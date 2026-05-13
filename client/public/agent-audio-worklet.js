// AudioWorklet processor that captures mic audio as PCM16 24kHz chunks.
// Posts each ~100ms chunk back to the main thread as an ArrayBuffer.

class PCMRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.chunkSize = 2400; // 100ms at 24kHz
    this.buffer = new Float32Array(this.chunkSize);
    this.bufferIdx = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channel = input[0];

    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.bufferIdx++] = channel[i];
      if (this.bufferIdx >= this.chunkSize) {
        const int16 = new Int16Array(this.chunkSize);
        for (let j = 0; j < this.chunkSize; j++) {
          const s = Math.max(-1, Math.min(1, this.buffer[j]));
          int16[j] = s < 0 ? s * 32768 : s * 32767;
        }
        this.port.postMessage({ pcm16: int16.buffer }, [int16.buffer]);
        this.bufferIdx = 0;
      }
    }
    return true;
  }
}

registerProcessor("pcm-recorder", PCMRecorderProcessor);
