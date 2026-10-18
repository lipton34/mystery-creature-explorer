export type SoundCue = "impact" | "call";

export const SOUND_CUES = {
  impact: { start: 72, end: 28, duration: 0.65, gain: 0.65 },
  call: { start: 155, end: 83, duration: 1.25, gain: 0.25 },
} as const;

export class StageAudio {
  enabled = true;
  private context?: AudioContext;
  private master?: GainNode;
  private paused = false;
  private sources = new Set<AudioScheduledSourceNode>();

  unlock(): void {
    if (!this.enabled || this.paused) return;
    try {
      if (!this.context && typeof window.AudioContext === "function") {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0.18;
        this.master.connect(this.context.destination);
      }
      if (this.context?.state === "suspended") void this.context.resume().catch(() => {});
    } catch { this.context = undefined; }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stop();
    if (this.master && this.context) this.master.gain.setValueAtTime(enabled ? 0.18 : 0, this.context.currentTime);
    if (enabled) this.unlock();
  }

  play(cue: SoundCue): void {
    const context = this.context;
    if (!this.enabled || this.paused || !context || context.state !== "running" || !this.master) return;
    const sound = SOUND_CUES[cue];
    const start = context.currentTime;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.001, start);
    envelope.gain.exponentialRampToValueAtTime(sound.gain, start + 0.03);
    envelope.gain.exponentialRampToValueAtTime(0.001, start + sound.duration);
    envelope.connect(this.master);
    const voice = context.createOscillator();
    voice.type = cue === "call" ? "triangle" : "sine";
    voice.frequency.setValueAtTime(sound.start, start);
    if (cue === "call") voice.frequency.linearRampToValueAtTime(190, start + 0.22);
    voice.frequency.exponentialRampToValueAtTime(sound.end, start + sound.duration);
    voice.connect(envelope);
    this.track(voice, () => envelope.disconnect());
    voice.start(start);
    voice.stop(start + sound.duration);
    if (cue === "impact") {
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.35), context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let index = 0; index < samples.length; index++) samples[index] = (Math.random() * 2 - 1) * (1 - index / samples.length) ** 2;
      const noise = context.createBufferSource();
      noise.buffer = buffer;
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 220;
      noise.connect(filter).connect(envelope);
      this.track(noise, () => filter.disconnect());
      noise.start(start);
      noise.stop(start + 0.35);
    }
  }

  private track(source: AudioScheduledSourceNode, cleanup: () => void): void {
    this.sources.add(source);
    source.onended = () => { this.sources.delete(source); source.disconnect(); cleanup(); };
  }

  pause(): void {
    this.paused = true;
    if (this.context?.state === "running") void this.context.suspend().catch(() => {});
  }

  resume(): void { this.paused = false; this.unlock(); }

  stop(): void {
    for (const source of this.sources) { try { source.stop(); } catch {} }
    this.sources.clear();
  }

  dispose(): void {
    this.stop();
    if (this.context) void this.context.close().catch(() => {});
  }
}
