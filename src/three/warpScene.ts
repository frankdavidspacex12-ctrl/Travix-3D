import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createGlowTexture, createShipRig, loadShipTemplate, ShipRig } from './shipModel';
import { createDetailedSaturnRingTexture, createUranusRingTexture } from './proceduralTextures';
import { precompilePmrem } from './pmremWarmup';

/**
 * Hyperspace / wormhole jump used by "Modo nave": radial light streaks, a flowing tunnel, the
 * Travix starship seen from behind and the destination ahead, which stays in view and grows as the
 * ship arrives. Runs on its own small renderer that only draws while a jump is playing.
 */

export interface WarpTarget {
  /** Surface texture of the destination (planet / moon); omitted for deep-space targets */
  texture?: string;
  /** Tint, and fallback colour while / if the texture can't load */
  color: string;
  /** Self-luminous destination (the Sun, nebulae, black holes...) */
  glow?: boolean;
  /**
   * Cuerpos que acompañan al destino (sus lunas principales). Tamaño relativo real respecto al
   * destino (con un mínimo para que se vean); la distancia se acerca para que quepan en la escena,
   * porque el hipersalto es una transición visual, no un viaje a escala.
   */
  companions?: WarpCompanion[];
  /** Anillos del destino (Saturno, Urano), en múltiplos de su radio, como en la vista 3D. */
  rings?: { inner: number; outer: number; opacity: number; saturn: boolean };
}

/** Anillo plano (en XZ) con UV radial: u = de dentro hacia fuera, igual que en la vista 3D. */
function createRingGeometry(inner: number, outer: number): THREE.RingGeometry {
  const geo = new THREE.RingGeometry(inner, outer, 128, 4);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i));
    uv.setXY(i, THREE.MathUtils.clamp((r - inner) / (outer - inner), 0, 1), 0.5);
  }
  uv.needsUpdate = true;
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/** Inclinación con la que se ven los anillos durante el salto (rad): de frente serían una línea. */
const RING_VIEW_TILT = 0.42;

export interface WarpCompanion {
  texture?: string;
  color: string;
  /** Radio relativo al del destino (1 = igual de grande) */
  size: number;
}

/** Ángulos (rad) donde se reparten los acompañantes alrededor del destino. */
const COMPANION_ANGLES = [2.5, 0.55, 3.6, -0.35];
const COMPANION_MAX = COMPANION_ANGLES.length;

const STREAK_PALETTE = [
  new THREE.Color(0xffffff),
  new THREE.Color(0xd6e4ff),
  new THREE.Color(0x9db8ff),
  new THREE.Color(0x7f8cff),
  new THREE.Color(0xffb067),
  new THREE.Color(0xff7a45),
];
const STREAK_NEAR_Z = 14;
const STREAK_FAR_Z = -170;
const SHIP_LENGTH = 4.8;
const TARGET_RADIUS = 5;
const TARGET_FAR = 165;
const TARGET_NEAR = 17;

export class WarpScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private disposables: Array<{ dispose: () => void }> = [];
  private disposed = false;
  /** Builds the environment map; null once built */
  private buildEnvironment: (() => void) | null = null;
  private warmUpWanted = false;
  private streaks: THREE.InstancedMesh;
  private streakData: Float32Array; // per streak: angle, radius, z, width
  private tunnelMat: THREE.ShaderMaterial;
  private ship = new THREE.Group();
  private rig: ShipRig | null = null;
  private coreGlow: THREE.Sprite;
  private glowTex: THREE.CanvasTexture;
  private target: THREE.Mesh;
  private targetMat: THREE.MeshStandardMaterial;
  private targetHalo: THREE.Sprite;
  private targetTexUrl = '';
  private companionGeo: THREE.SphereGeometry;
  private companionGroup = new THREE.Group();
  private companionMeshes: Array<{ mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; angle: number; orbit: number }> = [];
  private ringMesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshStandardMaterial> | null = null;
  private ringKey = '';
  /**
   * 1x1 white texture always bound as map / emissiveMap: swapping in the real planet texture is
   * then just a uniform change, never a new shader program mid-jump (white x colour = colour,
   * and the emissive colour is black whenever there is no glow).
   */
  private readonly placeholderTex: THREE.DataTexture;
  private textureLoader = new THREE.TextureLoader();
  /** Decodes off the main thread; flipped and unpremultiplied like a TextureLoader upload */
  private bitmapLoader = new THREE.ImageBitmapLoader().setOptions({
    imageOrientation: 'flipY',
    premultiplyAlpha: 'none',
  });
  /** Ring texture + material per ring type, reused across jumps */
  private readonly ringCache = new Map<'saturn' | 'uranus', { material: THREE.MeshStandardMaterial }>();
  private time = 0;
  private readonly count: number;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly pos = new THREE.Vector3();
  private readonly scl = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement, lowPower: boolean) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.25 : 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x000000, 1);
    // Reading every program's info log makes the CPU wait for the GPU compiler; skip it in
    // production builds (errors are still reported in development), as the main view does.
    this.renderer.debug.checkShaderErrors = !import.meta.env.PROD;

    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 400);
    this.camera.position.set(0, 2.6, 8.4);
    this.camera.lookAt(0, 0.2, -6);

    // Environment lighting: its shaders compile in parallel first, then the same fromScene() as
    // before builds it without waiting on the GPU driver (see pmremWarmup). If a jump needs it
    // sooner, it is built right away instead.
    this.scene.environmentIntensity = 0.4;
    const room = new RoomEnvironment();
    this.buildEnvironment = () => {
      this.buildEnvironment = null;
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const env = pmrem.fromScene(room, 0.04).texture;
      pmrem.dispose();
      this.scene.environment = env;
      this.disposables.push(env);
      if (this.warmUpWanted) this.warmUp();
    };
    void precompilePmrem(this.renderer, room)
      .catch(() => {})
      .then(() => {
        if (!this.disposed) this.buildEnvironment?.();
      });

    this.scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x0b0e16, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.9);
    key.position.set(2, 6, 4);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x7aa2ff, 1.6);
    rim.position.set(-3, 1, -8);
    this.scene.add(rim);

    this.glowTex = createGlowTexture();
    this.disposables.push(this.glowTex);

    // Wormhole tunnel: flowing bands converging on the vanishing point
    const tunnelGeo = new THREE.CylinderGeometry(16, 16, 340, 48, 1, true);
    tunnelGeo.rotateX(Math.PI / 2);
    this.tunnelMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uSpeed: { value: 0 }, uOpacity: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uSpeed;
        uniform float uOpacity;
        varying vec2 vUv;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        void main() {
          vec2 p = vec2(vUv.x * 24.0, vUv.y * 9.0 + uTime * uSpeed * 0.35);
          float n = noise(p) * 0.6 + noise(p * 2.3 + 7.0) * 0.4;
          float bands = smoothstep(0.55, 1.0, n);
          vec3 col = mix(vec3(0.12, 0.16, 0.55), vec3(0.45, 0.25, 0.85), noise(p * 0.5));
          float ends = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
          float a = bands * ends * uOpacity * 0.55;
          gl_FragColor = vec4(col * a, a);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const tunnel = new THREE.Mesh(tunnelGeo, this.tunnelMat);
    tunnel.position.z = -150;
    this.scene.add(tunnel);
    this.disposables.push(tunnelGeo, this.tunnelMat);

    // Bright convergence point far ahead (behind the destination)
    const coreMat = new THREE.SpriteMaterial({
      map: this.glowTex,
      color: 0xdfe7ff,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      toneMapped: false,
    });
    this.coreGlow = new THREE.Sprite(coreMat);
    this.coreGlow.position.set(0, 0.2, -175);
    this.coreGlow.scale.set(60, 60, 1);
    this.scene.add(this.coreGlow);
    this.disposables.push(coreMat);

    // Destination: stays in view at the end of the tunnel and grows on approach
    const targetGeo = new THREE.SphereGeometry(TARGET_RADIUS, 64, 48);
    this.placeholderTex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    this.placeholderTex.colorSpace = THREE.SRGBColorSpace;
    this.placeholderTex.needsUpdate = true;
    this.disposables.push(this.placeholderTex);
    this.targetMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0,
      map: this.placeholderTex,
      emissive: 0x000000,
      emissiveMap: this.placeholderTex,
    });
    this.target = new THREE.Mesh(targetGeo, this.targetMat);
    this.target.visible = false;
    this.scene.add(this.target);
    const haloMat = new THREE.SpriteMaterial({
      map: this.glowTex,
      color: 0xffffff,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      toneMapped: false,
    });
    this.targetHalo = new THREE.Sprite(haloMat);
    this.targetHalo.visible = false;
    this.scene.add(this.targetHalo);
    this.disposables.push(targetGeo, this.targetMat, haloMat);

    // Lunas que acompañan al destino: viajan junto a él (hijas de su grupo, no giran con su textura)
    this.companionGeo = new THREE.SphereGeometry(TARGET_RADIUS, 32, 24);
    this.disposables.push(this.companionGeo);
    this.scene.add(this.companionGroup);

    // Light streaks
    this.count = lowPower ? 420 : 760;
    const streakGeo = new THREE.BoxGeometry(1, 1, 1);
    const streakMat = new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    this.streaks = new THREE.InstancedMesh(streakGeo, streakMat, this.count);
    this.streaks.frustumCulled = false;
    this.streakData = new Float32Array(this.count * 4);
    const c = new THREE.Color();
    for (let i = 0; i < this.count; i++) {
      this.respawnStreak(i, STREAK_FAR_Z + Math.random() * (STREAK_NEAR_Z - STREAK_FAR_Z));
      const base = STREAK_PALETTE[Math.floor(Math.pow(Math.random(), 1.4) * STREAK_PALETTE.length)];
      c.copy(base).multiplyScalar(1.2 + Math.random() * 1.6);
      this.streaks.setColorAt(i, c);
    }
    this.scene.add(this.streaks);
    this.disposables.push(streakGeo, streakMat);

    // The Travix starship (team model)
    this.scene.add(this.ship);
    loadShipTemplate()
      .then((template) => {
        if (this.disposed) return;
        this.rig = createShipRig(template, this.glowTex);
        this.rig.group.scale.setScalar(SHIP_LENGTH);
        this.ship.add(this.rig.group);
        this.warmUp();
      })
      .catch(() => {});
  }

  private respawnStreak(i: number, z: number): void {
    const d = this.streakData;
    d[i * 4] = Math.random() * Math.PI * 2;
    // Keep a little clearance around the axis so the ship and the destination stay readable
    d[i * 4 + 1] = 1.2 + Math.pow(Math.random(), 0.7) * 13;
    d[i * 4 + 2] = z;
    d[i * 4 + 3] = 0.018 + Math.random() * 0.05;
  }

  /** Destination shown ahead during the jump (null = no specific target). */
  public setTarget(target: WarpTarget | null): void {
    this.setRings(target?.rings ?? null);
    this.setCompanions(target?.companions ?? [], target?.rings?.outer ?? 0);
    if (!target) {
      this.target.visible = false;
      this.targetHalo.visible = false;
      return;
    }
    const color = new THREE.Color(target.color);
    this.targetHalo.material.color.copy(color).lerp(new THREE.Color(0xffffff), 0.35);
    this.targetHalo.visible = true;

    if (!target.texture && target.glow) {
      // Deep-space objects: a glowing beacon, no solid sphere
      this.target.visible = false;
      return;
    }
    this.target.visible = true;
    this.targetMat.emissive.set(target.glow ? 0xffffff : 0x000000);
    this.targetMat.emissiveIntensity = target.glow ? 1.4 : 0;
    const glow = Boolean(target.glow);
    const loadedMap = () =>
      this.targetMat.map && this.targetMat.map !== this.placeholderTex ? this.targetMat.map : null;
    if (target.texture && target.texture !== this.targetTexUrl) {
      this.targetTexUrl = target.texture;
      loadedMap()?.dispose();
      this.targetMat.map = this.placeholderTex;
      this.targetMat.emissiveMap = this.placeholderTex;
      this.targetMat.color.copy(color);
      const url = target.texture;
      this.loadTexture(url, (tex) => {
        if (this.disposed || this.targetTexUrl !== url) {
          tex.dispose();
          return;
        }
        this.targetMat.map = tex;
        this.targetMat.emissiveMap = glow ? tex : this.placeholderTex;
        this.targetMat.color.set(0xffffff);
      });
    } else if (target.texture) {
      // Same texture as last time: just make sure the emissive setup matches
      const map = loadedMap();
      this.targetMat.emissiveMap = glow && map ? map : this.placeholderTex;
    } else {
      this.targetTexUrl = '';
      loadedMap()?.dispose();
      this.targetMat.map = this.placeholderTex;
      this.targetMat.emissiveMap = this.placeholderTex;
      this.targetMat.color.copy(color);
    }
  }

  /** Crea (o quita) los anillos del destino; se reutilizan si el destino no cambió. */
  private setRings(rings: WarpTarget['rings'] | null): void {
    const key = rings ? `${rings.inner}:${rings.outer}:${rings.opacity}:${rings.saturn}` : '';
    if (key === this.ringKey) return;
    this.ringKey = key;
    if (this.ringMesh) {
      // Texture and material are kept for the next jump to a ringed planet (ringCache)
      this.scene.remove(this.ringMesh);
      this.ringMesh.geometry.dispose();
      this.ringMesh = null;
    }
    if (!rings) return;
    // The ring texture is generated on the CPU: once per ring type, not on every jump
    const type = rings.saturn ? 'saturn' : 'uranus';
    let cached = this.ringCache.get(type);
    if (!cached) {
      const tex = rings.saturn ? createDetailedSaturnRingTexture(4) : createUranusRingTexture(4);
      cached = { material: this.makeRingMaterial(tex, rings.opacity) };
      this.ringCache.set(type, cached);
    }
    const mat = cached.material;
    mat.opacity = rings.opacity;
    this.ringMesh = new THREE.Mesh(createRingGeometry(TARGET_RADIUS * rings.inner, TARGET_RADIUS * rings.outer), mat);
    this.ringMesh.rotation.set(RING_VIEW_TILT, 0, -0.18);
    this.scene.add(this.ringMesh);
  }

  /** Reemplaza las lunas acompañantes (libera las anteriores: materiales y texturas). */
  private setCompanions(list: WarpCompanion[], ringOuter = 0): void {
    for (const c of this.companionMeshes) {
      this.companionGroup.remove(c.mesh);
      if (c.mat.map !== this.placeholderTex) c.mat.map?.dispose();
      c.mat.dispose();
    }
    this.companionMeshes = [];
    const items = list.slice(0, COMPANION_MAX);
    items.forEach((item, i) => {
      const size = THREE.MathUtils.clamp(item.size, 0.07, 0.4);
      // White 1x1 map until the real one arrives (white x colour = colour): the texture swap is
      // then a uniform change, not a new shader program mid-jump
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(item.color),
        roughness: 0.95,
        metalness: 0,
        map: this.placeholderTex,
      });
      const mesh = new THREE.Mesh(this.companionGeo, mat);
      mesh.scale.setScalar(size);
      // Cada luna un poco más lejos que la anterior, fuera del disco del destino
      const orbit = TARGET_RADIUS * (Math.max(1.7, ringOuter + 0.35) + i * 0.55 + size);
      this.companionMeshes.push({ mesh, mat, angle: COMPANION_ANGLES[i], orbit });
      this.companionGroup.add(mesh);
      if (item.texture) {
        const url = item.texture;
        this.loadTexture(url, (tex) => {
          if (this.disposed || !this.companionMeshes.some((c) => c.mat === mat)) {
            tex.dispose();
            return;
          }
          mat.map = tex;
          mat.color.set(0xffffff);
        });
      }
    });
  }

  /** Compile every shader up front (in parallel where supported) so jumps start without a hitch. */
  public warmUp(): void {
    // The ship's programs depend on the environment map: compile once it exists
    if (this.buildEnvironment) {
      this.warmUpWanted = true;
      return;
    }
    this.warmUpWanted = false;
    // Hidden until a jump (compile() covers hidden objects too), plus stand-ins with the same
    // programs as the companion moons and the ring materials, which are created per jump
    const extras = new THREE.Group();
    const companionLike = new THREE.Mesh(
      this.companionGeo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0, map: this.placeholderTex }),
    );
    const ringLike = new THREE.Mesh(this.companionGeo, this.makeRingMaterial(this.placeholderTex, 1));
    extras.add(companionLike, ringLike);
    this.scene.add(extras);
    try {
      void this.renderer.compileAsync(this.scene, this.camera).catch(() => {});
    } finally {
      this.scene.remove(extras);
      // The programs stay cached while any material uses them: keep these until disposal
      this.disposables.push(companionLike.material, ringLike.material);
    }
  }

  /** Ring material of the destination (same settings for every ring type). */
  private makeRingMaterial(map: THREE.Texture, opacity: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      map,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.04,
      depthWrite: false,
      alphaTest: 0.015,
    });
  }

  /**
   * Loads an sRGB texture with the image decoded off the main thread (ImageBitmap, flipped while
   * decoding): the same pixels as TextureLoader, without a long decode + upload in the middle of
   * the jump. Falls back to TextureLoader where ImageBitmap options are unsupported.
   */
  private loadTexture(url: string, onLoad: (tex: THREE.Texture) => void): void {
    const viaImage = () =>
      this.textureLoader.load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        onLoad(tex);
      });
    if (typeof createImageBitmap !== 'function') {
      viaImage();
      return;
    }
    this.bitmapLoader.load(
      url,
      (bitmap) => {
        const tex = new THREE.Texture(bitmap as unknown as HTMLImageElement);
        tex.flipY = false; // already flipped by the decoder
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        onLoad(tex);
      },
      undefined,
      () => viaImage(),
    );
  }

  public setSize(w: number, h: number): void {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(h, 1);
    // Keep the ship fully in frame on tall phone screens
    this.camera.fov = this.camera.aspect < 0.8 ? 78 : 62;
    this.camera.updateProjectionMatrix();
  }

  /**
   * @param speed 0..1 hyperspace speed (streak length / flow)
   * @param shipIn 0..1 ship entering from below the camera (1 = in place)
   * @param shipOut 0..1 ship leaping ahead into the jump exit
   * @param approach 0..1 how close the destination is (grows on screen)
   */
  public render(dt: number, speed: number, shipIn: number, shipOut: number, approach: number): void {
    this.buildEnvironment?.();
    this.time += dt;
    const t = this.time;
    const v = 6 + speed * 230;
    const lengthBase = 0.3 + speed * 22;

    const d = this.streakData;
    for (let i = 0; i < this.count; i++) {
      let z = d[i * 4 + 2] + v * dt;
      const r = d[i * 4 + 1];
      const len = lengthBase * (0.6 + (r / 14) * 0.9);
      if (z - len / 2 > STREAK_NEAR_Z) {
        this.respawnStreak(i, STREAK_FAR_Z - Math.random() * 30);
        z = d[i * 4 + 2];
      }
      d[i * 4 + 2] = z;
      const a = d[i * 4];
      this.pos.set(Math.cos(a) * r, 0.2 + Math.sin(a) * r, z);
      const w = d[i * 4 + 3];
      this.scl.set(w, w, len);
      this.m.compose(this.pos, this.q, this.scl);
      this.streaks.setMatrixAt(i, this.m);
    }
    this.streaks.instanceMatrix.needsUpdate = true;

    this.tunnelMat.uniforms.uTime.value = t;
    this.tunnelMat.uniforms.uSpeed.value = 2 + speed * 10;
    this.tunnelMat.uniforms.uOpacity.value = speed * (1 - approach * 0.5);
    this.coreGlow.material.opacity = (0.35 + 0.65 * speed) * (1 - approach * 0.6);

    // Destination: from a dot at the vanishing point to a large disc above the ship
    const ap = approach * approach;
    const dist = THREE.MathUtils.lerp(TARGET_FAR, TARGET_NEAR, ap);
    const ty = 0.2 + dist * 0.14;
    this.target.position.set(0, ty, -dist);
    this.target.rotation.y = t * 0.15;
    this.targetHalo.position.set(0, ty, -dist - 1);
    const halo = TARGET_RADIUS * (this.target.visible ? 3.2 : 4.5);
    this.targetHalo.scale.set(halo, halo, 1);
    this.targetHalo.material.opacity = this.target.visible ? 0.35 + 0.25 * approach : 0.9;

    // Anillos: acompañan al destino con una inclinación fija (no giran con su textura)
    if (this.ringMesh) {
      this.ringMesh.visible = this.target.visible;
      this.ringMesh.position.copy(this.target.position);
    }

    // Lunas acompañantes: alrededor del destino, girando despacio en un plano algo inclinado
    this.companionGroup.visible = this.target.visible && this.companionMeshes.length > 0;
    this.companionGroup.position.copy(this.target.position);
    for (const c of this.companionMeshes) {
      const a = c.angle + t * 0.12;
      c.mesh.position.set(Math.cos(a) * c.orbit, Math.sin(a) * c.orbit * 0.28, Math.sin(a) * c.orbit * 0.3);
      c.mesh.rotation.y = t * 0.1;
    }

    // Ship: gentle sway in flight, enters from below, leaps ahead at the exit
    const ease = (x: number) => 1 - Math.pow(1 - x, 3);
    const inE = ease(Math.min(1, Math.max(0, shipIn)));
    const outE = Math.pow(Math.min(1, Math.max(0, shipOut)), 2);
    this.ship.position.set(
      Math.sin(t * 0.7) * 0.18,
      THREE.MathUtils.lerp(-5.5, 0, inE) + Math.sin(t * 1.3) * 0.08,
      THREE.MathUtils.lerp(5, 0, inE) - outE * 140,
    );
    this.ship.rotation.set(
      THREE.MathUtils.lerp(0.35, -0.04, inE) + Math.sin(t * 1.1) * 0.015,
      Math.sin(t * 0.5) * 0.03,
      Math.sin(t * 0.9) * 0.06,
    );
    this.rig?.update(t, Math.max(speed, outE), 1);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.disposed = true;
    for (const dsp of this.disposables) dsp.dispose();
    this.disposables = [];
    this.rig?.dispose();
    this.setCompanions([]);
    this.setRings(null);
    for (const r of this.ringCache.values()) {
      r.material.map?.dispose();
      r.material.dispose();
    }
    this.ringCache.clear();
    if (this.targetMat.map && this.targetMat.map !== this.placeholderTex) this.targetMat.map.dispose();
    this.renderer.dispose();
  }
}
