/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private engineRunning: boolean = false;
  private lastEngineFreq: number = 60;

  constructor(initialMuted: boolean = false) {
    this.isMuted = initialMuted;
  }

  private initCtx(): boolean {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : 0.8;
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return !!this.ctx;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.8, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Starts the continuous procedural car engine sound
   */
  public startEngine(): void {
    if (!this.initCtx() || !this.ctx || !this.masterGain || this.engineRunning) return;

    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineSubOsc = this.ctx.createOscillator();
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineGain = this.ctx.createGain();

      this.engineOsc.type = 'sawtooth';
      this.engineSubOsc.type = 'triangle';

      this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime);
      this.engineSubOsc.frequency.setValueAtTime(27.5, this.ctx.currentTime);

      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(260, this.ctx.currentTime);
      this.engineFilter.Q.setValueAtTime(3, this.ctx.currentTime);

      this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      this.engineOsc.connect(this.engineFilter);
      this.engineSubOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.engineOsc.start();
      this.engineSubOsc.start();
      this.engineRunning = true;
    } catch (e) {
      console.warn('Could not start engine audio', e);
    }
  }

  /**
   * Updates engine pitch and filter cutoff based on vehicle throttle and speed (0 - 1)
   */
  public updateEngine(throttle: number, speedRatio: number): void {
    if (!this.engineRunning || !this.ctx || !this.engineOsc || !this.engineFilter || !this.engineGain) return;

    const baseFreq = 50;
    const targetFreq = baseFreq + Math.abs(speedRatio) * 95 + (throttle > 0 ? 35 : 0);
    // Smooth frequency transition
    this.lastEngineFreq += (targetFreq - this.lastEngineFreq) * 0.15;

    const now = this.ctx.currentTime;
    this.engineOsc.frequency.setValueAtTime(this.lastEngineFreq, now);
    if (this.engineSubOsc) {
      this.engineSubOsc.frequency.setValueAtTime(this.lastEngineFreq * 0.5, now);
    }

    const cutoff = 220 + Math.abs(speedRatio) * 450 + (throttle > 0 ? 200 : 0);
    this.engineFilter.frequency.setValueAtTime(cutoff, now);

    const volume = 0.08 + Math.abs(speedRatio) * 0.06 + (throttle > 0 ? 0.04 : 0);
    this.engineGain.gain.setValueAtTime(volume, now);
  }

  public stopEngine(): void {
    if (!this.engineRunning) return;
    try {
      this.engineOsc?.stop();
      this.engineSubOsc?.stop();
      this.engineOsc?.disconnect();
      this.engineSubOsc?.disconnect();
      this.engineFilter?.disconnect();
      this.engineGain?.disconnect();
    } catch {
      // ignore cleanup errors
    }
    this.engineOsc = null;
    this.engineSubOsc = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.engineRunning = false;
  }

  /**
   * Plays a crisp, cheerful coin chime
   */
  public playCoin(value: number = 5): void {
    if (!this.initCtx() || !this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // Base frequency tuned by coin value
      const baseFreq = value >= 100 ? 987.77 : value >= 25 ? 783.99 : 659.25; // B5, G5, E5
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.12);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // ignore
    }
  }

  /**
   * Plays a refreshing dual-tone fuel can collection sound
   */
  public playFuel(): void {
    if (!this.initCtx() || !this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      [440, 659.25, 880].forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const start = now + idx * 0.06;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(start);
        osc.stop(start + 0.25);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Plays a deep suspension landing thud
   */
  public playLanding(intensity: number = 1): void {
    if (!this.initCtx() || !this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.14);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, now);

      const vol = Math.min(0.35, 0.12 * intensity);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // ignore
    }
  }

  /**
   * Plays a dramatic crash impact sound
   */
  public playCrash(): void {
    if (!this.initCtx() || !this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      // White noise buffer for crash texture
      const bufferSize = this.ctx.sampleRate * 0.4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.35);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.4);
    } catch {
      // ignore
    }
  }

  /**
   * Plays a celebratory stunt arpeggio (for backflips/frontflips)
   */
  public playStunt(): void {
    if (!this.initCtx() || !this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const start = now + idx * 0.05;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(start);
        osc.stop(start + 0.18);
      });
    } catch {
      // ignore
    }
  }

  /**
   * UI Click tone
   */
  public playClick(): void {
    if (!this.initCtx() || !this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // ignore
    }
  }
}

export const soundManager = new SoundManager();
