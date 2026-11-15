import * as THREE from 'three';
import { CelestialBodyId, MoonTextureStyle } from '../data/solarSystemData';
import { ReliefKernelResult, computeReliefPixels } from './reliefKernel';
import type { ReliefJobRequest, ReliefJobResponse } from './relief.worker';

function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, octaves = 4): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * valueNoise(x * freq, y * freq);
    freq *= 2.04;
    amp *= 0.5;
  }
  return val;
}

function configureTexture(
  tex: THREE.CanvasTexture,
  isColor: boolean,
  anisotropy: number,
): THREE.CanvasTexture {
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

function buildNormalFromHeightfield(
  heights: Float32Array,
  width: number,
  height: number,
  strength: number,
  anisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(width, height);
  const d = img.data;

  for (let y = 0; y < height; y++) {
    const ym = Math.max(0, y - 1);
    const yp = Math.min(height - 1, y + 1);
    for (let x = 0; x < width; x++) {
      const xm = (x - 1 + width) % width;
      const xp = (x + 1) % width;

      const dx = (heights[y * width + xp] - heights[y * width + xm]) * strength;
      const dy = (heights[yp * width + x] - heights[ym * width + x]) * strength;
      const nx = -dx;
      const ny = -dy;
      const nz = 1.0;
      const inv = 1 / Math.hypot(nx, ny, nz);

      const idx = (y * width + x) * 4;
      d[idx] = Math.round((nx * inv * 0.5 + 0.5) * 255);
      d[idx + 1] = Math.round((ny * inv * 0.5 + 0.5) * 255);
      d[idx + 2] = Math.round((nz * inv * 0.5 + 0.5) * 255);
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  return configureTexture(tex, false, anisotropy);
}

export interface PlanetTextureSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  metalnessMap: THREE.CanvasTexture;
}

export interface MoonTextureSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  metalnessMap: THREE.CanvasTexture;
}

export function createProceduralPlanetTextureSet(
  id: CelestialBodyId | 'moon',
  anisotropy = 4,
): PlanetTextureSet {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(width, height);
  const data = img.data;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const rCtx = roughCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(width, height);
  const rData = rImg.data;

  const metalCanvas = document.createElement('canvas');
  metalCanvas.width = width;
  metalCanvas.height = height;
  const mCtx = metalCanvas.getContext('2d')!;
  const mImg = mCtx.createImageData(width, height);
  const mData = mImg.data;

  const heights = new Float32Array(width * height);

  for (let py = 0; py < height; py++) {
    const v = py / height;
    const lat = (v - 0.5) * Math.PI;
    const absLat = Math.abs(v - 0.5) * 2;

    for (let px = 0; px < width; px++) {
      const u = px / width;
      const angle = u * Math.PI * 2;
      const nx = Math.cos(angle) * 2.2 + 4.0;
      const nz = Math.sin(angle) * 2.2 + 4.0;
      const ny = v * 4.4;

      const warp = fbm(nx * 1.15 + 3.7, nz * 1.15 + ny * 0.7, 3) * 0.55;
      const n1 = fbm(nx + ny * 0.25 + warp, nz + ny + warp, 5);
      const n2 = fbm(nx * 2.9 + 9.2, ny * 2.9 + nz * 1.4, 4);
      const micro = fbm(nx * 9.5 + 1.3, ny * 9.5 + nz * 4.2, 3);

      let r = 128;
      let g = 128;
      let b = 128;
      let elev = n2 * 0.6 + micro * 0.4;
      let rough = 0.72;

      if (id === 'sun') {
        const gran = fbm(nx * 6.5, ny * 6.5 + nz * 3.8, 5);
        const fineCell = Math.pow(Math.abs(gran - 0.5) * 2.0, 0.75);
        const activeLat = Math.exp(-Math.pow((absLat - 0.28) / 0.16, 2));
        const sunspot = Math.max(0, (n1 - 0.62) * activeLat) * 3.1;
        const faculae = Math.max(0, (n2 - 0.58) * activeLat) * 1.6;
        r = 255;
        g = Math.min(
          255,
          Math.max(85, 180 + gran * 75 - fineCell * 28 - sunspot * 135 + faculae * 45),
        );
        b = Math.min(
          255,
          Math.max(18, 44 + gran * 95 - sunspot * 45 + faculae * 68),
        );
        elev = 0.5;
        rough = 0.5;
      } else if (id === 'mercury' || id === 'moon') {
        const base = id === 'mercury' ? 124 : 148;
        const maria = n1 < 0.43 ? -34 : 12;
        const craterRing = Math.sin(n2 * 24 + micro * 4.5);
        const craterBowl = craterRing < -0.55 ? -0.35 : craterRing > 0.78 ? 0.28 : 0;
        const rays = micro > 0.66 ? (micro - 0.66) * 116 : 0;
        const lum = Math.min(
          238,
          Math.max(40, base + maria + n2 * 44 + craterBowl * 28 + rays),
        );
        r = lum + (id === 'mercury' ? 9 : 0);
        g = lum + (id === 'mercury' ? 4 : 0);
        b = lum - (id === 'mercury' ? 4 : 0);
        elev = (n1 < 0.43 ? 0.22 : 0.58) + craterBowl + micro * 0.24;
        rough = 0.76 - (rays > 0 ? 0.14 : 0);
      } else if (id === 'venus') {
        const band = Math.sin((v + n1 * 0.16) * Math.PI * 11) * 0.5 + 0.5;
        const chevron =
          Math.sin((angle + Math.abs(v - 0.5) * 5.2 + n2 * 2) * 2) * 0.12;
        const swirl = n2 * 0.35 + band * 0.55 + micro * 0.14 + chevron;
        r = 208 + swirl * 44;
        g = 160 + swirl * 52;
        b = 88 + swirl * 46;
        elev = 0.45 + swirl * 0.35;
        rough = 0.42 + band * 0.12;
      } else if (id === 'earth') {
        const polarIce = absLat > 0.84 - n2 * 0.08;
        if (polarIce) {
          r = 238;
          g = 246;
          b = 254;
          elev = 0.55 + micro * 0.18;
          rough = 0.48;
        } else if (n1 > 0.502) {
          const arid = Math.max(0, 1 - Math.abs(absLat - 0.31) * 4.3) * n2;
          const mountain = Math.max(0, micro - 0.52) * 2.2;
          const snowPeak = mountain > 0.78 ? 1 : 0;
          r = snowPeak ? 228 : 44 + arid * 145 + n2 * 36 + mountain * 42;
          g = snowPeak ? 232 : 104 + arid * 60 + n2 * 38 + mountain * 34;
          b = snowPeak ? 238 : 44 + arid * 36 + mountain * 32;
          elev = 0.5 + (n1 - 0.502) * 1.4 + mountain * 0.42;
          rough = snowPeak ? 0.48 : 0.76 + (1 - arid) * 0.1;
        } else {
          const shelf = Math.pow(n1 / 0.502, 2.7);
          r = 10 + shelf * 32;
          g = 42 + shelf * 86;
          b = 112 + shelf * 102;
          elev = 0.18;
          // Crisp low roughness on oceans for realistic gleaming sunlight reflection
          rough = 0.15 + shelf * 0.07;
        }
      } else if (id === 'mars') {
        const polar = absLat > 0.895 - n2 * 0.045;
        if (polar) {
          r = 242;
          g = 234;
          b = 226;
          elev = 0.65 + micro * 0.15;
          rough = 0.52;
        } else {
          const darkBasalt = n1 < 0.43 ? -40 : 6;
          const valles =
            Math.abs(v - 0.54) < 0.032 && u > 0.25 && u < 0.45 ? -42 : 0;
          const olympusDist = Math.hypot((u - 0.22) * 5.2, (v - 0.41) * 6.2);
          const volcano = olympusDist < 0.35 ? (1 - olympusDist / 0.35) * 0.55 : 0;
          const dust = micro * 30;
          r = Math.min(244, Math.max(74, 184 + n2 * 52 + darkBasalt + valles + dust));
          g = Math.min(
            180,
            Math.max(40, 84 + n2 * 36 + darkBasalt * 0.6 + valles * 0.6 + dust * 0.5),
          );
          b = Math.min(128, Math.max(24, 48 + n2 * 22 + darkBasalt * 0.4 + dust * 0.3));
          elev =
            0.46 +
            (n1 < 0.43 ? -0.16 : 0.12) +
            (valles < 0 ? -0.45 : 0) +
            volcano +
            micro * 0.28;
          rough = darkBasalt < 0 ? 0.68 : 0.84;
        }
      } else if (id === 'jupiter') {
        const turb = (n1 - 0.5) * 0.1 + (micro - 0.5) * 0.032;
        const zone = Math.sin((v + turb) * Math.PI * 18);
        const fine = Math.cos((v + n2 * 0.048) * Math.PI * 38);
        const spotDist = Math.hypot((u - 0.35) * 3.1, (v - 0.63) * 7.6);
        if (spotDist < 0.44) {
          const t = 1 - spotDist / 0.44;
          const eye = Math.sin(spotDist * 18) * 12;
          r = 212 + t * 28 + eye;
          g = 94 - t * 24 + eye * 0.4;
          b = 60 - t * 16;
          elev = 0.68 + Math.sin(spotDist * 14) * 0.14;
          rough = 0.46;
        } else {
          r = 190 + zone * 38 + fine * 14;
          g = 152 + zone * 42 + fine * 16;
          b = 116 + zone * 36 + fine * 12;
          elev = 0.5 + zone * 0.18 + fine * 0.08;
          rough = 0.48 + (zone * 0.5 + 0.5) * 0.16;
        }
      } else if (id === 'saturn') {
        const band = Math.sin((v + n1 * 0.03) * Math.PI * 22) * 0.5 + 0.5;
        const fine = Math.cos((v + micro * 0.02) * Math.PI * 42) * 7;
        const polarTint = Math.max(0, absLat - 0.72) * 1.8;
        const hexEdge =
          v < 0.18
            ? Math.exp(-Math.pow((v - 0.11 + Math.cos(angle * 6) * 0.015) / 0.022, 2))
            : 0;
        r = 216 + band * 26 + fine - polarTint * 42 - hexEdge * 22;
        g = 188 + band * 24 + fine - polarTint * 24 - hexEdge * 12;
        b = 132 + band * 20 + fine * 0.6 - polarTint * 4 + hexEdge * 18;
        elev = 0.5 + band * 0.14 + hexEdge * 0.12;
        rough = 0.46 + band * 0.14;
      } else if (id === 'uranus') {
        const haze = Math.sin((v + n1 * 0.02) * Math.PI * 9) * 8;
        const polarHood = Math.max(0, absLat - 0.65) * 30;
        r = 132 + haze + n2 * 14 + polarHood;
        g = 216 + haze + n2 * 14 + polarHood * 0.6;
        b = 228 + haze * 0.5 + n2 * 10 + polarHood * 0.4;
        elev = 0.5 + n2 * 0.08;
        rough = 0.38;
      } else if (id === 'comet67p') {
        const dust = fbm(nx * 2.4, nz * 2.4 + ny, 4);
        const cliff = n2 > 0.7 ? 36 : 0;
        const iceGlint = micro > 0.78 ? 38 : 0;
        const lum = Math.min(142, Math.max(32, 48 + dust * 50 + cliff + iceGlint));
        r = lum + 4;
        g = lum + 2;
        b = lum + (iceGlint > 0 ? 10 : 0);
        elev = dust * 0.7 + micro * 0.35 + (cliff > 0 ? 0.25 : 0);
        rough = iceGlint > 0 ? 0.42 : 0.88;
      } else if (id === 'ceres') {
        const occator = Math.hypot((u - 0.52) * 5.5, (v - 0.38) * 6.5);
        const saltSpot = occator < 0.22 ? (1 - occator / 0.22) * 150 : 0;
        const lum = 78 + n1 * 42 + n2 * 24 + saltSpot + micro * 16;
        r = lum + 3;
        g = lum + 2;
        b = lum;
        elev = n1 * 0.5 + micro * 0.32 - (occator < 0.22 ? 0.28 : 0);
        rough = saltSpot > 20 ? 0.45 : 0.82;
      } else if (id === 'pluto') {
        const sputnik = Math.hypot((u - 0.48) * 3.8, (v - 0.46) * 4.5);
        const tholin = v > 0.45 && v < 0.65 && u > 0.15 && u < 0.46 ? n1 : 0;
        if (sputnik < 0.45) {
          const heart = 1 - sputnik / 0.45;
          r = 216 + heart * 34;
          g = 204 + heart * 34;
          b = 186 + heart * 30;
          elev = 0.28 + micro * 0.06;
          rough = 0.28; // Smooth nitrogen glacier reflecting sunlight
        } else {
          r = 162 - tholin * 68 + n2 * 36 + micro * 14;
          g = 128 - tholin * 62 + n2 * 26 + micro * 12;
          b = 104 - tholin * 52 + n2 * 20 + micro * 10;
          elev = 0.52 + n2 * 0.3 + micro * 0.22;
          rough = 0.74;
        }
      } else if (id === 'eris') {
        const lum = 200 + n1 * 34 + n2 * 18 + micro * 10;
        r = lum + 6;
        g = lum + 4;
        b = lum + 2;
        elev = 0.4 + n2 * 0.25 + micro * 0.16;
        rough = 0.32;
      } else if (id === 'neptune') {
        const band = Math.sin((v + n1 * 0.04) * Math.PI * 14) * 14;
        const darkSpot = Math.hypot((u - 0.42) * 4.2, (v - 0.58) * 8.5);
        const storm = darkSpot < 0.32 ? -(1 - darkSpot / 0.32) * 36 : 0;
        const streak = n2 > 0.73 && micro > 0.55 ? 46 : 0;
        r = 38 + band * 0.4 + streak + storm * 0.4;
        g = 88 + band * 0.6 + streak + storm * 0.6;
        b = 210 + band + streak * 0.8 + storm;
        elev = 0.48 + (band / 24) * 0.12 + (streak > 0 ? 0.18 : 0);
        rough = 0.38;
      }

      const poleShade = 1 - Math.pow(Math.abs(lat) / (Math.PI * 0.5), 4) * 0.1;
      const idx = (py * width + px) * 4;
      data[idx] = Math.min(255, Math.max(0, r * poleShade));
      data[idx + 1] = Math.min(255, Math.max(0, g * poleShade));
      data[idx + 2] = Math.min(255, Math.max(0, b * poleShade));
      data[idx + 3] = 255;

      const roughByte = Math.round(THREE.MathUtils.clamp(rough, 0.08, 0.98) * 255);
      rData[idx] = roughByte;
      rData[idx + 1] = roughByte;
      rData[idx + 2] = roughByte;
      rData[idx + 3] = 255;

      let metal = 0.0;
      if (id === 'mercury' || id === 'comet67p') {
        metal = n1 < 0.42 && micro > 0.56 ? 0.16 : 0.04;
      } else if (id === 'mars' || id === 'moon' || id === 'ceres') {
        metal = n1 < 0.4 && micro > 0.62 ? 0.11 : 0.0;
      }
      const metalByte = Math.round(metal * 255);
      mData[idx] = metalByte;
      mData[idx + 1] = metalByte;
      mData[idx + 2] = metalByte;
      mData[idx + 3] = 255;

      heights[py * width + px] = elev;
    }
  }

  ctx.putImageData(img, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  mCtx.putImageData(mImg, 0, 0);

  const map = configureTexture(new THREE.CanvasTexture(canvas), true, anisotropy);
  const roughnessMap = configureTexture(
    new THREE.CanvasTexture(roughCanvas),
    false,
    anisotropy,
  );
  const metalnessMap = configureTexture(
    new THREE.CanvasTexture(metalCanvas),
    false,
    anisotropy,
  );
  const normalStrength =
    id === 'jupiter' || id === 'saturn' || id === 'venus' || id === 'uranus' || id === 'neptune'
      ? 1.8
      : id === 'comet67p'
        ? 6.2
        : 4.8;
  const normalMap = buildNormalFromHeightfield(
    heights,
    width,
    height,
    normalStrength,
    anisotropy,
  );

  return { map, normalMap, roughnessMap, metalnessMap };
}

export function createProceduralPlanetTexture(
  id: CelestialBodyId | 'moon',
  anisotropy = 4,
): THREE.CanvasTexture {
  const set = createProceduralPlanetTextureSet(id, anisotropy);
  set.normalMap.dispose();
  set.roughnessMap.dispose();
  set.metalnessMap.dispose();
  return set.map;
}

export function createProceduralEarthNightLights(
  anisotropy = 4,
): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(width, height);
  const d = img.data;

  for (let py = 0; py < height; py++) {
    const v = py / height;
    const absLat = Math.abs(v - 0.5) * 2;
    for (let px = 0; px < width; px++) {
      const u = px / width;
      const angle = u * Math.PI * 2;
      const nx = Math.cos(angle) * 2.2 + 4.0;
      const nz = Math.sin(angle) * 2.2 + 4.0;
      const ny = v * 4.4;
      const warp = fbm(nx * 1.15 + 3.7, nz * 1.15 + ny * 0.7, 3) * 0.55;
      const n1 = fbm(nx + ny * 0.25 + warp, nz + ny + warp, 5);
      const n2 = fbm(nx * 6.5 + 1.1, ny * 6.5 + nz * 4.1, 3);
      const cityHash = hash2(px * 0.45, py * 0.45);

      const isHabitableLand = n1 > 0.505 && n1 < 0.62 && absLat < 0.66;
      const cluster = isHabitableLand && n2 > 0.58 && cityHash > 0.78 ? (cityHash - 0.78) * 4.5 : 0;
      const glow = Math.min(1, cluster);

      const idx = (py * width + px) * 4;
      d[idx] = Math.round(glow * 255);
      d[idx + 1] = Math.round(glow * 204);
      d[idx + 2] = Math.round(glow * 124);
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return configureTexture(new THREE.CanvasTexture(canvas), true, anisotropy);
}

export function createProceduralMoonTextureSet(
  style: MoonTextureStyle,
  anisotropy = 4,
): MoonTextureSet {
  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(width, height);
  const data = img.data;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const rCtx = roughCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(width, height);
  const rData = rImg.data;

  const metalCanvas = document.createElement('canvas');
  metalCanvas.width = width;
  metalCanvas.height = height;
  const mCtx = metalCanvas.getContext('2d')!;
  const mImg = mCtx.createImageData(width, height);
  const mData = mImg.data;

  const heights = new Float32Array(width * height);
  const seed = style.charCodeAt(0) * 1.37 + style.length * 4.1;

  for (let py = 0; py < height; py++) {
    const v = py / height;
    for (let px = 0; px < width; px++) {
      const u = px / width;
      const angle = u * Math.PI * 2;
      const nx = Math.cos(angle) * 2.4 + seed;
      const nz = Math.sin(angle) * 2.4 + seed;
      const ny = v * 4.6;

      const n1 = fbm(nx + ny * 0.3, nz + ny, 4);
      const n2 = fbm(nx * 3.1 + 4.2, ny * 3.1 + nz * 1.7, 4);
      const micro = fbm(nx * 8.4, ny * 8.4 + nz * 2.2, 3);

      let r = 145;
      let g = 145;
      let b = 145;
      let elev = n2 * 0.5 + micro * 0.35;
      let rough = 0.78;

      if (style === 'io') {
        const caldera = n2 > 0.71 ? -98 : 0;
        r = 228 + n1 * 30 + caldera * 0.5 + micro * 12;
        g = 188 + n1 * 45 + caldera + micro * 10;
        b = 64 + n2 * 35 + caldera * 0.4;
        elev = caldera < 0 ? 0.16 : 0.55 + micro * 0.3;
        rough = caldera < 0 ? 0.45 : 0.74;
      } else if (style === 'europa') {
        const crack =
          Math.abs(Math.sin((nx * 2.2 + nz * 1.9 + ny * 1.5) * 3.4 + micro)) < 0.085
            ? 1
            : 0;
        r = crack ? 176 : 220 + n1 * 28;
        g = crack ? 132 : 218 + n1 * 26;
        b = crack ? 104 : 210 + n1 * 24;
        elev = crack ? 0.25 : 0.6 + micro * 0.14;
        rough = crack ? 0.56 : 0.26; // Glossy sunlit ice sheet
      } else if (style === 'ganymede') {
        const dark = n1 < 0.46 ? -38 : 12;
        r = 148 + dark + n2 * 32 + micro * 12;
        g = 142 + dark + n2 * 30 + micro * 12;
        b = 132 + dark + n2 * 26 + micro * 10;
        elev = (n1 < 0.46 ? 0.28 : 0.58) + micro * 0.3;
        rough = n1 < 0.46 ? 0.78 : 0.54;
      } else if (style === 'callisto') {
        const brightCrater = n2 > 0.69 ? 62 : 0;
        r = 88 + n1 * 34 + brightCrater + micro * 14;
        g = 84 + n1 * 30 + brightCrater + micro * 12;
        b = 80 + n1 * 26 + brightCrater + micro * 10;
        elev = n1 * 0.4 + (brightCrater > 0 ? 0.42 : 0) + micro * 0.3;
        rough = brightCrater > 0 ? 0.44 : 0.84;
      } else if (style === 'enceladus') {
        const stripe = v > 0.74 && Math.sin(nx * 8.5 + nz * 6.5) > 0.7 ? 1 : 0;
        r = stripe ? 158 : 230 + n1 * 24;
        g = stripe ? 216 : 238 + n1 * 17;
        b = stripe ? 250 : 246 + n1 * 9;
        elev = stripe ? 0.15 : 0.58 + micro * 0.12;
        rough = stripe ? 0.36 : 0.22; // Fresh bright water ice reflects strongly
      } else if (style === 'titan') {
        const band = Math.sin(v * Math.PI * 5 + n1 * 0.4) * 10;
        r = 218 + band + n2 * 16;
        g = 156 + band * 0.7 + n2 * 14;
        b = 78 + n2 * 12;
        elev = 0.45 + (band / 20) * 0.15;
        rough = 0.44;
      } else if (style === 'iapetus') {
        const darkSide = Math.sin(angle + n1 * 0.8) > 0.05;
        if (darkSide) {
          r = 66 + n2 * 24;
          g = 56 + n2 * 20;
          b = 50 + n2 * 18;
          rough = 0.88;
        } else {
          r = 212 + n2 * 28;
          g = 210 + n2 * 26;
          b = 204 + n2 * 24;
          rough = 0.38;
        }
        elev = 0.4 + n2 * 0.3 + micro * 0.2;
      } else if (style === 'triton') {
        r = 200 + n1 * 34 + micro * 10;
        g = 178 + n1 * 28 + micro * 8;
        b = 174 + n2 * 26 + micro * 8;
        elev = 0.45 + n2 * 0.28 + micro * 0.18;
        rough = 0.34;
      } else if (style === 'charon') {
        const polarCap = v < 0.22 + n1 * 0.06;
        if (polarCap) {
          r = 128 + n2 * 26;
          g = 78 + n2 * 18;
          b = 62 + n2 * 14;
        } else {
          const lum = 128 + n1 * 42 + n2 * 20 + micro * 10;
          r = lum + 4;
          g = lum + 2;
          b = lum;
        }
        elev = 0.45 + n2 * 0.35 + micro * 0.22;
        rough = 0.7;
      } else if (style === 'phobos' || style === 'deimos' || style === 'proteus') {
        const lum = 72 + n1 * 48 + Math.sin(n2 * 14) * 14 + micro * 12;
        r = lum + 8;
        g = lum + 3;
        b = lum - 2;
        elev = n1 * 0.55 + Math.sin(n2 * 14) * 0.25 + micro * 0.2;
        rough = 0.86;
      } else {
        const maria = n1 < 0.42 ? -32 : 12;
        const lum = 144 + maria + n2 * 44 + micro * 14;
        r = lum;
        g = lum;
        b = lum + (style === 'ariel' || style === 'miranda' ? 8 : 0);
        elev = (n1 < 0.42 ? 0.26 : 0.62) + micro * 0.28;
        rough = style === 'ariel' || style === 'miranda' ? 0.44 : 0.78;
      }

      const idx = (py * width + px) * 4;
      data[idx] = Math.min(255, Math.max(0, r));
      data[idx + 1] = Math.min(255, Math.max(0, g));
      data[idx + 2] = Math.min(255, Math.max(0, b));
      data[idx + 3] = 255;

      const rByte = Math.round(THREE.MathUtils.clamp(rough, 0.1, 0.96) * 255);
      rData[idx] = rByte;
      rData[idx + 1] = rByte;
      rData[idx + 2] = rByte;
      rData[idx + 3] = 255;

      const isMetallicRegolith =
        (style === 'phobos' || style === 'deimos' || style === 'proteus' || style === 'io') &&
        micro > 0.68;
      const mByte = isMetallicRegolith ? 26 : 0;
      mData[idx] = mByte;
      mData[idx + 1] = mByte;
      mData[idx + 2] = mByte;
      mData[idx + 3] = 255;

      heights[py * width + px] = elev;
    }
  }

  ctx.putImageData(img, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  mCtx.putImageData(mImg, 0, 0);
  const map = configureTexture(new THREE.CanvasTexture(canvas), true, anisotropy);
  const roughnessMap = configureTexture(
    new THREE.CanvasTexture(roughCanvas),
    false,
    anisotropy,
  );
  const metalnessMap = configureTexture(
    new THREE.CanvasTexture(metalCanvas),
    false,
    anisotropy,
  );
  const normalMap = buildNormalFromHeightfield(
    heights,
    width,
    height,
    4.6,
    anisotropy,
  );

  return { map, normalMap, roughnessMap, metalnessMap };
}

export function createProceduralMoonTexture(
  style: MoonTextureStyle,
  anisotropy = 4,
): THREE.CanvasTexture {
  const set = createProceduralMoonTextureSet(style, anisotropy);
  set.normalMap.dispose();
  set.roughnessMap.dispose();
  set.metalnessMap.dispose();
  return set.map;
}

export function createProceduralBumpTexture(
  seedOffset: number,
  anisotropy = 4,
): THREE.CanvasTexture {
  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(width, height);
  const data = img.data;

  for (let py = 0; py < height; py++) {
    const v = py / height;
    for (let px = 0; px < width; px++) {
      const u = px / width;
      const angle = u * Math.PI * 2;
      const nx = Math.cos(angle) * 3.0 + seedOffset;
      const nz = Math.sin(angle) * 3.0 + seedOffset;
      const base = fbm(nx + v * 0.45, nz + v * 5.2, 5);
      const ridge =
        Math.abs(fbm(nx * 3.4 + 2.1, nz * 3.4 + v * 9.0, 3) - 0.5) * 0.35;
      const h = THREE.MathUtils.clamp(base * 0.82 + ridge, 0, 1);
      const val = Math.round(h * 255);
      const idx = (py * width + px) * 4;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  return configureTexture(tex, false, anisotropy);
}

export function createProceduralEarthClouds(anisotropy = 4): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(width, height);
  const data = img.data;

  for (let py = 0; py < height; py++) {
    const v = py / height;
    for (let px = 0; px < width; px++) {
      const u = px / width;
      const angle = u * Math.PI * 2;
      const nx = Math.cos(angle) * 3.3 + 11.4;
      const nz = Math.sin(angle) * 3.3 + 11.4;
      const n = fbm(nx + v * 0.9, nz + v * 5.6, 5);
      const alpha = Math.max(0, Math.min(1, (n - 0.47) * 3.2));
      const idx = (py * width + px) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.round(alpha * 226);
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  return configureTexture(tex, true, anisotropy);
}

export function createProceduralJupiterClouds(
  anisotropy = 4,
): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(width, height);
  const data = img.data;

  for (let py = 0; py < height; py++) {
    const v = py / height;
    for (let px = 0; px < width; px++) {
      const u = px / width;
      const angle = u * Math.PI * 2;
      const nx = Math.cos(angle) * 4.4 + 7.1;
      const nz = Math.sin(angle) * 4.4 + 7.1;
      const shear = fbm(nx * 1.4, nz * 1.4 + v * 9.0, 4);
      const band = Math.sin((v + shear * 0.08) * Math.PI * 20) * 0.5 + 0.5;
      const wisp = fbm(nx * 3.4 + shear * 2.0, nz * 2.6 + v * 13.0, 3);
      const alpha = Math.max(
        0,
        Math.min(1, (band * 0.55 + wisp * 0.65 - 0.56) * 2.2),
      );

      const idx = (py * width + px) * 4;
      data[idx] = 248;
      data[idx + 1] = 230;
      data[idx + 2] = 204;
      data[idx + 3] = Math.round(alpha * 155);
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  return configureTexture(tex, true, anisotropy);
}

export function createDetailedSaturnRingTexture(
  anisotropy = 8,
): THREE.CanvasTexture {
  const width = 1024;
  const height = 16;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(width, height);
  const data = img.data;

  for (let x = 0; x < width; x++) {
    const t = x / (width - 1);
    const fine =
      Math.sin(t * 210) * 0.08 +
      Math.sin(t * 490) * 0.05 +
      Math.cos(t * 95) * 0.07;

    let alpha = 0;
    let r = 218;
    let g = 198;
    let b = 164;

    if (t < 0.05) {
      alpha = (t / 0.05) * 0.14;
      r = 165;
      g = 152;
      b = 138;
    } else if (t < 0.22) {
      alpha = 0.22 + fine * 0.35;
      r = 176;
      g = 160;
      b = 140;
    } else if (t < 0.56) {
      const band = Math.sin((t - 0.22) * 42) * 0.12;
      alpha = Math.min(0.96, 0.78 + band + fine * 0.5);
      r = 232 + band * 35;
      g = 212 + band * 30;
      b = 176 + band * 22;
    } else if (t < 0.625) {
      alpha = 0.04;
      r = 95;
      g = 88;
      b = 80;
    } else if (t < 0.89) {
      const encke = Math.exp(-Math.pow((t - 0.815) / 0.008, 2));
      const keeler = Math.exp(-Math.pow((t - 0.882) / 0.003, 2));
      alpha = Math.max(
        0.05,
        (0.64 + fine * 0.45) * (1 - encke * 0.88) * (1 - keeler * 0.8),
      );
      r = 210;
      g = 195;
      b = 168;
    } else if (t < 0.945) {
      alpha = 0.03;
    } else if (t < 0.975) {
      const f = Math.exp(-Math.pow((t - 0.96) / 0.009, 2));
      alpha = f * 0.58;
      r = 225;
      g = 214;
      b = 190;
    } else {
      alpha = 0;
    }

    const aByte = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
    const rByte = Math.round(Math.min(255, Math.max(0, r)));
    const gByte = Math.round(Math.min(255, Math.max(0, g)));
    const bByte = Math.round(Math.min(255, Math.max(0, b)));

    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4;
      data[idx] = rByte;
      data[idx + 1] = gByte;
      data[idx + 2] = bByte;
      data[idx + 3] = aByte;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createUranusRingTexture(anisotropy = 4): THREE.CanvasTexture {
  const width = 512;
  const height = 8;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(width, height);
  const data = img.data;

  const ringlets = [0.15, 0.32, 0.48, 0.68, 0.88];
  for (let x = 0; x < width; x++) {
    const t = x / (width - 1);
    let alpha = 0;
    for (const pos of ringlets) {
      alpha += Math.exp(-Math.pow((t - pos) / 0.025, 2)) * 0.45;
    }
    const aByte = Math.round(Math.min(0.65, alpha) * 255);
    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4;
      data[idx] = 175;
      data[idx + 1] = 225;
      data[idx + 2] = 238;
      data[idx + 3] = aByte;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createSunGlowTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  const grad = ctx.createRadialGradient(
    half,
    half,
    size * 0.03,
    half,
    half,
    size * 0.5,
  );
  grad.addColorStop(0.0, 'rgba(255, 253, 240, 1.0)');
  grad.addColorStop(0.14, 'rgba(255, 232, 165, 0.92)');
  grad.addColorStop(0.34, 'rgba(255, 174, 58, 0.48)');
  grad.addColorStop(0.62, 'rgba(245, 98, 18, 0.14)');
  grad.addColorStop(0.84, 'rgba(220, 62, 10, 0.03)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createSoftStarSpriteTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.22, 'rgba(255, 250, 240, 0.88)');
  grad.addColorStop(0.55, 'rgba(210, 230, 255, 0.28)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createNebulaPuffTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const half = size / 2;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const dx = (px - half) / half;
      const dy = (py - half) / half;
      const r = Math.hypot(dx, dy);
      if (r >= 1) continue;
      const n = fbm(dx * 3.8 + 4.1, dy * 3.8 + 8.9, 4);
      const fil = fbm(dx * 7.2 + n * 2.1, dy * 7.2 + 3.4, 3);
      const alpha = Math.pow(1 - r, 2.0) * (0.32 + n * 0.48 + fil * 0.32);
      const idx = (py * size + px) * 4;
      img.data[idx] = 255;
      img.data[idx + 1] = 249;
      img.data[idx + 2] = 244;
      img.data[idx + 3] = Math.round(Math.min(1, alpha) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export interface DerivedReliefOptions {
  normalStrength?: number;
  anisotropy?: number;
  isGasGiant?: boolean;
  isIcy?: boolean;
  tileVertical?: boolean;
  repeatX?: number;
  repeatY?: number;
  maxWidth?: number;
}

/**
 * Computes pixel-matched tangent-space Sobel normalMap + calibrated roughnessMap
 * directly from any loaded NASA planetary, moon, or surface terrain photograph.
 */
export function deriveSurfaceReliefMaps(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  options: DerivedReliefOptions = {},
): {
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  metalnessMap: THREE.CanvasTexture;
} {
  const {
    normalStrength = 3.2,
    anisotropy = 4,
    isGasGiant = false,
    isIcy = false,
    tileVertical = false,
    repeatX = 1,
    repeatY = 1,
    maxWidth = 2048,
  } = options;

  const { w, h } = resolveReliefSize(sourceImage, maxWidth);
  const pixels = readSourcePixels(sourceImage, w, h);
  const res = computeReliefPixels(pixels, w, h, {
    normalStrength,
    isGasGiant,
    isIcy,
    tileVertical,
  });
  return buildReliefTextures(res, w, h, {
    anisotropy,
    tileVertical,
    repeatX,
    repeatY,
  });
}

function resolveReliefSize(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  maxWidth: number,
): { w: number; h: number } {
  const srcW =
    sourceImage instanceof HTMLImageElement
      ? sourceImage.naturalWidth || sourceImage.width || 512
      : sourceImage.width || 512;
  const srcH =
    sourceImage instanceof HTMLImageElement
      ? sourceImage.naturalHeight || sourceImage.height || 256
      : sourceImage.height || 256;
  const scale = Math.min(1, maxWidth / Math.max(1, srcW));
  return {
    w: Math.max(64, Math.round(srcW * scale)),
    h: Math.max(64, Math.round(srcH * scale)),
  };
}

function readSourcePixels(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  w: number,
  h: number,
): Uint8ClampedArray {
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = w;
  srcCanvas.height = h;
  // CPU-backed: its pixels are read right away (no GPU readback stall)
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true })!;
  srcCtx.drawImage(sourceImage, 0, 0, w, h);
  return srcCtx.getImageData(0, 0, w, h).data;
}

function pixelsToCanvas(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  img.data.set(data);
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function buildReliefTextures(
  res: ReliefKernelResult,
  w: number,
  h: number,
  opts: {
    anisotropy: number;
    tileVertical: boolean;
    repeatX: number;
    repeatY: number;
  },
): {
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  metalnessMap: THREE.CanvasTexture;
} {
  const { anisotropy, tileVertical, repeatX, repeatY } = opts;
  const roughCanvas = pixelsToCanvas(res.rough, w, h);
  const metalCanvas = pixelsToCanvas(res.metal, w, h);
  const normCanvas = pixelsToCanvas(res.normal, w, h);

  const normalMap = new THREE.CanvasTexture(normCanvas);
  normalMap.colorSpace = THREE.NoColorSpace;
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = tileVertical ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  normalMap.repeat.set(repeatX, repeatY);
  normalMap.anisotropy = anisotropy;
  normalMap.needsUpdate = true;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = tileVertical ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  roughnessMap.repeat.set(repeatX, repeatY);
  roughnessMap.anisotropy = anisotropy;
  roughnessMap.needsUpdate = true;

  const metalnessMap = new THREE.CanvasTexture(metalCanvas);
  metalnessMap.colorSpace = THREE.NoColorSpace;
  metalnessMap.wrapS = THREE.RepeatWrapping;
  metalnessMap.wrapT = tileVertical ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  metalnessMap.repeat.set(repeatX, repeatY);
  metalnessMap.anisotropy = anisotropy;
  metalnessMap.needsUpdate = true;

  return { normalMap, roughnessMap, metalnessMap };
}


/* ---------------------------------------------------------------------------
 * Off-main-thread relief derivation (same kernel → identical pixels)
 * ------------------------------------------------------------------------- */

let reliefWorker: Worker | null = null;
let reliefWorkerFailed = false;
let reliefNextJobId = 1;
const reliefPending = new Map<
  number,
  { resolve: (res: ReliefJobResponse | null) => void }
>();

function getReliefWorker(): Worker | null {
  if (reliefWorkerFailed || typeof Worker === 'undefined') return null;
  if (reliefWorker) return reliefWorker;
  try {
    const worker = new Worker(new URL('./relief.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (e: MessageEvent<ReliefJobResponse>) => {
      const job = reliefPending.get(e.data.jobId);
      if (!job) return;
      reliefPending.delete(e.data.jobId);
      job.resolve(e.data);
    };
    worker.onerror = () => {
      // Worker crashed or could not load: resolve everything with null so callers fall back to sync.
      reliefWorkerFailed = true;
      reliefWorker = null;
      for (const job of reliefPending.values()) job.resolve(null);
      reliefPending.clear();
      worker.terminate();
    };
    reliefWorker = worker;
    return worker;
  } catch {
    reliefWorkerFailed = true;
    return null;
  }
}

/**
 * Async twin of deriveSurfaceReliefMaps: the Sobel / roughness / metalness pixel loops run
 * in relief.worker.ts so texture loads never block the render loop. Output is identical.
 */
export async function deriveSurfaceReliefMapsAsync(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  options: DerivedReliefOptions = {},
): Promise<{
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  metalnessMap: THREE.CanvasTexture;
}> {
  const {
    normalStrength = 3.2,
    anisotropy = 4,
    isGasGiant = false,
    isIcy = false,
    tileVertical = false,
    repeatX = 1,
    repeatY = 1,
    maxWidth = 2048,
  } = options;

  const worker = getReliefWorker();
  if (!worker) return deriveSurfaceReliefMaps(sourceImage, options);

  const { w, h } = resolveReliefSize(sourceImage, maxWidth);
  const pixels = readSourcePixels(sourceImage, w, h);
  const kernelOpts = { normalStrength, isGasGiant, isIcy, tileVertical };
  const buffer = pixels.slice().buffer as ArrayBuffer;

  const response = await new Promise<ReliefJobResponse | null>((resolve) => {
    const jobId = reliefNextJobId++;
    reliefPending.set(jobId, { resolve });
    const req: ReliefJobRequest = {
      jobId,
      width: w,
      height: h,
      pixels: buffer,
      options: kernelOpts,
    };
    worker.postMessage(req, [buffer]);
  });

  const res: ReliefKernelResult = response
    ? {
        normal: new Uint8ClampedArray(response.normal),
        rough: new Uint8ClampedArray(response.rough),
        metal: new Uint8ClampedArray(response.metal),
      }
    : computeReliefPixels(pixels, w, h, kernelOpts);

  return buildReliefTextures(res, w, h, {
    anisotropy,
    tileVertical,
    repeatX,
    repeatY,
  });
}
