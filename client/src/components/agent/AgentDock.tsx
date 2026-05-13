import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useRealtimeAgent,
  type AgentMessage,
  type UsageStatus,
} from "@/hooks/use-realtime-agent";
import { useVoiceIO } from "@/hooks/use-voice-io";

export default function AgentDock() {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const playbackRef = useRef({
    play: (_b64: string) => {},
    flush: () => {},
  });

  const {
    status,
    messages,
    error,
    isUserSpeaking,
    isAssistantSpeaking,
    usage,
    sendText,
    sendAudio,
    cancel,
  } = useRealtimeAgent({
    enabled: isOpen,
    onAudioOutput: (b64) => playbackRef.current.play(b64),
    onAudioDone: () => {},
    onSpeechStarted: () => {
      // User started talking — interrupt the assistant immediately.
      playbackRef.current.flush();
      cancel();
    },
  });

  const voice = useVoiceIO({
    onAudioChunk: sendAudio,
  });

  playbackRef.current = {
    play: voice.playAudio,
    flush: voice.flushAudio,
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (!isOpen) {
      voice.stopSession();
    }
  }, [isOpen, voice]);

  const handleSendText = () => {
    const text = draft.trim();
    if (!text) return;
    sendText(text);
    setDraft("");
  };

  const handleVoiceToggle = async () => {
    if (voice.isActive) {
      voice.stopSession();
    } else {
      await voice.startSession();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 rounded-full w-12 h-12 p-0 shadow-lg z-50"
        aria-label="Open voice agent"
      >
        <Mic className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 w-80 max-w-[calc(100vw-2rem)] h-96 bg-background border rounded-lg shadow-xl flex flex-col z-50">
      <header className="flex flex-col px-3 py-2 border-b gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Voice Agent</span>
            <StatusDot status={status} />
            {voice.isActive && (
              <span className="text-xs text-muted-foreground">
                {isUserSpeaking
                  ? "listening…"
                  : isAssistantSpeaking
                    ? "speaking…"
                    : "idle"}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-7 w-7 p-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {usage && <UsageMeter usage={usage} />}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-sm">
        {messages.length === 0 && status === "open" && (
          <p className="text-muted-foreground text-xs">
            Click the mic to start a voice session, or type below. Try "how many contacts" or "what industries are my contacts from".
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {error && <div className="text-destructive text-xs">⚠ {error}</div>}
        {voice.error && (
          <div className="text-destructive text-xs">⚠ {voice.error}</div>
        )}
      </div>

      <footer className="p-2 border-t flex gap-2 items-center">
        <Button
          variant={voice.isActive ? "destructive" : "secondary"}
          size="sm"
          onClick={handleVoiceToggle}
          disabled={status !== "open"}
          className="h-9 w-9 p-0 shrink-0"
          aria-label={voice.isActive ? "End voice session" : "Start voice session"}
        >
          {voice.isActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendText()}
          placeholder={status === "open" ? "Type or talk…" : "Connecting…"}
          disabled={status !== "open"}
          className="flex-1 bg-background border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button
          size="sm"
          onClick={handleSendText}
          disabled={status !== "open" || !draft.trim()}
          className="h-9 w-9 p-0 shrink-0"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </Button>
      </footer>
    </div>
  );
}

function UsageMeter({ usage }: { usage: UsageStatus }) {
  const pct = Math.min(
    100,
    Math.round((usage.minutesUsed / Math.max(1, usage.minutesLimit)) * 100),
  );
  const overage = usage.overageMinutes > 0;
  const barColor = overage
    ? "bg-orange-500"
    : pct >= 90
      ? "bg-yellow-500"
      : "bg-green-500";

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>
          {usage.tier} · {usage.minutesUsed}/{usage.minutesLimit} min
        </span>
        {overage ? (
          <span className="text-orange-500 font-medium">
            +{usage.overageMinutes} min · £
            {(usage.overagePence / 100).toFixed(2)}
          </span>
        ) : (
          <span>{usage.minutesLimit - usage.minutesUsed} min left</span>
        )}
      </div>
      <div className="h-1 w-full bg-muted rounded overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  if (status === "connecting") {
    return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
  }
  const color =
    status === "open"
      ? "bg-green-500"
      : status === "error"
        ? "bg-red-500"
        : "bg-muted-foreground";
  return <span className={`h-2 w-2 rounded-full ${color}`} />;
}

function MessageBubble({ message }: { message: AgentMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 max-w-[85%]">
          {message.text}
        </div>
      </div>
    );
  }
  if (message.role === "assistant") {
    return (
      <div className="flex justify-start">
        <div className="bg-muted rounded-lg px-3 py-1.5 max-w-[85%]">
          {message.text}
        </div>
      </div>
    );
  }
  return (
    <div className="text-muted-foreground text-xs font-mono">
      {message.result !== undefined
        ? `← ${message.name}: ${JSON.stringify(message.result)}`
        : `→ ${message.name}(${JSON.stringify(message.args ?? {})})`}
    </div>
  );
}
