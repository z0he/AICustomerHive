import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRealtimeAgent, type AgentMessage } from "@/hooks/use-realtime-agent";
import { useVoiceIO } from "@/hooks/use-voice-io";

export default function AgentDock() {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { status, messages, error, send } = useRealtimeAgent({ enabled: isOpen });

  const handleFinalTranscript = useCallback(
    (text: string) => {
      if (text) send(text);
    },
    [send],
  );

  const { isListening, interim, startListening, stopListening, speak, isListenSupported } =
    useVoiceIO({ onFinalTranscript: handleFinalTranscript });

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "assistant") speak(last.text);
  }, [messages, speak]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, interim]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    send(text);
    setDraft("");
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
      <header className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Voice Agent</span>
          <StatusDot status={status} />
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
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-sm">
        {messages.length === 0 && status === "open" && (
          <p className="text-muted-foreground text-xs">
            Try: "how many contacts do I have?" or "find inactive customers"
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {interim && (
          <div className="text-muted-foreground italic text-xs">{interim}…</div>
        )}
        {error && <div className="text-destructive text-xs">⚠ {error}</div>}
      </div>

      <footer className="p-2 border-t flex gap-2 items-center">
        {isListenSupported && (
          <Button
            variant={isListening ? "destructive" : "secondary"}
            size="sm"
            onClick={isListening ? stopListening : startListening}
            disabled={status !== "open"}
            className="h-9 w-9 p-0 shrink-0"
            aria-label={isListening ? "Stop listening" : "Start listening"}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={status === "open" ? "Type or speak…" : "Connecting…"}
          disabled={status !== "open"}
          className="flex-1 bg-background border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button
          size="sm"
          onClick={handleSend}
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
