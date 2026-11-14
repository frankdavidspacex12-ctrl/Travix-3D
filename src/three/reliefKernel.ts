/**
 * Pure pixel kernel shared by the main thread (sync fallback) and relief.worker.ts.
 * No three.js import so the worker bundle stays tiny. Any change here changes both
 * paths identically, which keeps worker output byte-for-byte equal to the sync path.
 */

export interface ReliefKernelOptions {
  normalStrength: number;
  isGasGiant: boolean;
  isIcy: boolean;
  tileVertical: boolean;
}

export interface ReliefKernelResult {
  normal: Uint8ClampedArray;
  rough: Uint8ClampedArray;
  metal: Uint8ClampedArray;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function computeReliefPixels(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  opts: ReliefKernelOptions,
): ReliefKernelResult {
  const { normalStrength, isGasGiant, isIcy, tileVertical } = opts;
  const lum = new Float32Array(w * h);
  const rData = new Uint8ClampedArray(w * h * 4);
  const mData = new Uint8ClampedArray(w * h * 4);
  const nData = new Uint8ClampedArray(w * h * 4);

  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    const r = pixels[p] / 255;
    const g = pixels[p + 1] / 255;
    const b = pixels[p + 2] / 255;
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    lum[i] = l;

    let rough = 0.92;
    let metal = 0.0;
    if (isGasGiant) {
      rough = 0.9 - l * 0.14;
    } else if (isIcy) {
      rough = 0.88 - l * 0.34;
    } else {
      rough = 0.84 + l * 0.13;
      if (l < 0.34) {
        metal = ((0.34 - l) / 0.34) * 0.11;
      }
    }
    const rb = Math.round(clamp(rough, 0.32, 0.98) * 255);
    rData[p] = rb;
    rData[p + 1] = rb;
    rData[p + 2] = rb;
    rData[p + 3] = 255;

    const mb = Math.round(clamp(metal, 0, 1) * 255);
    mData[p] = mb;
    mData[p + 1] = mb;
    mData[p + 2] = mb;
    mData[p + 3] = 255;
  }

  for (let y = 0; y < h; y++) {
    const ym = tileVertical ? (y - 1 + h) % h : Math.max(0, y - 1);
    const yp = tileVertical ? (y + 1) % h : Math.min(h - 1, y + 1);
    for (let x = 0; x < w; x++) {
      const xm = (x - 1 + w) % w;
      const xp = (x + 1) % w;

      const tl = lum[ym * w + xm];
      const tc = lum[ym * w + x];
      const tr = lum[ym * w + xp];
      const ml = lum[y * w + xm];
      const mr = lum[y * w + xp];
      const bl = lum[yp * w + xm];
      const bc = lum[yp * w + x];
      const br = lum[yp * w + xp];

      const gx = (tr + 2 * mr + br - (tl + 2 * ml + bl)) * 0.25 * normalStrength;
      const gy = (bl + 2 * bc + br - (tl + 2 * tc + tr)) * 0.25 * normalStrength;

      const nx = -gx;
      const ny = -gy;
      const nz = 1.0;
      const inv = 1 / Math.hypot(nx, ny, nz);

      const idx = (y * w + x) * 4;
      nData[idx] = Math.round((nx * inv * 0.5 + 0.5) * 255);
      nData[idx + 1] = Math.round((ny * inv * 0.5 + 0.5) * 255);
      nData[idx + 2] = Math.round((nz * inv * 0.5 + 0.5) * 255);
      nData[idx + 3] = 255;
    }
  }

  return { normal: nData, rough: rData, metal: mData };
}
