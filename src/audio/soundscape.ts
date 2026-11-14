// Sonido sintetizado con Web Audio: música ambiental generativa y efectos cortos.
// No usa archivos de audio, así que funciona sin internet y no requiere licencias.
// Arranca apagado: los navegadores solo permiten sonido después de que la persona toca algo,
// y la preferencia se recuerda en este navegador.

const STORAGE_KEY = 'travix-sound';

// Pentatónica menor de Re: suena «espacial» y nunca desafina entre notas.
const PAD_CHORD_HZ = [73.42, 110.0, 146.83, 174.61, 220.0]; // D2 A2 D3 F3 A3
const BELL_SCALE_HZ = [587.33, 698.46, 783.99, 880.0, 1046.5, 1174.66, 1396.91]; // D5 F5 G5 A5 C6 D6 F6

type Listener = (enabled: boolean) => void;

class Soundscape {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private musicNodes: AudioNode[] = [];
  private bellTimer: number | null = null;
  private enabled = false;
  private listeners = new Set<Listener>();

  constructor() {
    try {
      this.enabled = window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      this.enabled = false;
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) void this.ctx.suspend();
        else if (this.enabled) void this.ctx.resume();
      });
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Debe llamarse desde un gesto (clic/toque) para que el navegador permita el audio. */
  setEnabled(on: boolean): void {
    this.enabled = on;
    try {
      window.localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
    } catch {
      // sin almacenamiento: solo no se recuerda la preferencia
    }
    if (on) {
      if (!this.ensureContext()) {
        this.enabled = false;
      } else {
        void this.ctx!.resume();
        this.fadeMaster(0.9, 0.6);
        this.startMusic();
        this.chime();
      }
    } else if (this.ctx) {
      this.fadeMaster(0, 0.4);
      window.setTimeout(() => {
        if (!this.enabled) {
          this.stopMusic();
          void this.ctx?.suspend();
        }
      }, 450);
    }
    this.listeners.forEach((fn) => fn(this.enabled));
  }

  /**
   * Si la persona dejó el sonido activado en una visita anterior, se reanuda en su primer gesto
   * (los navegadores bloquean el audio antes de eso).
   */
  resumeOnFirstGesture(): void {
    if (!this.enabled) return;
    const start = () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
      if (this.enabled && !this.ctx) this.setEnabled(true);
    };
    window.addEventListener('pointerdown', start, { once: true });
    window.addEventListener('keydown', start, { once: true });
  }

  // ---------------------------------------------------------------- efectos

  /** Dos notas suaves: al seleccionar un planeta, luna o misión. */
  select(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.tone(659.25, t, 0.5, 0.16, 'sine');
    this.tone(987.77, t + 0.09, 0.7, 0.12, 'sine');
  }

  /** Brillo corto al aparecer un objeto (ficha, misión en superficie). */
  appear(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    [1174.66, 1396.91, 1760.0].forEach((f, i) => this.tone(f, t + i * 0.06, 0.9, 0.06, 'triangle'));
  }

  /** Viento suave mientras la cámara viaja hacia un destino. */
  travel(): void {
    const ctx = this.ready();
    if (!ctx) return;
    this.noiseSweep(ctx.currentTime, 1.6, 250, 1800, 0.12);
  }

  /** Tono grave y cálido al llegar al destino. */
  arrive(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.tone(146.83, t, 1.6, 0.14, 'sine');
    this.tone(220.0, t + 0.05, 1.4, 0.08, 'sine');
    this.tone(880.0, t + 0.12, 1.1, 0.03, 'triangle');
  }

  /** Hipersalto del «Modo nave»: subida de ruido y tono, y un golpe suave al salir. */
  warp(): void {
    const ctx = this.ready();
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime;
    this.noiseSweep(t, 2.4, 120, 6000, 0.22);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 2.2);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(400, t);
    lp.frequency.exponentialRampToValueAtTime(4000, t + 2.2);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 1.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
    osc.connect(lp).connect(g).connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 2.6);
    this.tone(73.42, t + 2.3, 1.8, 0.2, 'sine');
  }

  /** Confirmación al activar el sonido. */
  private chime(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + 0.05;
    [587.33, 880.0, 1174.66].forEach((f, i) => this.tone(f, t + i * 0.1, 1.2, 0.08, 'sine'));
  }

  // ---------------------------------------------------------------- música

  private startMusic(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus || this.musicNodes.length) return;

    // Colchón: osciladores levemente desafinados a través de un filtro que «respira» muy lento
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    filter.Q.value = 0.7;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.035;
    lfoGain.gain.value = 380;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    const padGain = ctx.createGain();
    padGain.gain.value = 0.0001;
    padGain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 6);
    filter.connect(padGain).connect(this.musicBus);
    this.musicNodes.push(filter, lfo, lfoGain, padGain);

    PAD_CHORD_HZ.forEach((hz, i) => {
      for (const detune of [-6, 6]) {
        const osc = ctx.createOscillator();
        osc.type = i < 2 ? 'sine' : 'triangle';
        osc.frequency.value = hz;
        osc.detune.value = detune;
        const g = ctx.createGain();
        g.gain.value = i < 2 ? 0.5 : 0.22;
        // Cada voz sube y baja a su propio ritmo para que el acorde nunca suene igual
        const swell = ctx.createOscillator();
        const swellGain = ctx.createGain();
        swell.frequency.value = 0.02 + i * 0.011;
        swellGain.gain.value = g.gain.value * 0.6;
        swell.connect(swellGain).connect(g.gain);
        osc.connect(g).connect(filter);
        osc.start();
        swell.start();
        this.musicNodes.push(osc, g, swell, swellGain);
      }
    });

    this.scheduleBell();
  }

  /** Campanas suaves y aleatorias, como estrellas que titilan. */
  private scheduleBell(): void {
    if (!this.enabled) return;
    const wait = 3500 + Math.random() * 6000;
    this.bellTimer = window.setTimeout(() => {
      const ctx = this.ctx;
      if (ctx && this.enabled && this.musicBus && ctx.state === 'running') {
        const hz = BELL_SCALE_HZ[Math.floor(Math.random() * BELL_SCALE_HZ.length)];
        this.tone(hz, ctx.currentTime, 3.5, 0.035, 'sine', this.musicBus);
        if (Math.random() < 0.4) {
          const hz2 = BELL_SCALE_HZ[Math.floor(Math.random() * BELL_SCALE_HZ.length)];
          this.tone(hz2, ctx.currentTime + 0.35, 3.0, 0.025, 'sine', this.musicBus);
        }
      }
      this.scheduleBell();
    }, wait);
  }

  private stopMusic(): void {
    if (this.bellTimer !== null) {
      window.clearTimeout(this.bellTimer);
      this.bellTimer = null;
    }
    for (const node of this.musicNodes) {
      try {
        if (node instanceof OscillatorNode) node.stop();
        node.disconnect();
      } catch {
        // ya estaba detenido
      }
    }
    this.musicNodes = [];
  }

  // ---------------------------------------------------------------- utilidades

  private ensureContext(): boolean {
    if (this.ctx) return true;
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.0001;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.ratio.value = 6;
    this.master.connect(limiter).connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(3.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.45;
    this.reverb.connect(wet).connect(this.master);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.8;
    this.musicBus.connect(this.master);
    this.musicBus.connect(this.reverb);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 1;
    this.sfxBus.connect(this.master);
    this.sfxBus.connect(this.reverb);
    return true;
  }

  /** Devuelve el contexto solo si el sonido está activo y corriendo. */
  private ready(): AudioContext | null {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return null;
    return this.ctx;
  }

  private fadeMaster(to: number, seconds: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const g = this.master.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(Math.max(g.value, 0.0001), ctx.currentTime);
    g.exponentialRampToValueAtTime(Math.max(to, 0.0001), ctx.currentTime + seconds);
  }

  private tone(
    hz: number,
    at: number,
    decay: number,
    peak: number,
    type: OscillatorType,
    bus: GainNode | null = this.sfxBus,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !bus) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = hz;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    osc.connect(g).connect(bus);
    osc.start(at);
    osc.stop(at + decay + 0.05);
  }

  private noiseSweep(at: number, seconds: number, fromHz: number, toHz: number, peak: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const src = ctx.createBufferSource();
    src.buffer = this.makeNoise(seconds + 0.2);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(fromHz, at);
    bp.frequency.exponentialRampToValueAtTime(toHz, at + seconds * 0.7);
    bp.frequency.exponentialRampToValueAtTime(fromHz * 1.5, at + seconds);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + seconds * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
    src.connect(bp).connect(g).connect(this.sfxBus);
    src.start(at);
    src.stop(at + seconds + 0.1);
  }

  private makeNoise(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  /** Reverberación generada (ruido que se desvanece), sin archivos externos. */
  private makeImpulse(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.ceil(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return buf;
  }
}

export const soundscape = new Soundscape();
