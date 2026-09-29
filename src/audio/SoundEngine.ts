/**
 * Phase 3 — Thin semantic SoundEngine.
 * Game emits event IDs; engine maps to families, buses, momentum-aware synthesis.
 * Procedural only (no sample library yet). Aesthetic constrained by soundLanguage.ts.
 */

import { SOUND_LANGUAGE, type SoundBusId } from './soundLanguage';
import { SOUND_MANIFEST, type PlayContext, type SoundEventId } from './soundManifest';

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function vary(base: number, cents: number): number {
  const detune = 1 + ((Math.random() * 2 - 1) * cents) / 1200;
  return base * detune;
}

export class SoundEngine {
  ctx: AudioContext | null = null;

  private buses: Partial<Record<SoundBusId, GainNode>> = {};
  private master: GainNode | null = null;

  /** Continuous fluency 0–1 — drives richness, not primarily loudness. */
  private momentum = 0;

  private droneNodes: OscillatorNode[] = [];
  private droneGain: GainNode | null = null;
  private droneLfo: OscillatorNode | null = null;
  private bedStarted = false;

  private pulseTimer = 0;
  private pressureTimer = 0;

  private muted = false;

  // ── Lifecycle ────────────────────────────────────────────────────────────

  init(): void {
    try {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
        return;
      }
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.buildGraph();
      this.startBed();
    } catch (e) {
      console.warn('[SoundEngine] init failed', e);
    }
  }

  private buildGraph(): void {
    if (!this.ctx) return;
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);

    const levels: Record<SoundBusId, number> = {
      master: 1,
      ambience: 0.85,
      interaction: 0.75,
      gameplay: 0.8,
      musical: 0.55,
      transition: 0.7,
    };

    (Object.keys(levels) as SoundBusId[]).forEach((id) => {
      if (id === 'master') return;
      const g = this.ctx!.createGain();
      g.gain.value = levels[id];
      g.connect(this.master!);
      this.buses[id] = g;
    });
  }

  private bus(id: SoundBusId): AudioNode {
    if (id === 'master' || !this.buses[id]) return this.master || this.ctx!.destination;
    return this.buses[id]!;
  }

  // ── Public semantic API ──────────────────────────────────────────────────

  play(eventId: SoundEventId, context: PlayContext = {}): void {
    if (!this.ctx || this.muted) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});

    const def = SOUND_MANIFEST[eventId];
    if (!def) return;

    const m = context.momentum ?? this.momentum;

    switch (eventId) {
      case 'world.enter':
        this.synthEnter();
        break;
      case 'contact.select':
      case 'motion.depart':
        this.synthDepart();
        break;
      case 'math.resolve':
        this.synthResolve(false, m);
        break;
      case 'math.resolve.fluent':
        this.synthResolve(true, m);
        break;
      case 'math.nonresolve':
        this.synthNonResolve(m);
        break;
      case 'progress.level_clear':
        this.synthProgress(m);
        break;
      case 'state.death':
        this.synthDeath(context.deathType === 'timer');
        break;
      case 'momentum.pulse':
        this.synthPulse(m);
        break;
      case 'pressure.tick':
        this.synthPressure();
        break;
      case 'ambience.bed':
        this.startBed();
        break;
      default:
        break;
    }
  }

  setMomentum(value: number): void {
    this.momentum = clamp01(value);
  }

  getMomentum(): number {
    return this.momentum;
  }

  /**
   * Update continuous momentum from gameplay signals.
   * correct: soft rise; wrong: graceful decay; idle: slow fade.
   */
  notifyCorrect(opts: { timeLeftRatio: number }): void {
    const speed = clamp01(opts.timeLeftRatio);
    this.momentum = clamp01(this.momentum + 0.07 + 0.12 * speed);
  }

  notifyWrong(): void {
    this.momentum = clamp01(this.momentum * 0.72);
  }

  notifyIdle(dt: number): void {
    this.momentum = clamp01(this.momentum * Math.pow(0.97, dt));
  }

  /** Per-frame layers. Pressure follows the wave warning band, not the turn clock. */
  update(dt: number, opts: { waveWarning: boolean }): void {
    if (!this.ctx || this.muted) return;

    if (this.momentum >= 0.55) {
      this.pulseTimer -= dt;
      if (this.pulseTimer <= 0) {
        this.pulseTimer = 0.85 - this.momentum * 0.25;
        this.play('momentum.pulse', { momentum: this.momentum });
      }
    } else {
      this.pulseTimer = 0;
    }

    if (opts.waveWarning) {
      this.pressureTimer -= dt;
      if (this.pressureTimer <= 0) {
        this.pressureTimer = 0.9;
        this.play('pressure.tick', { momentum: this.momentum });
      }
    } else {
      this.pressureTimer = 0;
    }

    if (!opts.waveWarning) {
      this.notifyIdle(dt * 0.15);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.05);
    }
  }

  stopAll(): void {
    this.stopBed();
    this.momentum = 0;
  }

  // ── Ambience bed ─────────────────────────────────────────────────────────

  private startBed(): void {
    if (!this.ctx || this.bedStarted) return;
    try {
      this.stopBed();
      const t = this.ctx.currentTime;
      const g = this.ctx.createGain();
      g.gain.value = SOUND_LANGUAGE.intensity.ambienceCeiling * 0.5;
      g.connect(this.bus('ambience'));
      this.droneGain = g;

      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoG = this.ctx.createGain();
      lfoG.gain.value = 0.35;
      lfo.connect(lfoG);
      lfoG.connect(g.gain);
      lfo.start(t);
      this.droneLfo = lfo;

      // Warm low pair — language-locked register
      const freqs = [SOUND_LANGUAGE.pitchHz.D3 / 2, SOUND_LANGUAGE.pitchHz.A3 / 4];
      freqs.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;
        const og = this.ctx!.createGain();
        og.gain.value = i === 0 ? 0.55 : 0.35;
        osc.connect(og);
        og.connect(g);
        osc.start(t);
        this.droneNodes.push(osc);
      });

      this.bedStarted = true;
    } catch {
      /* ignore */
    }
  }

  private stopBed(): void {
    try {
      this.droneNodes.forEach((o) => {
        try {
          o.stop();
          o.disconnect();
        } catch {
          /* */
        }
      });
      this.droneNodes = [];
      if (this.droneLfo) {
        try {
          this.droneLfo.stop();
          this.droneLfo.disconnect();
        } catch {
          /* */
        }
        this.droneLfo = null;
      }
      this.droneGain = null;
      this.bedStarted = false;
    } catch {
      /* */
    }
  }

  // ── Synthesis voices (Phase 4 prototype set, inline) ─────────────────────

  private envGain(
    peak: number,
    attack: number,
    release: number,
    dest: AudioNode,
    t: number
  ): GainNode {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
    g.connect(dest);
    return g;
  }

  private synthEnter(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const f = vary(SOUND_LANGUAGE.pitchHz.D3, SOUND_LANGUAGE.variation.pitchCents);
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f * 0.5, t);
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.4);
    const g = this.envGain(0.12, 0.08, 0.55, this.bus('transition'), t);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.7);
  }

  /** Soft wood-like depart — replaces rising arcade whoop. */
  private synthDepart(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const f0 = vary(SOUND_LANGUAGE.pitchHz.A3 * 0.5, SOUND_LANGUAGE.variation.pitchCents);
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f0 * 1.35, t + 0.12);
    const g = this.envGain(0.18, 0.01, 0.14, this.bus('interaction'), t);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    osc.connect(lp);
    lp.connect(g);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  /** Harmonic resolve — richer with momentum / fluent flag. */
  private synthResolve(fluent: boolean, momentum: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const richness = clamp01((fluent ? 0.55 : 0.25) + momentum * 0.45);
    const base = vary(SOUND_LANGUAGE.pitchHz.D4, SOUND_LANGUAGE.variation.pitchCents);

    // Body thump (arrival)
    const body = this.ctx.createOscillator();
    body.type = 'sine';
    body.frequency.setValueAtTime(base * 0.25, t);
    body.frequency.exponentialRampToValueAtTime(base * 0.12, t + 0.1);
    const bg = this.envGain(0.22 + richness * 0.08, 0.008, 0.12, this.bus('gameplay'), t);
    body.connect(bg);
    body.start(t);
    body.stop(t + 0.15);

    // Resolve partials from locked collection
    const partials = [SOUND_LANGUAGE.pitchHz.D4, SOUND_LANGUAGE.pitchHz.A3, SOUND_LANGUAGE.pitchHz.F4];
    const count = richness > 0.7 ? 3 : richness > 0.4 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = vary(partials[i], SOUND_LANGUAGE.variation.pitchCents);
      const peak = (0.07 + richness * 0.05) * (1 - i * 0.2);
      const g = this.envGain(peak, 0.02 + i * 0.03, 0.28 + richness * 0.2, this.bus('gameplay'), t + i * 0.03);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1400 + richness * 400;
      osc.connect(lp);
      lp.connect(g);
      osc.start(t + i * 0.03);
      osc.stop(t + 0.55 + richness * 0.2);
    }
  }

  /** Incomplete / damped — not a buzzer. */
  private synthNonResolve(momentum: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const f = vary(SOUND_LANGUAGE.pitchHz.G3, SOUND_LANGUAGE.variation.pitchCents);
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, t);
    osc.frequency.exponentialRampToValueAtTime(f * 0.72, t + 0.2);
    const peak = 0.12 * (0.6 + momentum * 0.2);
    const g = this.envGain(peak, 0.01, 0.22, this.bus('gameplay'), t);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 480;
    osc.connect(lp);
    lp.connect(g);
    osc.start(t);
    osc.stop(t + 0.28);
  }

  private synthProgress(momentum: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [
      SOUND_LANGUAGE.pitchHz.D3,
      SOUND_LANGUAGE.pitchHz.A3,
      SOUND_LANGUAGE.pitchHz.D4,
      SOUND_LANGUAGE.pitchHz.F4,
    ];
    notes.forEach((hz, i) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = vary(hz, 8);
      const g = this.envGain(0.08 + momentum * 0.04, 0.04, 0.45, this.bus('transition'), t + i * 0.09);
      osc.connect(g);
      osc.start(t + i * 0.09);
      osc.stop(t + i * 0.09 + 0.55);
    });
  }

  private synthDeath(quiet: boolean): void {
    if (!this.ctx) return;
    this.stopBed();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    const start = quiet ? SOUND_LANGUAGE.pitchHz.F3 : SOUND_LANGUAGE.pitchHz.A3;
    const end = SOUND_LANGUAGE.pitchHz.D3 / 2;
    const dur = quiet ? 0.35 : 0.65;
    osc.frequency.setValueAtTime(start, t);
    osc.frequency.exponentialRampToValueAtTime(end, t + dur * 0.85);
    const g = this.envGain(quiet ? 0.1 : 0.2, 0.02, dur * 0.85, this.bus('transition'), t);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = quiet ? 400 : 600;
    osc.connect(lp);
    lp.connect(g);
    osc.start(t);
    osc.stop(t + dur);
  }

  private synthPulse(momentum: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(70, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    const g = this.envGain(0.08 + momentum * 0.06, 0.01, 0.18, this.bus('musical'), t);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  private synthPressure(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = vary(SOUND_LANGUAGE.pitchHz.G3, 10);
    const g = this.envGain(0.06, 0.005, 0.06, this.bus('musical'), t);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = SOUND_LANGUAGE.register.pressureMaxHz;
    osc.connect(lp);
    lp.connect(g);
    osc.start(t);
    osc.stop(t + 0.08);
  }
}
