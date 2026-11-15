import * as THREE from 'three';

function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

// Lattice values of hash2 memoised: neighbouring pixels sample the same lattice corners, so
// Math.sin ran millions of times on the same few thousand points. Same function, same inputs,
// same numbers (Float64): the textures are bit-for-bit identical, several times faster.
const LATTICE = 512;
let latticeCache: Float64Array | null = null;
function latticeHash(ix: number, iy: number): number {
  if (ix >= 0 && iy >= 0 && ix < LATTICE && iy < LATTICE) {
    const cache = (latticeCache ??= new Float64Array(LATTICE * LATTICE).fill(-1));
    const k = iy * LATTICE + ix;
    let v = cache[k];
    if (v < 0) {
      v = hash2(ix, iy);
      cache[k] = v;
    }
    return v;
  }
  return hash2(ix, iy);
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = latticeHash(ix, iy);
  const b = latticeHash(ix + 1, iy);
  const c = latticeHash(ix, iy + 1);
  const d = latticeHash(ix + 1, iy + 1);
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

function heightCanvasToNormalTexture(
  heights: Float32Array,
  size: number,
  strength: number,
  anisotropy: number,
  repeat = 1,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;

      const dx = (heights[y * size + xp] - heights[y * size + xm]) * strength;
      const dy = (heights[yp * size + x] - heights[ym * size + x]) * strength;
      const nx = -dx;
      const ny = -dy;
      const nz = 1.0;
      const inv = 1 / Math.hypot(nx, ny, nz);

      const idx = (y * size + x) * 4;
      d[idx] = Math.round((nx * inv * 0.5 + 0.5) * 255);
      d[idx + 1] = Math.round((ny * inv * 0.5 + 0.5) * 255);
      d[idx + 2] = Math.round((nz * inv * 0.5 + 0.5) * 255);
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

function createScalarPbrMap(
  heights: Float32Array,
  size: number,
  mapFn: (h: number, x: number, y: number) => number,
  anisotropy: number,
  repeat = 1,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx4 = (y * size + x) * 4;
      const v = Math.min(1, Math.max(0, mapFn(heights[y * size + x], x, y)));
      const b = Math.round(v * 255);
      d[idx4] = b;
      d[idx4 + 1] = b;
      d[idx4 + 2] = b;
      d[idx4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export interface CraftTextureSet {
  kaptonMap: THREE.CanvasTexture;
  kaptonNormal: THREE.CanvasTexture;
  kaptonRoughness: THREE.CanvasTexture;
  kaptonMetalness: THREE.CanvasTexture;
  solarMap: THREE.CanvasTexture;
  solarNormal: THREE.CanvasTexture;
  solarRoughness: THREE.CanvasTexture;
  solarMetalness: THREE.CanvasTexture;
  issSolarMap: THREE.CanvasTexture;
  issSolarNormal: THREE.CanvasTexture;
  issSolarRoughness: THREE.CanvasTexture;
  issSolarMetalness: THREE.CanvasTexture;
  issBetaMap: THREE.CanvasTexture;
  issBetaNormal: THREE.CanvasTexture;
  issBetaRoughness: THREE.CanvasTexture;
  issBetaMetalness: THREE.CanvasTexture;
  radiatorMap: THREE.CanvasTexture;
  radiatorNormal: THREE.CanvasTexture;
  radiatorRoughness: THREE.CanvasTexture;
  radiatorMetalness: THREE.CanvasTexture;
  wheelMap: THREE.CanvasTexture;
  wheelBump: THREE.CanvasTexture;
  wheelNormal: THREE.CanvasTexture;
  wheelRoughness: THREE.CanvasTexture;
  wheelMetalness: THREE.CanvasTexture;
  panelMap: THREE.CanvasTexture;
  panelNormal: THREE.CanvasTexture;
  panelRoughness: THREE.CanvasTexture;
  panelMetalness: THREE.CanvasTexture;
  carbonMap: THREE.CanvasTexture;
  carbonNormal: THREE.CanvasTexture;
  carbonRoughness: THREE.CanvasTexture;
  carbonMetalness: THREE.CanvasTexture;
  brushedMetalMap: THREE.CanvasTexture;
  brushedMetalNormal: THREE.CanvasTexture;
  brushedMetalRoughness: THREE.CanvasTexture;
  brushedMetalMetalness: THREE.CanvasTexture;
  jwstMirrorMap: THREE.CanvasTexture;
  jwstMirrorNormal: THREE.CanvasTexture;
  jwstMirrorRoughness: THREE.CanvasTexture;
  jwstMirrorMetalness: THREE.CanvasTexture;
  copperMap: THREE.CanvasTexture;
  copperNormal: THREE.CanvasTexture;
  copperRoughness: THREE.CanvasTexture;
  copperMetalness: THREE.CanvasTexture;
  lensMap: THREE.CanvasTexture;
  lensNormal: THREE.CanvasTexture;
  lensRoughness: THREE.CanvasTexture;
  lensMetalness: THREE.CanvasTexture;
  trackImprintMap: THREE.CanvasTexture;
  dispose: () => void;
}

export function createCraftTextureSet(anisotropy = 4): CraftTextureSet {
  // 1. Crinkled Gold Kapton MLI Thermal Foil (512px Color + Normal + Roughness)
  const kSize = 512;
  const kCanvas = document.createElement('canvas');
  kCanvas.width = kSize;
  kCanvas.height = kSize;
  const kCtx = kCanvas.getContext('2d')!;
  const kImg = kCtx.createImageData(kSize, kSize);
  const kRoughCanvas = document.createElement('canvas');
  kRoughCanvas.width = kSize;
  kRoughCanvas.height = kSize;
  const krCtx = kRoughCanvas.getContext('2d')!;
  const krImg = krCtx.createImageData(kSize, kSize);
  const kHeights = new Float32Array(kSize * kSize);

  for (let y = 0; y < kSize; y++) {
    for (let x = 0; x < kSize; x++) {
      const u = x / kSize;
      const v = y / kSize;
      const n1 = Math.abs(fbm(u * 14, v * 14, 4) - 0.5) * 2.0;
      const n2 = Math.abs(fbm(u * 30 + 5.2, v * 30 + 1.9, 3) - 0.5) * 2.0;
      const crease = Math.abs(Math.sin((u * 18 + n1 * 2.4) * Math.PI)) * 0.25;
      const seam = x % 128 < 3 || y % 128 < 3 ? 0.18 : 1.0;
      const h = Math.min(1, (1.0 - (n1 * 0.58 + n2 * 0.3 + crease * 0.12)) * seam);
      kHeights[y * kSize + x] = h;

      const idx = (y * kSize + x) * 4;
      kImg.data[idx] = Math.round(188 + h * 64);
      kImg.data[idx + 1] = Math.round(130 + h * 60);
      kImg.data[idx + 2] = Math.round(24 + h * 36);
      kImg.data[idx + 3] = 255;

      const roughByte = Math.round((0.18 + (1 - h) * 0.32) * 255);
      krImg.data[idx] = roughByte;
      krImg.data[idx + 1] = roughByte;
      krImg.data[idx + 2] = roughByte;
      krImg.data[idx + 3] = 255;
    }
  }
  kCtx.putImageData(kImg, 0, 0);
  krCtx.putImageData(krImg, 0, 0);
  const kaptonMap = new THREE.CanvasTexture(kCanvas);
  kaptonMap.colorSpace = THREE.SRGBColorSpace;
  kaptonMap.wrapS = THREE.RepeatWrapping;
  kaptonMap.wrapT = THREE.RepeatWrapping;
  kaptonMap.anisotropy = anisotropy;

  const kaptonNormal = heightCanvasToNormalTexture(kHeights, kSize, 6.4, anisotropy);
  const kaptonRoughness = new THREE.CanvasTexture(kRoughCanvas);
  kaptonRoughness.colorSpace = THREE.NoColorSpace;
  kaptonRoughness.wrapS = THREE.RepeatWrapping;
  kaptonRoughness.wrapT = THREE.RepeatWrapping;
  kaptonRoughness.anisotropy = anisotropy;
  const kaptonMetalness = createScalarPbrMap(
    kHeights,
    kSize,
    (h) => 0.52 + h * 0.44,
    anisotropy,
  );

  // 2. Aerospace Photovoltaic Solar Array (512px silicon cells + silver busbars)
  const sSize = 512;
  const sCanvas = document.createElement('canvas');
  sCanvas.width = sSize;
  sCanvas.height = sSize;
  const sCtx = sCanvas.getContext('2d')!;
  const sHeights = new Float32Array(sSize * sSize);

  sCtx.fillStyle = '#091429';
  sCtx.fillRect(0, 0, sSize, sSize);

  const cols = 10;
  const rows = 10;
  const cellW = sSize / cols;
  const cellH = sSize / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * cellW;
      const cy = r * cellH;
      const shade = 16 + ((r * 7 + c * 13) % 14);
      sCtx.fillStyle = `rgb(${shade}, ${shade + 22}, ${shade + 64})`;
      sCtx.fillRect(cx + 2, cy + 2, cellW - 4, cellH - 4);

      // Fine silver current-collection trace lines
      sCtx.fillStyle = 'rgba(195, 218, 244, 0.38)';
      for (let f = 1; f < 5; f++) {
        sCtx.fillRect(cx + 2, cy + (cellH * f) / 5, cellW - 4, 1);
      }
      sCtx.fillStyle = 'rgba(226, 232, 240, 0.48)';
      sCtx.fillRect(cx + cellW * 0.5, cy + 2, 1.5, cellH - 4);

      sCtx.fillStyle = '#94a3b8';
      sCtx.fillRect(cx, cy, 3, 3);
      sCtx.fillRect(cx + cellW - 3, cy, 3, 3);
    }
  }
  for (let y = 0; y < sSize; y++) {
    for (let x = 0; x < sSize; x++) {
      const edge = x % cellW < 2.5 || y % cellH < 2.5 ? 0.18 : 0.85;
      sHeights[y * sSize + x] = edge;
    }
  }
  const solarMap = new THREE.CanvasTexture(sCanvas);
  solarMap.colorSpace = THREE.SRGBColorSpace;
  solarMap.wrapS = THREE.RepeatWrapping;
  solarMap.wrapT = THREE.RepeatWrapping;
  solarMap.anisotropy = anisotropy;
  const solarNormal = heightCanvasToNormalTexture(sHeights, sSize, 2.8, anisotropy);
  const solarRoughness = createScalarPbrMap(
    sHeights,
    sSize,
    (h) => (h < 0.35 ? 0.56 : 0.14),
    anisotropy,
  );
  const solarMetalness = createScalarPbrMap(
    sHeights,
    sSize,
    (h) => (h < 0.35 ? 0.85 : 0.42),
    anisotropy,
  );

  // 3. Machined Aluminum Chevron Cleated Rover Wheels (512px)
  const wSize = 512;
  const wCanvas = document.createElement('canvas');
  wCanvas.width = wSize;
  wCanvas.height = wSize;
  const wCtx = wCanvas.getContext('2d')!;
  const wBumpCanvas = document.createElement('canvas');
  wBumpCanvas.width = wSize;
  wBumpCanvas.height = wSize;
  const wbCtx = wBumpCanvas.getContext('2d', { willReadFrequently: true })!;

  wCtx.fillStyle = '#242a34';
  wCtx.fillRect(0, 0, wSize, wSize);
  wbCtx.fillStyle = '#242424';
  wbCtx.fillRect(0, 0, wSize, wSize);

  for (let y = 0; y < wSize; y += 24) {
    wCtx.fillStyle = '#7b8594';
    wCtx.fillRect(0, y, wSize, 6);
    wbCtx.fillStyle = '#f4f4f4';
    wbCtx.fillRect(0, y, wSize, 6);

    wCtx.strokeStyle = '#aeb7c4';
    wCtx.lineWidth = 3;
    wCtx.beginPath();
    wCtx.moveTo(0, y + 9);
    wCtx.lineTo(wSize * 0.5, y + 18);
    wCtx.lineTo(wSize, y + 9);
    wCtx.stroke();

    wbCtx.strokeStyle = '#d4d4d4';
    wbCtx.lineWidth = 3;
    wbCtx.beginPath();
    wbCtx.moveTo(0, y + 9);
    wbCtx.lineTo(wSize * 0.5, y + 18);
    wbCtx.lineTo(wSize, y + 9);
    wbCtx.stroke();
  }
  const wheelMap = new THREE.CanvasTexture(wCanvas);
  wheelMap.colorSpace = THREE.SRGBColorSpace;
  wheelMap.wrapS = THREE.RepeatWrapping;
  wheelMap.wrapT = THREE.RepeatWrapping;
  wheelMap.anisotropy = anisotropy;

  const wheelBump = new THREE.CanvasTexture(wBumpCanvas);
  wheelBump.colorSpace = THREE.NoColorSpace;
  wheelBump.wrapS = THREE.RepeatWrapping;
  wheelBump.wrapT = THREE.RepeatWrapping;
  wheelBump.anisotropy = anisotropy;

  const wHeights = new Float32Array(wSize * wSize);
  const wData = wbCtx.getImageData(0, 0, wSize, wSize).data;
  for (let i = 0; i < wSize * wSize; i++) {
    wHeights[i] = wData[i * 4] / 255;
  }
  const wheelNormal = heightCanvasToNormalTexture(wHeights, wSize, 4.2, anisotropy);
  const wheelRoughness = createScalarPbrMap(
    wHeights,
    wSize,
    (h) => (h > 0.55 ? 0.28 : 0.82),
    anisotropy,
  );
  const wheelMetalness = createScalarPbrMap(
    wHeights,
    wSize,
    (h) => (h > 0.55 ? 0.88 : 0.18),
    anisotropy,
  );

  // 4. White Thermal Paint & Riveted Aerospace Deck Panels (512px)
  const pSize = 512;
  const pCanvas = document.createElement('canvas');
  pCanvas.width = pSize;
  pCanvas.height = pSize;
  const pCtx = pCanvas.getContext('2d')!;
  const pHeights = new Float32Array(pSize * pSize);

  pCtx.fillStyle = '#dae1ea';
  pCtx.fillRect(0, 0, pSize, pSize);
  pCtx.strokeStyle = '#8b99ab';
  pCtx.lineWidth = 2;
  for (let gy = 0; gy < pSize; gy += 64) {
    for (let gx = 0; gx < pSize; gx += 64) {
      const tint = ((gx * 5 + gy * 9) % 10) - 5;
      pCtx.fillStyle = `rgb(${214 + tint}, ${222 + tint}, ${232 + tint})`;
      pCtx.fillRect(gx + 2, gy + 2, 60, 60);
      pCtx.strokeRect(gx + 1, gy + 1, 62, 62);
      // Rivet corner bolts
      pCtx.fillStyle = '#64748b';
      for (const [rx, ry] of [
        [gx + 6, gy + 6],
        [gx + 56, gy + 6],
        [gx + 6, gy + 56],
        [gx + 56, gy + 56],
      ]) {
        pCtx.fillRect(rx, ry, 2, 2);
      }
    }
  }
  for (let y = 0; y < pSize; y++) {
    for (let x = 0; x < pSize; x++) {
      const seam = x % 64 < 2 || y % 64 < 2 ? 0.14 : 0.85;
      pHeights[y * pSize + x] =
        seam + (fbm((x / pSize) * 14, (y / pSize) * 14, 3) - 0.5) * 0.12;
    }
  }
  const panelMap = new THREE.CanvasTexture(pCanvas);
  panelMap.colorSpace = THREE.SRGBColorSpace;
  panelMap.wrapS = THREE.RepeatWrapping;
  panelMap.wrapT = THREE.RepeatWrapping;
  panelMap.anisotropy = anisotropy;
  const panelNormal = heightCanvasToNormalTexture(pHeights, pSize, 3.6, anisotropy);
  const panelRoughness = createScalarPbrMap(
    pHeights,
    pSize,
    (h) => (h < 0.35 ? 0.3 : 0.48),
    anisotropy,
  );
  const panelMetalness = createScalarPbrMap(
    pHeights,
    pSize,
    (h) => (h < 0.35 ? 0.82 : 0.14),
    anisotropy,
  );

  // 5. Woven Carbon-Fiber Composite (for Masts, Helicopter Rotors & Struts)
  const cSize = 256;
  const cCanvas = document.createElement('canvas');
  cCanvas.width = cSize;
  cCanvas.height = cSize;
  const cCtx = cCanvas.getContext('2d')!;
  const cHeights = new Float32Array(cSize * cSize);
  for (let y = 0; y < cSize; y++) {
    for (let x = 0; x < cSize; x++) {
      const cellX = Math.floor(x / 8);
      const cellY = Math.floor(y / 8);
      const weave = (cellX + cellY) % 2 === 0;
      const inX = (x % 8) / 8;
      const inY = (y % 8) / 8;
      const fiber = weave ? Math.sin(inX * Math.PI) : Math.sin(inY * Math.PI);
      const h = 0.35 + fiber * 0.55;
      cHeights[y * cSize + x] = h;
      const lum = Math.round(22 + h * 34);
      cCtx.fillStyle = `rgb(${lum}, ${lum + 3}, ${lum + 8})`;
      cCtx.fillRect(x, y, 1, 1);
    }
  }
  const carbonMap = new THREE.CanvasTexture(cCanvas);
  carbonMap.colorSpace = THREE.SRGBColorSpace;
  carbonMap.wrapS = THREE.RepeatWrapping;
  carbonMap.wrapT = THREE.RepeatWrapping;
  carbonMap.repeat.set(3, 3);
  carbonMap.anisotropy = anisotropy;
  const carbonNormal = heightCanvasToNormalTexture(cHeights, cSize, 3.8, anisotropy, 3);
  const carbonRoughness = createScalarPbrMap(
    cHeights,
    cSize,
    (h) => 0.36 + (1 - h) * 0.26,
    anisotropy,
    3,
  );
  const carbonMetalness = createScalarPbrMap(
    cHeights,
    cSize,
    (h) => 0.24 + h * 0.32,
    anisotropy,
    3,
  );

  // 6. Anisotropic Brushed Aerospace Aluminum & Titanium
  const mSize = 256;
  const mCanvas = document.createElement('canvas');
  mCanvas.width = mSize;
  mCanvas.height = mSize;
  const mCtx = mCanvas.getContext('2d')!;
  const mImg = mCtx.createImageData(mSize, mSize);
  const mHeights = new Float32Array(mSize * mSize);
  for (let y = 0; y < mSize; y++) {
    const streak = hash2(y * 1.7, 9.1) * 0.28;
    for (let x = 0; x < mSize; x++) {
      const micro = fbm((x / mSize) * 4, (y / mSize) * 48, 3) * 0.35;
      const h = 0.5 + streak * 0.5 + micro * 0.4;
      mHeights[y * mSize + x] = h;
      const lum = Math.round(186 + (streak + micro) * 52);
      const idx = (y * mSize + x) * 4;
      mImg.data[idx] = lum;
      mImg.data[idx + 1] = Math.min(255, lum + 4);
      mImg.data[idx + 2] = Math.min(255, lum + 10);
      mImg.data[idx + 3] = 255;
    }
  }
  mCtx.putImageData(mImg, 0, 0);
  const brushedMetalMap = new THREE.CanvasTexture(mCanvas);
  brushedMetalMap.colorSpace = THREE.SRGBColorSpace;
  brushedMetalMap.wrapS = THREE.RepeatWrapping;
  brushedMetalMap.wrapT = THREE.RepeatWrapping;
  brushedMetalMap.anisotropy = anisotropy;
  const brushedMetalNormal = heightCanvasToNormalTexture(mHeights, mSize, 2.4, anisotropy);
  const brushedMetalRoughness = createScalarPbrMap(
    mHeights,
    mSize,
    (h) => 0.22 + (1 - h) * 0.2,
    anisotropy,
  );
  const brushedMetalMetalness = createScalarPbrMap(
    mHeights,
    mSize,
    (h) => 0.78 + h * 0.18,
    anisotropy,
  );

  // 7. JWST Gold-Coated Beryllium Hexagonal Mirror Pattern
  const jSize = 512;
  const jCanvas = document.createElement('canvas');
  jCanvas.width = jSize;
  jCanvas.height = jSize;
  const jCtx = jCanvas.getContext('2d', { willReadFrequently: true })!;
  jCtx.fillStyle = '#241806';
  jCtx.fillRect(0, 0, jSize, jSize);
  const rHex = 44;
  const dxHex = rHex * 1.5;
  const dyHex = rHex * Math.sqrt(3);
  for (let col = -1; col < 10; col++) {
    for (let row = -1; row < 10; row++) {
      const cx = col * dxHex;
      const cy = row * dyHex + (col % 2 === 0 ? 0 : dyHex * 0.5);
      jCtx.beginPath();
      for (let k = 0; k < 6; k++) {
        const ang = (Math.PI / 3) * k;
        const vx = cx + (rHex - 2.2) * Math.cos(ang);
        const vy = cy + (rHex - 2.2) * Math.sin(ang);
        if (k === 0) jCtx.moveTo(vx, vy);
        else jCtx.lineTo(vx, vy);
      }
      jCtx.closePath();
      const g = jCtx.createLinearGradient(cx - rHex, cy - rHex, cx + rHex, cy + rHex);
      g.addColorStop(0, '#fae08c');
      g.addColorStop(0.5, '#d9961f');
      g.addColorStop(1, '#f5c451');
      jCtx.fillStyle = g;
      jCtx.fill();
    }
  }
  const jwstMirrorMap = new THREE.CanvasTexture(jCanvas);
  jwstMirrorMap.colorSpace = THREE.SRGBColorSpace;
  jwstMirrorMap.anisotropy = anisotropy;

  const jHeights = new Float32Array(jSize * jSize);
  const jData = jCtx.getImageData(0, 0, jSize, jSize).data;
  for (let i = 0; i < jSize * jSize; i++) {
    const r = jData[i * 4];
    jHeights[i] = r > 120 ? 0.92 : 0.15;
  }
  const jwstMirrorNormal = heightCanvasToNormalTexture(jHeights, jSize, 3.0, anisotropy);
  const jwstMirrorRoughness = createScalarPbrMap(
    jHeights,
    jSize,
    (h) => (h > 0.5 ? 0.08 : 0.74),
    anisotropy,
  );
  const jwstMirrorMetalness = createScalarPbrMap(
    jHeights,
    jSize,
    (h) => (h > 0.5 ? 0.98 : 0.22),
    anisotropy,
  );

  // 8. NASA ISS Copper-Amber Kapton Double-Sided Solar Array Blanket
  const issSize = 512;
  const issCanvas = document.createElement('canvas');
  issCanvas.width = issSize;
  issCanvas.height = issSize;
  const issCtx = issCanvas.getContext('2d')!;
  const issHeights = new Float32Array(issSize * issSize);

  issCtx.fillStyle = '#4a250d';
  issCtx.fillRect(0, 0, issSize, issSize);

  const wingCols = 8;
  const wingRows = 24;
  const wCellW = issSize / wingCols;
  const wCellH = issSize / wingRows;
  for (let r = 0; r < wingRows; r++) {
    for (let c = 0; c < wingCols; c++) {
      const cx = c * wCellW;
      const cy = r * wCellH;
      const tint = ((r * 5 + c * 11) % 18) - 8;
      const rr = Math.min(255, Math.max(0, 178 + tint));
      const gg = Math.min(255, Math.max(0, 102 + Math.round(tint * 0.7)));
      const bb = Math.min(255, Math.max(0, 40 + Math.round(tint * 0.4)));
      issCtx.fillStyle = `rgb(${rr}, ${gg}, ${bb})`;
      issCtx.fillRect(cx + 2, cy + 1.5, wCellW - 4, wCellH - 3);

      issCtx.fillStyle = 'rgba(28, 16, 10, 0.42)';
      issCtx.fillRect(cx + 3, cy + wCellH * 0.48, wCellW - 6, 1.5);
      issCtx.fillStyle = 'rgba(246, 200, 128, 0.34)';
      issCtx.fillRect(cx + wCellW * 0.5, cy + 2, 1.2, wCellH - 4);
    }
    issCtx.fillStyle = 'rgba(210, 218, 228, 0.55)';
    issCtx.fillRect(0, r * wCellH, issSize, 1.5);
  }
  for (let y = 0; y < issSize; y++) {
    for (let x = 0; x < issSize; x++) {
      const seamY = y % wCellH < 2 ? 0.25 : 0.85;
      const seamX = x % wCellW < 3 ? 0.3 : 0.85;
      issHeights[y * issSize + x] = Math.min(seamX, seamY);
    }
  }
  const issSolarMap = new THREE.CanvasTexture(issCanvas);
  issSolarMap.colorSpace = THREE.SRGBColorSpace;
  issSolarMap.wrapS = THREE.RepeatWrapping;
  issSolarMap.wrapT = THREE.RepeatWrapping;
  issSolarMap.anisotropy = anisotropy;
  const issSolarNormal = heightCanvasToNormalTexture(issHeights, issSize, 3.2, anisotropy);
  const issSolarRoughness = createScalarPbrMap(
    issHeights,
    issSize,
    (h) => (h < 0.4 ? 0.44 : 0.2),
    anisotropy,
  );
  const issSolarMetalness = createScalarPbrMap(
    issHeights,
    issSize,
    (h) => (h < 0.4 ? 0.82 : 0.56),
    anisotropy,
  );

  // 9. ISS Beta-Cloth Quilted White Pressurized Module Skin + MMOD Whipple Shielding
  const bSize = 512;
  const bCanvas = document.createElement('canvas');
  bCanvas.width = bSize;
  bCanvas.height = bSize;
  const bCtx = bCanvas.getContext('2d')!;
  const bHeights = new Float32Array(bSize * bSize);

  bCtx.fillStyle = '#dde2ea';
  bCtx.fillRect(0, 0, bSize, bSize);

  const bStep = 64;
  for (let gy = 0; gy < bSize; gy += bStep) {
    for (let gx = 0; gx < bSize; gx += bStep) {
      const shade = 216 + ((gx * 3 + gy * 7) % 16);
      const grad = bCtx.createRadialGradient(
        gx + bStep * 0.5,
        gy + bStep * 0.5,
        4,
        gx + bStep * 0.5,
        gy + bStep * 0.5,
        bStep * 0.65,
      );
      grad.addColorStop(0, `rgb(${shade + 14}, ${shade + 15}, ${shade + 18})`);
      grad.addColorStop(1, `rgb(${shade - 22}, ${shade - 20}, ${shade - 14})`);
      bCtx.fillStyle = grad;
      bCtx.fillRect(gx + 1, gy + 1, bStep - 2, bStep - 2);

      bCtx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
      bCtx.lineWidth = 1.5;
      bCtx.strokeRect(gx + 1, gy + 1, bStep - 2, bStep - 2);
      bCtx.fillStyle = '#f59e0b';
      bCtx.fillRect(gx + 8, gy + bStep * 0.5 - 1, 10, 2);
    }
  }
  for (let y = 0; y < bSize; y++) {
    for (let x = 0; x < bSize; x++) {
      const lx = (x % bStep) / bStep - 0.5;
      const ly = (y % bStep) / bStep - 0.5;
      const pillow = Math.max(0, 1.0 - (lx * lx + ly * ly) * 2.4);
      const stitch = x % bStep < 2 || y % bStep < 2 ? -0.25 : 0;
      bHeights[y * bSize + x] =
        0.55 + pillow * 0.35 + stitch + (fbm((x / bSize) * 16, (y / bSize) * 16, 2) - 0.5) * 0.08;
    }
  }
  const issBetaMap = new THREE.CanvasTexture(bCanvas);
  issBetaMap.colorSpace = THREE.SRGBColorSpace;
  issBetaMap.wrapS = THREE.RepeatWrapping;
  issBetaMap.wrapT = THREE.RepeatWrapping;
  issBetaMap.anisotropy = anisotropy;
  const issBetaNormal = heightCanvasToNormalTexture(bHeights, bSize, 3.6, anisotropy);
  const issBetaRoughness = createScalarPbrMap(
    bHeights,
    bSize,
    (h) => (h < 0.45 ? 0.38 : 0.62),
    anisotropy,
  );
  const issBetaMetalness = createScalarPbrMap(
    bHeights,
    bSize,
    (h) => (h < 0.45 ? 0.68 : 0.08),
    anisotropy,
  );

  // 10. White Accordion Thermal Control Radiator Texture
  const rCanvas = document.createElement('canvas');
  rCanvas.width = 256;
  rCanvas.height = 256;
  const rCtx = rCanvas.getContext('2d')!;
  rCtx.fillStyle = '#eef3f9';
  rCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) {
    rCtx.fillStyle = '#cbd5e1';
    rCtx.fillRect(0, y, 256, 2);
    rCtx.fillStyle = '#94a3b8';
    rCtx.fillRect(0, y + 7, 256, 1);
  }
  for (let x = 0; x < 256; x += 64) {
    rCtx.fillStyle = '#64748b';
    rCtx.fillRect(x, 0, 2, 256);
  }
  const radHeights = new Float32Array(256 * 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const hinge = x % 64 < 2 ? 0.15 : 0.85;
      const pleat = Math.sin((y / 16) * Math.PI * 2) * 0.25 + 0.5;
      radHeights[y * 256 + x] = Math.min(hinge, pleat + 0.2);
    }
  }
  const radiatorMap = new THREE.CanvasTexture(rCanvas);
  radiatorMap.colorSpace = THREE.SRGBColorSpace;
  radiatorMap.wrapS = THREE.RepeatWrapping;
  radiatorMap.wrapT = THREE.RepeatWrapping;
  radiatorMap.anisotropy = anisotropy;
  const radiatorNormal = heightCanvasToNormalTexture(radHeights, 256, 2.8, anisotropy);
  const radiatorRoughness = createScalarPbrMap(
    radHeights,
    256,
    (h) => (h < 0.25 ? 0.3 : 0.44),
    anisotropy,
  );
  const radiatorMetalness = createScalarPbrMap(
    radHeights,
    256,
    (h) => (h < 0.25 ? 0.78 : 0.22),
    anisotropy,
  );

  // 11. Braided Aerospace Copper / Kapton Harness & Propulsion Tubing (256px)
  const cuSize = 256;
  const cuCanvas = document.createElement('canvas');
  cuCanvas.width = cuSize;
  cuCanvas.height = cuSize;
  const cuCtx = cuCanvas.getContext('2d')!;
  const cuHeights = new Float32Array(cuSize * cuSize);
  const cuImg = cuCtx.createImageData(cuSize, cuSize);
  for (let y = 0; y < cuSize; y++) {
    for (let x = 0; x < cuSize; x++) {
      const braid = Math.sin((x + y) * 0.42) * 0.5 + Math.sin((x - y) * 0.42) * 0.5;
      const groove = Math.sin((y / cuSize) * Math.PI * 24) * 0.25;
      const micro = fbm((x / cuSize) * 16, (y / cuSize) * 16, 3) * 0.2;
      const h = 0.5 + braid * 0.3 + groove + micro;
      cuHeights[y * cuSize + x] = h;
      const idx = (y * cuSize + x) * 4;
      cuImg.data[idx] = Math.min(255, Math.round(168 + h * 72));
      cuImg.data[idx + 1] = Math.min(255, Math.round(88 + h * 54));
      cuImg.data[idx + 2] = Math.min(255, Math.round(40 + h * 28));
      cuImg.data[idx + 3] = 255;
    }
  }
  cuCtx.putImageData(cuImg, 0, 0);
  const copperMap = new THREE.CanvasTexture(cuCanvas);
  copperMap.colorSpace = THREE.SRGBColorSpace;
  copperMap.wrapS = THREE.RepeatWrapping;
  copperMap.wrapT = THREE.RepeatWrapping;
  copperMap.anisotropy = anisotropy;
  const copperNormal = heightCanvasToNormalTexture(cuHeights, cuSize, 3.2, anisotropy);
  const copperRoughness = createScalarPbrMap(
    cuHeights,
    cuSize,
    (h) => 0.2 + (1 - h) * 0.24,
    anisotropy,
  );
  const copperMetalness = createScalarPbrMap(
    cuHeights,
    cuSize,
    (h) => 0.74 + h * 0.22,
    anisotropy,
  );

  // 12. Anti-Reflective Sapphire & Multi-Coated Spacecraft Camera Optics (256px)
  const lnSize = 256;
  const lnCanvas = document.createElement('canvas');
  lnCanvas.width = lnSize;
  lnCanvas.height = lnSize;
  const lnCtx = lnCanvas.getContext('2d')!;
  const lnHalf = lnSize / 2;
  const lnGrad = lnCtx.createRadialGradient(lnHalf, lnHalf, 4, lnHalf, lnHalf, lnHalf);
  lnGrad.addColorStop(0.0, '#040914');
  lnGrad.addColorStop(0.35, '#0b1c3d');
  lnGrad.addColorStop(0.62, '#1e3a6e');
  lnGrad.addColorStop(0.78, '#3b1d5a');
  lnGrad.addColorStop(0.92, '#1e293b');
  lnGrad.addColorStop(1.0, '#475569');
  lnCtx.fillStyle = lnGrad;
  lnCtx.fillRect(0, 0, lnSize, lnSize);
  lnCtx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  lnCtx.lineWidth = 2;
  for (const rRing of [28, 56, 86, 112]) {
    lnCtx.beginPath();
    lnCtx.arc(lnHalf, lnHalf, rRing, 0, Math.PI * 2);
    lnCtx.stroke();
  }
  const lnHeights = new Float32Array(lnSize * lnSize);
  for (let y = 0; y < lnSize; y++) {
    for (let x = 0; x < lnSize; x++) {
      const dist = Math.hypot(x - lnHalf, y - lnHalf);
      const dome = Math.max(0, 1 - (dist / lnHalf) * (dist / lnHalf));
      const step = Math.abs(dist - 86) < 2 || Math.abs(dist - 112) < 2 ? -0.35 : 0;
      lnHeights[y * lnSize + x] = dome * 0.75 + step;
    }
  }
  const lensMap = new THREE.CanvasTexture(lnCanvas);
  lensMap.colorSpace = THREE.SRGBColorSpace;
  lensMap.anisotropy = anisotropy;
  const lensNormal = heightCanvasToNormalTexture(lnHeights, lnSize, 2.4, anisotropy);
  const lensRoughness = createScalarPbrMap(
    lnHeights,
    lnSize,
    (h) => (h < 0.05 ? 0.35 : 0.06),
    anisotropy,
  );
  const lensMetalness = createScalarPbrMap(
    lnHeights,
    lnSize,
    (h) => (h < 0.05 ? 0.85 : 0.2),
    anisotropy,
  );

  // 13. Rover Chevron Wheel Track Imprint Decals in Martian / Lunar Regolith
  const tSize = 256;
  const tCanvas = document.createElement('canvas');
  tCanvas.width = tSize;
  tCanvas.height = tSize;
  const tCtx = tCanvas.getContext('2d')!;
  tCtx.clearRect(0, 0, tSize, tSize);
  for (let y = 0; y < tSize; y += 18) {
    tCtx.fillStyle = 'rgba(20, 12, 8, 0.34)';
    tCtx.fillRect(24, y, tSize - 48, 6);
    tCtx.strokeStyle = 'rgba(24, 15, 10, 0.24)';
    tCtx.lineWidth = 3;
    tCtx.beginPath();
    tCtx.moveTo(28, y + 8);
    tCtx.lineTo(tSize * 0.5, y + 14);
    tCtx.lineTo(tSize - 28, y + 8);
    tCtx.stroke();
  }
  const trackImprintMap = new THREE.CanvasTexture(tCanvas);
  trackImprintMap.colorSpace = THREE.SRGBColorSpace;
  trackImprintMap.wrapS = THREE.ClampToEdgeWrapping;
  trackImprintMap.wrapT = THREE.RepeatWrapping;
  trackImprintMap.repeat.set(1, 22);
  trackImprintMap.anisotropy = anisotropy;

  return {
    kaptonMap,
    kaptonNormal,
    kaptonRoughness,
    kaptonMetalness,
    solarMap,
    solarNormal,
    solarRoughness,
    solarMetalness,
    issSolarMap,
    issSolarNormal,
    issSolarRoughness,
    issSolarMetalness,
    issBetaMap,
    issBetaNormal,
    issBetaRoughness,
    issBetaMetalness,
    radiatorMap,
    radiatorNormal,
    radiatorRoughness,
    radiatorMetalness,
    wheelMap,
    wheelBump,
    wheelNormal,
    wheelRoughness,
    wheelMetalness,
    panelMap,
    panelNormal,
    panelRoughness,
    panelMetalness,
    carbonMap,
    carbonNormal,
    carbonRoughness,
    carbonMetalness,
    brushedMetalMap,
    brushedMetalNormal,
    brushedMetalRoughness,
    brushedMetalMetalness,
    jwstMirrorMap,
    jwstMirrorNormal,
    jwstMirrorRoughness,
    jwstMirrorMetalness,
    copperMap,
    copperNormal,
    copperRoughness,
    copperMetalness,
    lensMap,
    lensNormal,
    lensRoughness,
    lensMetalness,
    trackImprintMap,
    dispose: () => {
      kaptonMap.dispose();
      kaptonNormal.dispose();
      kaptonRoughness.dispose();
      kaptonMetalness.dispose();
      solarMap.dispose();
      solarNormal.dispose();
      solarRoughness.dispose();
      solarMetalness.dispose();
      issSolarMap.dispose();
      issSolarNormal.dispose();
      issSolarRoughness.dispose();
      issSolarMetalness.dispose();
      issBetaMap.dispose();
      issBetaNormal.dispose();
      issBetaRoughness.dispose();
      issBetaMetalness.dispose();
      radiatorMap.dispose();
      radiatorNormal.dispose();
      radiatorRoughness.dispose();
      radiatorMetalness.dispose();
      wheelMap.dispose();
      wheelBump.dispose();
      wheelNormal.dispose();
      wheelRoughness.dispose();
      wheelMetalness.dispose();
      panelMap.dispose();
      panelNormal.dispose();
      panelRoughness.dispose();
      panelMetalness.dispose();
      carbonMap.dispose();
      carbonNormal.dispose();
      carbonRoughness.dispose();
      carbonMetalness.dispose();
      brushedMetalMap.dispose();
      brushedMetalNormal.dispose();
      brushedMetalRoughness.dispose();
      brushedMetalMetalness.dispose();
      jwstMirrorMap.dispose();
      jwstMirrorNormal.dispose();
      jwstMirrorRoughness.dispose();
      jwstMirrorMetalness.dispose();
      copperMap.dispose();
      copperNormal.dispose();
      copperRoughness.dispose();
      copperMetalness.dispose();
      lensMap.dispose();
      lensNormal.dispose();
      lensRoughness.dispose();
      lensMetalness.dispose();
      trackImprintMap.dispose();
    },
  };
}

export interface TerrainPBRTextures {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  metalnessMap: THREE.CanvasTexture;
  dispose: () => void;
}

export function createTerrainPBRTextures(
  worldType: 'mars' | 'luna' | 'titan' | 'venus' | 'mercury' | 'comet' | 'clouds',
  anisotropy = 4,
): TerrainPBRTextures {
  // 512x512 Fast Multi-Octave Geological PBR (Color + Normal + Roughness) tiled 14x14
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(size, size);

  const heights = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;

      const coarse = fbm(u * 7, v * 7, 4);
      const mid = fbm(u * 19 + 2.7, v * 19 + 5.1, 3);
      const fine = fbm(u * 48 + 4.1, v * 48 + 8.3, 3);
      const ripple =
        worldType === 'mars' || worldType === 'clouds' || worldType === 'titan'
          ? Math.sin(v * Math.PI * 30 + coarse * 6.0) * 0.5 + 0.5
          : 0.5;
      const pebbleSeed = hash2(x * 0.5, y * 0.5);
      const pebble =
        pebbleSeed > 0.99 && worldType !== 'clouds' ? 0.42 : pebbleSeed > 0.965 ? 0.16 : 0;

      const h = coarse * 0.4 + mid * 0.25 + fine * 0.2 + ripple * 0.15 + pebble;
      heights[y * size + x] = h;

      let r = 180;
      let g = 180;
      let b = 180;
      let rough = 0.92;

      if (worldType === 'mars') {
        // Real Meridiani/Jezero ferric oxide dust + dark volcanic basalt grains + hematite spherules
        r = 152 + coarse * 62 + ripple * 24 + (mid - 0.5) * 26 - pebble * 72;
        g = 80 + coarse * 38 + ripple * 16 + (mid - 0.5) * 18 - pebble * 42;
        b = 50 + coarse * 24 + ripple * 9 - pebble * 26;
        rough = pebble > 0.2 ? 0.72 : 0.95 - ripple * 0.06;
      } else if (worldType === 'luna') {
        const microCrater = fine < 0.34 ? -18 : 0;
        const lum = 88 + coarse * 56 + mid * 24 + fine * 18 + microCrater - pebble * 28;
        r = lum;
        g = lum + 1;
        b = lum + 4;
        rough = 0.96 - fine * 0.08;
      } else if (worldType === 'mercury') {
        const lum = 82 + coarse * 50 + mid * 22 + fine * 20 - pebble * 22;
        r = lum + 6;
        g = lum + 2;
        b = lum - 4;
        rough = 0.94;
      } else if (worldType === 'titan') {
        // Damp hydrocarbon mudflats + orange tholin organic pebbles
        const dampPatch = coarse < 0.42 ? 1 : 0;
        r = 126 + coarse * 54 + ripple * 16 - dampPatch * 24;
        g = 72 + coarse * 34 + ripple * 10 - dampPatch * 14;
        b = 26 + coarse * 18 - dampPatch * 4;
        rough = dampPatch ? 0.38 : 0.84;
      } else if (worldType === 'venus') {
        const crack = Math.abs(mid - 0.5) < 0.03 ? -28 : 0;
        r = 134 + coarse * 48 + crack;
        g = 84 + coarse * 32 + crack * 0.7;
        b = 34 + coarse * 18;
        rough = 0.9;
      } else if (worldType === 'comet') {
        const iceGlint = fine > 0.76 ? 34 : 0;
        const lum = 32 + coarse * 28 + mid * 16 + iceGlint;
        r = lum + 4;
        g = lum + 4;
        b = lum + 8 + iceGlint * 0.5;
        rough = iceGlint > 0 ? 0.42 : 0.97;
      } else {
        const band = Math.sin(v * Math.PI * 10 + coarse * 2.5) * 0.5 + 0.5;
        r = 165 + band * 55;
        g = 138 + band * 48;
        b = 92 + band * 34;
        rough = 0.85;
      }

      const idx = (y * size + x) * 4;
      img.data[idx] = Math.min(255, Math.max(0, Math.round(r)));
      img.data[idx + 1] = Math.min(255, Math.max(0, Math.round(g)));
      img.data[idx + 2] = Math.min(255, Math.max(0, Math.round(b)));
      img.data[idx + 3] = 255;

      const rByte = Math.min(255, Math.max(0, Math.round(rough * 255)));
      rImg.data[idx] = rByte;
      rImg.data[idx + 1] = rByte;
      rImg.data[idx + 2] = rByte;
      rImg.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(12, 12);
  map.anisotropy = anisotropy;

  const normalMap = heightCanvasToNormalTexture(
    heights,
    size,
    worldType === 'clouds' ? 0.8 : 5.2,
    anisotropy,
    12,
  );

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(12, 12);
  roughnessMap.anisotropy = anisotropy;

  const metalnessMap = createScalarPbrMap(
    heights,
    size,
    (h) =>
      worldType === 'mars' || worldType === 'comet' || worldType === 'mercury'
        ? h > 0.72
          ? 0.14
          : 0.02
        : 0.0,
    anisotropy,
    12,
  );

  return {
    map,
    normalMap,
    roughnessMap,
    metalnessMap,
    dispose: () => {
      map.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
      metalnessMap.dispose();
    },
  };
}

/*
 * The craft and terrain textures are procedural and deterministic: the same pixels every time.
 * Generating them took about a second of main-thread noise per mission entered (several seconds
 * on a phone), which froze the app on every stop of the hardware tour. They are now built once
 * per session and reused by every mission. Leaving a mission still calls dispose(), which frees
 * their GPU copies; the canvases stay, so the next mission only re-uploads them.
 */
const sharedCraftSets = new Map<number, CraftTextureSet>();
const sharedTerrainSets = new Map<string, TerrainPBRTextures>();

export function getSharedCraftTextureSet(anisotropy = 4): CraftTextureSet {
  let set = sharedCraftSets.get(anisotropy);
  if (!set) {
    set = createCraftTextureSet(anisotropy);
    sharedCraftSets.set(anisotropy, set);
    latticeCache = null; // 2 MB, only needed while generating
  }
  return set;
}

export function getSharedTerrainPBRTextures(
  worldType: Parameters<typeof createTerrainPBRTextures>[0],
  anisotropy = 4,
): TerrainPBRTextures {
  const key = worldType + ':' + anisotropy;
  let set = sharedTerrainSets.get(key);
  if (!set) {
    set = createTerrainPBRTextures(worldType, anisotropy);
    sharedTerrainSets.set(key, set);
    latticeCache = null;
  }
  return set;
}
