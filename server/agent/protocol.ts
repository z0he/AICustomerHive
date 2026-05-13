export type ClientEvent =
  | { type: "ping" }
  | { type: "user.text"; text: string }
  | { type: "audio.input"; audio: string } // base64-encoded PCM16 24kHz mono
  | { type: "session.cancel" };

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
