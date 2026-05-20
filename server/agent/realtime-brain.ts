import { WebSocket } from "ws";
import { agentToolRegistry } from "./tools";
import type { Navigate, ServerEvent } from "./protocol";
import { checkDailyCap, getBundleStatus, recordRealtimeUsage } from "./usage-tracker";

// A tool can attach `{ navigate: { route, params? } }` to its return object.
// The dispatcher emits a ui.navigate event and strips the field before
// forwarding the rest of the result to the model.
function extractNavigate(result: unknown): Navigate | undefined {
  if (!result || typeof result !== "object") return undefined;
  const nav = (result as Record<string, unknown>).navigate;
  if (!nav || typeof nav !== "object") return undefined;
  const route = (nav as Record<string, unknown>).route;
  if (typeof route !== "string" || route.length === 0) return undefined;
  const params = (nav as Record<string, unknown>).params;
  return {
    route,
    params:
      params && typeof params === "object"
        ? (params as Record<string, string>)
        : undefined,
  };
}

function stripNavigate(result: unknown): unknown {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return result;
  }
  const { navigate: _drop, ...rest } = result as Record<string, unknown>;
  return rest;
}

// GA Realtime API model. Beta `gpt-4o-mini-realtime-preview` was retired May 12 2026.
const REALTIME_MODEL = "gpt-realtime-mini";
const REALTIME_URL = `wss://api.openai.com/v1/realtime?model=${REALTIME_MODEL}`;

const SYSTEM_PROMPT = `You are AICRM, a voice-first CRM assistant. You help users manage contacts, campaigns, and customer relationships through natural conversation.

Use the available tools to answer questions about the user's CRM data. Always prefer calling a tool over guessing. If a user asks for something that no tool covers, say so honestly in one short sentence and suggest what you CAN help with.

When a tool has sensible defaults for optional parameters, call it immediately with the defaults rather than asking the user to clarify. Only ask the user to clarify when the request is genuinely ambiguous and no default would do.

Your responses will be spoken aloud, so:
- Keep answers brief — one or two short sentences is ideal.
- Lead with the answer (the number, the name, the fact). Save context for follow-ups.
- Avoid lists, markdown, or anything that doesn't sound natural when read out.
- Stop after delivering the answer. Do not append follow-up offers like "Would you like more details?", "Let me know if I can help with anything else", or similar. If the user wants more, they'll ask.`;

export type Sender = (event: ServerEvent) => void;

export class RealtimeSession {
  private oaiWs: WebSocket | null = null;
  private connected = false;
  // Tracks whether the most recent input was typed (text-only reply wanted)
  // vs spoken (audio reply wanted). Used by handleFunctionCall so tool
  // results echo the modality the user is actually using.
  private lastInputWasText = false;

  constructor(
    private readonly userId: number,
    private readonly organizationId: number,
    private readonly send: Sender,
  ) {}

  async sendUserText(text: string): Promise<void> {
    const cap = await checkDailyCap(this.userId);
    if (!cap.ok) {
      const capPounds = (cap.capMillipence / 100_000).toFixed(2);
      this.send({
        type: "error",
        message: `You've reached today's £${capPounds} AI usage cap. It resets at midnight UTC.`,
      });
      return;
    }

    try {
      await this.ensureConnected();
    } catch (err) {
      this.send({
        type: "error",
        message:
          err instanceof Error
            ? `Realtime connection failed: ${err.message}`
            : "Realtime connection failed",
      });
      return;
    }

    this.lastInputWasText = true;

    this.sendToOai({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });

    this.sendToOai({
      type: "response.create",
      response: { output_modalities: ["text"] },
    });
  }

  // When the user types (text input), we want a text-only reply (no audio).
  // When the user speaks (audio input), server_vad auto-creates a response
  // with default modalities (text+audio), which gives us a spoken answer.

  close(): void {
    if (this.oaiWs && this.oaiWs.readyState <= WebSocket.OPEN) {
      this.oaiWs.close();
    }
    this.oaiWs = null;
    this.connected = false;
  }

  private async ensureConnected(): Promise<void> {
    if (this.connected && this.oaiWs?.readyState === WebSocket.OPEN) return;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const ws = new WebSocket(REALTIME_URL, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    await new Promise<void>((resolve, reject) => {
      const onOpen = () => {
        ws.off("error", onError);
        resolve();
      };
      const onError = (err: Error) => {
        ws.off("open", onOpen);
        reject(err);
      };
      ws.once("open", onOpen);
      ws.once("error", onError);
    });

    ws.on("message", (data) => {
      this.handleOaiMessage(data).catch((err) =>
        console.error("[realtime-brain] handler error:", err),
      );
    });
    ws.on("close", () => {
      this.connected = false;
    });
    ws.on("error", (err) => {
      console.error("[realtime-brain] OAI ws error:", err);
    });

    this.oaiWs = ws;
    this.connected = true;

    // GA session.update shape: `type: "realtime"` is required, modality config
    // renamed to `output_modalities`, audio I/O config is nested under
    // `audio.input` / `audio.output`, and `turn_detection` lives under
    // `audio.input` rather than the top of the session.
    this.sendToOai({
      type: "session.update",
      session: {
        type: "realtime",
        model: REALTIME_MODEL,
        instructions: SYSTEM_PROMPT,
        output_modalities: ["audio"],
        audio: {
          input: {
            format: { type: "audio/pcm", rate: 24000 },
            transcription: { model: "whisper-1" },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
          },
          output: {
            format: { type: "audio/pcm", rate: 24000 },
            voice: "alloy",
          },
        },
        tools: agentToolRegistry.toOpenAIRealtimeTools(),
        tool_choice: "auto",
      },
    });
  }

  async sendAudio(base64Pcm16: string): Promise<void> {
    if (!this.connected || this.oaiWs?.readyState !== WebSocket.OPEN) {
      try {
        await this.ensureConnected();
      } catch (err) {
        this.send({
          type: "error",
          message:
            err instanceof Error
              ? `Realtime connection failed: ${err.message}`
              : "Realtime connection failed",
        });
        return;
      }
    }
    this.lastInputWasText = false;
    this.sendToOai({
      type: "input_audio_buffer.append",
      audio: base64Pcm16,
    });
  }

  cancelResponse(): void {
    this.sendToOai({ type: "response.cancel" });
  }

  // Drops any audio in OAI's input buffer that hasn't been committed yet.
  // Called when the user toggles the mic off so trailing ambient noise
  // doesn't trip server VAD and produce a phantom response.
  clearAudioBuffer(): void {
    this.sendToOai({ type: "input_audio_buffer.clear" });
  }

  private sendToOai(event: unknown): void {
    if (this.oaiWs?.readyState === WebSocket.OPEN) {
      this.oaiWs.send(JSON.stringify(event));
    }
  }

  private async handleOaiMessage(data: unknown): Promise<void> {
    let event: any;
    try {
      event = JSON.parse(String(data));
    } catch {
      return;
    }

    switch (event.type) {
      case "error":
        // Silence the "no active response to cancel" race — it fires when
        // the user starts speaking but the assistant wasn't actually mid-reply.
        if (
          event.error?.code === "response_cancel_not_active" ||
          /no active response/i.test(event.error?.message ?? "")
        ) {
          return;
        }
        console.error("[realtime-brain] OAI event error:", event.error);
        this.send({
          type: "error",
          message: event.error?.message ?? "Realtime API error",
        });
        return;

      case "conversation.item.input_audio_transcription.completed":
        if (typeof event.transcript === "string" && event.transcript.trim()) {
          this.send({ type: "user.transcript", text: event.transcript.trim() });
        }
        return;

      // GA renames: response.text.* → response.output_text.*,
      // response.audio.* → response.output_audio.*,
      // response.audio_transcript.* → response.output_audio_transcript.*
      case "response.output_text.done":
        if (typeof event.text === "string" && event.text.length > 0) {
          this.send({ type: "assistant.text", text: event.text });
        }
        return;

      case "response.output_audio.delta":
        if (typeof event.delta === "string" && event.delta.length > 0) {
          this.send({ type: "audio.output", audio: event.delta });
        }
        return;

      case "response.output_audio.done":
        this.send({ type: "audio.done" });
        return;

      case "response.output_audio_transcript.done":
        if (typeof event.transcript === "string" && event.transcript.length > 0) {
          this.send({ type: "assistant.text", text: event.transcript });
        }
        return;

      case "input_audio_buffer.speech_started":
        this.send({ type: "speech.started" });
        return;

      case "input_audio_buffer.speech_stopped":
        this.send({ type: "speech.stopped" });
        return;

      case "response.function_call_arguments.done":
        await this.handleFunctionCall(event);
        return;

      case "response.done":
        if (event.response?.usage) {
          const usage = event.response.usage;
          try {
            await recordRealtimeUsage({
              userId: this.userId,
              organizationId: this.organizationId,
              inputTokens: usage.input_tokens ?? 0,
              cachedInputTokens: usage.input_token_details?.cached_tokens ?? 0,
              outputTokens: usage.output_tokens ?? 0,
              inputAudioTokens: usage.input_token_details?.audio_tokens ?? 0,
              outputAudioTokens: usage.output_token_details?.audio_tokens ?? 0,
            });
            const status = await getBundleStatus(
              this.userId,
              this.organizationId,
            );
            this.send({ type: "usage.update", ...status });
          } catch (err) {
            console.error("[realtime-brain] failed to record usage:", err);
          }
        }
        return;
    }
  }

  private async handleFunctionCall(event: any): Promise<void> {
    const name: string = event.name;
    const callId: string = event.call_id;
    const argsStr: string = event.arguments || "{}";

    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(argsStr);
    } catch {
      // continue with empty args; Zod validation in dispatch will reject if needed
    }

    this.send({ type: "tool.call", name, args });

    let resultOutput: string;
    try {
      const result = await agentToolRegistry.dispatch(name, args, {
        organizationId: this.organizationId,
      });
      this.send({ type: "tool.result", name, result });
      const navigate = extractNavigate(result);
      if (navigate) {
        this.send({ type: "ui.navigate", navigate });
      }
      resultOutput = JSON.stringify(stripNavigate(result));
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : "Tool execution failed";
      this.send({ type: "error", message: `${name}: ${errMsg}` });
      resultOutput = JSON.stringify({ error: errMsg });
    }

    this.sendToOai({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: resultOutput,
      },
    });

    // Echo the user's input modality: typed → text-only reply, spoken → audio
    // (audio responses still emit a transcript event so we get text for the UI).
    const followUpModalities = this.lastInputWasText ? ["text"] : ["audio"];
    this.sendToOai({
      type: "response.create",
      response: { output_modalities: followUpModalities },
    });
  }
}
