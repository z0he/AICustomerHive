import { agentToolRegistry } from "./tools";
import type { ServerEvent } from "./protocol";

export type Sender = (event: ServerEvent) => void;

export interface DispatchContext {
  organizationId: number;
  send: Sender;
}

interface Intent {
  tool: string;
  args: Record<string, unknown>;
}

export async function handleUserText(
  text: string,
  ctx: DispatchContext,
): Promise<void> {
  const intent = matchIntent(text);

  if (!intent) {
    ctx.send({
      type: "assistant.text",
      text:
        "I'm not sure how to help with that yet. Try asking 'how many contacts do I have?', " +
        "'find inactive customers', or 'give me a summary'.",
    });
    return;
  }

  ctx.send({ type: "tool.call", name: intent.tool, args: intent.args });

  try {
    const result = await agentToolRegistry.dispatch(intent.tool, intent.args, {
      organizationId: ctx.organizationId,
    });
    ctx.send({ type: "tool.result", name: intent.tool, result });
    ctx.send({ type: "assistant.text", text: renderResponse(intent.tool, result) });
  } catch (err) {
    ctx.send({
      type: "error",
      message: err instanceof Error ? err.message : "Tool dispatch failed",
    });
  }
}

function matchIntent(text: string): Intent | null {
  const t = text.toLowerCase();

  if (/how many contacts|count.*contacts|total contacts/.test(t)) {
    return { tool: "count_contacts", args: {} };
  }

  if (/inactive|haven'?t engaged|haven'?t been contacted|dormant/.test(t)) {
    const dayMatch = t.match(/(\d+)\s*days?/);
    const args: Record<string, unknown> = {};
    if (dayMatch) args.daysInactive = parseInt(dayMatch[1], 10);
    return { tool: "find_inactive_customers", args };
  }

  if (/summary|overview|how am i doing|stats/.test(t)) {
    return { tool: "get_org_summary", args: {} };
  }

  return null;
}

function renderResponse(tool: string, result: unknown): string {
  const r = result as Record<string, unknown>;
  switch (tool) {
    case "count_contacts":
      return `You have ${r.count} contacts.`;
    case "find_inactive_customers":
      return `Found ${r.total} contacts inactive for ${r.daysInactive}+ days.`;
    case "get_org_summary":
      return `You have ${r.contacts} contacts and ${r.campaigns} campaigns.`;
    default:
      return "Done.";
  }
}
