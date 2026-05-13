import { useCallback, useEffect, useRef, useState } from "react";
import { AudioPlaybackQueue, MicCapture } from "@/lib/agent-audio";

interface UseVoiceIOOptions {
  onAudioChunk?: (base64Pcm16: string) => void;
}

export function useVoiceIO(opts: UseVoiceIOOptions) {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const micRef = useRef<MicCapture | null>(null);
  const playbackRef = useRef<AudioPlaybackQueue | null>(null);
  const onAudioChunk = useRef(opts.onAudioChunk);
  onAudioChunk.current = opts.onAudioChunk;

  const ensurePlayback = useCallback((): AudioPlaybackQueue => {
    if (!playbackRef.current) {
      playbackRef.current = new AudioPlaybackQueue();
    }
    return playbackRef.current;
  }, []);

  const startSession = useCallback(async () => {
    if (isActive || micRef.current) return;
    setError(null);
    const mic = new MicCapture();
    try {
      await mic.start((b64) => onAudioChunk.current?.(b64));
      micRef.current = mic;
      ensurePlayback();
      setIsActive(true);
    } catch (err) {
      mic.stop();
      const msg =
        err instanceof Error
          ? err.message
          : "Could not access microphone";
      setError(msg);
      setIsActive(false);
    }
  }, [isActive, ensurePlayback]);

  const stopSession = useCallback(() => {
    micRef.current?.stop();
    micRef.current = null;
    playbackRef.current?.flush();
    setIsActive(false);
  }, []);

  const playAudio = useCallback((base64Pcm16: string) => {
    ensurePlayback().enqueueBase64(base64Pcm16);
  }, [ensurePlayback]);

  const flushAudio = useCallback(() => {
    playbackRef.current?.flush();
  }, []);

  useEffect(() => {
    return () => {
      micRef.current?.stop();
      playbackRef.current?.close();
      micRef.current = null;
      playbackRef.current = null;
    };
  }, []);

  return {
    isActive,
    error,
    startSession,
    stopSession,
    playAudio,
    flushAudio,
  };
}
