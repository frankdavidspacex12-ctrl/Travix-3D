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

  /**
   * Rugido potente de los motores al viajar de un lugar a otro:
   * Ignición de propulsores de plasma, vibración mecánica sostenida y aceleración sónica.
   */
  travel(): void {
    const ctx = this.ready();
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime;

    // Atenuación suave de la música ambiental para priorizar los motores
    this.duckMusic(0.28, 2.0, 0.6);

    // 1. Ignición y empuje inicial subgrave
    this.subBassThump(t, 90, 44, 0.45, 0.48);

    // 2. Rugido mecánico y vibración de los motores (cuerpo grave)
    this.engineRumble(t, 2.2, 54, 0.42, 14);

    // 3. Toberas de escape de plasma: siseo dinámico de aceleración
    this.filteredNoise(t, 2.1, 240, 2200, 0.36, 'bandpass', 1.2);
    this.filteredNoise(t + 0.1, 1.8, 120, 480, 0.32, 'lowpass', 1.0);

    // 4. Turbina de propulsión ascendente
    const turbine = ctx.createOscillator();
    const turbineGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    turbine.type = 'sawtooth';
    turbine.frequency.setValueAtTime(95, t);
    turbine.frequency.exponentialRampToValueAtTime(320, t + 0.9);
    turbine.frequency.exponentialRampToValueAtTime(110, t + 2.1);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, t);
    filter.frequency.exponentialRampToValueAtTime(1800, t + 0.9);
    filter.frequency.exponentialRampToValueAtTime(260, t + 2.1);

    turbineGain.gain.setValueAtTime(0.0001, t);
    turbineGain.gain.exponentialRampToValueAtTime(0.2, t + 0.35);
    turbineGain.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);

    turbine.connect(filter).connect(turbineGain).connect(this.sfxBus);
    turbine.start(t);
    turbine.stop(t + 2.15);
  }

  /**
   * Frenado orbital y retro-cohetes al alcanzar el destino:
   * Ráfaga de contra-empuje de gas/plasma y acordes armónicos de llegada.
   */
  arrive(): void {
    const ctx = this.ready();
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime;

    // Descarga de retro-cohetes de frenado
    this.subBassThump(t, 80, 36, 0.65, 0.38);
    this.filteredNoise(t, 0.75, 1200, 160, 0.24, 'bandpass', 1.2);

    // Armónicos cálidos de estabilización
    this.tone(146.83, t + 0.08, 1.8, 0.24, 'sine');
    this.tone(220.0, t + 0.15, 1.6, 0.18, 'sine');
    this.tone(440.0, t + 0.22, 1.4, 0.12, 'triangle');
    this.tone(880.0, t + 0.3, 1.2, 0.06, 'triangle');
  }

  /**
   * Hipersalto a hipervelocidad («Modo nave»):
   * 1. Carga energética de bobinas y turbinas en aceleración exponencial (0.0s - 0.75s).
   * 2. Ruptura de barrera espacial, impacto subsónico y rugido masivo en el túnel (0.75s - 2.5s).
   * 3. Desaceleración y tremendo estallido sónico al emerger frente al destino (2.72s).
   */
  warp(): void {
    const ctx = this.ready();
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime;

    // Atenuar música ambiental durante el hipersalto para dar máximo impacto al sonido
    this.duckMusic(0.12, 2.8, 0.8);

    // --- Fase 1: Carga e ignición del salto (0.0s a 0.75s) ---
    // Subida de partículas y vórtice
    this.filteredNoise(t, 0.85, 140, 3600, 0.35, 'bandpass', 1.6);
    this.subBassThump(t, 45, 95, 0.72, 0.36);

    // Turbinas del hiperpropulsor cargando energía a gran frecuencia
    const spool = ctx.createOscillator();
    const spoolGain = ctx.createGain();
    const spoolFilter = ctx.createBiquadFilter();

    spool.type = 'sawtooth';
    spool.frequency.setValueAtTime(60, t);
    spool.frequency.exponentialRampToValueAtTime(840, t + 0.75);
    spool.frequency.exponentialRampToValueAtTime(1150, t + 1.8);
    spool.frequency.exponentialRampToValueAtTime(120, t + 2.7);

    spoolFilter.type = 'lowpass';
    spoolFilter.Q.value = 3.5;
    spoolFilter.frequency.setValueAtTime(240, t);
    spoolFilter.frequency.exponentialRampToValueAtTime(4200, t + 0.75);
    spoolFilter.frequency.exponentialRampToValueAtTime(1100, t + 2.5);

    spoolGain.gain.setValueAtTime(0.0001, t);
    spoolGain.gain.exponentialRampToValueAtTime(0.26, t + 0.45);
    spoolGain.gain.exponentialRampToValueAtTime(0.2, t + 1.8);
    spoolGain.gain.exponentialRampToValueAtTime(0.0001, t + 2.72);

    spool.connect(spoolFilter).connect(spoolGain).connect(this.sfxBus);
    spool.start(t);
    spool.stop(t + 2.75);

    // --- Fase 2: Entrada a hipervelocidad y rugido sostenido (0.75s a 2.5s) ---
    // Impacto gravitatorio de entrada
    this.subBassThump(t + 0.72, 120, 38, 0.6, 0.55);

    // Rugido continuo con vibración pesada de motores en el túnel
    this.engineRumble(t + 0.75, 1.95, 50, 0.46, 16);

    // Flujo hiperespacial continuo (viento sónico de plasma)
    this.filteredNoise(t + 0.75, 1.8, 500, 5200, 0.42, 'bandpass', 1.8);
    this.filteredNoise(t + 0.75, 1.9, 140, 750, 0.38, 'lowpass', 1.2);

    // Dron armónico de hiperexpansión
    const drone = ctx.createOscillator();
    const droneGain = ctx.createGain();
    drone.type = 'triangle';
    drone.frequency.setValueAtTime(174.61, t + 0.75);
    drone.frequency.exponentialRampToValueAtTime(220.0, t + 1.6);
    drone.frequency.exponentialRampToValueAtTime(80.0, t + 2.65);

    droneGain.gain.setValueAtTime(0.0001, t + 0.75);
    droneGain.gain.exponentialRampToValueAtTime(0.24, t + 1.1);
    droneGain.gain.exponentialRampToValueAtTime(0.0001, t + 2.7);

    drone.connect(droneGain).connect(this.sfxBus);
    drone.start(t + 0.75);
    drone.stop(t + 2.72);

    // --- Fase 3: Estallido sónico de salida (Flash en 2.72s) ---
    // Tremendo estallido sónico al emerger al espacio normal frente al objetivo
    this.subBassThump(t + 2.72, 150, 26, 1.6, 0.68);

    // Onda de choque sónica y descarga
    this.filteredNoise(t + 2.72, 1.3, 2400, 180, 0.4, 'bandpass', 1.3);

    // Resonancia grave de asentamiento orbital
    this.tone(73.42, t + 2.85, 2.0, 0.32, 'sine');
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
    limiter.threshold.value = -8;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.18;
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

  /** Baja momentáneamente el volumen de la música ambiental para dar protagonismo a los motores / salto */
  private duckMusic(duckGain = 0.2, holdSeconds = 2.4, releaseSeconds = 0.8): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus || !this.enabled) return;
    const now = ctx.currentTime;
    const g = this.musicBus.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(g.value, 0.0001), now);
    g.exponentialRampToValueAtTime(Math.max(duckGain, 0.0001), now + 0.12);
    g.setValueAtTime(Math.max(duckGain, 0.0001), now + holdSeconds);
    g.exponentialRampToValueAtTime(0.8, now + holdSeconds + releaseSeconds);
  }

  /** Golpe subgrave de impacto o estallido sónico (boom / punch) */
  private subBassThump(
    at: number,
    fromHz: number,
    toHz: number,
    duration: number,
    peakGain: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(Math.max(10, fromHz), at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(10, toHz), at + duration * 0.7);

    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peakGain, at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    osc.connect(g).connect(this.sfxBus);
    osc.start(at);
    osc.stop(at + duration + 0.05);
  }

  /** Rugido de motor con modulación LFO para simular la vibración mecánica / propulsores */
  private engineRumble(
    at: number,
    duration: number,
    baseHz: number,
    peakGain: number,
    lfoRate = 15,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;

    // Cuerpo grave del motor
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseHz, at);
    osc.frequency.exponentialRampToValueAtTime(baseHz * 1.35, at + duration * 0.4);
    osc.frequency.exponentialRampToValueAtTime(baseHz * 0.85, at + duration);

    // Modulación que emula la vibración de las toberas de combustión
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(lfoRate, at);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(peakGain * 0.4, at);

    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0.0001, at);
    mainGain.gain.exponentialRampToValueAtTime(peakGain, at + 0.2);
    mainGain.gain.exponentialRampToValueAtTime(peakGain * 0.8, at + duration * 0.65);
    mainGain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    lfo.connect(lfoGain);
    lfoGain.connect(mainGain.gain);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, at);
    filter.frequency.exponentialRampToValueAtTime(480, at + duration * 0.4);
    filter.frequency.exponentialRampToValueAtTime(220, at + duration);

    osc.connect(filter).connect(mainGain).connect(this.sfxBus);
    osc.start(at);
    lfo.start(at);
    osc.stop(at + duration + 0.05);
    lfo.stop(at + duration + 0.05);
  }

  /** Ráfaga de ruido filtrado con envolvente personalizada */
  private filteredNoise(
    at: number,
    duration: number,
    fromHz: number,
    toHz: number,
    peak: number,
    filterType: BiquadFilterType = 'bandpass',
    q = 1.4,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const src = ctx.createBufferSource();
    src.buffer = this.makeNoise(duration + 0.15);
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(Math.max(20, fromHz), at);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, toHz), at + duration);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + duration * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    src.connect(filter).connect(g).connect(this.sfxBus);
    src.start(at);
    src.stop(at + duration + 0.05);
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
