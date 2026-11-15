import { isMemoryConstrained } from '../three/deviceProfile';
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
  private reverb: AudioNode | null = null;
  private musicNodes: AudioNode[] = [];
  private bellTimer: number | null = null;
  private layers: { trip: GainNode | null; descent: GainNode | null } = { trip: null, descent: null };
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
    // En pantallas táctiles el permiso de audio llega al levantar el dedo (pointerup/touchend/click),
    // no al tocar (pointerdown): si se creaba el audio en pointerdown quedaba bloqueado («suspended»)
    // y no se reintentaba, así que había que apagar y encender el sonido. Ahora se reintenta en cada
    // gesto hasta que el audio esté realmente sonando.
    const events = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;
    const stop = () => events.forEach((ev) => window.removeEventListener(ev, start, true));
    const start = () => {
      if (!this.enabled) {
        stop();
        return;
      }
      if (!this.ctx) {
        this.setEnabled(true);
      } else if (this.ctx.state !== 'running') {
        void this.ctx.resume();
      }
      if (this.ctx?.state === 'running') stop();
      else
        void this.ctx?.resume().then(() => {
          if (this.ctx?.state === 'running') stop();
        });
    };
    events.forEach((ev) => window.addEventListener(ev, start, { capture: true, passive: true }));
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
    this.inLayer('trip', () => this.travelNow());
  }

  private travelNow(): void {
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
    this.inLayer('trip', () => this.warpNow());
  }

  private warpNow(): void {
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

  // ---------------------------------------------------------------- capas (viaje / descenso)

  /**
   * Programa unos efectos en su propia capa (un GainNode hacia sfxBus), para poder apagarlos de
   * golpe: el viaje de la nave se corta cuando empieza la animación de descenso.
   */
  private inLayer(kind: 'trip' | 'descent', fn: () => void): void {
    const ctx = this.ctx;
    const bus = this.sfxBus;
    if (!ctx || !bus) return;
    this.fadeOutLayer(kind, 0.15);
    const layer = ctx.createGain();
    layer.connect(bus);
    this.layers[kind] = layer;
    this.sfxBus = layer;
    try {
      fn();
    } finally {
      this.sfxBus = bus;
    }
  }

  private fadeOutLayer(kind: 'trip' | 'descent', seconds: number): void {
    const ctx = this.ctx;
    const layer = this.layers[kind];
    if (!ctx || !layer) return;
    this.layers[kind] = null;
    const t = ctx.currentTime;
    layer.gain.cancelScheduledValues(t);
    layer.gain.setValueAtTime(layer.gain.value, t);
    layer.gain.linearRampToValueAtTime(0, t + seconds);
    window.setTimeout(() => layer.disconnect(), (seconds + 0.1) * 1000);
  }

  /** Corta el sonido del descenso (la animación se saltó o se cerró). */
  stopDescent(): void {
    this.fadeOutLayer('descent', 0.3);
  }

  /**
   * Sonido de la animación «Así aterrizó», sincronizado con sus fases (DescentOverlay: la fase
   * u = 0..1 dura 4,3 s). Corta primero el sonido del viaje de la nave. En la Luna, el cometa y
   * Eros no hay aire que lleve el sonido: solo se oye, apagado, lo que vibra a través de la nave
   * (motores y golpes), sin viento ni paracaídas.
   */
  descent(method: string, world: string): void {
    this.fadeOutLayer('trip', 0.4);
    this.inLayer('descent', () => this.descentNow(method, world));
  }

  private descentNow(method: string, world: string): void {
    const ctx = this.ready();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const T = (u: number) => t0 + u * 4.3; // misma escala de tiempo que la animación
    this.duckMusic(t0, 5.2, 0.2);

    // Entrada atmosférica: rugido del plasma contra el escudo térmico
    const entry = (from: number, to: number) => {
      this.noiseBand(T(from), T(to) - T(from), 'lowpass', 300, 1500, 0.8, 0.5, 0.2, 0.35);
      this.engineRumble(T(from), T(to) - T(from), {
        baseFrom: 32, baseTo: 40, peak: 0.35, attack: 0.25, release: 0.3,
        tremoloFrom: 9, tremoloTo: 14, cutoffFrom: 260, cutoffTo: 520,
      });
    };
    // Paracaídas: chasquido al abrirse y aleteo de la tela con viento
    const chute = (open: number, until: number) => {
      this.noiseBand(T(open), 0.22, 'bandpass', 1900, 600, 0.9, 0.7, 0.004, 0.18);
      this.kick(T(open), 150, 60, 0.3, 0.4);
      // Aleteo de la tela + viento de fondo mientras cuelga del paracaídas
      this.noiseBand(T(open) + 0.1, T(until) - T(open), 'bandpass', 520, 360, 0.7, 2.0, 0.3, 0.4, 9, 0.6);
      this.noiseBand(T(open) + 0.05, T(until) - T(open) + 0.2, 'lowpass', 900, 500, 0.6, 0.6, 0.4, 0.5);
    };
    const rockets = (from: number, to: number, muffled: boolean, strong = false) => {
      this.engineRumble(T(from), T(to) - T(from), {
        baseFrom: strong ? 44 : 52, baseTo: strong ? 58 : 66,
        peak: muffled ? (strong ? 0.42 : 0.3) : 0.48, attack: 0.2, release: 0.25,
        tremoloFrom: 20, tremoloTo: 28,
        cutoffFrom: muffled ? 260 : 650, cutoffTo: muffled ? 420 : 1300,
      });
    };
    const thud = (u: number, amount: number, muffled = false) => {
      this.kick(T(u), 80, 30, 0.55, 0.55 * amount);
      this.noiseBand(T(u), 0.3, 'lowpass', muffled ? 260 : 600, 120, 0.7, 0.4 * amount, 0.004, 0.25);
    };

    switch (method) {
      case 'skycrane':
        entry(0, 0.3);
        chute(0.3, 0.55);
        rockets(0.55, 0.86, false);
        this.tone(2400, T(0.86), 0.08, 0.05, 'square'); // corte de los cables
        thud(0.84, 0.6);
        this.noiseBand(T(0.86), T(1) - T(0.86), 'lowpass', 900, 300, 0.7, 0.25, 0.05, 0.5); // la grúa se aleja
        break;
      case 'airbags':
        entry(0, 0.28);
        chute(0.26, 0.5);
        rockets(0.47, 0.55, false); // retrocohetes antes de soltar las bolsas
        [
          [0.59, 1],
          [0.69, 0.6],
          [0.795, 0.35],
          [0.9, 0.18],
        ].forEach(([u, a]) => this.kick(T(u), 95, 38, 0.45, 0.85 * a)); // rebotes de las bolsas
        break;
      case 'retro_mars':
        entry(0, 0.3);
        chute(0.3, 0.55);
        rockets(0.55, 0.88, false);
        thud(0.88, 0.8);
        break;
      case 'apollo':
        rockets(0, 0.86, true);
        thud(0.86, 0.8, true);
        break;
      case 'retro_moon':
        rockets(0, 0.55, true, true);
        rockets(0.55, 0.86, true);
        thud(0.86, 0.7, true);
        break;
      case 'titan':
        entry(0.03, 0.18);
        chute(0.16, 0.98);
        this.noiseBand(T(0.2), T(0.98) - T(0.2), 'bandpass', 260, 420, 0.6, 1.1, 0.6, 0.6); // viento
        thud(0.98, 0.4);
        break;
      case 'venus':
        entry(0.06, 0.2);
        chute(0.18, 0.45);
        this.tone(1800, T(0.45), 0.06, 0.04, 'square'); // suelta el paracaídas
        this.noiseBand(T(0.45), T(0.98) - T(0.45), 'bandpass', 220, 520, 0.6, 0.9, 0.3, 0.4); // aire denso
        thud(0.98, 0.6);
        break;
      case 'comet':
        thud(0.45, 0.5, true);
        thud(0.75, 0.35, true);
        thud(0.9, 0.2, true);
        break;
      case 'asteroid':
        // Pequeños empujes de los propulsores (mismos instantes que la animación)
        for (let k = 0; k < 4; k++) {
          const at = 0.05 + k * 1.047;
          if (at > 3.8) break;
          this.noiseBand(t0 + at, 0.4, 'lowpass', 420, 260, 0.7, 0.18, 0.03, 0.2);
        }
        thud(0.9, 0.3, true);
        break;
    }
  }

  /** Ruido filtrado con envolvente y trémolo opcional: viento, plasma, aleteo, golpes. */
  private noiseBand(
    at: number,
    seconds: number,
    type: BiquadFilterType,
    fromHz: number,
    toHz: number,
    q: number,
    peak: number,
    attack: number,
    release: number,
    tremoloHz = 0,
    tremoloDepth = 0,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus || seconds <= 0) return;
    const end = at + seconds;
    const src = ctx.createBufferSource();
    src.buffer = this.makeNoise(seconds + 0.2);
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(fromHz, at);
    f.frequency.exponentialRampToValueAtTime(toHz, end);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(peak, at + Math.min(attack, seconds * 0.5));
    env.gain.setValueAtTime(peak, Math.max(at + Math.min(attack, seconds * 0.5), end - release));
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    let out: AudioNode = src.connect(f);
    if (tremoloHz > 0) {
      const trem = ctx.createGain();
      trem.gain.value = 1 - tremoloDepth / 2;
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = tremoloHz;
      depth.gain.value = tremoloDepth / 2;
      lfo.connect(depth).connect(trem.gain);
      lfo.start(at);
      lfo.stop(end + 0.05);
      out = out.connect(trem);
    }
    out.connect(env).connect(this.sfxBus);
    src.start(at);
    src.stop(end + 0.1);
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
    // Phones: a bigger audio buffer ('playback') so the sound does not crackle when the phone is
    // busy building a 3D scene; a little more latency does not matter for music and effects.
    const phone = isMemoryConstrained();
    let ctx: AudioContext;
    try {
      ctx = phone ? new Ctor({ latencyHint: 'playback' }) : new Ctor();
    } catch {
      ctx = new Ctor();
    }
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

    const wet = ctx.createGain();
    if (phone) {
      // The convolution reverb is the heaviest node: on phones a light echo (delay with feedback)
      // gives a similar sense of space at a fraction of the cost
      const input = ctx.createGain();
      const delay = ctx.createDelay(1);
      delay.delayTime.value = 0.23;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.42;
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 2200;
      input.connect(delay);
      delay.connect(tone).connect(feedback).connect(delay);
      tone.connect(wet);
      wet.gain.value = 0.35;
      this.reverb = input;
    } else {
      const conv = ctx.createConvolver();
      conv.buffer = this.makeImpulse(3.2);
      conv.connect(wet);
      wet.gain.value = 0.45;
      this.reverb = conv;
    }
    wet.connect(this.master);

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

