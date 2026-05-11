import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: any) => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function useVoiceIO(opts: { onFinalTranscript?: (text: string) => void }) {
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinal = useRef(opts.onFinalTranscript);
  onFinal.current = opts.onFinalTranscript;

  const Ctor = getSpeechRecognitionCtor();
  const isListenSupported = !!Ctor;
  const isSpeakSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const startListening = useCallback(() => {
    if (!Ctor || isListening) return;
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (ev: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim(interimText);
      if (finalText) {
        setInterim("");
        onFinal.current?.(finalText.trim());
      }
    };

    rec.onend = () => {
      setIsListening(false);
      recRef.current = null;
    };

    rec.onerror = () => {
      setIsListening(false);
      recRef.current = null;
    };

    try {
      rec.start();
      recRef.current = rec;
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }, [Ctor, isListening]);

  const stopListening = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isSpeakSupported) return;
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    },
    [isSpeakSupported],
  );

  useEffect(() => {
    return () => {
      recRef.current?.abort();
      if (isSpeakSupported) window.speechSynthesis.cancel();
    };
  }, [isSpeakSupported]);

  return {
    isListening,
    interim,
    startListening,
    stopListening,
    speak,
    isListenSupported,
    isSpeakSupported,
  };
}
