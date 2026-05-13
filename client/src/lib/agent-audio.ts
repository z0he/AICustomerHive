const SAMPLE_RATE = 24000;
const WORKLET_URL = "/agent-audio-worklet.js";

function int16ToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToInt16(b64: string): Int16Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

export class MicCapture {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private worklet: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  async start(onChunkBase64: (b64: string) => void): Promise<void> {
    this.ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
    if (this.ctx.state === "suspended") await this.ctx.resume();

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    await this.ctx.audioWorklet.addModule(WORKLET_URL);
    this.worklet = new AudioWorkletNode(this.ctx, "pcm-recorder");
    this.worklet.port.onmessage = (ev) => {
      const buf = ev.data?.pcm16 as ArrayBuffer | undefined;
      if (buf) onChunkBase64(int16ToBase64(buf));
    };

    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.source.connect(this.worklet);
  }

  stop(): void {
    this.source?.disconnect();
    this.worklet?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close().catch(() => {});
    this.source = null;
    this.worklet = null;
    this.stream = null;
    this.ctx = null;
  }
}

export class AudioPlaybackQueue {
  private ctx: AudioContext | null = null;
  private nextStartTime = 0;
  private active: AudioBufferSourceNode[] = [];

  ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
      this.nextStartTime = 0;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  enqueueBase64(b64: string): void {
    const ctx = this.ensureContext();
    const pcm = base64ToInt16(b64);
    if (pcm.length === 0) return;

    const float32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) float32[i] = pcm[i] / 32768;

    const buffer = ctx.createBuffer(1, float32.length, SAMPLE_RATE);
    buffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const startAt = Math.max(ctx.currentTime, this.nextStartTime);
    source.start(startAt);
    this.nextStartTime = startAt + buffer.duration;

    this.active.push(source);
    source.onended = () => {
      this.active = this.active.filter((s) => s !== source);
    };
  }

  flush(): void {
    for (const s of this.active) {
      try {
        s.stop();
      } catch {
        // already ended
      }
    }
    this.active = [];
    this.nextStartTime = this.ctx?.currentTime ?? 0;
  }

  close(): void {
    this.flush();
    this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}
