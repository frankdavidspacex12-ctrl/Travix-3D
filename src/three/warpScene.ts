import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Hyperspace / wormhole jump used by "Modo nave": radial light streaks, a flowing tunnel and an
 * original silver starship with cyan running lights and blue-violet engines, seen from behind.
 * Runs on its own small renderer that only draws while a jump is playing.
 */

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

function createGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Original starship: arrowhead hull, central spine, twin engine nacelles. Points along -Z. */
function buildShip(glowTex: THREE.Texture, disposables: Array<{ dispose: () => void }>) {
  const ship = new THREE.Group();
  const track = <T extends { dispose: () => void }>(x: T): T => {
    disposables.push(x);
    return x;
  };

  const hullMat = track(
    new THREE.MeshStandardMaterial({ color: 0xdfe5ed, metalness: 0.68, roughness: 0.26 }),
  );
  const panelMat = track(
    new THREE.MeshStandardMaterial({ color: 0x9aa6b6, metalness: 0.7, roughness: 0.34 }),
  );
  const darkMat = track(
    new THREE.MeshStandardMaterial({ color: 0x252c38, metalness: 0.7, roughness: 0.45 }),
  );
  const cyanMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x0e7490,
      emissive: 0x22d3ee,
      emissiveIntensity: 4.2,
      metalness: 0.2,
      roughness: 0.4,
    }),
  );

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    track(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    ship.add(m);
    return m;
  };

  // Arrowhead hull (top view outline, extruded upward)
  const half: Array<[number, number]> = [
    [0, 3.5],
    [0.32, 2.7],
    [0.62, 1.5],
    [1.55, 0.25],
    [2.05, -0.35],
    [2.0, -0.75],
    [1.25, -0.85],
    [0.8, -1.35],
    [0.0, -1.25],
  ];
  const outline = [
    ...half.map(([x, y]) => new THREE.Vector2(x, y)),
    ...half
      .slice(1, -1)
      .reverse()
      .map(([x, y]) => new THREE.Vector2(-x, y)),
  ];
  const hullGeo = new THREE.ExtrudeGeometry(new THREE.Shape(outline), {
    depth: 0.2,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelSegments: 2,
  });
  hullGeo.rotateX(-Math.PI / 2);
  add(hullGeo, hullMat, 0, -0.1, 0);

  // Central spine, upper deck and bridge
  add(new THREE.BoxGeometry(0.74, 0.34, 3.9), hullMat, 0, 0.26, -0.55);
  add(new THREE.BoxGeometry(0.46, 0.14, 2.7), panelMat, 0, 0.49, -0.45);
  add(new THREE.BoxGeometry(0.52, 0.22, 0.95), panelMat, 0, 0.4, -2.2);
  add(new THREE.BoxGeometry(0.3, 0.08, 0.5), cyanMat, 0, 0.53, -2.25);
  // Cyan running lights along the spine and on the wings
  for (const sx of [-1, 1]) {
    add(new THREE.BoxGeometry(0.04, 0.06, 2.6), cyanMat, sx * 0.39, 0.3, -0.5);
    const wingStrip = add(new THREE.BoxGeometry(0.75, 0.035, 0.07), cyanMat, sx * 1.12, 0.12, -0.05);
    wingStrip.rotation.y = sx * 0.62;
    const wingPanel = add(new THREE.BoxGeometry(0.8, 0.05, 0.34), panelMat, sx * 1.0, 0.1, 0.35);
    wingPanel.rotation.y = sx * 0.62;
    // Ventral fins
    const fin = add(new THREE.BoxGeometry(0.06, 0.55, 0.75), darkMat, sx * 0.5, -0.32, 0.85);
    fin.rotation.z = sx * 0.4;
  }
  // Panel seams and armour plates for a more detailed silhouette
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const seam = add(new THREE.BoxGeometry(0.95 - k * 0.2, 0.025, 0.035), darkMat, sx * (0.95 + k * 0.12), 0.135, -0.55 + k * 0.42);
      seam.rotation.y = sx * 0.62;
    }
    add(new THREE.BoxGeometry(0.16, 0.2, 2.2), panelMat, sx * 0.5, 0.2, -0.2);
    add(new THREE.BoxGeometry(0.035, 0.05, 1.3), cyanMat, sx * 0.59, 0.31, 0.15);
    add(new THREE.BoxGeometry(0.28, 0.05, 0.05), cyanMat, sx * 0.25, 0.52, -1.55);
    add(new THREE.BoxGeometry(0.06, 0.06, 0.06), cyanMat, sx * 1.95, 0.13, -0.55);
  }
  for (let k = 0; k < 4; k++) {
    add(new THREE.BoxGeometry(0.5, 0.03, 0.05), darkMat, 0, 0.565, -1.4 + k * 0.6);
  }
  // Rear block with twin cyan lights
  add(new THREE.BoxGeometry(0.66, 0.34, 0.3), panelMat, 0, 0.14, 1.28);
  for (const sx of [-1, 1]) {
    add(new THREE.BoxGeometry(0.22, 0.09, 0.03), cyanMat, sx * 0.16, 0.16, 1.45);
  }

  // Twin engine nacelles with blue-violet thrust
  const plumeMat = track(
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPower: { value: 1 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uPower;
        varying vec2 vUv;
        void main() {
          // Cone uv.y is 1 at the tip and 0 at the base (nozzle): along = 1 at the nozzle
          float along = 1.0 - vUv.y;
          float flicker = 0.85 + 0.15 * sin(uTime * 38.0 + vUv.x * 40.0);
          vec3 core = vec3(0.95, 0.97, 1.0);
          vec3 mid = vec3(0.45, 0.55, 1.0);
          vec3 tip = vec3(0.55, 0.3, 1.0);
          vec3 col = mix(tip, mid, smoothstep(0.0, 0.55, along));
          col = mix(col, core, smoothstep(0.7, 1.0, along));
          float a = pow(along, 1.6) * flicker * uPower;
          gl_FragColor = vec4(col * a * 1.6, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  const engineGlowMat = track(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xaab8ff,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      toneMapped: false,
    }),
  );
  const nozzleMat = track(
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.7, 2.2), toneMapped: false }),
  );
  const plumes: THREE.Mesh[] = [];
  const glows: THREE.Sprite[] = [];
  for (const sx of [-1, 1]) {
    const x = sx * 1.78;
    const body = add(new THREE.CylinderGeometry(0.42, 0.47, 2.3, 28), hullMat, x, 0.14, 0.05);
    body.rotation.x = Math.PI / 2;
    const nose = add(new THREE.ConeGeometry(0.42, 0.7, 28), panelMat, x, 0.14, -1.45);
    nose.rotation.x = -Math.PI / 2;
    const ring = add(new THREE.TorusGeometry(0.44, 0.07, 10, 32), darkMat, x, 0.14, 1.2);
    ring.rotation.y = 0;
    add(new THREE.BoxGeometry(0.05, 0.2, 0.6), cyanMat, x + sx * 0.46, 0.14, 0.55);
    add(new THREE.BoxGeometry(0.26, 0.05, 0.9), cyanMat, x, 0.6, 0.2);
    add(new THREE.BoxGeometry(0.5, 0.12, 1.4), panelMat, x, 0.52, 0.1);
    const trim = add(new THREE.TorusGeometry(0.47, 0.035, 8, 32), darkMat, x, 0.14, -0.4);
    trim.rotation.y = 0;
    add(new THREE.BoxGeometry(0.05, 0.2, 0.6), cyanMat, x - sx * 0.46, 0.14, 0.55);
    const nozzle = add(new THREE.CircleGeometry(0.37, 28), nozzleMat, x, 0.14, 1.23);
    nozzle.rotation.y = 0;

    const plumeGeo = track(new THREE.ConeGeometry(0.36, 3.4, 24, 1, true));
    // Cone tip points +Y: base moved to the origin (nozzle), then tip turned to trail behind (+Z)
    plumeGeo.translate(0, 1.7, 0);
    plumeGeo.rotateX(Math.PI / 2);
    const plume = new THREE.Mesh(plumeGeo, plumeMat);
    plume.position.set(x, 0.14, 1.25);
    ship.add(plume);
    plumes.push(plume);

    const glow = new THREE.Sprite(engineGlowMat);
    glow.position.set(x, 0.14, 1.45);
    glow.scale.set(2.1, 2.1, 1);
    ship.add(glow);
    glows.push(glow);
  }

  return { ship, plumeMat, plumes, glows };
}

export class WarpScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private disposables: Array<{ dispose: () => void }> = [];
  private streaks: THREE.InstancedMesh;
  private streakData: Float32Array; // per streak: angle, radius, z, width
  private tunnelMat: THREE.ShaderMaterial;
  private ship: THREE.Group;
  private plumeMat: THREE.ShaderMaterial;
  private plumes: THREE.Mesh[];
  private glows: THREE.Sprite[];
  private coreGlow: THREE.Sprite;
  private time = 0;
  private readonly count: number;

  constructor(canvas: HTMLCanvasElement, lowPower: boolean) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.25 : 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x000000, 1);

    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 400);
    this.camera.position.set(0, 2.6, 8.4);
    this.camera.lookAt(0, 0.2, -6);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = env;
    this.scene.environmentIntensity = 0.4;
    this.disposables.push(env);

    this.scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x0b0e16, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(2, 6, 4);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x7aa2ff, 1.6);
    rim.position.set(-3, 1, -8);
    this.scene.add(rim);

    const glowTex = createGlowTexture();
    this.disposables.push(glowTex);

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
          // fade toward both ends of the tunnel
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

    // Bright convergence point far ahead
    const coreMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xdfe7ff,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      toneMapped: false,
    });
    this.coreGlow = new THREE.Sprite(coreMat);
    this.coreGlow.position.set(0, 0.2, -160);
    this.coreGlow.scale.set(60, 60, 1);
    this.scene.add(this.coreGlow);
    this.disposables.push(coreMat);

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

    const built = buildShip(glowTex, this.disposables);
    this.ship = built.ship;
    this.plumeMat = built.plumeMat;
    this.plumes = built.plumes;
    this.glows = built.glows;
    this.scene.add(this.ship);
  }

  private respawnStreak(i: number, z: number): void {
    const d = this.streakData;
    d[i * 4] = Math.random() * Math.PI * 2;
    // Keep a little clearance around the axis so the ship stays readable
    d[i * 4 + 1] = 1.2 + Math.pow(Math.random(), 0.7) * 13;
    d[i * 4 + 2] = z;
    d[i * 4 + 3] = 0.018 + Math.random() * 0.05;
  }

  /** Compile every shader up front so the first jump starts without a hitch. */
  public warmUp(): void {
    this.renderer.compile(this.scene, this.camera);
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
   */
  public render(dt: number, speed: number, shipIn: number, shipOut: number): void {
    this.time += dt;
    const t = this.time;
    const v = 6 + speed * 230;
    const lengthBase = 0.3 + speed * 22;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
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
      pos.set(Math.cos(a) * r, 0.2 + Math.sin(a) * r, z);
      const w = d[i * 4 + 3];
      scl.set(w, w, len);
      m.compose(pos, q, scl);
      this.streaks.setMatrixAt(i, m);
    }
    this.streaks.instanceMatrix.needsUpdate = true;

    this.tunnelMat.uniforms.uTime.value = t;
    this.tunnelMat.uniforms.uSpeed.value = 2 + speed * 10;
    this.tunnelMat.uniforms.uOpacity.value = speed;
    this.coreGlow.material.opacity = 0.35 + 0.65 * speed;

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
      THREE.MathUtils.lerp(0.35, 0.04, inE) + Math.sin(t * 1.1) * 0.015,
      Math.sin(t * 0.5) * 0.03,
      Math.sin(t * 0.9) * 0.06,
    );
    this.plumeMat.uniforms.uTime.value = t;
    this.plumeMat.uniforms.uPower.value = 0.55 + 0.45 * Math.max(speed, outE);
    const flick = 1 + Math.sin(t * 31) * 0.05;
    for (const p of this.plumes) p.scale.set(1, 1, (0.7 + speed * 0.6 + outE) * flick);
    for (const g of this.glows) {
      const s = (1.8 + speed * 0.8) * flick;
      g.scale.set(s, s, 1);
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
    this.renderer.dispose();
  }
}
