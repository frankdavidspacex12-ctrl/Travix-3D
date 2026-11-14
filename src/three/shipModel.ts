import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Travix starship (public/models/ship/travix-ship.glb, optimized from the team's 3D model:
 * 75k triangles, 2K texture). Shared by the always-on ship of "Modo nave" and the hyperspace jump.
 *
 * Normalized model space: nose toward -Z, length 1, centred on the origin, +Y up.
 */
export const SHIP_MODEL_URL = '/models/ship/travix-ship.glb';

/** Engine nozzles in normalized model space (rear of the hull and the two side pods). */
export const SHIP_ENGINES: Array<{ pos: THREE.Vector3; size: number }> = [
  { pos: new THREE.Vector3(0, -0.01, 0.5), size: 0.16 },
  { pos: new THREE.Vector3(0.355, -0.037, 0.33), size: 0.12 },
  { pos: new THREE.Vector3(-0.355, -0.037, 0.33), size: 0.12 },
];

let templatePromise: Promise<THREE.Group> | null = null;

/** Loads (once) and normalizes the ship model. */
export function loadShipTemplate(): Promise<THREE.Group> {
  if (!templatePromise) {
    templatePromise = new GLTFLoader()
      .loadAsync(SHIP_MODEL_URL)
      .then((gltf) => {
        const model = gltf.scene;
        // Source model points its nose toward +Z: turn it around
        model.rotation.y = Math.PI;
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const s = 1 / Math.max(size.z, 1e-6);
        const wrapper = new THREE.Group();
        model.position.sub(center);
        wrapper.add(model);
        wrapper.scale.setScalar(s);
        model.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat.map) {
            mat.map.anisotropy = 4;
            mat.map.colorSpace = THREE.SRGBColorSpace;
          }
          mat.metalness = 0.5;
          mat.roughness = 0.38;
        });
        const root = new THREE.Group();
        root.name = 'travix_ship_template';
        root.add(wrapper);
        return root;
      })
      .catch((err) => {
        templatePromise = null;
        throw err;
      });
  }
  return templatePromise;
}

export function createGlowTexture(): THREE.CanvasTexture {
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

export interface ShipRig {
  group: THREE.Group;
  /**
   * power 0..1 = idle .. full thrust; gain scales the emitted light (exposure compensation);
   * glowScale shrinks the engine glow for the small always-on ship
   */
  update: (time: number, power: number, gain: number, glowScale?: number) => void;
  dispose: () => void;
}

/** A ship instance (shares the template's geometry and material) with blue-violet engine thrust. */
export function createShipRig(template: THREE.Group, glowTex: THREE.Texture): ShipRig {
  const group = new THREE.Group();
  group.add(template.clone(true));

  const disposables: Array<{ dispose: () => void }> = [];
  const plumeMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPower: { value: 1 }, uGain: { value: 1 } },
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
      uniform float uGain;
      varying vec2 vUv;
      void main() {
        // Cone uv.y is 1 at the tip and 0 at the base (nozzle)
        float along = 1.0 - vUv.y;
        float flicker = 0.85 + 0.15 * sin(uTime * 38.0 + vUv.x * 40.0);
        vec3 col = mix(vec3(0.55, 0.3, 1.0), vec3(0.45, 0.55, 1.0), smoothstep(0.0, 0.55, along));
        col = mix(col, vec3(0.95, 0.97, 1.0), smoothstep(0.7, 1.0, along));
        float a = pow(along, 1.6) * flicker * uPower;
        gl_FragColor = vec4(col * a * 1.6 * uGain, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const glowMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: 0xaab8ff,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    toneMapped: false,
  });
  const plumeGeo = new THREE.ConeGeometry(1, 1, 20, 1, true);
  // Base at the origin (nozzle), tip trailing behind the ship (+Z)
  plumeGeo.translate(0, 0.5, 0);
  plumeGeo.rotateX(Math.PI / 2);
  disposables.push(plumeMat, glowMat, plumeGeo);

  const plumes: Array<{ mesh: THREE.Mesh; size: number }> = [];
  const glows: Array<{ sprite: THREE.Sprite; size: number }> = [];
  for (const e of SHIP_ENGINES) {
    const plume = new THREE.Mesh(plumeGeo, plumeMat);
    plume.position.copy(e.pos);
    group.add(plume);
    plumes.push({ mesh: plume, size: e.size });
    const glow = new THREE.Sprite(glowMat);
    glow.position.copy(e.pos).add(new THREE.Vector3(0, 0, 0.02));
    group.add(glow);
    glows.push({ sprite: glow, size: e.size });
  }

  const baseGlow = new THREE.Color(0xaab8ff);
  return {
    group,
    update(time, power, gain, glowScale = 1) {
      plumeMat.uniforms.uTime.value = time;
      plumeMat.uniforms.uPower.value = 0.45 + 0.55 * power;
      plumeMat.uniforms.uGain.value = gain;
      glowMat.color.copy(baseGlow).multiplyScalar(gain);
      const flick = 1 + Math.sin(time * 31) * 0.05;
      for (const p of plumes) {
        const r = p.size * 0.5;
        p.mesh.scale.set(r, r, p.size * (2.2 + power * 6) * flick);
      }
      for (const g of glows) {
        const s = g.size * (2.4 + power * 1.4) * flick * glowScale;
        g.sprite.scale.set(s, s, 1);
      }
    },
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}
