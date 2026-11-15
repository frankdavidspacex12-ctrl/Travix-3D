// Sonido sintetizado con Web Audio: música ambiental generativa y efectos cortos.
// No usa archivos de audio, así que funciona sin internet y no requiere licencias.
// Arranca apagado: los navegadores solo permiten sonido después de que la persona toca algo,
// y la preferencia se recuerda en este navegador.

const STORAGE_KEY = 'travix-sound';
const MUSIC_LEVEL = 0.8; // volumen normal de la música (baja durante los viajes)

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

  /**
   * Viaje normal (~2,6 s): encendido con golpe grave, rugido de motores con vibración de
   * propulsores que sube de tono y viento de velocidad. La música baja mientras tanto.
   */
  travel(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.duckMusic(t, 2.8, 0.35);
    this.kick(t, 95, 38, 0.45, 0.45); // ignición
    this.engineRumble(t, 2.6, {
      baseFrom: 42,
      baseTo: 68,
      peak: 0.6,
      attack: 0.3,
      release: 0.9,
      tremoloFrom: 14,
      tremoloTo: 24,
      cutoffFrom: 520,
      cutoffTo: 1800,
    });
    this.noiseSweep(t + 0.15, 2.3, 300, 2600, 0.35); // viento de velocidad
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

  /**
   * Hipersalto del «Modo nave», sincronizado con WarpOverlay (3,2 s):
   * 0–0,5 s rugido que crece (sin silbido de carga) · 0,5 s estallido de arranque · 0,75–2,5 s rugido de
   * hipervelocidad que acelera · 2,5 s caída de tono al salir · 2,72 s golpe grave del destello.
   */
  warp(): void {
    const ctx = this.ready();
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime;
    this.duckMusic(t, 3.6, 0.2);

    // 1) Sin zumbido de carga: el sonido de selección (select) ya marca el inicio del salto.
    // 2) Estallido de arranque
    this.kick(t + 0.5, 120, 32, 0.7, 0.55);
    this.noiseSweep(t + 0.48, 0.5, 2500, 500, 0.3);

    // 3) Rugido de hipervelocidad: motores graves que aceleran y vibran cada vez más rápido
    this.engineRumble(t + 0.05, 2.7, {
      baseFrom: 38,
      baseTo: 120,
      peak: 0.75,
      attack: 0.7,
      release: 0.35,
      tremoloFrom: 10,
      tremoloTo: 38,
      cutoffFrom: 420,
      cutoffTo: 3600,
    });
    // Ráfaga de aire que sube durante el tránsito
    this.noiseSweep(t + 0.7, 1.9, 400, 7000, 0.5);
    // Dos tonos que suben como una turbina a máxima velocidad
    for (const [from, to, peak] of [
      [110, 660, 0.05],
      [165, 990, 0.035],
    ] as const) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(from, t + 0.75);
      osc.frequency.exponentialRampToValueAtTime(to, t + 2.45);
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(900, t + 0.75);
      lp.frequency.exponentialRampToValueAtTime(5000, t + 2.45);
      g.gain.setValueAtTime(0.0001, t + 0.75);
      g.gain.exponentialRampToValueAtTime(peak, t + 1.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      osc.connect(lp).connect(g).connect(this.sfxBus);
      osc.start(t + 0.75);
      osc.stop(t + 2.65);
    }

    // 4) Salida: caída de tono (efecto Doppler) y golpe grave en el destello
    this.noiseSweep(t + 2.4, 0.6, 5000, 300, 0.22);
    this.kick(t + 2.72, 90, 26, 1.3, 0.6);
    this.tone(73.42, t + 2.75, 2.2, 0.12, 'sine');
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
    // Limitador firme: los motores pueden sonar fuertes sin pasar del máximo (sin distorsión)
    limiter.threshold.value = -8;
    limiter.knee.value = 4;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.2;
    this.master.connect(limiter).connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(3.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.45;
    this.reverb.connect(wet).connect(this.master);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = MUSIC_LEVEL;
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

  /** Golpe grave (bombo) que cae de tono: ignición, arranque y salida del hipersalto. */
  private kick(at: number, fromHz: number, toHz: number, decay: number, peak: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(fromHz, at);
    osc.frequency.exponentialRampToValueAtTime(toHz, at + decay * 0.6);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    osc.connect(g).connect(this.sfxBus);
    osc.start(at);
    osc.stop(at + decay + 0.05);
  }

  /**
   * Rugido de motor: dos sierras graves desafinadas y una sub-octava cuadrada, con algo de
   * saturación, un filtro que se abre y un trémolo que acelera (la vibración de los propulsores),
   * más ruido grave tipo «retumbe».
   */
  private engineRumble(
    at: number,
    seconds: number,
    o: {
      baseFrom: number;
      baseTo: number;
      peak: number;
      attack: number;
      release: number;
      tremoloFrom: number;
      tremoloTo: number;
      cutoffFrom: number;
      cutoffTo: number;
    },
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const end = at + seconds;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 2.5;
    filter.frequency.setValueAtTime(o.cutoffFrom, at);
    filter.frequency.exponentialRampToValueAtTime(o.cutoffTo, end - o.release * 0.5);

    const drive = ctx.createWaveShaper();
    drive.curve = this.saturationCurve(2.2);

    // Trémolo: la ganancia oscila alrededor de 1 cada vez más rápido
    const tremolo = ctx.createGain();
    tremolo.gain.value = 1;
    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.frequency.setValueAtTime(o.tremoloFrom, at);
    lfo.frequency.exponentialRampToValueAtTime(o.tremoloTo, end);
    lfoDepth.gain.value = 0.35;
    lfo.connect(lfoDepth).connect(tremolo.gain);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(o.peak, at + o.attack);
    env.gain.setValueAtTime(o.peak, end - o.release);
    env.gain.exponentialRampToValueAtTime(0.0001, end);

    drive.connect(filter).connect(tremolo).connect(env).connect(this.sfxBus);

    const voices: Array<[OscillatorType, number, number]> = [
      ['sawtooth', 1, -9],
      ['sawtooth', 1, 9],
      ['square', 0.5, 0],
    ];
    const oscs: OscillatorNode[] = [lfo];
    for (const [type, ratio, detune] of voices) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.detune.value = detune;
      osc.frequency.setValueAtTime(o.baseFrom * ratio, at);
      osc.frequency.exponentialRampToValueAtTime(o.baseTo * ratio, end);
      g.gain.value = type === 'square' ? 0.45 : 0.32;
      osc.connect(g).connect(drive);
      oscs.push(osc);
    }

    // Retumbe: ruido filtrado muy grave
    const noise = ctx.createBufferSource();
    noise.buffer = this.makeNoise(seconds + 0.2);
    const noiseLp = ctx.createBiquadFilter();
    noiseLp.type = 'lowpass';
    noiseLp.frequency.value = 160;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 1.4;
    noise.connect(noiseLp).connect(noiseGain).connect(tremolo);

    for (const osc of oscs) {
      osc.start(at);
      osc.stop(end + 0.05);
    }
    noise.start(at);
    noise.stop(end + 0.05);
  }

  /** Baja la música durante un efecto fuerte y la recupera al terminar. */
  private duckMusic(at: number, seconds: number, level: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    const g = this.musicBus.gain;
    g.cancelScheduledValues(at);
    g.setValueAtTime(Math.max(g.value, 0.0001), at);
    g.linearRampToValueAtTime(level, at + 0.25);
    g.setValueAtTime(level, at + seconds - 0.8);
    g.linearRampToValueAtTime(MUSIC_LEVEL, at + seconds);
  }

  private saturationCurve(amount: number): Float32Array<ArrayBuffer> {
    const n = 1024;
    const curve = new Float32Array(new ArrayBuffer(n * 4));
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
    }
    return curve;
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
