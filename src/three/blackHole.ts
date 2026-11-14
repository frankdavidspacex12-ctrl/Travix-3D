import * as THREE from 'three';
import {
  DEEP_SPACE_TARGETS,
  DeepSpaceTargetId,
} from '../data/solarSystemData';
import {
  createNebulaPuffTexture,
  createSoftStarSpriteTexture,
} from './proceduralTextures';

export interface DeepSpaceDioramaRuntime {
  root: THREE.Group;
  defaultCamPos: THREE.Vector3;
  defaultTarget: THREE.Vector3;
  update: (dt: number, elapsed: number) => void;
  dispose: () => void;
}

/* ============================================================================
 * SHARED PROCEDURAL ASTROPHYSICAL TEXTURES (JWST/HUBBLE DIFFRACTION & CLOUDS)
 * ========================================================================== */

function createDiffractionStarTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const cx = size / 2;

  const core = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx * 0.6);
  core.addColorStop(0.0, 'rgba(255,255,255,1.0)');
  core.addColorStop(0.08, 'rgba(235,248,255,0.92)');
  core.addColorStop(0.24, 'rgba(165,215,255,0.34)');
  core.addColorStop(0.55, 'rgba(110,165,255,0.08)');
  core.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  // Authentic 6-point JWST + subtle vertical diffraction spikes
  ctx.save();
  ctx.translate(cx, cx);
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 3);
    const g = ctx.createLinearGradient(-cx * 0.92, 0, cx * 0.92, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.45, 'rgba(220,242,255,0.42)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.55, 'rgba(220,242,255,0.42)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-cx * 0.92, -1.6, size * 0.92, 3.2);
    ctx.restore();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFbmCloudSpriteTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const data = img.data;

  const hash = (x: number, y: number) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const vnoise = (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy);
    const b = hash(ix + 1, iy);
    const c1 = hash(ix, iy + 1);
    const d = hash(ix + 1, iy + 1);
    return a + (b - a) * ux + (c1 - a) * uy + (a - b - c1 + d) * ux * uy;
  };
  const fbm = (x: number, y: number) => {
    let val = 0;
    let amp = 0.55;
    let freq = 1;
    for (let o = 0; o < 5; o++) {
      val += vnoise(x * freq, y * freq) * amp;
      freq *= 2.07;
      amp *= 0.5;
    }
    return val;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x / size) * 2 - 1;
      const ny = (y / size) * 2 - 1;
      const r = Math.hypot(nx, ny);
      const radial = Math.max(0, 1 - r);
      const n = fbm((x / size) * 4.5 + 3.1, (y / size) * 4.5 + 7.4);
      const wisps = Math.pow(radial, 1.35) * THREE.MathUtils.smoothstep(n, 0.24, 0.92);
      const idx = (y * size + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.round(THREE.MathUtils.clamp(wisps * 255, 0, 255));
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const GLSL_NOISE_LIB = `
  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm5(vec2 p) {
    float v = 0.0;
    float a = 0.52;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 5; i++) {
      v += a * noise2D(p);
      p = rot * p * 2.06 + vec2(3.7, 1.9);
      a *= 0.5;
    }
    return v;
  }
`;

function createStarFieldLayer(
  count: number,
  minR: number,
  maxR: number,
  heightSpread: number,
  paletteHex: number[],
  starTex: THREE.Texture,
  size: number,
  opacity: number,
  disposables: Array<{ dispose: () => void }>,
): THREE.Points {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const tmp = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const u = Math.random();
    const r = minR + u * (maxR - minR);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    if (heightSpread < maxR * 0.5) {
      pos[i * 3] = Math.cos(theta) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * heightSpread;
      pos[i * 3 + 2] = Math.sin(theta) * r;
    } else {
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    tmp
      .setHex(paletteHex[i % paletteHex.length])
      .multiplyScalar(0.55 + Math.pow(Math.random(), 1.6) * 0.85);
    col[i * 3] = tmp.r;
    col[i * 3 + 1] = tmp.g;
    col[i * 3 + 2] = tmp.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    map: starTex,
    size,
    vertexColors: true,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  disposables.push(geo, mat);
  return new THREE.Points(geo, mat);
}

/* ============================================================================
 * 1. RELATIVISTIC BLACK HOLE CORE (Gargantua/EHT Photon Ring + Einstein Lensing)
 * ========================================================================== */

function createBlackHoleCore(
  scale: number,
  warmTone: [number, number, number],
  _starTex: THREE.Texture,
  cloudTex: THREE.Texture,
  disposables: Array<{ dispose: () => void }>,
  options: {
    withAccretionDisk?: boolean;
    photonRingTone?: [number, number, number];
    lensedGalaxyIntensity?: number;
  } = {},
): { group: THREE.Group; update: (dt: number, elapsed: number) => void } {
  const withDisk = options.withAccretionDisk ?? true;
  const ringTone = options.photonRingTone ?? warmTone;
  const galaxyStrength = options.lensedGalaxyIntensity ?? (withDisk ? 0.42 : 1.35);
  const group = new THREE.Group();

  // Real-time 3D Schwarzschild Curved-Spacetime Geodesic Ray-Marcher
  // Traces curved photon trajectories around r_s -> automatically bends far-side disk into upper/lower Einstein arches,
  // produces crisp photon sphere rings, relativistic Doppler beaming, and gravitationally-lensed Milky Way arcs.
  const boundR = scale * 16.5;
  const bhGeo = new THREE.SphereGeometry(boundR, 40, 28);
  const bhMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: scale },
      uBoundR: { value: boundR },
      uTint: { value: new THREE.Color(warmTone[0], warmTone[1], warmTone[2]) },
      uRingTint: { value: new THREE.Color(ringTone[0], ringTone[1], ringTone[2]) },
      uHasDisk: { value: withDisk ? 1.0 : 0.0 },
      uGalaxyStrength: { value: galaxyStrength },
    },
    vertexShader: `
      varying vec3 vLocalExit;
      varying vec3 vLocalCam;
      void main() {
        vLocalExit = position;
        vec3 centerWorld = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vec3 delta = cameraPosition - centerWorld;
        // Transform camera delta into local BH space (compatible across WebGL1/2)
        vLocalCam = vec3(
          dot(delta, modelMatrix[0].xyz),
          dot(delta, modelMatrix[1].xyz),
          dot(delta, modelMatrix[2].xyz)
        );
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uScale;
      uniform float uBoundR;
      uniform vec3 uTint;
      uniform vec3 uRingTint;
      uniform float uHasDisk;
      uniform float uGalaxyStrength;
      varying vec3 vLocalExit;
      varying vec3 vLocalCam;

      ${GLSL_NOISE_LIB}

      vec3 evalLensedBackground(vec3 dir) {
        // Inclined galactic plane (matches Milky Way core & dust lanes warped by Gaia BH1)
        vec3 gDir = normalize(vec3(
          dir.x * 0.92 + dir.y * 0.39,
          -dir.x * 0.39 + dir.y * 0.92,
          dir.z
        ));
        float lat = abs(gDir.y);
        float lon = atan(gDir.z, gDir.x);
        float band = exp(-pow(lat / 0.14, 2.0));
        float bulge = exp(-pow(lat / 0.28, 2.0)) * pow(max(0.0, cos(lon)), 3.0);

        float dustN = fbm5(vec2(lon * 3.4, gDir.y * 10.5));
        float darkLane = exp(-pow(lat / 0.048, 2.0)) * smoothstep(0.32, 0.72, dustN);

        vec3 galDust = mix(vec3(0.28, 0.48, 0.85), vec3(1.15, 0.72, 0.34), clamp(bulge * 1.4 + dustN * 0.35, 0.0, 1.0));
        vec3 bg = galDust * (band * (0.38 + dustN * 0.9) + bulge * 1.35) * (1.0 - darkLane * 0.85);

        // Deflected high-resolution pinpoint stars that shear into Einstein arcs near shadow
        vec2 starGrid = vec2(lon * 38.0, asin(clamp(dir.y, -0.999, 0.999)) * 38.0);
        vec2 cell = floor(starGrid);
        vec2 f = fract(starGrid) - 0.5;
        float rnd = hash21(cell);
        if (rnd > 0.92) {
          float d = length(f);
          float pt = exp(-d * d * 42.0) * (0.7 + 1.4 * fract(rnd * 37.0));
          vec3 sCol = mix(vec3(0.75, 0.88, 1.2), vec3(1.2, 0.96, 0.72), fract(rnd * 13.0));
          bg += sCol * pt;
        }
        return bg * uGalaxyStrength;
      }

      vec4 sampleAccretionDisk(vec3 p, vec3 rayDir, float rs) {
        float r = length(p.xz);
        float rInner = rs * 2.15;
        float rOuter = uScale * 14.2;
        if (r < rInner || r > rOuter) return vec4(0.0);

        float t = clamp((r - rInner) / (rOuter - rInner), 0.0, 1.0);
        float ang = atan(p.z, p.x);

        // Differential Keplerian shear + concentric turbulent plasma streams
        float kepler = 2.6 / (0.18 + pow(t, 0.85) * 1.45);
        float shearedAng = ang + uTime * kepler + 4.4 * (1.0 - t);
        float n1 = fbm5(vec2(r * 0.78 - uTime * 0.35, shearedAng * 1.7));
        float n2 = fbm5(vec2(r * 2.1 - uTime * 0.7, shearedAng * 3.6 + 2.7));
        float rings = 0.5 + 0.5 * sin(r * 5.2 - uTime * 2.4 + n1 * 5.5);
        float density = pow(clamp(n1 * 0.62 + n2 * 0.48, 0.0, 1.3), 1.35) * (0.48 + 0.52 * rings);

        // Relativistic Doppler beaming: plasma moving toward camera is brighter & whiter
        vec3 tanVel = normalize(vec3(-p.z, 0.0, p.x));
        float vDot = dot(tanVel, -rayDir);
        float doppler = clamp(0.76 + 0.68 * vDot, 0.28, 1.75);

        float radialEnv = smoothstep(0.0, 0.055, t) * pow(1.0 - t, 1.38);
        float iscoHot = exp(-pow(t / 0.07, 2.0)) * 0.95;

        vec3 whiteHot = vec3(2.45, 2.15, 1.75);
        vec3 midCol = uTint * vec3(1.55, 0.95, 0.55);
        vec3 outerEmber = uTint * vec3(0.95, 0.32, 0.14);

        vec3 col = mix(whiteHot, mix(midCol, outerEmber, pow(t, 0.65)), smoothstep(0.02, 0.62, t));
        col *= (0.45 + density * 1.85 + iscoHot) * doppler;

        float a = clamp(radialEnv * (0.35 + density * 0.9), 0.0, 1.0);
        return vec4(col, a);
      }

      void main() {
        vec3 rd = normalize(vLocalExit - vLocalCam);
        float camDist = length(vLocalCam);
        float tStart = 0.0;
        if (camDist > uBoundR) {
          float b = dot(vLocalCam, rd);
          float c = dot(vLocalCam, vLocalCam) - uBoundR * uBoundR;
          float disc = max(0.0, b * b - c);
          tStart = max(0.0, -b - sqrt(disc));
        }

        vec3 pos = vLocalCam + rd * tStart;
        vec3 vel = rd;
        float rs = uScale * 1.08;
        float bClosest = 999.0;
        bool captured = false;

        vec3 accum = vec3(0.0);
        float transmittance = 1.0;

        // 58 adaptive Schwarzschild geodesic steps
        for (int i = 0; i < 58; i++) {
          float r = length(pos);
          bClosest = min(bClosest, r);

          if (r < rs * 1.02) {
            captured = true;
            break;
          }
          if (r > uBoundR * 1.03 && dot(pos, vel) > 0.0) {
            break;
          }

          vec3 oldPos = pos;
          float stepLen = clamp(r * 0.095, uScale * 0.09, uScale * 0.95);
          // Photon geodesic gravitational acceleration a = -1.5 * rs * |r x v|^2 / r^5 * r
          vec3 hVec = cross(pos, vel);
          float h2 = dot(hVec, hVec);
          vec3 accel = -1.5 * rs * h2 * pos / pow(max(r, 0.001), 5.0);
          vel = normalize(vel + accel * stepLen);
          pos += vel * stepLen;

          if (uHasDisk > 0.5) {
            // Plane crossing check for infinitely crisp warped accretion sheets & secondary rings
            bool crossed = (oldPos.y > 0.0 && pos.y <= 0.0) || (oldPos.y < 0.0 && pos.y >= 0.0);
            if (crossed) {
              float frac = abs(oldPos.y) / max(0.0001, abs(oldPos.y - pos.y));
              vec3 hitP = mix(oldPos, pos, frac);
              vec4 dSample = sampleAccretionDisk(hitP, vel, rs);
              accum += transmittance * dSample.rgb * dSample.a;
              transmittance *= (1.0 - dSample.a * 0.72);
            } else if (abs(pos.y) < uScale * 0.22) {
              // Subtle volumetric disk thickness near equator
              vec4 dSample = sampleAccretionDisk(pos, vel, rs);
              float slab = (1.0 - abs(pos.y) / (uScale * 0.22)) * 0.16;
              accum += transmittance * dSample.rgb * dSample.a * slab;
              transmittance *= (1.0 - dSample.a * slab * 0.45);
            }
          }
        }

        // Photon sphere ring (razor edge around shadow: 1.5 * rs critical photon orbit)
        float shadowR = rs * 1.54;
        float photonRing = exp(-pow((bClosest - shadowR) / (rs * 0.095), 2.0));
        float secondaryRing = exp(-pow((bClosest - shadowR * 1.18) / (rs * 0.22), 2.0)) * 0.35;
        vec3 pCol = mix(uRingTint * 1.65, vec3(2.2, 2.35, 2.55), photonRing * 0.65);
        accum += pCol * (photonRing * mix(0.65, 1.45, uHasDisk) + secondaryRing) * (captured ? 0.25 : 1.0);

        if (!captured) {
          vec3 deflectedBg = evalLensedBackground(vel);
          float einsteinBoost = 1.0 + exp(-pow((bClosest - shadowR * 1.45) / (rs * 0.9), 2.0)) * (1.5 - uHasDisk * 0.7);
          accum += transmittance * deflectedBg * einsteinBoost;
        }

        // Event Horizon captures light -> opaque black disk; exterior fades smoothly at bounding sphere edge
        float horizonMask = captured ? 1.0 : 0.0;
        float lumAlpha = clamp(max(max(accum.r, accum.g), accum.b) * 0.92, 0.0, 1.0);
        float outerEdge = smoothstep(uBoundR * 0.98, uBoundR * 0.65, length(vLocalExit - dot(vLocalExit, rd) * rd));
        float outAlpha = max(horizonMask, lumAlpha * outerEdge);
        if (outAlpha < 0.008) discard;
        gl_FragColor = vec4(accum * outerEdge, outAlpha);
      }
    `,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const bhVolume = new THREE.Mesh(bhGeo, bhMat);
  bhVolume.renderOrder = 3;
  group.add(bhVolume);
  disposables.push(bhGeo, bhMat);

  let streamGeo: THREE.BufferGeometry | null = null;
  const streamCount = 900;
  const sRadii = new Float32Array(streamCount);
  const sAngles = new Float32Array(streamCount);
  const sSpeeds = new Float32Array(streamCount);

  if (withDisk) {
    // 3D spiralling luminous plasma embers orbiting the equatorial disk
    const sPos = new Float32Array(streamCount * 3);
    const sCol = new Float32Array(streamCount * 3);
    const cHot = new THREE.Color(0xfff4d4);
    const cMid = new THREE.Color(warmTone[0], warmTone[1], warmTone[2]);
    const cTmp = new THREE.Color();

    for (let i = 0; i < streamCount; i++) {
      const r = scale * 2.4 + Math.pow(Math.random(), 1.25) * scale * 11.5;
      const a = Math.random() * Math.PI * 2;
      sRadii[i] = r;
      sAngles[i] = a;
      sSpeeds[i] = (scale * 3.8) / Math.pow(r, 1.18);
      const h = (Math.random() - 0.5) * scale * (0.14 + (r / (scale * 14)) * 0.75);
      sPos[i * 3] = Math.cos(a) * r;
      sPos[i * 3 + 1] = h;
      sPos[i * 3 + 2] = Math.sin(a) * r;

      const heat = 1 - THREE.MathUtils.clamp((r - scale * 2.4) / (scale * 11.5), 0, 1);
      cTmp.copy(cMid).lerp(cHot, heat * 0.85);
      sCol[i * 3] = cTmp.r;
      sCol[i * 3 + 1] = cTmp.g;
      sCol[i * 3 + 2] = cTmp.b;
    }

    streamGeo = new THREE.BufferGeometry();
    streamGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    streamGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
    const streamMat = new THREE.PointsMaterial({
      map: cloudTex,
      size: scale * 0.95,
      vertexColors: true,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const streamPoints = new THREE.Points(streamGeo, streamMat);
    group.add(streamPoints);
    disposables.push(streamGeo, streamMat);
  }

  return {
    group,
    update: (dt: number, elapsed: number) => {
      bhMat.uniforms.uTime.value = elapsed;
      if (streamGeo) {
        const attr = streamGeo.attributes.position as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        for (let i = 0; i < streamCount; i++) {
          sAngles[i] += dt * sSpeeds[i];
          const r = sRadii[i];
          arr[i * 3] = Math.cos(sAngles[i]) * r;
          arr[i * 3 + 2] = Math.sin(sAngles[i]) * r;
        }
        attr.needsUpdate = true;
      }
    },
  };
}

/* ============================================================================
 * 2. MILKY WAY GALAXY DIORAMA (Preserves Galactocentric Coords + Volumetric Glow)
 * ========================================================================== */

function createMilkyWayDiorama(): DeepSpaceDioramaRuntime {
  const disposables: Array<{ dispose: () => void }> = [];
  const root = new THREE.Group();

  const starTex = createSoftStarSpriteTexture();
  const cloudTex = createFbmCloudSpriteTexture();
  const diffStarTex = createDiffractionStarTexture();
  disposables.push(starTex, cloudTex, diffStarTex);

  const sgrA = createBlackHoleCore(1.25, [1.0, 0.74, 0.36], starTex, cloudTex, disposables);
  root.add(sgrA.group);

  const starCount = 26000;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);

  const armCount = 4;
  const maxR = 148;
  const lyToUnits = 1 / 360;

  const coreCol = new THREE.Color(0xffe1a8);
  const armCol = new THREE.Color(0x93c5fd);
  const pinkNebula = new THREE.Color(0xf472b6);
  const tmpCol = new THREE.Color();

  for (let i = 0; i < starCount; i++) {
    const u = Math.random();
    let r = 0;
    let angle = 0;
    let y = 0;

    if (i < starCount * 0.26) {
      r = Math.pow(Math.random(), 1.35) * 30;
      angle = Math.random() * Math.PI * 2;
      const barStretch = 1.72;
      positions[i * 3] = Math.cos(angle) * r * barStretch;
      positions[i * 3 + 1] = (Math.random() - 0.5) * (9.5 * Math.exp(-r / 20));
      positions[i * 3 + 2] = Math.sin(angle) * r * 0.68;
      tmpCol.copy(coreCol).multiplyScalar(0.68 + Math.random() * 0.55);
    } else {
      const arm = i % armCount;
      const armOffset = (arm * Math.PI * 2) / armCount;
      r = 10 + Math.pow(u, 0.76) * (maxR - 10);
      const spiralTwist = (r / maxR) * 5.35;
      const scatter = (Math.random() - 0.5) * (0.24 + (r / maxR) * 0.42);
      angle = armOffset + spiralTwist + scatter;
      y = (Math.random() - 0.5) * (5.2 * Math.exp(-r / 75) + 0.65);

      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * r;

      const t = r / maxR;
      tmpCol.copy(coreCol).lerp(armCol, THREE.MathUtils.clamp(t * 1.25, 0, 1));
      if (Math.random() > 0.9) tmpCol.lerp(pinkNebula, 0.72);
      tmpCol.multiplyScalar(0.55 + Math.random() * 0.68);
    }

    colors[i * 3] = tmpCol.r;
    colors[i * 3 + 1] = tmpCol.g;
    colors[i * 3 + 2] = tmpCol.b;
  }

  const mwGeo = new THREE.BufferGeometry();
  mwGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  mwGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mwMat = new THREE.PointsMaterial({
    map: starTex,
    size: 1.05,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const galaxyPoints = new THREE.Points(mwGeo, mwMat);
  root.add(galaxyPoints);
  disposables.push(mwGeo, mwMat);

  const nebCount = 1250;
  const nPos = new Float32Array(nebCount * 3);
  const nCol = new Float32Array(nebCount * 3);
  for (let i = 0; i < nebCount; i++) {
    const arm = i % armCount;
    const armOffset = (arm * Math.PI * 2) / armCount;
    const r = 8 + Math.pow(Math.random(), 0.8) * (maxR * 0.92 - 8);
    const spiralTwist = (r / maxR) * 5.35;
    const scatter = (Math.random() - 0.5) * 0.2;
    const ang = armOffset + spiralTwist + scatter;
    nPos[i * 3] = Math.cos(ang) * r;
    nPos[i * 3 + 1] = (Math.random() - 0.5) * 2.2;
    nPos[i * 3 + 2] = Math.sin(ang) * r;

    const t = r / maxR;
    tmpCol
      .setHex(r < 28 ? 0xfbbf24 : Math.random() > 0.7 ? 0xec4899 : 0x38bdf8)
      .multiplyScalar(0.18 * (1 - t * 0.55));
    nCol[i * 3] = tmpCol.r;
    nCol[i * 3 + 1] = tmpCol.g;
    nCol[i * 3 + 2] = tmpCol.b;
  }
  const nebGeo = new THREE.BufferGeometry();
  nebGeo.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
  nebGeo.setAttribute('color', new THREE.BufferAttribute(nCol, 3));
  const nebMat = new THREE.PointsMaterial({
    map: cloudTex,
    size: 18.0,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const nebulaCloud = new THREE.Points(nebGeo, nebMat);
  root.add(nebulaCloud);
  disposables.push(nebGeo, nebMat);

  for (const rad of [26670 * lyToUnits, 148]) {
    const grGeo = new THREE.RingGeometry(rad - 0.16, rad + 0.16, 128);
    grGeo.rotateX(-Math.PI / 2);
    const grMat = new THREE.MeshBasicMaterial({
      color: rad < 100 ? 0x38bdf8 : 0x93c5fd,
      transparent: true,
      opacity: rad < 100 ? 0.16 : 0.09,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const grMesh = new THREE.Mesh(grGeo, grMat);
    galaxyPoints.add(grMesh);
    disposables.push(grGeo, grMat);
  }

  const sunBeaconGroup = new THREE.Group();
  sunBeaconGroup.position.set(0, 65 * lyToUnits, 26670 * lyToUnits);
  galaxyPoints.add(sunBeaconGroup);

  const sunMarkerGeo = new THREE.SphereGeometry(0.8, 16, 12);
  const sunMarkerMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, toneMapped: false });
  sunBeaconGroup.add(new THREE.Mesh(sunMarkerGeo, sunMarkerMat));

  const ringGeo = new THREE.RingGeometry(1.6, 2.25, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });
  const sunRing = new THREE.Mesh(ringGeo, ringMat);
  sunBeaconGroup.add(sunRing);
  disposables.push(sunMarkerGeo, sunMarkerMat, ringGeo, ringMat);

  const beaconRings: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; phase: number }> = [];
  const objGeo = new THREE.SphereGeometry(0.58, 12, 10);
  const objRingGeo = new THREE.RingGeometry(1.1, 1.55, 24);
  objRingGeo.rotateX(-Math.PI / 2);
  disposables.push(objGeo, objRingGeo);

  DEEP_SPACE_TARGETS.forEach((target, idx) => {
    if (target.id === 'milkyway' || target.id === 'sagittarius_a') return;
    const [lx, ly, lz] = target.galacticPosLy;
    const grp = new THREE.Group();
    grp.position.set(lx * lyToUnits, ly * lyToUnits, lz * lyToUnits);
    galaxyPoints.add(grp);

    const col = new THREE.Color(target.accentColor);
    const mat = new THREE.MeshBasicMaterial({ color: col, toneMapped: false });
    grp.add(new THREE.Mesh(objGeo, mat));

    const rMat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const rMesh = new THREE.Mesh(objRingGeo, rMat);
    grp.add(rMesh);
    beaconRings.push({ mesh: rMesh, mat: rMat, phase: idx * 0.7 });
    disposables.push(mat, rMat);
  });

  return {
    root,
    defaultCamPos: new THREE.Vector3(0, 74, 136),
    defaultTarget: new THREE.Vector3(0, 0, 0),
    update: (dt: number, elapsed: number) => {
      sgrA.update(dt, elapsed);
      galaxyPoints.rotation.y += dt * 0.02;
      nebulaCloud.rotation.y += dt * 0.02;
      const pulse = 1 + 0.45 * (0.5 + 0.5 * Math.sin(elapsed * 2.8));
      sunRing.scale.setScalar(pulse);
      ringMat.opacity = 0.88 - 0.45 * (0.5 + 0.5 * Math.sin(elapsed * 2.8));
      for (const b of beaconRings) {
        const s = 1 + 0.32 * (0.5 + 0.5 * Math.sin(elapsed * 2.2 + b.phase));
        b.mesh.scale.setScalar(s);
        b.mat.opacity = 0.72 - 0.35 * (0.5 + 0.5 * Math.sin(elapsed * 2.2 + b.phase));
      }
    },
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

/* ============================================================================
 * 3. BLACK HOLE VARIANTS (Sgr A*, Cygnus X-1, Gaia BH1, GRS 1915+105)
 * ========================================================================== */

function createBlackHoleVariant(
  id: 'sagittarius_a' | 'cygnus_x1' | 'gaia_bh1' | 'grs_1915',
): DeepSpaceDioramaRuntime {
  const disposables: Array<{ dispose: () => void }> = [];
  const root = new THREE.Group();
  const starTex = createSoftStarSpriteTexture();
  const cloudTex = createFbmCloudSpriteTexture();
  const diffStarTex = createDiffractionStarTexture();
  disposables.push(starTex, cloudTex, diffStarTex);

  root.add(
    createStarFieldLayer(
      2200,
      26,
      110,
      85,
      id === 'cygnus_x1'
        ? [0xbae6fd, 0x93c5fd, 0xf8fafc]
        : [0xfef3c7, 0xe2e8f0, 0xbae6fd],
      starTex,
      0.7,
      0.8,
      disposables,
    ),
  );

  // Sagitario A*: SMBH + Dense Nuclear Star Cluster & Orbiting S-Stars (S2)
  if (id === 'sagittarius_a') {
    const bh = createBlackHoleCore(2.0, [1.0, 0.74, 0.36], starTex, cloudTex, disposables);
    root.add(bh.group);

    const sStars = [
      { a: 18, e: 0.65, inc: 0.55, rot: 0.3, speed: 0.75, color: 0x93c5fd, size: 0.55 },
      { a: 24, e: 0.42, inc: -0.42, rot: 1.9, speed: 0.52, color: 0xfef08a, size: 0.46 },
      { a: 14, e: 0.72, inc: 0.95, rot: 3.4, speed: 1.05, color: 0xfdba74, size: 0.4 },
    ];
    const starRunners: Array<{
      mesh: THREE.Group;
      a: number;
      b: number;
      c: number;
      angle: number;
      speed: number;
    }> = [];

    for (const st of sStars) {
      const tilt = new THREE.Group();
      tilt.rotation.set(st.inc, st.rot, 0);
      root.add(tilt);

      const b = st.a * Math.sqrt(1 - st.e * st.e);
      const c = st.a * st.e;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 96; i++) {
        const ang = (i / 96) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(ang) * st.a - c, 0, Math.sin(ang) * b));
      }
      const oGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const oMat = new THREE.LineBasicMaterial({
        color: st.color,
        transparent: true,
        opacity: 0.22,
      });
      tilt.add(new THREE.Line(oGeo, oMat));

      const starUnit = new THREE.Group();
      const sGeo = new THREE.SphereGeometry(st.size, 20, 16);
      const sMat = new THREE.MeshBasicMaterial({ color: st.color, toneMapped: false });
      starUnit.add(new THREE.Mesh(sGeo, sMat));
      const flare = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: diffStarTex,
          color: st.color,
          transparent: true,
          opacity: 0.88,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      flare.scale.setScalar(st.size * 7.5);
      starUnit.add(flare);
      tilt.add(starUnit);
      disposables.push(oGeo, oMat, sGeo, sMat, flare.material);

      starRunners.push({
        mesh: starUnit,
        a: st.a,
        b,
        c,
        angle: Math.random() * Math.PI * 2,
        speed: st.speed,
      });
    }

    return {
      root,
      defaultCamPos: new THREE.Vector3(0, 11, 38),
      defaultTarget: new THREE.Vector3(0, 0, 0),
      update: (dt: number, elapsed: number) => {
        bh.update(dt, elapsed);
        for (const sr of starRunners) {
          const r = sr.mesh.position.length() || sr.a;
          sr.angle += dt * sr.speed * (sr.a / Math.max(4, r));
          sr.mesh.position.set(
            Math.cos(sr.angle) * sr.a - sr.c,
            0,
            Math.sin(sr.angle) * sr.b,
          );
        }
      },
      dispose: () => disposables.forEach((d) => d.dispose()),
    };
  }

  // Cygnus X-1: 21.2 M☉ BH (electric ice-blue photon ring + fiery coral-orange warped disk like video 00:03/00:10) + HDE 226868 Tidal Stream (00:12)
  if (id === 'cygnus_x1') {
    const binaryPivot = new THREE.Group();
    root.add(binaryPivot);

    const bh = createBlackHoleCore(1.28, [1.0, 0.36, 0.24], starTex, cloudTex, disposables, {
      photonRingTone: [0.22, 0.78, 1.45],
      lensedGalaxyIntensity: 0.55,
    });
    bh.group.position.set(-8.0, 0, 0);
    binaryPivot.add(bh.group);

    // Polar high-energy X-ray micro-jets on Cygnus X-1
    const cJetGeo = new THREE.CylinderGeometry(0.14, 0.85, 22, 24, 1, true);
    const cJetMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float axial = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.06, vUv.y);
          float pulse = 0.65 + 0.35 * sin(vUv.y * 24.0 - uTime * 8.0);
          gl_FragColor = vec4(vec3(0.55, 0.9, 1.8) * pulse, axial * 0.32);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const jN = new THREE.Mesh(cJetGeo, cJetMat);
    jN.position.set(-8.0, 11.5, 0);
    jN.rotation.x = Math.PI;
    const jS = new THREE.Mesh(cJetGeo, cJetMat);
    jS.position.set(-8.0, -11.5, 0);
    binaryPivot.add(jN, jS);
    disposables.push(cJetGeo, cJetMat);

    // Tidally deformed Blue Supergiant HDE 226868 (stretched toward L1 Lagrange point at -X!)
    const starGeo = new THREE.SphereGeometry(4.4, 64, 48);
    const sPos = starGeo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < sPos.count; i++) {
      v.fromBufferAttribute(sPos, i);
      if (v.x < 0) {
        const pull = Math.pow(-v.x / 4.4, 2.2) * 2.6;
        v.x -= pull;
        v.y *= 1 - pull * 0.08;
        v.z *= 1 - pull * 0.08;
      }
      sPos.setXYZ(i, v.x, v.y, v.z);
    }
    starGeo.computeVertexNormals();

    const starMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec3 vNormalView;
        varying vec3 vPosView;
        varying vec3 vLocal;
        void main() {
          vLocal = position;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vPosView = mv.xyz;
          vNormalView = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vNormalView;
        varying vec3 vPosView;
        varying vec3 vLocal;
        ${GLSL_NOISE_LIB}
        void main() {
          vec3 n = normalize(vLocal);
          float gran = fbm5(n.xy * 7.5 + n.zy * 5.2 + vec2(uTime * 0.35, -uTime * 0.25));
          float l1Heat = smoothstep(-1.0, -5.8, vLocal.x);
          vec3 deepBlue = vec3(0.28, 0.62, 1.35);
          vec3 hotCyan = vec3(0.88, 0.96, 1.85);
          vec3 col = mix(deepBlue, hotCyan, gran * 0.78 + l1Heat * 0.35);
          vec3 viewDir = normalize(-vPosView);
          float rim = pow(1.0 - clamp(dot(vNormalView, viewDir), 0.0, 1.0), 2.1);
          gl_FragColor = vec4(col + vec3(0.45, 0.85, 1.6) * rim * 1.1, 1.0);
        }
      `,
    });
    const supergiant = new THREE.Mesh(starGeo, starMat);
    supergiant.position.set(11.8, 0, 0);
    binaryPivot.add(supergiant);

    // Supergiant coronal glow halo
    const sgGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: cloudTex,
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.38,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    sgGlow.position.set(11.8, 0, 0);
    sgGlow.scale.set(18, 18, 1);
    binaryPivot.add(sgGlow);
    disposables.push(starGeo, starMat, sgGlow.material);

    // Volumetric Roche-lobe glowing plasma accretion bridge TubeGeometry
    const bridgeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(5.6, 0, 0),
      new THREE.Vector3(2.4, 0.1, -1.6),
      new THREE.Vector3(-1.8, 0.2, -3.4),
      new THREE.Vector3(-5.2, 0.1, -2.1),
      new THREE.Vector3(-6.2, 0, 0.6),
    ]);
    const tubeGeo = new THREE.TubeGeometry(bridgeCurve, 64, 0.72, 16, false);
    const tubeMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalView;
        varying vec3 vPosView;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vPosView = mv.xyz;
          vNormalView = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vNormalView;
        varying vec3 vPosView;
        ${GLSL_NOISE_LIB}
        void main() {
          vec3 viewDir = normalize(-vPosView);
          float soft = pow(abs(dot(vNormalView, viewDir)), 1.4);
          float flow = fbm5(vec2(vUv.x * 9.0 - uTime * 3.2, vUv.y * 4.0));
          float ends = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
          vec3 col = mix(vec3(0.35, 0.85, 1.5), vec3(1.6, 1.85, 2.1), flow);
          gl_FragColor = vec4(col, soft * flow * ends * 0.88);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const bridgeTube = new THREE.Mesh(tubeGeo, tubeMat);
    binaryPivot.add(bridgeTube);
    disposables.push(tubeGeo, tubeMat);

    return {
      root,
      defaultCamPos: new THREE.Vector3(2, 15, 42),
      defaultTarget: new THREE.Vector3(1.5, 0, 0),
      update: (dt: number, elapsed: number) => {
        bh.update(dt, elapsed);
        starMat.uniforms.uTime.value = elapsed;
        tubeMat.uniforms.uTime.value = elapsed;
        cJetMat.uniforms.uTime.value = elapsed;
        binaryPivot.rotation.y += dt * 0.22;
      },
      dispose: () => disposables.forEach((d) => d.dispose()),
    };
  }

  // Gaia BH1: Dormant 9.6 M☉ Schwarzschild Lens warping the Milky Way core & dust lanes into concentric Einstein rings (video 00:13-00:14)
  if (id === 'gaia_bh1') {
    const bh = createBlackHoleCore(1.75, [0.95, 0.85, 0.62], starTex, cloudTex, disposables, {
      withAccretionDisk: false,
      photonRingTone: [0.92, 0.82, 0.68],
      lensedGalaxyIntensity: 1.55,
    });
    root.add(bh.group);

    const orbitPts: THREE.Vector3[] = [];
    const orbitR = 16.5;
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      orbitPts.push(new THREE.Vector3(Math.cos(a) * orbitR, 0, Math.sin(a) * orbitR * 0.86));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
    const orbitMat = new THREE.LineBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.28,
    });
    root.add(new THREE.Line(orbitGeo, orbitMat));

    const gStarGeo = new THREE.SphereGeometry(2.45, 48, 36);
    const gStarMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec3 vNormalView;
        varying vec3 vPosView;
        varying vec3 vLocal;
        void main() {
          vLocal = position;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vPosView = mv.xyz;
          vNormalView = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vNormalView;
        varying vec3 vPosView;
        varying vec3 vLocal;
        ${GLSL_NOISE_LIB}
        void main() {
          vec3 n = normalize(vLocal);
          float gran = fbm5(n.xy * 10.0 + n.yz * 8.0 + uTime * 0.25);
          vec3 viewDir = normalize(-vPosView);
          float mu = clamp(dot(vNormalView, viewDir), 0.0, 1.0);
          float limb = pow(mu, 0.45);
          vec3 col = mix(vec3(1.15, 0.52, 0.14), vec3(1.85, 1.55, 0.82), gran * 0.7 + limb * 0.45);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const gStar = new THREE.Mesh(gStarGeo, gStarMat);
    root.add(gStar);

    const gGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: diffStarTex,
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    gGlow.scale.set(13.5, 13.5, 1);
    gStar.add(gGlow);
    disposables.push(orbitGeo, orbitMat, gStarGeo, gStarMat, gGlow.material);

    return {
      root,
      defaultCamPos: new THREE.Vector3(0, 16, 40),
      defaultTarget: new THREE.Vector3(0, 0, 0),
      update: (dt: number, elapsed: number) => {
        bh.update(dt, elapsed);
        gStarMat.uniforms.uTime.value = elapsed;
        const a = elapsed * 0.35;
        gStar.position.set(Math.cos(a) * orbitR, 0, Math.sin(a) * orbitR * 0.86);
        bh.group.position.set(-Math.cos(a) * 2.2, 0, -Math.sin(a) * 1.9);
      },
      dispose: () => disposables.forEach((d) => d.dispose()),
    };
  }

  // GRS 1915+105: Spinning Kerr Microquasar with Blistering Crimson-Gold Disk + Helical Relativistic Jets (video 00:06)
  const bh = createBlackHoleCore(1.6, [1.25, 0.34, 0.14], starTex, cloudTex, disposables, {
    photonRingTone: [1.45, 0.92, 0.35],
    lensedGalaxyIntensity: 0.45,
  });
  root.add(bh.group);

  const jetMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0x60a5fa) },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vPosView;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vPosView = mv.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vPosView;
      ${GLSL_NOISE_LIB}
      void main() {
        vec3 viewDir = normalize(-vPosView);
        float edge = pow(abs(dot(vNormalView, viewDir)), 1.25);
        float flow = fbm5(vec2(vUv.x * 6.0, vUv.y * 14.0 + uTime * 5.2));
        float shock = 0.65 + 0.35 * sin(vUv.y * 32.0 + uTime * 11.0);
        float axialFade = smoothstep(0.0, 0.14, vUv.y) * smoothstep(1.0, 0.08, vUv.y);
        vec3 col = mix(uColor, vec3(1.15, 1.35, 1.85), flow * shock);
        gl_FragColor = vec4(col * 1.65, axialFade * edge * (0.28 + 0.72 * flow) * 0.65);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  disposables.push(jetMat);

  for (const dir of [1, -1]) {
    // Nested dual-shell relativistic jet + helical magnetic filament tubes
    const jGeo = new THREE.CylinderGeometry(0.18, 2.1, 52, 32, 12, true);
    const jMesh = new THREE.Mesh(jGeo, jetMat);
    jMesh.position.y = dir * 28.5;
    if (dir > 0) jMesh.rotation.x = Math.PI;
    root.add(jMesh);
    disposables.push(jGeo);

    const helixPts: THREE.Vector3[] = [];
    for (let s = 0; s <= 48; s++) {
      const t = s / 48;
      const y = dir * (2.6 + t * 48);
      const rad = 0.25 + t * 1.45;
      const ang = t * Math.PI * 10;
      helixPts.push(new THREE.Vector3(Math.cos(ang) * rad, y, Math.sin(ang) * rad));
    }
    const hTubeGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helixPts), 80, 0.085, 8, false);
    const hTubeMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const hMesh = new THREE.Mesh(hTubeGeo, hTubeMat);
    root.add(hMesh);
    disposables.push(hTubeGeo, hTubeMat);
  }

  const knotCount = 320;
  const kPos = new Float32Array(knotCount * 3);
  const kDirs = new Float32Array(knotCount);
  for (let i = 0; i < knotCount; i++) {
    const dir = i % 2 === 0 ? 1 : -1;
    kDirs[i] = dir;
    const yd = 3 + Math.random() * 50;
    const sp = 0.16 + (yd / 52) * 1.35;
    const ang = Math.random() * Math.PI * 2;
    kPos[i * 3] = Math.cos(ang) * sp;
    kPos[i * 3 + 1] = dir * yd;
    kPos[i * 3 + 2] = Math.sin(ang) * sp;
  }
  const kGeo = new THREE.BufferGeometry();
  kGeo.setAttribute('position', new THREE.BufferAttribute(kPos, 3));
  const kMat = new THREE.PointsMaterial({
    map: cloudTex,
    color: 0xbae6fd,
    size: 1.35,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  root.add(new THREE.Points(kGeo, kMat));
  disposables.push(kGeo, kMat);

  return {
    root,
    defaultCamPos: new THREE.Vector3(0, 14, 42),
    defaultTarget: new THREE.Vector3(0, 0, 0),
    update: (dt: number, elapsed: number) => {
      bh.update(dt, elapsed);
      jetMat.uniforms.uTime.value = elapsed;
      const attr = kGeo.attributes.position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < knotCount; i++) {
        const dir = kDirs[i];
        arr[i * 3 + 1] += dir * dt * 28;
        if (Math.abs(arr[i * 3 + 1]) > 53) {
          arr[i * 3 + 1] = dir * (3 + Math.random() * 4);
          const ang = Math.random() * Math.PI * 2;
          const sp = 0.15 + Math.random() * 0.3;
          arr[i * 3] = Math.cos(ang) * sp;
          arr[i * 3 + 2] = Math.sin(ang) * sp;
        }
      }
      attr.needsUpdate = true;
    },
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

/* ============================================================================
 * 4. PULSARS (Chandra X-Ray Magnetosphere Dipoles + Alfvén Beams + Vela Bow Shock)
 * ========================================================================== */

function createPulsarDiorama(
  id: 'crab_pulsar' | 'vela_pulsar',
): DeepSpaceDioramaRuntime {
  const disposables: Array<{ dispose: () => void }> = [];
  const root = new THREE.Group();
  const starTex = createSoftStarSpriteTexture();
  const cloudTex = createFbmCloudSpriteTexture();
  const diffStarTex = createDiffractionStarTexture();
  disposables.push(starTex, cloudTex, diffStarTex);

  const isCrab = id === 'crab_pulsar';
  const beamHex = isCrab ? 0x60a5fa : 0x22d3ee;

  root.add(
    createStarFieldLayer(
      1400,
      24,
      98,
      68,
      [0x93c5fd, 0xe2e8f0, 0xc4b5fd],
      starTex,
      0.62,
      0.74,
      disposables,
    ),
  );

  const spinAxis = new THREE.Group();
  spinAxis.rotation.z = 0.24;
  root.add(spinAxis);

  const magTilt = new THREE.Group();
  magTilt.rotation.z = 0.56;
  spinAxis.add(magTilt);

  // Hot magnetized neutron star crust with glowing magnetic polar caps
  const nsGeo = new THREE.SphereGeometry(0.95, 48, 36);
  const nsMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(beamHex) },
    },
    vertexShader: `
      varying vec3 vLocal;
      varying vec3 vNormalView;
      varying vec3 vPosView;
      void main() {
        vLocal = normalize(position);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vPosView = mv.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec3 vLocal;
      varying vec3 vNormalView;
      varying vec3 vPosView;
      void main() {
        float polarCap = pow(abs(vLocal.y), 3.5);
        vec3 viewDir = normalize(-vPosView);
        float rim = pow(1.0 - clamp(dot(vNormalView, viewDir), 0.0, 1.0), 2.5);
        vec3 crust = mix(uColor * 1.15, vec3(1.6, 1.95, 2.2), polarCap);
        gl_FragColor = vec4(crust + uColor * rim * 1.4, 1.0);
      }
    `,
  });
  magTilt.add(new THREE.Mesh(nsGeo, nsMat));

  // Video 00:01 Spiked Magenta-Violet / Electric-Cyan Pulsar Plasma Flare Corona
  const flareGeo = new THREE.SphereGeometry(5.6, 32, 24);
  const flareMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPrimary: { value: new THREE.Color(isCrab ? 0xe879f9 : 0x22d3ee) },
      uSecondary: { value: new THREE.Color(isCrab ? 0x60a5fa : 0xa855f7) },
    },
    vertexShader: `
      varying vec3 vLocalDir;
      varying vec3 vNormalView;
      varying vec3 vPosView;
      void main() {
        vLocalDir = normalize(position);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vPosView = mv.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uPrimary;
      uniform vec3 uSecondary;
      varying vec3 vLocalDir;
      varying vec3 vNormalView;
      varying vec3 vPosView;
      ${GLSL_NOISE_LIB}
      void main() {
        vec3 viewDir = normalize(-vPosView);
        float centerGlow = pow(abs(dot(vNormalView, viewDir)), 1.65);
        float theta = atan(vLocalDir.z, vLocalDir.x);
        float phi = acos(clamp(vLocalDir.y, -1.0, 1.0));
        // Sharp radial plasma corona spikes bursting outward
        float spikeA = fbm5(vec2(theta * 4.5 + uTime * 0.9, phi * 4.5 - uTime * 0.7));
        float spikeB = fbm5(vec2(theta * 9.0 - uTime * 1.4, phi * 9.0 + uTime * 1.1));
        float burst = pow(clamp(spikeA * 0.6 + spikeB * 0.55, 0.0, 1.2), 1.9);
        vec3 col = mix(uSecondary, uPrimary, spikeA);
        col = mix(col, vec3(1.9, 1.85, 2.3), pow(centerGlow, 2.4) * 0.85);
        gl_FragColor = vec4(col * (0.85 + burst * 1.6), centerGlow * (0.28 + burst * 0.78));
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const flareShell = new THREE.Mesh(flareGeo, flareMat);
  magTilt.add(flareShell);

  const glowSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: diffStarTex,
      color: isCrab ? 0xf0abfc : beamHex,
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  glowSprite.scale.set(11.5, 11.5, 1);
  magTilt.add(glowSprite);
  disposables.push(nsGeo, nsMat, flareGeo, flareMat, glowSprite.material);

  // Authentic Spherical Magnetic Dipole Field Lines: r = Rmax * sin^2(theta)
  const fieldMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0x7dd3fc) },
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float flow = 0.55 + 0.45 * sin(vUv.x * 18.0 - uTime * 7.5);
        float fade = sin(vUv.x * 3.14159);
        gl_FragColor = vec4(uColor * 1.4 * flow, fade * 0.52);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  disposables.push(fieldMat);

  for (let shell = 0; shell < 2; shell++) {
    const rMax = shell === 0 ? 5.6 : 9.4;
    const count = 8;
    for (let l = 0; l < count; l++) {
      const phi = (l * Math.PI * 2) / count + shell * 0.25;
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= 40; s++) {
        const theta = 0.16 + (s / 40) * (Math.PI - 0.32);
        const r = rMax * Math.sin(theta) * Math.sin(theta);
        pts.push(
          new THREE.Vector3(
            r * Math.sin(theta) * Math.cos(phi),
            r * Math.cos(theta),
            r * Math.sin(theta) * Math.sin(phi),
          ),
        );
      }
      const fGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 44, 0.032, 6, false);
      magTilt.add(new THREE.Mesh(fGeo, fieldMat));
      disposables.push(fGeo);
    }
  }

  // Dual Soft Volumetric Synchrotron Lighthouse Cones (nested inner + outer shell with smooth edges)
  const beamMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(beamHex) },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vPosView;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vPosView = mv.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vPosView;
      ${GLSL_NOISE_LIB}
      void main() {
        vec3 viewDir = normalize(-vPosView);
        float softVol = pow(abs(dot(vNormalView, viewDir)), 1.35);
        float spiral = fbm5(vec2(vUv.x * 7.0 + uTime * 2.5, vUv.y * 10.0 + uTime * 6.0));
        float fade = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.04, vUv.y);
        vec3 col = mix(uColor, vec3(1.15, 1.35, 1.75), spiral * 0.72);
        gl_FragColor = vec4(col * 1.45, fade * softVol * (0.35 + 0.65 * spiral) * 0.56);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  disposables.push(beamMat);

  for (const [topR, botR] of [[0.22, 3.2], [0.35, 5.2]]) {
    const bGeo = new THREE.CylinderGeometry(topR, botR, 38, 36, 10, true);
    const nBeam = new THREE.Mesh(bGeo, beamMat);
    nBeam.position.y = 19.6;
    nBeam.rotation.x = Math.PI;
    const sBeam = new THREE.Mesh(bGeo, beamMat);
    sBeam.position.y = -19.6;
    magTilt.add(nBeam, sBeam);
    disposables.push(bGeo);
  }

  // Chandra Equatorial X-Ray Synchrotron Torus & Turbulent Shock Wisps
  const torusGeo = new THREE.RingGeometry(4.2, 16.5, 128, 12);
  torusGeo.rotateX(-Math.PI / 2);
  const torusMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(isCrab ? 0x38bdf8 : 0x22d3ee) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec3 vPos;
      ${GLSL_NOISE_LIB}
      void main() {
        float r = length(vPos.xz);
        float t = clamp((r - 4.2) / 12.3, 0.0, 1.0);
        float ang = atan(vPos.z, vPos.x);
        float wisps = fbm5(vec2(r * 0.85 - uTime * 2.1, ang * 3.5 + uTime * 0.4));
        float wave = 0.5 + 0.5 * sin(r * 2.6 - uTime * 4.2 + wisps * 4.0);
        float envelope = sin(t * 3.14159);
        vec3 col = mix(uColor, vec3(0.85, 0.96, 1.4), wave * wisps);
        gl_FragColor = vec4(col * 1.45, envelope * (0.28 + 0.72 * wisps) * 0.58);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const torus = new THREE.Mesh(torusGeo, torusMat);
  spinAxis.add(torus);
  disposables.push(torusGeo, torusMat);

  // Vela Pulsar: Sculpted Parabolic Chandra Bow-Shock Shell + Supersonic Tail
  let bowMat: THREE.ShaderMaterial | null = null;
  if (!isCrab) {
    const bowPts: THREE.Vector2[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const rad = Math.sin(t * Math.PI * 0.52) * 12.5;
      const z = 5.5 - t * t * 14.5;
      bowPts.push(new THREE.Vector2(rad, z));
    }
    const bowGeo = new THREE.LatheGeometry(bowPts, 48);
    bowGeo.rotateX(Math.PI / 2);
    bowMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalView;
        varying vec3 vPosView;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vPosView = mv.xyz;
          vNormalView = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vNormalView;
        varying vec3 vPosView;
        ${GLSL_NOISE_LIB}
        void main() {
          vec3 viewDir = normalize(-vPosView);
          float rim = pow(1.0 - abs(dot(vNormalView, viewDir)), 1.5);
          float turb = fbm5(vec2(vUv.x * 8.0, vUv.y * 6.0 - uTime * 1.2));
          float fade = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.25, vUv.y);
          gl_FragColor = vec4(vec3(0.35, 0.85, 1.45) * (0.8 + turb), (0.18 + rim * 0.72) * fade * turb * 0.8);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const bowMesh = new THREE.Mesh(bowGeo, bowMat);
    bowMesh.rotation.set(-0.35, 0.25, 0);
    root.add(bowMesh);
    disposables.push(bowGeo, bowMat);
  }

  return {
    root,
    defaultCamPos: new THREE.Vector3(0, 12, 36),
    defaultTarget: new THREE.Vector3(0, 0, 0),
    update: (dt: number, elapsed: number) => {
      magTilt.rotation.y += dt * (isCrab ? 7.8 : 4.5);
      nsMat.uniforms.uTime.value = elapsed;
      flareMat.uniforms.uTime.value = elapsed;
      fieldMat.uniforms.uTime.value = elapsed;
      beamMat.uniforms.uTime.value = elapsed;
      torusMat.uniforms.uTime.value = elapsed;
      if (bowMat) bowMat.uniforms.uTime.value = elapsed;
    },
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

/* ============================================================================
 * 5. NEBULAE (Volumetric FBM Gas Shaders, Dark Dust Ridges, 3D Tube Filaments)
 * ========================================================================== */

function createNebulaDiorama(
  id: 'nebula_orion' | 'nebula_eagle' | 'nebula_carina' | 'nebula_crab' | 'nebula_helix',
): DeepSpaceDioramaRuntime {
  const disposables: Array<{ dispose: () => void }> = [];
  const root = new THREE.Group();
  const starTex = createSoftStarSpriteTexture();
  const cloudTex = createFbmCloudSpriteTexture();
  const diffStarTex = createDiffractionStarTexture();
  const nebTex = createNebulaPuffTexture();
  disposables.push(starTex, cloudTex, diffStarTex, nebTex);

  root.add(
    createStarFieldLayer(
      1400,
      30,
      115,
      90,
      [0xfef3c7, 0xbae6fd, 0xfbcfe8, 0xf8fafc],
      starTex,
      0.62,
      0.78,
      disposables,
    ),
  );

  // 1. Nebulosa de Orión (M42): Sculpted H-II Ionization Bowl + Orion Bar + Dark Fish Mouth + Trapezium
  if (id === 'nebula_orion') {
    const cloudGroup = new THREE.Group();
    root.add(cloudGroup);

    // Sculpted 3D parabolic cavity shell with procedural JWST/Hubble emission shader
    const bowlGeo = new THREE.SphereGeometry(20, 64, 48, 0, Math.PI * 2, 0.25, Math.PI * 0.72);
    const pos = bowlGeo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n =
        1 +
        0.16 * Math.sin(v.x * 0.28 + v.y * 0.22) +
        0.1 * Math.cos(v.z * 0.36 - v.x * 0.18);
      v.multiplyScalar(n);
      v.z = -Math.abs(v.z) * 0.78; // Concave cavity facing viewer
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    bowlGeo.computeVertexNormals();

    const bowlMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec3 vLocal;
        varying vec3 vNormalView;
        varying vec3 vPosView;
        void main() {
          vLocal = position;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vPosView = mv.xyz;
          vNormalView = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vLocal;
        varying vec3 vNormalView;
        varying vec3 vPosView;
        ${GLSL_NOISE_LIB}
        void main() {
          vec2 p = vLocal.xy * 0.16;
          float n1 = fbm5(p + vec2(uTime * 0.015, 0.0));
          float n2 = fbm5(p * 2.4 - vec2(0.0, uTime * 0.02));
          float r = length(vLocal.xy) / 20.0;

          // Bright Orion Bar diagonal ionization ridge
          float bar = exp(-pow((vLocal.x * 0.45 + vLocal.y + 4.5) / 2.2, 2.0)) * 0.65;
          // Dark foreground dust lane ("Fish Mouth")
          float dustLane = smoothstep(0.18, 0.68, exp(-pow((vLocal.y - vLocal.x * 0.35 - 1.8) / 2.6, 2.0)) * smoothstep(0.0, 0.5, vLocal.x * 0.08 + 0.6));

          vec3 oiii = vec3(0.18, 0.85, 0.88);
          vec3 halpha = vec3(0.95, 0.32, 0.62);
          vec3 dustWarm = vec3(0.85, 0.42, 0.16);

          vec3 col = mix(oiii, halpha, smoothstep(0.15, 0.72, r + (n1 - 0.5) * 0.35));
          col = mix(col, dustWarm, bar * n2);
          col *= (0.45 + n1 * 0.95 + bar * 0.8) * (1.0 - dustLane * 0.72);

          vec3 viewDir = normalize(-vPosView);
          float softEdge = smoothstep(0.98, 0.35, r) * (0.4 + 0.6 * abs(dot(vNormalView, viewDir)));
          gl_FragColor = vec4(col, clamp(softEdge * (0.45 + n2 * 0.65), 0.0, 0.92));
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const bowlMesh = new THREE.Mesh(bowlGeo, bowlMat);
    cloudGroup.add(bowlMesh);
    disposables.push(bowlGeo, bowlMat);

    // Layered FBM billowing foreground gas clouds
    const pCount = 650;
    const pPos = new Float32Array(pCount * 3);
    const pCol = new Float32Array(pCount * 3);
    const tmp = new THREE.Color();
    for (let i = 0; i < pCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = 1.5 + Math.pow(Math.random(), 0.75) * 18.5;
      pPos[i * 3] = Math.cos(ang) * r;
      pPos[i * 3 + 1] = Math.sin(ang) * r * 0.85;
      pPos[i * 3 + 2] = -r * 0.25 + (Math.random() - 0.5) * 6.0;
      tmp.setHex(r < 6.5 ? 0x2dd4bf : i % 3 === 0 ? 0xfb923c : 0xf472b6).multiplyScalar(0.24);
      pCol[i * 3] = tmp.r;
      pCol[i * 3 + 1] = tmp.g;
      pCol[i * 3 + 2] = tmp.b;
    }
    const nGeo = new THREE.BufferGeometry();
    nGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    nGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    const nMat = new THREE.PointsMaterial({
      map: cloudTex,
      size: 9.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    cloudGroup.add(new THREE.Points(nGeo, nMat));
    disposables.push(nGeo, nMat);

    // Trapezium Cluster OB Stars with crisp JWST diffraction spikes
    const trapCoords: Array<[number, number, number, number]> = [
      [0.4, 0.3, 0.4, 0.65],
      [-1.1, -0.5, 0.7, 0.48],
      [0.9, -0.9, -0.4, 0.5],
      [-0.4, 1.1, -0.3, 0.44],
    ];
    for (const [x, y, z, rad] of trapCoords) {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: diffStarTex,
          color: 0xe0f2fe,
          transparent: true,
          opacity: 0.98,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      s.position.set(x, y, z);
      s.scale.setScalar(rad * 11);
      cloudGroup.add(s);
      disposables.push(s.material);
    }

    return {
      root,
      defaultCamPos: new THREE.Vector3(0, 3, 35),
      defaultTarget: new THREE.Vector3(0, 0, 0),
      update: (dt: number, elapsed: number) => {
        bowlMat.uniforms.uTime.value = elapsed;
        cloudGroup.rotation.y = Math.sin(elapsed * 0.12) * 0.28 + elapsed * dt * 0.02;
      },
      dispose: () => disposables.forEach((d) => d.dispose()),
    };
  }

  // 2. Pilares de la Creación (M16): Organic Sculpted Dusty Elephant-Trunk Pillars + Rim-Lit Halos + EGGs
  if (id === 'nebula_eagle') {
    const eagleGrp = new THREE.Group();
    root.add(eagleGrp);

    // Custom organic multi-curve dusty elephant trunk builder (NOT rigid cylinders!)
    const pillarDefs = [
      {
        pts: [
          new THREE.Vector3(-8.2, -11.5, 1.2),
          new THREE.Vector3(-7.0, -5.5, 0.5),
          new THREE.Vector3(-5.8, 1.2, -0.4),
          new THREE.Vector3(-4.6, 6.8, -0.8),
          new THREE.Vector3(-3.8, 10.6, 0.2),
        ],
        baseR: 2.9,
        topR: 1.15,
      },
      {
        pts: [
          new THREE.Vector3(-0.6, -11.5, -1.2),
          new THREE.Vector3(-0.1, -5.2, -0.7),
          new THREE.Vector3(0.4, 0.4, -0.2),
          new THREE.Vector3(1.1, 4.8, 0.3),
        ],
        baseR: 2.35,
        topR: 0.95,
      },
      {
        pts: [
          new THREE.Vector3(5.8, -11.5, 1.4),
          new THREE.Vector3(5.4, -7.0, 0.8),
          new THREE.Vector3(5.0, -2.5, 0.2),
          new THREE.Vector3(4.6, 1.2, -0.3),
        ],
        baseR: 1.85,
        topR: 0.72,
      },
    ];

    const pillarMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec3 vNormalView;
        varying vec3 vPosView;
        varying vec3 vLocal;
        varying vec2 vUv;
        ${GLSL_NOISE_LIB}
        void main() {
          vUv = uv;
          vec3 displaced = position + normal * (fbm5(position.xy * 0.45 + position.yz * 0.35) - 0.45) * 1.45;
          vLocal = displaced;
          vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
          vPosView = mv.xyz;
          vNormalView = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vNormalView;
        varying vec3 vPosView;
        varying vec3 vLocal;
        varying vec2 vUv;
        ${GLSL_NOISE_LIB}
        void main() {
          vec3 viewDir = normalize(-vPosView);
          float fres = pow(1.0 - abs(dot(vNormalView, viewDir)), 1.9);
          float detail = fbm5(vLocal.xy * 0.55 + vLocal.zy * 0.4);
          float topUV = smoothstep(-5.0, 9.0, vLocal.y);

          // Dark dense molecular H2 dust interior + glowing photo-evaporating sulfur/cyan rim!
          vec3 darkDust = mix(vec3(0.05, 0.025, 0.018), vec3(0.24, 0.11, 0.05), detail);
          vec3 cyanHalo = vec3(0.22, 0.78, 0.92);
          vec3 amberRim = vec3(1.45, 0.62, 0.18);
          vec3 rimCol = mix(cyanHalo, amberRim, topUV * 0.75 + detail * 0.25);

          float shimmer = 0.92 + 0.08 * sin(vLocal.y * 0.9 - uTime * 0.9);
          vec3 finalCol = darkDust + rimCol * fres * (1.25 + detail * 0.9) * shimmer;
          gl_FragColor = vec4(finalCol, 0.96);
        }
      `,
      transparent: true,
    });
    disposables.push(pillarMat);

    for (const def of pillarDefs) {
      const curve = new THREE.CatmullRomCurve3(def.pts);
      const geo = new THREE.TubeGeometry(curve, 56, 1.0, 28, false);
      const frames = curve.computeFrenetFrames(56, false);
      const pos = geo.attributes.position;
      const center = new THREE.Vector3();
      const v = new THREE.Vector3();
      for (let s = 0; s <= 56; s++) {
        const t = s / 56;
        curve.getPointAt(t, center);
        const rad = THREE.MathUtils.lerp(def.baseR, def.topR, Math.pow(t, 0.75));
        for (let r = 0; r <= 28; r++) {
          const idx = s * 29 + r;
          v.fromBufferAttribute(pos, idx).sub(center);
          const knobby = 1 + 0.28 * Math.sin(t * 14 + r * 0.9) + 0.15 * Math.cos(t * 23);
          v.multiplyScalar(rad * knobby).add(center);
          pos.setXYZ(idx, v.x, v.y, v.z);
        }
      }
      geo.computeVertexNormals();
      void frames;
      eagleGrp.add(new THREE.Mesh(geo, pillarMat));
      disposables.push(geo);

      // Tip newborn protostar + Evaporating Gaseous Globule (EGG) flare
      const tip = def.pts[def.pts.length - 1];
      const knot = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: diffStarTex,
          color: 0xfdba74,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      knot.position.copy(tip).add(new THREE.Vector3(0, 0.45, 0.4));
      knot.scale.setScalar(4.8);
      eagleGrp.add(knot);
      disposables.push(knot.material);
    }

    // Soft FBM ionized blue-teal & amber surrounding nebula clouds
    const hazeCount = 340;
    const hPos = new Float32Array(hazeCount * 3);
    const hCol = new Float32Array(hazeCount * 3);
    const tmp = new THREE.Color();
    for (let i = 0; i < hazeCount; i++) {
      hPos[i * 3] = (Math.random() - 0.5) * 32;
      hPos[i * 3 + 1] = -12 + Math.random() * 26;
      hPos[i * 3 + 2] = -3 + (Math.random() - 0.5) * 14;
      tmp.setHex(i % 2 === 0 ? 0x0ea5e9 : 0xf59e0b).multiplyScalar(0.22);
      hCol[i * 3] = tmp.r;
      hCol[i * 3 + 1] = tmp.g;
      hCol[i * 3 + 2] = tmp.b;
    }
    const hGeo = new THREE.BufferGeometry();
    hGeo.setAttribute('position', new THREE.BufferAttribute(hPos, 3));
    hGeo.setAttribute('color', new THREE.BufferAttribute(hCol, 3));
    const hMat = new THREE.PointsMaterial({
      map: cloudTex,
      size: 11.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    eagleGrp.add(new THREE.Points(hGeo, hMat));
    disposables.push(hGeo, hMat);

    return {
      root,
      defaultCamPos: new THREE.Vector3(0, 2, 34),
      defaultTarget: new THREE.Vector3(0, -1, 0),
      update: (dt: number, elapsed: number) => {
        pillarMat.uniforms.uTime.value = elapsed;
        eagleGrp.rotation.y += dt * 0.038;
      },
      dispose: () => disposables.forEach((d) => d.dispose()),
    };
  }

  // 3. Nebulosa de Carina y Eta Carinae (NGC 3372): Authentic Pinched Homunculus Twin Lobes + JWST Cosmic Cliffs
  if (id === 'nebula_carina') {
    const carinaGrp = new THREE.Group();
    root.add(carinaGrp);

    // Pinched peanut-shaped Homunculus Nebula around Eta Carinae
    const homoGrp = new THREE.Group();
    homoGrp.position.set(0, 4.2, 0);
    homoGrp.rotation.z = 0.52;
    carinaGrp.add(homoGrp);

    const hPts: THREE.Vector2[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const y = (t * 2 - 1) * 7.2;
      // Pinched narrow waist at y=0, billowing rounded lobes at north & south!
      const lobeEnv = Math.abs(Math.sin(t * Math.PI));
      const waistPinch = 0.14 + 0.86 * Math.pow(Math.abs(t * 2 - 1), 0.72);
      const r = 3.85 * Math.sqrt(Math.max(0.01, lobeEnv)) * waistPinch;
      hPts.push(new THREE.Vector2(r, y));
    }
    const homoGeo = new THREE.LatheGeometry(hPts, 48);
    const hPosAttr = homoGeo.attributes.position;
    const hv = new THREE.Vector3();
    for (let i = 0; i < hPosAttr.count; i++) {
      hv.fromBufferAttribute(hPosAttr, i);
      const blister = 1 + 0.08 * Math.sin(hv.x * 2.4 + hv.y * 1.9) * Math.cos(hv.z * 2.4);
      hv.x *= blister;
      hv.z *= blister;
      hPosAttr.setXYZ(i, hv.x, hv.y, hv.z);
    }
    homoGeo.computeVertexNormals();

    const homoMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec3 vLocal;
        varying vec3 vNormalView;
        varying vec3 vPosView;
        void main() {
          vLocal = position;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vPosView = mv.xyz;
          vNormalView = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vLocal;
        varying vec3 vNormalView;
        varying vec3 vPosView;
        ${GLSL_NOISE_LIB}
        void main() {
          vec3 viewDir = normalize(-vPosView);
          float rim = pow(1.0 - abs(dot(vNormalView, viewDir)), 1.6);
          float cells = fbm5(vLocal.xy * 0.9 + vLocal.zy * 0.7 + vec2(uTime * 0.04, 0.0));
          float waist = exp(-pow(vLocal.y / 0.85, 2.0));
          vec3 shellCol = mix(vec3(0.85, 0.36, 0.1), vec3(1.35, 0.82, 0.38), cells);
          shellCol += vec3(0.55, 0.92, 1.45) * waist * 0.85;
          gl_FragColor = vec4(shellCol * (0.65 + rim * 0.95), 0.34 + rim * 0.58);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    homoGrp.add(new THREE.Mesh(homoGeo, homoMat));

    const etaStar = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: diffStarTex,
        color: 0xfff8e7,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    etaStar.scale.setScalar(11.5);
    homoGrp.add(etaStar);
    disposables.push(homoGeo, homoMat, etaStar.material);

    // Multi-layered JWST "Cosmic Cliffs" dusty mountain silhouettes + golden ionization ridge
    const cliffMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        ${GLSL_NOISE_LIB}
        void main() {
          float ridge = 0.42 + 0.14 * sin(vUv.x * 7.5 + 0.6) + 0.09 * fbm5(vec2(vUv.x * 6.0, 1.4));
          float cliffMask = smoothstep(ridge + 0.02, ridge - 0.04, vUv.y);
          float crest = exp(-pow((vUv.y - ridge) / 0.045, 2.0));
          float tex = fbm5(vUv * vec2(12.0, 9.0) + vec2(uTime * 0.02, 0.0));
          float cavity = smoothstep(ridge - 0.03, ridge + 0.35, vUv.y);

          vec3 mountain = mix(vec3(0.08, 0.035, 0.015), vec3(0.45, 0.2, 0.07), tex);
          vec3 goldRim = vec3(1.45, 0.78, 0.25) * crest * (0.7 + tex * 0.7);
          vec3 blueGas = vec3(0.14, 0.52, 0.92) * cavity * (0.35 + tex * 0.65);

          vec3 col = mountain * cliffMask + goldRim + blueGas;
          float alpha = clamp(cliffMask * 0.92 + crest * 0.85 + cavity * tex * 0.55, 0.0, 0.95) * smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x) * smoothstep(0.0, 0.12, vUv.y);
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    disposables.push(cliffMat);

    for (let l = 0; l < 3; l++) {
      const cliffGeo = new THREE.PlaneGeometry(36 - l * 3, 16);
      const cliffMesh = new THREE.Mesh(cliffGeo, cliffMat);
      cliffMesh.position.set((l - 1) * 1.8, -5.8 - l * 0.8, -2.5 + l * 2.2);
      carinaGrp.add(cliffMesh);
      disposables.push(cliffGeo);
    }

    return {
      root,
      defaultCamPos: new THREE.Vector3(0, 3, 34),
      defaultTarget: new THREE.Vector3(0, -1, 0),
      update: (dt: number, elapsed: number) => {
        homoMat.uniforms.uTime.value = elapsed;
        cliffMat.uniforms.uTime.value = elapsed;
        carinaGrp.rotation.y += dt * 0.035;
      },
      dispose: () => disposables.forEach((d) => d.dispose()),
    };
  }

  // 4. Nebulosa del Cangrejo (M1): 3D Branching TubeGeometry Ejecta Cage + Synchrotron Volume
  if (id === 'nebula_crab') {
    const crabGrp = new THREE.Group();
    root.add(crabGrp);

    // Swirling inner Chandra blue-violet X-ray synchrotron cloud
    const synCount = 360;
    const sPos = new Float32Array(synCount * 3);
    const sCol = new Float32Array(synCount * 3);
    const tmp = new THREE.Color();
    for (let i = 0; i < synCount; i++) {
      const r = Math.pow(Math.random(), 0.72) * 8.8;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      sPos[i * 3] = r * Math.sin(ph) * Math.cos(th) * 1.28;
      sPos[i * 3 + 1] = r * Math.cos(ph) * 0.94;
      sPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) * 0.94;
      tmp.setHex(i % 2 === 0 ? 0x38bdf8 : 0x818cf8).multiplyScalar(0.28);
      sCol[i * 3] = tmp.r;
      sCol[i * 3 + 1] = tmp.g;
      sCol[i * 3 + 2] = tmp.b;
    }
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
    const sMat = new THREE.PointsMaterial({
      map: cloudTex,
      size: 6.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    crabGrp.add(new THREE.Points(sGeo, sMat));
    disposables.push(sGeo, sMat);

    // 32 Sculpted 3D Supernova Filament Tendrils (orange S-II, crimson H-alpha, teal O-III)
    const filMatAmber = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const filMatRed = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const filMatTeal = new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    disposables.push(filMatAmber, filMatRed, filMatTeal);

    for (let f = 0; f < 32; f++) {
      const phi0 = (f * 2.39996) % (Math.PI * 2);
      const theta0 = Math.acos(1 - 2 * ((f + 0.5) / 32));
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= 12; s++) {
        const u = s / 12;
        const r = 6.8 + u * 5.8 + Math.sin(u * Math.PI * 2 + f) * 1.4;
        const th = theta0 + Math.sin(u * 4 + f * 1.3) * 0.48;
        const ph = phi0 + u * 0.95 + Math.cos(u * 3.5 + f) * 0.35;
        pts.push(
          new THREE.Vector3(
            r * Math.sin(th) * Math.cos(ph) * 1.28,
            r * Math.cos(th) * 0.94,
            r * Math.sin(th) * Math.sin(ph) * 0.94,
          ),
        );
      }
      const tubeGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.14, 6, false);
      const mat = f % 3 === 0 ? filMatAmber : f % 3 === 1 ? filMatRed : filMatTeal;
      crabGrp.add(new THREE.Mesh(tubeGeo, mat));
      disposables.push(tubeGeo);
    }

    const pulsarCore = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: diffStarTex,
        color: 0xe0f2fe,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    pulsarCore.scale.setScalar(5.8);
    crabGrp.add(pulsarCore);
    disposables.push(pulsarCore.material);

    return {
      root,
      defaultCamPos: new THREE.Vector3(0, 5, 32),
      defaultTarget: new THREE.Vector3(0, 0, 0),
      update: (dt: number, elapsed: number) => {
        crabGrp.rotation.y += dt * 0.05;
        const p = 0.75 + 0.25 * Math.sin(elapsed * 22);
        pulsarCore.scale.setScalar(4.8 + p * 1.6);
      },
      dispose: () => disposables.forEach((d) => d.dispose()),
    };
  }

  // 5. Nebulosa de la Hélice (NGC 7293): Textured 3D Torus Shader + Radially Pointing Cometary Knots
  const helixGrp = new THREE.Group();
  helixGrp.rotation.set(0.32, 0.18, 0);
  root.add(helixGrp);

  const helixGeo = new THREE.RingGeometry(4.2, 15.2, 160, 16);
  helixGeo.rotateX(-Math.PI / 2);
  const hPos = helixGeo.attributes.position;
  for (let i = 0; i < hPos.count; i++) {
    const x = hPos.getX(i);
    const z = hPos.getZ(i);
    const ang = Math.atan2(z, x);
    const rad = Math.hypot(x, z);
    const helixWave = Math.sin(ang * 2.0 + (rad - 4.2) * 0.25) * 1.45;
    hPos.setY(i, helixWave);
  }
  helixGeo.computeVertexNormals();

  const helixMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vPos;
      ${GLSL_NOISE_LIB}
      void main() {
        float r = length(vPos.xz);
        float t = clamp((r - 4.2) / 11.0, 0.0, 1.0);
        float ang = atan(vPos.z, vPos.x);
        float knots = fbm5(vec2(ang * 14.0, r * 1.2 - uTime * 0.18));
        float streaks = fbm5(vec2(ang * 26.0, r * 0.35));

        vec3 cyanOIII = vec3(0.14, 0.88, 0.86);
        vec3 goldTrans = vec3(1.15, 0.78, 0.24);
        vec3 crimsonHa = vec3(1.05, 0.22, 0.38);

        vec3 col = t < 0.45
          ? mix(cyanOIII, goldTrans, smoothstep(0.18, 0.45, t))
          : mix(goldTrans, crimsonHa, smoothstep(0.45, 0.85, t));

        float ringEnv = smoothstep(0.0, 0.16, t) * smoothstep(1.0, 0.12, t);
        float fil = 0.45 + 0.85 * (knots * 0.6 + streaks * 0.4);
        gl_FragColor = vec4(col * fil * 1.25, ringEnv * clamp(fil * 0.65, 0.0, 0.88));
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  helixGrp.add(new THREE.Mesh(helixGeo, helixMat));
  disposables.push(helixGeo, helixMat);

  // Layered cloud volume + radial cometary knots
  const kCount = 480;
  const kPos = new Float32Array(kCount * 3);
  const kCol = new Float32Array(kCount * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < kCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 5.0 + Math.random() * 8.6;
    kPos[i * 3] = Math.cos(ang) * rad;
    kPos[i * 3 + 1] = Math.sin(ang * 2 + (rad - 4.2) * 0.25) * 1.45 + (Math.random() - 0.5) * 1.6;
    kPos[i * 3 + 2] = Math.sin(ang) * rad;
    const norm = (rad - 5.0) / 8.6;
    tmp.setHex(norm < 0.42 ? 0x2dd4bf : norm < 0.7 ? 0xfbbf24 : 0xf43f5e).multiplyScalar(0.32);
    kCol[i * 3] = tmp.r;
    kCol[i * 3 + 1] = tmp.g;
    kCol[i * 3 + 2] = tmp.b;
  }
  const hkGeo = new THREE.BufferGeometry();
  hkGeo.setAttribute('position', new THREE.BufferAttribute(kPos, 3));
  hkGeo.setAttribute('color', new THREE.BufferAttribute(kCol, 3));
  const hkMat = new THREE.PointsMaterial({
    map: cloudTex,
    size: 4.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  helixGrp.add(new THREE.Points(hkGeo, hkMat));

  const wd = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: diffStarTex,
      color: 0xe0f2fe,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  wd.scale.setScalar(6.5);
  helixGrp.add(wd);
  disposables.push(hkGeo, hkMat, wd.material);

  return {
    root,
    defaultCamPos: new THREE.Vector3(0, 14, 30),
    defaultTarget: new THREE.Vector3(0, 0, 0),
    update: (dt: number, elapsed: number) => {
      helixMat.uniforms.uTime.value = elapsed;
      helixGrp.rotation.y += dt * 0.055;
    },
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

export function createDeepSpaceDiorama(
  id: DeepSpaceTargetId,
): DeepSpaceDioramaRuntime {
  if (id === 'milkyway') {
    return createMilkyWayDiorama();
  }
  if (
    id === 'sagittarius_a' ||
    id === 'cygnus_x1' ||
    id === 'gaia_bh1' ||
    id === 'grs_1915'
  ) {
    return createBlackHoleVariant(id);
  }
  if (id === 'crab_pulsar' || id === 'vela_pulsar') {
    return createPulsarDiorama(id);
  }
  return createNebulaDiorama(id);
}
