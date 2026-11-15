import * as THREE from 'three';

/**
 * Coma and tails of a comet, drawn like the real thing instead of solid cones:
 * - coma: a soft round glow around the nucleus;
 * - ion (plasma) tail: thin, straight, bluish, pointing exactly away from the Sun, with faint
 *   rays flowing outward;
 * - dust tail: wider, yellowish white, curving back along the orbit (the grains lag behind the
 *   comet's motion), with a few drifting grains.
 * Everything fades softly at its edges and along its length, and grows with the comet's
 * activity, which depends on its distance from the Sun.
 *
 * Local frame of `group` (set by orient()): +Z away from the Sun, +X opposite to the comet's
 * motion (where the dust tail bends), +Y completes it.
 */

const ION_COLOR = new THREE.Color(0.45, 0.7, 1.0);
const DUST_COLOR = new THREE.Color(1.0, 0.88, 0.68);
const COMA_COLOR = new THREE.Color(0.8, 0.92, 1.0);

/** Faint coma / short tails even far from the Sun, so the comet still reads as one */
const MIN_ACTIVITY = 0.28;

/**
 * Activity 0..1 from the heliocentric distance. 67P (Rosetta): weak CO / CO₂ activity from
 * ~4 AU, water-driven jets and a full coma inside ~2 AU, strongest near perihelion (1.24 AU).
 */
export function cometActivity(distanceAu: number): number {
  const a = 1 - THREE.MathUtils.smoothstep(distanceAu, 1.3, 4.6);
  return MIN_ACTIVITY + (1 - MIN_ACTIVITY) * a;
}

function softDotTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.7)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Coma glow: brightness falls off roughly as 1/ρ from the nucleus (as in real comae), so it is
 * concentrated around the nucleus and thins out smoothly, with no visible edge.
 */
function comaTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (let i = 0; i <= 24; i++) {
    const r = i / 24;
    const core = 1 / (1 + Math.pow(r / 0.07, 1.25));
    const edge = 1 - THREE.MathUtils.smoothstep(r, 0.45, 1);
    g.addColorStop(r, `rgba(255,255,255,${(core * edge).toFixed(4)})`);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Shared soft round dot (comet grains, geyser particles): never square pixels */
let sharedDot: THREE.CanvasTexture | null = null;
export function getSoftDotTexture(): THREE.CanvasTexture {
  if (!sharedDot) sharedDot = softDotTexture();
  return sharedDot;
}

/** Tube along `center(t)`, t 0..1, radius `radius(t)`; uv.x = t, uv.y = angle around. */
function tailGeometry(
  center: (t: number, out: THREE.Vector3) => THREE.Vector3,
  radius: (t: number) => number,
  lengthSegments: number,
  radialSegments: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const c = new THREE.Vector3();
  const c2 = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const n = new THREE.Vector3();
  for (let i = 0; i <= lengthSegments; i++) {
    const t = i / lengthSegments;
    center(t, c);
    center(Math.min(1, t + 1e-3), c2);
    if (t >= 1) center(t - 1e-3, c2).sub(c).negate().add(c);
    tangent.subVectors(c2, c).normalize();
    // The tail stays in the XZ plane: Y is a stable binormal
    side.crossVectors(up, tangent).normalize();
    const r = radius(t);
    for (let j = 0; j <= radialSegments; j++) {
      const a = (j / radialSegments) * Math.PI * 2;
      n.copy(side).multiplyScalar(Math.cos(a)).addScaledVector(up, Math.sin(a));
      positions.push(c.x + n.x * r, c.y + n.y * r, c.z + n.z * r);
      normals.push(n.x, n.y, n.z);
      uvs.push(t, j / radialSegments);
    }
  }
  const row = radialSegments + 1;
  for (let i = 0; i < lengthSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * row + j;
      const b = (i + 1) * row + j;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

function tailMaterial(color: THREE.Color, rays: number, flow: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color.clone() },
      uIntensity: { value: 0 },
      uTime: { value: 0 },
      uRays: { value: rays },
      uFlow: { value: flow },
    },
    // The renderer uses a logarithmic depth buffer: these chunks keep depth on the same scale
    vertexShader: /* glsl */ `
      #include <common>
      #include <logdepthbuf_pars_vertex>
      varying vec2 vUv;
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormalV = normalize(normalMatrix * normal);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
        #include <logdepthbuf_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <logdepthbuf_pars_fragment>
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uTime;
      uniform float uRays;
      uniform float uFlow;
      varying vec2 vUv;
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      void main() {
        #include <logdepthbuf_fragment>
        float t = vUv.x;
        // Seen through the middle of the tail it is densest; it thins out to nothing at its edges
        float facing = abs(dot(normalize(vNormalV), normalize(vViewDir)));
        float body = facing * facing;
        // Born inside the coma, fading away along its length
        float head = smoothstep(0.0, 0.07, t);
        float fade = pow(max(1.0 - t, 0.0), 1.7);
        // Faint rays streaming outward (ion tail) / gentle flow (dust tail)
        float around = vUv.y * 6.2831853;
        float ray = 0.5 + 0.5 * sin(around * 7.0 + sin(t * 7.0 - uTime * 0.6) * 1.2);
        float rays = mix(1.0, 0.55 + 0.9 * ray * ray, uRays);
        float flow = 0.86 + 0.14 * sin(t * 18.0 - uTime * uFlow);
        float a = body * head * fade * rays * flow * uIntensity;
        gl_FragColor = vec4(uColor * a, 1.0);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export interface CometEffects {
  group: THREE.Group;
  /** activity 0..1 (cometActivity), time in seconds */
  update: (dt: number, time: number, activity: number) => void;
  /** Screen-brightness factor: 1 / exposure, so the effects keep their look at any distance */
  setGain: (gain: number) => void;
  /** Points the tails: away from the Sun, the dust tail bending back along the orbit (world space) */
  orient: (cometWorldPos: THREE.Vector3, velocityWorld: THREE.Vector3) => void;
  dispose: () => void;
}

export function createCometEffects(nucleusRadius: number): CometEffects {
  const R = nucleusRadius;
  const group = new THREE.Group();
  group.name = 'comet_effects';
  const disposables: Array<{ dispose: () => void }> = [];
  const dot = getSoftDotTexture();

  // Ion tail: straight and narrow
  const ionLength = 34 * R;
  const ionGeo = tailGeometry(
    (t, out) => out.set(0, 0, t * ionLength),
    (t) => R * (0.32 + 1.1 * Math.pow(t, 0.85)),
    48,
    24,
  );
  const ionMat = tailMaterial(ION_COLOR, 1, 2.2);
  const ion = new THREE.Mesh(ionGeo, ionMat);
  ion.renderOrder = 2;
  ion.frustumCulled = false;

  // Dust tail: broader, curving back along the orbit
  const dustLength = 22 * R;
  const dustBend = 0.42;
  const dustCenter = (t: number, out: THREE.Vector3) =>
    out.set(dustBend * dustLength * t * t, 0, t * dustLength);
  const dustRadius = (t: number) => R * (0.55 + 4.2 * Math.pow(t, 0.9));
  const dustGeo = tailGeometry(dustCenter, dustRadius, 48, 24);
  const dustMat = tailMaterial(DUST_COLOR, 0, 1.2);
  const dust = new THREE.Mesh(dustGeo, dustMat);
  dust.renderOrder = 1;
  dust.frustumCulled = false;

  // Coma: soft glow around the nucleus (always faces the camera)
  const comaTex = comaTexture();
  const comaMat = new THREE.SpriteMaterial({
    map: comaTex,
    color: COMA_COLOR.clone(),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const coma = new THREE.Sprite(comaMat);
  coma.renderOrder = 3;

  // Dust grains drifting along the dust tail
  const grainCount = 90;
  const grainPos = new Float32Array(grainCount * 3);
  const grainCol = new Float32Array(grainCount * 3);
  const grainT = new Float32Array(grainCount);
  const grainSpeed = new Float32Array(grainCount);
  const grainAngle = new Float32Array(grainCount);
  const grainFrac = new Float32Array(grainCount);
  const respawn = (i: number, t: number) => {
    grainT[i] = t;
    grainSpeed[i] = 0.035 + Math.random() * 0.05;
    grainAngle[i] = Math.random() * Math.PI * 2;
    grainFrac[i] = Math.sqrt(Math.random()) * 0.85;
  };
  for (let i = 0; i < grainCount; i++) respawn(i, Math.random());
  const grainGeo = new THREE.BufferGeometry();
  grainGeo.setAttribute('position', new THREE.BufferAttribute(grainPos, 3));
  grainGeo.setAttribute('color', new THREE.BufferAttribute(grainCol, 3));
  const grainMat = new THREE.PointsMaterial({
    map: dot,
    size: R * 0.16,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const grains = new THREE.Points(grainGeo, grainMat);
  grains.frustumCulled = false;
  grains.renderOrder = 2;

  group.add(dust, ion, grains, coma);
  disposables.push(ionGeo, ionMat, dustGeo, dustMat, comaTex, comaMat, grainGeo, grainMat);

  let gain = 1;
  let activity = MIN_ACTIVITY;
  const c = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  const applyBrightness = () => {
    ionMat.uniforms.uIntensity.value = 0.55 * activity * gain;
    dustMat.uniforms.uIntensity.value = 0.45 * activity * gain;
    comaMat.color.copy(COMA_COLOR).multiplyScalar((0.4 + 0.6 * activity) * 1.1 * gain);
    grainMat.color.setScalar(0.55 * activity * gain);
  };

  const m = new THREE.Matrix4();
  const x = new THREE.Vector3();
  const y = new THREE.Vector3();
  const z = new THREE.Vector3();
  const qWorld = new THREE.Quaternion();
  const qParent = new THREE.Quaternion();

  return {
    group,
    update(dt, time, act) {
      activity = THREE.MathUtils.clamp(act, 0, 1);
      // Tails grow with activity; the coma too, a little
      const scale = 0.35 + 0.65 * activity;
      ion.scale.setScalar(scale);
      dust.scale.setScalar(scale);
      grains.scale.setScalar(scale);
      coma.scale.setScalar(R * (6 + 8 * activity));
      ionMat.uniforms.uTime.value = time;
      dustMat.uniforms.uTime.value = time;
      for (let i = 0; i < grainCount; i++) {
        let t = grainT[i] + dt * grainSpeed[i];
        if (t > 1) {
          respawn(i, 0);
          t = 0;
        }
        grainT[i] = t;
        dustCenter(t, c);
        dustCenter(Math.min(1, t + 1e-3), tmp);
        tangent.subVectors(tmp, c).normalize();
        side.crossVectors(up, tangent).normalize();
        const r = dustRadius(t) * grainFrac[i];
        const a = grainAngle[i];
        grainPos[i * 3] = c.x + (side.x * Math.cos(a)) * r;
        grainPos[i * 3 + 1] = c.y + Math.sin(a) * r;
        grainPos[i * 3 + 2] = c.z + (side.z * Math.cos(a)) * r;
        const b = THREE.MathUtils.smoothstep(t, 0, 0.06) * Math.pow(1 - t, 1.5);
        grainCol[i * 3] = DUST_COLOR.r * b;
        grainCol[i * 3 + 1] = DUST_COLOR.g * b;
        grainCol[i * 3 + 2] = DUST_COLOR.b * b;
      }
      grainGeo.attributes.position.needsUpdate = true;
      grainGeo.attributes.color.needsUpdate = true;
      applyBrightness();
    },
    setGain(g) {
      if (Math.abs(g - gain) < 1e-5) return;
      gain = g;
      applyBrightness();
    },
    orient(cometWorldPos, velocityWorld) {
      z.copy(cometWorldPos).normalize();
      if (z.lengthSq() < 0.5) return;
      // Dust lags behind the motion: bend opposite to the velocity, across the antisolar axis
      x.copy(velocityWorld).addScaledVector(z, -velocityWorld.dot(z)).negate();
      if (x.lengthSq() < 1e-12) x.set(1, 0, 0).addScaledVector(z, -z.x);
      x.normalize();
      y.crossVectors(z, x);
      m.makeBasis(x, y, z);
      qWorld.setFromRotationMatrix(m);
      if (group.parent) {
        group.parent.getWorldQuaternion(qParent);
        group.quaternion.copy(qParent.invert().multiply(qWorld));
      } else {
        group.quaternion.copy(qWorld);
      }
    },
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}
