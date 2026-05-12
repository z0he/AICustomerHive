import OpenAI from "openai";
import { agentToolRegistry } from "./tools";
import type { ServerEvent } from "./protocol";
import {
  DAILY_CAP_PENCE,
  checkDailyCap,
  recordTextUsage,
} from "./usage-tracker";

const MODEL = "gpt-4o-mini";
const MAX_TOOL_ITERATIONS = 5;

const SYSTEM_PROMPT = `You are AICRM, a voice-first CRM assistant. You help users manage contacts, campaigns, and customer relationships through natural conversation.

Use the available tools to answer questions about the user's CRM data. Always prefer calling a tool over guessing. If a user asks for something that no tool covers, say so honestly in one short sentence and suggest what you CAN help with.

Your responses will be spoken aloud, so:
- Keep answers brief — one or two short sentences is ideal.
- Lead with the answer (the number, the name, the fact). Save context for follow-ups.
- Avoid lists, markdown, or anything that doesn't sound natural when read out.`;

export type Sender = (event: ServerEvent) => void;

export interface BrainContext {
  userId: number;
  organizationId: number;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  send: Sender;
}

let cachedClient: OpenAI | null = null;
function getClient(): OpenAI | null {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
}

export async function handleUserText(
  text: string,
  ctx: BrainContext,
): Promise<void> {
  const client = getClient();
  if (!client) {
    ctx.send({
      type: "error",
      message: "OpenAI API key not configured on the server.",
    });
    return;
  }

  const cap = await checkDailyCap(ctx.userId);
  if (!cap.ok) {
    const capPounds = (cap.capPence / 100).toFixed(2);
    ctx.send({
      type: "error",
      message: `You've reached today's £${capPounds} AI usage cap. It resets at midnight UTC.`,
    });
    return;
  }

  ctx.messages.push({ role: "user", content: text });

  const tools = agentToolRegistry.toOpenAITools();

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    let completion;
    try {
      completion = await client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...ctx.messages,
        ],
        tools,
        tool_choice: "auto",
      });
    } catch (err) {
      console.error("[agent] OpenAI request failed:", err);
      ctx.send({
        type: "error",
        message:
          err instanceof Error
            ? `AI request failed: ${err.message}`
            : "AI request failed",
      });
      return;
    }

    if (completion.usage) {
      try {
        await recordTextUsage({
          userId: ctx.userId,
          organizationId: ctx.organizationId,
          inputTokens: completion.usage.prompt_tokens,
          outputTokens: completion.usage.completion_tokens,
        });
      } catch (err) {
        console.error("[agent] failed to record usage:", err);
      }
    }

    const choice = completion.choices[0];
    if (!choice) {
      ctx.send({ type: "error", message: "No response from AI" });
      return;
    }

    const msg = choice.message;
    ctx.messages.push(msg);

    const toolCalls = msg.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      for (const tc of toolCalls) {
        if (tc.type !== "function") continue;
        let args: Record<string, unknown> = {};
        try {
          args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
        } catch {
          // fall through with empty args; the tool's Zod validation will reject if needed
        }

        ctx.send({ type: "tool.call", name: tc.function.name, args });

        let toolResultContent: string;
        try {
          const result = await agentToolRegistry.dispatch(
            tc.function.name,
            args,
            { organizationId: ctx.organizationId },
          );
          ctx.send({
            type: "tool.result",
            name: tc.function.name,
            result,
          });
          toolResultContent = JSON.stringify(result);
        } catch (err) {
          const errMsg =
            err instanceof Error ? err.message : "Tool execution failed";
          ctx.send({ type: "error", message: `${tc.function.name}: ${errMsg}` });
          toolResultContent = JSON.stringify({ error: errMsg });
        }

        ctx.messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: toolResultContent,
        });
      }
      continue;
    }

    const finalText = msg.content;
    if (typeof finalText === "string" && finalText.trim().length > 0) {
      ctx.send({ type: "assistant.text", text: finalText });
    }
    return;
  }

  ctx.send({
    type: "error",
    message: `Stopped after ${MAX_TOOL_ITERATIONS} tool iterations`,
  });
}
