export type ClientEvent =
  | { type: "ping" }
  | { type: "user.text"; text: string };

export type ServerEvent =
  | { type: "ready" }
  | { type: "pong" }
  | { type: "assistant.text"; text: string }
  | { type: "tool.call"; name: string; args: Record<string, unknown> }
  | { type: "tool.result"; name: string; result: unknown }
  | { type: "error"; message: string };

export const REALTIME_PATH = "/api/agent/realtime";
