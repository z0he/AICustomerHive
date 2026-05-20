export type ClientEvent =
  | { type: "ping" }
  | { type: "user.text"; text: string }
  | { type: "audio.input"; audio: string } // base64-encoded PCM16 24kHz mono
  | { type: "audio.clear" } // discard any uncommitted audio buffered on OAI side
  | { type: "session.cancel" };

// Optional UI navigation hint a tool can attach to its result. The dispatcher
// strips this before forwarding the result to the model (it's framework
// metadata, not data the model should phrase about) and emits a ui.navigate
// ServerEvent so the client can push the wouter location.
export interface Navigate {
  route: string;
  params?: Record<string, string>;
}

export type ServerEvent =
  | { type: "ready" }
  | { type: "pong" }
  | { type: "user.transcript"; text: string }
  | { type: "assistant.text"; text: string }
  | { type: "audio.output"; audio: string } // base64-encoded PCM16 24kHz mono chunk
  | { type: "audio.done" }
  | { type: "speech.started" }
  | { type: "speech.stopped" }
  | { type: "tool.call"; name: string; args: Record<string, unknown> }
  | { type: "tool.result"; name: string; result: unknown }
  | { type: "ui.navigate"; navigate: Navigate }
  | {
      type: "usage.update";
      tier: string;
      minutesUsed: number;
      minutesLimit: number;
      overageMinutes: number;
      overagePence: number;
    }
  | { type: "error"; message: string };

export const REALTIME_PATH = "/api/agent/realtime";
