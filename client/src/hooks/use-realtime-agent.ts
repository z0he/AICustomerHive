import { useCallback, useEffect, useRef, useState } from "react";

type ServerEvent =
  | { type: "ready" }
  | { type: "pong" }
  | { type: "assistant.text"; text: string }
  | { type: "audio.output"; audio: string }
  | { type: "audio.done" }
  | { type: "speech.started" }
  | { type: "speech.stopped" }
  | { type: "tool.call"; name: string; args: Record<string, unknown> }
  | { type: "tool.result"; name: string; result: unknown }
  | { type: "error"; message: string };

type ClientEvent =
  | { type: "ping" }
  | { type: "user.text"; text: string }
  | { type: "audio.input"; audio: string }
  | { type: "session.cancel" };

export type AgentMessage =
  | { id: string; role: "user"; text: string; ts: number }
  | { id: string; role: "assistant"; text: string; ts: number }
  | {
      id: string;
      role: "tool";
      name: string;
      args?: Record<string, unknown>;
      result?: unknown;
      ts: number;
    };

export type AgentStatus = "idle" | "connecting" | "open" | "closed" | "error";

interface UseRealtimeAgentOptions {
  enabled: boolean;
  onAudioOutput?: (base64: string) => void;
  onAudioDone?: () => void;
  onSpeechStarted?: () => void;
  onSpeechStopped?: () => void;
}

const REALTIME_PATH = "/api/agent/realtime";

function buildWsUrl(token: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}${REALTIME_PATH}?token=${encodeURIComponent(token)}`;
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useRealtimeAgent(opts: UseRealtimeAgentOptions) {
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const cbs = useRef(opts);
  cbs.current = opts;

  const connect = useCallback(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setError("Not logged in");
      setStatus("error");
      return;
    }

    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
      return;
    }

    setStatus("connecting");
    setError(null);

    const ws = new WebSocket(buildWsUrl(token));
    wsRef.current = ws;

    ws.onopen = () => setStatus("open");

    ws.onmessage = (ev) => {
      let event: ServerEvent;
      try {
        event = JSON.parse(ev.data);
      } catch {
        return;
      }

      switch (event.type) {
        case "ready":
        case "pong":
          return;
        case "assistant.text":
          setMessages((m) => [
            ...m,
            { id: newId(), role: "assistant", text: event.text, ts: Date.now() },
          ]);
          return;
        case "audio.output":
          setIsAssistantSpeaking(true);
          cbs.current.onAudioOutput?.(event.audio);
          return;
        case "audio.done":
          setIsAssistantSpeaking(false);
          cbs.current.onAudioDone?.();
          return;
        case "speech.started":
          setIsUserSpeaking(true);
          cbs.current.onSpeechStarted?.();
          return;
        case "speech.stopped":
          setIsUserSpeaking(false);
          cbs.current.onSpeechStopped?.();
          return;
        case "tool.call":
          setMessages((m) => [
            ...m,
            {
              id: newId(),
              role: "tool",
              name: event.name,
              args: event.args,
              ts: Date.now(),
            },
          ]);
          return;
        case "tool.result":
          setMessages((m) => [
            ...m,
            {
              id: newId(),
              role: "tool",
              name: event.name,
              result: event.result,
              ts: Date.now(),
            },
          ]);
          return;
        case "error":
          setError(event.message);
          return;
      }
    };

    ws.onerror = () => {
      setError("Connection error");
      setStatus("error");
    };

    ws.onclose = () => {
      setStatus((s) => (s === "error" ? "error" : "closed"));
      setIsAssistantSpeaking(false);
      setIsUserSpeaking(false);
      wsRef.current = null;
    };
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus("closed");
  }, []);

  const sendRaw = useCallback((payload: ClientEvent) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(payload));
  }, []);

  const sendText = useCallback(
    (text: string) => {
      sendRaw({ type: "user.text", text });
      setMessages((m) => [
        ...m,
        { id: newId(), role: "user", text, ts: Date.now() },
      ]);
    },
    [sendRaw],
  );

  const sendAudio = useCallback(
    (base64: string) => {
      sendRaw({ type: "audio.input", audio: base64 });
    },
    [sendRaw],
  );

  const cancel = useCallback(() => {
    sendRaw({ type: "session.cancel" });
  }, [sendRaw]);

  useEffect(() => {
    if (!opts.enabled) return;
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [opts.enabled, connect]);

  return {
    status,
    messages,
    error,
    isUserSpeaking,
    isAssistantSpeaking,
    sendText,
    sendAudio,
    cancel,
    connect,
    disconnect,
  };
}
