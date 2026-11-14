/// <reference lib="webworker" />

export type SurfacePbrProfile =
  | 'earth'
  | 'rocky'
  | 'gas'
  | 'icy'
  | 'comet'
  | 'terrain';

export type CraftPbrProfile = 'auto' | 'kapton' | 'solar' | 'metal' | 'panel' | 'carbon';

export interface Surface8KJobRequest {
  jobId: number;
  kind: 'surface';
  srcWidth: number;
  srcHeight: number;
  targetWidth: number;
  targetHeight: number;
  albedoPixels: ArrayBuffer;
  bumpPixels?: ArrayBuffer;
  bumpWidth?: number;
  bumpHeight?: number;
  specPixels?: ArrayBuffer;
  specWidth?: number;
  specHeight?: number;
  profile: SurfacePbrProfile;
  normalStrength: number;
  tileVertical: boolean;
  skipAlbedo?: boolean;
  seed: number;
}

export interface Craft8KJobRequest {
  jobId: number;
  kind: 'craft';
  srcWidth: number;
  srcHeight: number;
  targetWidth: number;
  targetHeight: number;
  albedoPixels: ArrayBuffer;
  craftProfile: CraftPbrProfile;
  normalStrength: number;
  skipAlbedo?: boolean;
  seed: number;
}

export type PbrWorkerRequest = Surface8KJobRequest | Craft8KJobRequest;

export interface PbrWorkerResponse {
  jobId: number;
  width: number;
  height: number;
  albedoBuffer: ArrayBuffer | null;
  normalBuffer: ArrayBuffer;
  roughnessBuffer: ArrayBuffer;
  metalnessBuffer: ArrayBuffer;
}

// Fast deterministic integer hash for micro-geology PBR synthesis
function hashInt(x: number, y: number, seed: number): number {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function fastNoise(x: number, y: number, periodX: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const px0 = ((ix % periodX) + periodX) % periodX;
  const px1 = (px0 + 1) % periodX;

  const a = hashInt(px0, iy, seed);
  const b = hashInt(px1, iy, seed);
  const c = hashInt(px0, iy + 1, seed);
  const d = hashInt(px1, iy + 1, seed);

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function tileMicroDetail(
  u: number,
  v: number,
  periodBase: number,
  seed: number,
): number {
  const p1 = periodBase;
  const p2 = periodBase * 2;
  const p3 = periodBase * 4;
  const n1 = fastNoise(u * p1, v * (p1 * 0.5), p1, seed);
  const n2 = fastNoise(u * p2 + 3.1, v * (p2 * 0.5) + 1.7, p2, seed + 17);
  const n3 = fastNoise(u * p3 + 7.4, v * (p3 * 0.5) + 5.3, p3, seed + 53);
  return n1 * 0.52 + n2 * 0.31 + n3 * 0.17;
}

function sampleBilinearRgba(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  u: number,
  v: number,
  wrapX: boolean,
  wrapY: boolean,
): [number, number, number] {
  const fx = u * w - 0.5;
  const fy = v * h - 0.5;
  let x0 = Math.floor(fx);
  let y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;

  let x1 = x0 + 1;
  let y1 = y0 + 1;

  if (wrapX) {
    x0 = ((x0 % w) + w) % w;
    x1 = ((x1 % w) + w) % w;
  } else {
    x0 = Math.max(0, Math.min(w - 1, x0));
    x1 = Math.max(0, Math.min(w - 1, x1));
  }

  if (wrapY) {
    y0 = ((y0 % h) + h) % h;
    y1 = ((y1 % h) + h) % h;
  } else {
    y0 = Math.max(0, Math.min(h - 1, y0));
    y1 = Math.max(0, Math.min(h - 1, y1));
  }

  const i00 = (y0 * w + x0) * 4;
  const i10 = (y0 * w + x1) * 4;
  const i01 = (y1 * w + x0) * 4;
  const i11 = (y1 * w + x1) * 4;

  const w00 = (1 - tx) * (1 - ty);
  const w10 = tx * (1 - ty);
  const w01 = (1 - tx) * ty;
  const w11 = tx * ty;

  const r =
    data[i00] * w00 +
    data[i10] * w10 +
    data[i01] * w01 +
    data[i11] * w11;
  const g =
    data[i00 + 1] * w00 +
    data[i10 + 1] * w10 +
    data[i01 + 1] * w01 +
    data[i11 + 1] * w11;
  const b =
    data[i00 + 2] * w00 +
    data[i10 + 2] * w10 +
    data[i01 + 2] * w01 +
    data[i11 + 2] * w11;

  return [r, g, b];
}

function sampleBilinearLuma(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  u: number,
  v: number,
  wrapX: boolean,
  wrapY: boolean,
): number {
  const [r, g, b] = sampleBilinearRgba(data, w, h, u, v, wrapX, wrapY);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

function processSurface8K(req: Surface8KJobRequest): PbrWorkerResponse {
  const w = req.targetWidth;
  const h = req.targetHeight;
  const totalBytes = w * h * 4;

  const srcAlbedo = new Uint8ClampedArray(req.albedoPixels);
  const srcBump = req.bumpPixels ? new Uint8ClampedArray(req.bumpPixels) : null;
  const srcSpec = req.specPixels ? new Uint8ClampedArray(req.specPixels) : null;

  const albedoOut = req.skipAlbedo ? null : new Uint8Array(totalBytes);
  const normalOut = new Uint8Array(totalBytes);
  const roughOut = new Uint8Array(totalBytes);
  const metalOut = new Uint8Array(totalBytes);

  // 3-row rolling height ring buffer to compute Sobel normals with minimal RAM
  const rowBuf0 = new Float32Array(w);
  const rowBuf1 = new Float32Array(w);
  const rowBuf2 = new Float32Array(w);

  const microFreq = Math.max(96, Math.round(w / 24));
  const detailAmp =
    req.profile === 'gas'
      ? 0.045
      : req.profile === 'earth'
        ? 0.055
        : req.profile === 'comet'
          ? 0.14
          : 0.105;

  const computeRow = (py: number, heightRow: Float32Array) => {
    const v = (py + 0.5) / h;
    const outY = h - 1 - py;
    const outRowOffset = outY * w * 4;

    for (let px = 0; px < w; px++) {
      const u = (px + 0.5) / w;
      const [sr, sg, sb] = sampleBilinearRgba(
        srcAlbedo,
        req.srcWidth,
        req.srcHeight,
        u,
        v,
        true,
        req.tileVertical,
      );

      const luma = (0.299 * sr + 0.587 * sg + 0.114 * sb) / 255;
      const micro = tileMicroDetail(u, v, microFreq, req.seed);
      const microCentered = micro - 0.5;

      const idx = outRowOffset + px * 4;
      if (albedoOut) {
        const grainBoost =
          req.profile === 'gas'
            ? microCentered * 4
            : req.profile === 'earth'
              ? microCentered * 6
              : microCentered * 8;
        albedoOut[idx] = clampByte(sr + grainBoost);
        albedoOut[idx + 1] = clampByte(sg + grainBoost);
        albedoOut[idx + 2] = clampByte(sb + grainBoost);
        albedoOut[idx + 3] = 255;
      }

      let macroElev = luma;
      if (srcBump && req.bumpWidth && req.bumpHeight) {
        const bumpVal = sampleBilinearLuma(
          srcBump,
          req.bumpWidth,
          req.bumpHeight,
          u,
          v,
          true,
          req.tileVertical,
        );
        macroElev = bumpVal * 0.78 + luma * 0.22;
      }

      let rough = 0.86;
      let metal = 0.0;

      if (req.profile === 'earth') {
        const oceanMask =
          srcSpec && req.specWidth && req.specHeight
            ? sampleBilinearLuma(
                srcSpec,
                req.specWidth,
                req.specHeight,
                u,
                v,
                true,
                false,
              )
            : Math.max(0, (sb - sr * 1.15) / 110);

        const polarSnow = luma > 0.76 && Math.abs(v - 0.5) > 0.34 ? 1 : 0;
        if (oceanMask > 0.35 && !polarSnow) {
          rough = 0.16 + Math.abs(microCentered) * 0.09;
          metal = 0.0;
          heightRow[px] = 0.2 + micro * 0.04;
        } else if (polarSnow) {
          rough = 0.46 + micro * 0.12;
          metal = 0.0;
          heightRow[px] = macroElev * 0.9 + micro * detailAmp;
        } else {
          rough = 0.84 + micro * 0.12;
          metal = 0.0;
          heightRow[px] = macroElev + micro * detailAmp * 1.4;
        }
      } else if (req.profile === 'gas') {
        rough = 0.88 - luma * 0.14 + microCentered * 0.06;
        metal = 0.0;
        heightRow[px] = macroElev * 0.65 + micro * detailAmp;
      } else if (req.profile === 'icy') {
        rough = 0.78 - luma * 0.42 + microCentered * 0.08;
        metal = 0.0;
        heightRow[px] = macroElev + micro * detailAmp;
      } else if (req.profile === 'comet') {
        const brightMineral = luma > 0.56 ? (luma - 0.56) * 0.25 : 0;
        rough = luma > 0.65 ? 0.48 : 0.9 - micro * 0.08;
        metal = Math.min(0.05, brightMineral * 0.12);
        heightRow[px] = macroElev + micro * detailAmp;
      } else if (req.profile === 'terrain') {
        const darkBasalt = luma < 0.32;
        rough = darkBasalt ? 0.76 + micro * 0.14 : 0.88 + micro * 0.1;
        metal = darkBasalt && micro > 0.78 ? 0.04 : 0.0;
        heightRow[px] = macroElev + micro * detailAmp;
      } else {
        // Rocky planets & moons: keep dielectric diffuse bright in deep space
        const basaltic = luma < 0.36 ? (0.36 - luma) / 0.36 : 0;
        rough = 0.82 + luma * 0.14 - basaltic * 0.14;
        metal = basaltic * 0.03;
        heightRow[px] = macroElev + micro * detailAmp;
      }

      roughOut[idx] = clampByte(Math.round(rough * 255));
      roughOut[idx + 1] = roughOut[idx];
      roughOut[idx + 2] = roughOut[idx];
      roughOut[idx + 3] = 255;

      const mByte = clampByte(Math.round(metal * 255));
      metalOut[idx] = mByte;
      metalOut[idx + 1] = mByte;
      metalOut[idx + 2] = mByte;
      metalOut[idx + 3] = 255;
    }
  };

  const resScale = Math.sqrt(w / 1024);
  const gradFactor = 0.25 * req.normalStrength * resScale;

  const emitNormalRow = (
    py: number,
    rPrev: Float32Array,
    rCurr: Float32Array,
    rNext: Float32Array,
  ) => {
    const outY = h - 1 - py;
    const outRowOffset = outY * w * 4;
    for (let px = 0; px < w; px++) {
      const xm = (px - 1 + w) % w;
      const xp = (px + 1) % w;

      const tl = rPrev[xm];
      const tc = rPrev[px];
      const tr = rPrev[xp];
      const ml = rCurr[xm];
      const mr = rCurr[xp];
      const bl = rNext[xm];
      const bc = rNext[px];
      const br = rNext[xp];

      const gx = (tr + 2 * mr + br - (tl + 2 * ml + bl)) * gradFactor;
      const gy = (bl + 2 * bc + br - (tl + 2 * tc + tr)) * gradFactor;

      const nx = -gx;
      const ny = gy;
      const nz = 1.0;
      const inv = 1 / Math.hypot(nx, ny, nz);

      const idx = outRowOffset + px * 4;
      normalOut[idx] = clampByte(Math.round((nx * inv * 0.5 + 0.5) * 255));
      normalOut[idx + 1] = clampByte(Math.round((ny * inv * 0.5 + 0.5) * 255));
      normalOut[idx + 2] = clampByte(Math.round((nz * inv * 0.5 + 0.5) * 255));
      normalOut[idx + 3] = 255;
    }
  };

  let rowPrev = rowBuf0;
  let rowCurr = rowBuf1;
  let rowNext = rowBuf2;

  computeRow(0, rowCurr);
  if (h > 1) {
    computeRow(1, rowNext);
  } else {
    rowNext.set(rowCurr);
  }

  if (req.tileVertical && h > 2) {
    computeRow(h - 1, rowPrev);
    emitNormalRow(0, rowPrev, rowCurr, rowNext);
  } else {
    emitNormalRow(0, rowCurr, rowCurr, rowNext);
  }

  for (let py = 1; py < h - 1; py++) {
    const tmp = rowPrev;
    rowPrev = rowCurr;
    rowCurr = rowNext;
    rowNext = tmp;
    computeRow(py + 1, rowNext);
    emitNormalRow(py, rowPrev, rowCurr, rowNext);
  }

  if (h > 1) {
    if (req.tileVertical && h > 2) {
      computeRow(0, rowPrev);
      emitNormalRow(h - 1, rowCurr, rowNext, rowPrev);
    } else {
      emitNormalRow(h - 1, rowCurr, rowNext, rowNext);
    }
  }

  return {
    jobId: req.jobId,
    width: w,
    height: h,
    albedoBuffer: albedoOut ? albedoOut.buffer : null,
    normalBuffer: normalOut.buffer,
    roughnessBuffer: roughOut.buffer,
    metalnessBuffer: metalOut.buffer,
  };
}

function processCraft8K(req: Craft8KJobRequest): PbrWorkerResponse {
  const w = req.targetWidth;
  const h = req.targetHeight;
  const totalBytes = w * h * 4;

  const srcAlbedo = new Uint8ClampedArray(req.albedoPixels);
  const albedoOut = req.skipAlbedo ? null : new Uint8Array(totalBytes);
  const normalOut = new Uint8Array(totalBytes);
  const roughOut = new Uint8Array(totalBytes);
  const metalOut = new Uint8Array(totalBytes);

  const rowBuf0 = new Float32Array(w);
  const rowBuf1 = new Float32Array(w);
  const rowBuf2 = new Float32Array(w);
  const microFreq = Math.max(96, Math.round(w / 16));

  const computeRow = (py: number, heightRow: Float32Array) => {
    const v = (py + 0.5) / h;
    const outY = h - 1 - py;
    const outRowOffset = outY * w * 4;

    for (let px = 0; px < w; px++) {
      const u = (px + 0.5) / w;
      const [sr, sg, sb] = sampleBilinearRgba(
        srcAlbedo,
        req.srcWidth,
        req.srcHeight,
        u,
        v,
        true,
        true,
      );

      const luma = (0.299 * sr + 0.587 * sg + 0.114 * sb) / 255;
      const maxC = Math.max(sr, sg, sb);
      const minC = Math.min(sr, sg, sb);
      const sat = maxC > 0 ? (maxC - minC) / maxC : 0;

      const brush = fastNoise(u * (microFreq * 0.35), v * (microFreq * 2.4), microFreq, req.seed);
      const grain = tileMicroDetail(u, v, microFreq, req.seed + 31);
      const micro = brush * 0.55 + grain * 0.45 - 0.5;

      const idx = outRowOffset + px * 4;
      if (albedoOut) {
        albedoOut[idx] = clampByte(sr + micro * 5);
        albedoOut[idx + 1] = clampByte(sg + micro * 5);
        albedoOut[idx + 2] = clampByte(sb + micro * 5);
        albedoOut[idx + 3] = 255;
      }

      let rough = 0.46;
      let metal = 0.5;
      let elev = luma + micro * 0.08;

      if (req.craftProfile === 'kapton') {
        rough = 0.16 + (1 - luma) * 0.36 + Math.abs(micro) * 0.08;
        metal = 0.84 + luma * 0.14;
      } else if (req.craftProfile === 'solar') {
        const isBusbar = luma > 0.52 && sat < 0.25;
        rough = isBusbar ? 0.2 : 0.14 + Math.abs(micro) * 0.06;
        metal = isBusbar ? 0.92 : 0.36;
        elev = isBusbar ? 0.85 : luma * 0.45 + micro * 0.04;
      } else if (req.craftProfile === 'metal') {
        rough = 0.22 + (1 - luma) * 0.28 + Math.abs(micro) * 0.08;
        metal = 0.78 + luma * 0.18;
      } else if (req.craftProfile === 'panel') {
        const isSeamOrRivet = luma < 0.62;
        rough = isSeamOrRivet ? 0.32 : 0.48 + Math.abs(micro) * 0.12;
        metal = isSeamOrRivet ? 0.8 : 0.12;
      } else if (req.craftProfile === 'carbon') {
        rough = 0.42 + (1 - luma) * 0.2;
        metal = 0.38;
      } else {
        const isGoldOrCopper = sr > sb * 1.45 && sg > sb * 1.1 && luma > 0.25;
        const isSolarBlue = sb > sr * 1.25 && luma < 0.48;
        const isWhiteThermal = luma > 0.74 && sat < 0.16;
        const isDarkCarbon = luma < 0.22 && sat < 0.25;

        if (isGoldOrCopper) {
          rough = 0.18 + (1 - luma) * 0.34;
          metal = 0.88 + luma * 0.1;
        } else if (isSolarBlue) {
          rough = 0.15 + Math.abs(micro) * 0.06;
          metal = 0.42;
        } else if (isWhiteThermal) {
          rough = 0.52 + Math.abs(micro) * 0.12;
          metal = 0.1;
        } else if (isDarkCarbon) {
          rough = 0.48 + Math.abs(micro) * 0.1;
          metal = 0.32;
        } else {
          rough = 0.26 + (1 - luma) * 0.28;
          metal = 0.76 + luma * 0.18;
        }
      }

      heightRow[px] = elev;
      const rByte = clampByte(Math.round(rough * 255));
      roughOut[idx] = rByte;
      roughOut[idx + 1] = rByte;
      roughOut[idx + 2] = rByte;
      roughOut[idx + 3] = 255;

      const mByte = clampByte(Math.round(metal * 255));
      metalOut[idx] = mByte;
      metalOut[idx + 1] = mByte;
      metalOut[idx + 2] = mByte;
      metalOut[idx + 3] = 255;
    }
  };

  const resScale = Math.sqrt(w / 1024);
  const gradFactor = 0.25 * req.normalStrength * resScale;

  const emitNormalRow = (
    py: number,
    rPrev: Float32Array,
    rCurr: Float32Array,
    rNext: Float32Array,
  ) => {
    const outY = h - 1 - py;
    const outRowOffset = outY * w * 4;
    for (let px = 0; px < w; px++) {
      const xm = (px - 1 + w) % w;
      const xp = (px + 1) % w;

      const gx =
        (rPrev[xp] +
          2 * rCurr[xp] +
          rNext[xp] -
          (rPrev[xm] + 2 * rCurr[xm] + rNext[xm])) *
        gradFactor;
      const gy =
        (rNext[xm] +
          2 * rNext[px] +
          rNext[xp] -
          (rPrev[xm] + 2 * rPrev[px] + rPrev[xp])) *
        gradFactor;

      const nx = -gx;
      const ny = gy;
      const nz = 1.0;
      const inv = 1 / Math.hypot(nx, ny, nz);

      const idx = outRowOffset + px * 4;
      normalOut[idx] = clampByte(Math.round((nx * inv * 0.5 + 0.5) * 255));
      normalOut[idx + 1] = clampByte(Math.round((ny * inv * 0.5 + 0.5) * 255));
      normalOut[idx + 2] = clampByte(Math.round((nz * inv * 0.5 + 0.5) * 255));
      normalOut[idx + 3] = 255;
    }
  };

  let rowPrev = rowBuf0;
  let rowCurr = rowBuf1;
  let rowNext = rowBuf2;

  computeRow(0, rowCurr);
  if (h > 1) computeRow(1, rowNext);
  else rowNext.set(rowCurr);

  if (h > 2) {
    computeRow(h - 1, rowPrev);
    emitNormalRow(0, rowPrev, rowCurr, rowNext);
  } else {
    emitNormalRow(0, rowCurr, rowCurr, rowNext);
  }

  for (let py = 1; py < h - 1; py++) {
    const tmp = rowPrev;
    rowPrev = rowCurr;
    rowCurr = rowNext;
    rowNext = tmp;
    computeRow(py + 1, rowNext);
    emitNormalRow(py, rowPrev, rowCurr, rowNext);
  }

  if (h > 1) {
    if (h > 2) {
      computeRow(0, rowPrev);
      emitNormalRow(h - 1, rowCurr, rowNext, rowPrev);
    } else {
      emitNormalRow(h - 1, rowCurr, rowNext, rowNext);
    }
  }

  return {
    jobId: req.jobId,
    width: w,
    height: h,
    albedoBuffer: albedoOut ? albedoOut.buffer : null,
    normalBuffer: normalOut.buffer,
    roughnessBuffer: roughOut.buffer,
    metalnessBuffer: metalOut.buffer,
  };
}

self.onmessage = (event: MessageEvent<PbrWorkerRequest>) => {
  const req = event.data;
  const result =
    req.kind === 'surface' ? processSurface8K(req) : processCraft8K(req);

  const transfers: Transferable[] = [
    result.normalBuffer,
    result.roughnessBuffer,
    result.metalnessBuffer,
  ];
  if (result.albedoBuffer) transfers.push(result.albedoBuffer);

  self.postMessage(result, transfers);
};
