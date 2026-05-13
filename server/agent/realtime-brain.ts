import { WebSocket } from "ws";
import { agentToolRegistry } from "./tools";
import type { ServerEvent } from "./protocol";
import { checkDailyCap, recordRealtimeTextUsage } from "./usage-tracker";

const REALTIME_MODEL = "gpt-4o-mini-realtime-preview";
const REALTIME_URL = `wss://api.openai.com/v1/realtime?model=${REALTIME_MODEL}`;

const SYSTEM_PROMPT = `You are AICRM, a voice-first CRM assistant. You help users manage contacts, campaigns, and customer relationships through natural conversation.

Use the available tools to answer questions about the user's CRM data. Always prefer calling a tool over guessing. If a user asks for something that no tool covers, say so honestly in one short sentence and suggest what you CAN help with.

Your responses will be spoken aloud, so:
- Keep answers brief — one or two short sentences is ideal.
- Lead with the answer (the number, the name, the fact). Save context for follow-ups.
- Avoid lists, markdown, or anything that doesn't sound natural when read out.`;

export type Sender = (event: ServerEvent) => void;

export class RealtimeSession {
  private oaiWs: WebSocket | null = null;
  private connected = false;

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
      response: { modalities: ["text"] },
    });
  }

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
        "OpenAI-Beta": "realtime=v1",
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

    this.sendToOai({
      type: "session.update",
      session: {
        modalities: ["text"],
        instructions: SYSTEM_PROMPT,
        tools: agentToolRegistry.toOpenAIRealtimeTools(),
        tool_choice: "auto",
        temperature: 0.6,
      },
    });
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
        console.error("[realtime-brain] OAI event error:", event.error);
        this.send({
          type: "error",
          message: event.error?.message ?? "Realtime API error",
        });
        return;

      case "response.text.done":
        if (typeof event.text === "string" && event.text.length > 0) {
          this.send({ type: "assistant.text", text: event.text });
        }
        return;

      case "response.function_call_arguments.done":
        await this.handleFunctionCall(event);
        return;

      case "response.done":
        if (event.response?.usage) {
          const usage = event.response.usage;
          try {
            await recordRealtimeTextUsage({
              userId: this.userId,
              organizationId: this.organizationId,
              inputTokens: usage.input_tokens ?? 0,
              cachedInputTokens: usage.input_token_details?.cached_tokens ?? 0,
              outputTokens: usage.output_tokens ?? 0,
            });
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
      resultOutput = JSON.stringify(result);
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

    this.sendToOai({
      type: "response.create",
      response: { modalities: ["text"] },
    });
  }
}
