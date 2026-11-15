import * as THREE from 'three';
import type {
  Craft8KJobRequest,
  CraftPbrProfile,
  PbrWorkerResponse,
  Surface8KJobRequest,
  SurfacePbrProfile,
} from './pbr8k.worker';

export interface FullPbrTextureSet {
  map: THREE.DataTexture | null;
  normalMap: THREE.DataTexture;
  roughnessMap: THREE.DataTexture;
  metalnessMap: THREE.DataTexture;
  width: number;
  height: number;
  dispose: () => void;
}

export interface Pbr8KCapabilities {
  maxTextureSize: number;
  anisotropy: number;
  isSoftwareGl: boolean;
  deviceMemoryGb: number;
}

export function getPbr8KCapabilities(
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean,
): Pbr8KCapabilities {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    maxTextureSize: renderer.capabilities.maxTextureSize || 4096,
    anisotropy: renderer.capabilities.getMaxAnisotropy(),
    isSoftwareGl,
    deviceMemoryGb: nav.deviceMemory ?? 8,
  };
}

function resolveTargetDimensions(
  srcW: number,
  srcH: number,
  caps: Pbr8KCapabilities,
  maxAllowedWidth: number,
): { width: number; height: number } {
  // Cap at 4096px wide so uncompressed RGBA DataTextures stay fast & VRAM-safe across all GPUs
  const hardwareCap = caps.isSoftwareGl
    ? 1024
    : caps.deviceMemoryGb < 4
      ? Math.min(2048, caps.maxTextureSize)
      : Math.min(4096, caps.maxTextureSize);

  const maxW = Math.min(maxAllowedWidth, hardwareCap);
  const aspect = srcW / Math.max(1, srcH);

  let width = maxW;
  let height: number;
  if (aspect >= 3.0) {
    height = Math.max(512, Math.round(width / 4));
  } else if (aspect >= 1.55) {
    height = Math.max(512, Math.round(width / 2));
  } else {
    width = Math.min(width, caps.isSoftwareGl ? 1024 : 2048);
    height = width;
  }

  return { width, height };
}

function extractImagePixels(
  source: CanvasImageSource,
  targetW?: number,
  targetH?: number,
): { width: number; height: number; buffer: ArrayBuffer } | null {
  let rawW = 512;
  let rawH = 512;
  if (source instanceof HTMLImageElement) {
    rawW = source.naturalWidth || source.width || 512;
    rawH = source.naturalHeight || source.height || 256;
  } else if (source instanceof HTMLCanvasElement) {
    rawW = source.width || 512;
    rawH = source.height || 512;
  } else if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
    rawW = source.width || 512;
    rawH = source.height || 512;
  }

  const scale = Math.min(1, 2048 / Math.max(rawW, rawH));
  const w = targetW ?? Math.max(32, Math.round(rawW * scale));
  const h = targetH ?? Math.max(32, Math.round(rawH * scale));

  // Revisiting a body reuses the pixels read last time (the buffer sent to the worker is a copy,
  // since it gets transferred)
  const key = `${w}x${h}`;
  const cached = extractedPixelsCache.get(source as object);
  if (cached && cached.key === key) {
    return { width: w, height: h, buffer: new Uint8ClampedArray(cached.data).buffer };
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  // CPU-backed canvas: getImageData no longer waits for a GPU readback (the main-thread stall
  // seen when arriving at a planet)
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  extractedPixelsCache.set(source as object, { key, data });
  const copy = new Uint8ClampedArray(data);
  return { width: w, height: h, buffer: copy.buffer };
}

let pixelsWorker: Worker | null = null;
let pixelsWorkerFailed = false;
let pixelsJobId = 0;
const pixelsJobs = new Map<number, (buffer: ArrayBuffer | null) => void>();

/**
 * Pixels of an image URL read in imagePixels.worker (decode, resize and getImageData off the main
 * thread). Null when workers / OffscreenCanvas are unavailable or the read fails: the caller then
 * uses the main-thread path, as before.
 */
function readPixelsInWorker(
  url: string,
  width: number,
  height: number,
  srcWidth: number,
  srcHeight: number,
): Promise<ArrayBuffer | null> {
  if (pixelsWorkerFailed || typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    return Promise.resolve(null);
  }
  if (!pixelsWorker) {
    try {
      pixelsWorker = new Worker(new URL('./imagePixels.worker.ts', import.meta.url), { type: 'module' });
      pixelsWorker.onmessage = (event: MessageEvent<{ id: number; buffer: ArrayBuffer | null }>) => {
        const done = pixelsJobs.get(event.data.id);
        pixelsJobs.delete(event.data.id);
        done?.(event.data.buffer);
      };
      pixelsWorker.onerror = () => {
        pixelsWorkerFailed = true;
        pixelsJobs.forEach((done) => done(null));
        pixelsJobs.clear();
        pixelsWorker?.terminate();
        pixelsWorker = null;
      };
    } catch {
      pixelsWorkerFailed = true;
      return Promise.resolve(null);
    }
  }
  const id = ++pixelsJobId;
  return new Promise((resolve) => {
    pixelsJobs.set(id, resolve);
    pixelsWorker!.postMessage({ id, url, width, height, srcWidth, srcHeight });
  });
}

/** Pixels already read from a source image (weak: freed with the image). */
const extractedPixelsCache = new WeakMap<object, { key: string; data: Uint8ClampedArray }>();

/**
 * Same result as extractImagePixels, but for a loaded image the decode, resize and pixel read run
 * in a worker (same canvas resampling): on the main thread they blocked the click that starts a
 * flight for 100-250 ms on a phone. Anything else, or a failed read, takes the original path.
 */
async function extractImagePixelsAsync(
  source: CanvasImageSource,
): Promise<{ width: number; height: number; buffer: ArrayBuffer } | null> {
  if (!(source instanceof HTMLImageElement) || !source.complete || !source.naturalWidth) {
    return extractImagePixels(source);
  }
  const rawW = source.naturalWidth;
  const rawH = source.naturalHeight || source.height || 256;
  const scale = Math.min(1, 2048 / Math.max(rawW, rawH));
  const w = Math.max(32, Math.round(rawW * scale));
  const h = Math.max(32, Math.round(rawH * scale));
  // Only 1:1 reads go to the worker (bit-identical); a resized read keeps the original path
  if (w !== rawW || h !== rawH) return extractImagePixels(source);
  const key = `${w}x${h}`;
  const cached = extractedPixelsCache.get(source);
  if (cached && cached.key === key) {
    return { width: w, height: h, buffer: new Uint8ClampedArray(cached.data).buffer };
  }
  const url = source.currentSrc || source.src;
  const fromWorker = url ? await readPixelsInWorker(url, w, h, rawW, rawH) : null;
  if (!fromWorker) return extractImagePixels(source);
  const data = new Uint8ClampedArray(fromWorker);
  extractedPixelsCache.set(source, { key, data });
  return { width: w, height: h, buffer: new Uint8ClampedArray(data).buffer };
}

function buildDataTexture(
  buffer: ArrayBuffer,
  width: number,
  height: number,
  isColor: boolean,
  anisotropy: number,
  wrapS: THREE.Wrapping,
  wrapT: THREE.Wrapping,
  repeatX = 1,
  repeatY = 1,
): THREE.DataTexture {
  const bytes = new Uint8Array(buffer);
  const tex = new THREE.DataTexture(bytes, width, height, THREE.RGBAFormat);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = wrapS;
  tex.wrapT = wrapT;
  tex.repeat.set(repeatX, repeatY);
  tex.flipY = false;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

class Pbr8KJobManager {
  private worker: Worker | null = null;
  private nextJobId = 1;
  private pending = new Map<
    number,
    {
      resolve: (res: PbrWorkerResponse) => void;
      reject: (err: Error) => void;
    }
  >();

  private ensureWorker(): Worker | null {
    if (this.worker) return this.worker;
    if (typeof Worker === 'undefined') return null;

    try {
      const worker = new Worker(new URL('./pbr8k.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.onmessage = (event: MessageEvent<PbrWorkerResponse>) => {
        const res = event.data;
        const entry = this.pending.get(res.jobId);
        if (!entry) return;
        this.pending.delete(res.jobId);
        entry.resolve(res);
      };
      worker.onerror = (err) => {
        const error = new Error(err.message || 'PBR worker error');
        this.pending.forEach((p) => p.reject(error));
        this.pending.clear();
      };
      this.worker = worker;
      return worker;
    } catch {
      return null;
    }
  }

  public runJob(
    buildPayload: (jobId: number) => {
      req: Surface8KJobRequest | Craft8KJobRequest;
      transfers: Transferable[];
    },
    signal?: AbortSignal,
  ): Promise<PbrWorkerResponse | null> {
    if (signal?.aborted) return Promise.resolve(null);
    const worker = this.ensureWorker();
    if (!worker) return Promise.resolve(null);

    const jobId = this.nextJobId++;
    const { req, transfers } = buildPayload(jobId);

    return new Promise((resolve) => {
      const onAbort = () => {
        this.pending.delete(jobId);
        resolve(null);
      };
      signal?.addEventListener('abort', onAbort, { once: true });

      this.pending.set(jobId, {
        resolve: (res) => {
          signal?.removeEventListener('abort', onAbort);
          if (signal?.aborted) {
            resolve(null);
          } else {
            resolve(res);
          }
        },
        reject: () => {
          signal?.removeEventListener('abort', onAbort);
          resolve(null);
        },
      });

      worker.postMessage(req, transfers);
    });
  }
}

const jobManager = new Pbr8KJobManager();

export interface Surface8KProcessOptions {
  albedoSource: CanvasImageSource;
  bumpSource?: CanvasImageSource | null;
  specSource?: CanvasImageSource | null;
  profile: SurfacePbrProfile;
  normalStrength: number;
  tileVertical?: boolean;
  skipAlbedo?: boolean;
  repeatX?: number;
  repeatY?: number;
  maxWidth?: number;
  seed?: number;
  capabilities: Pbr8KCapabilities;
  signal?: AbortSignal;
}

export async function processSurface8KPBR(
  opts: Surface8KProcessOptions,
): Promise<FullPbrTextureSet | null> {
  const albedo = await extractImagePixelsAsync(opts.albedoSource);
  if (!albedo || opts.signal?.aborted) return null;

  const target = resolveTargetDimensions(
    albedo.width,
    albedo.height,
    opts.capabilities,
    opts.maxWidth ?? 4096,
  );

  const bump = opts.bumpSource ? await extractImagePixelsAsync(opts.bumpSource) : null;
  const spec = opts.specSource ? await extractImagePixelsAsync(opts.specSource) : null;
  if (opts.signal?.aborted) return null;

  const res = await jobManager.runJob((jobId) => {
    const transfers: Transferable[] = [albedo.buffer];
    if (bump) transfers.push(bump.buffer);
    if (spec) transfers.push(spec.buffer);

    const req: Surface8KJobRequest = {
      jobId,
      kind: 'surface',
      srcWidth: albedo.width,
      srcHeight: albedo.height,
      targetWidth: target.width,
      targetHeight: target.height,
      albedoPixels: albedo.buffer,
      bumpPixels: bump?.buffer,
      bumpWidth: bump?.width,
      bumpHeight: bump?.height,
      specPixels: spec?.buffer,
      specWidth: spec?.width,
      specHeight: spec?.height,
      profile: opts.profile,
      normalStrength: opts.normalStrength,
      tileVertical: opts.tileVertical ?? false,
      skipAlbedo: opts.skipAlbedo ?? true,
      seed: opts.seed ?? 137,
    };
    return { req, transfers };
  }, opts.signal);

  if (!res) return null;

  const wrapS = THREE.RepeatWrapping;
  const wrapT = opts.tileVertical
    ? THREE.RepeatWrapping
    : THREE.ClampToEdgeWrapping;
  const rx = opts.repeatX ?? 1;
  const ry = opts.repeatY ?? 1;

  const map = res.albedoBuffer
    ? buildDataTexture(
        res.albedoBuffer,
        res.width,
        res.height,
        true,
        opts.capabilities.anisotropy,
        wrapS,
        wrapT,
        rx,
        ry,
      )
    : null;
  const normalMap = buildDataTexture(
    res.normalBuffer,
    res.width,
    res.height,
    false,
    opts.capabilities.anisotropy,
    wrapS,
    wrapT,
    rx,
    ry,
  );
  const roughnessMap = buildDataTexture(
    res.roughnessBuffer,
    res.width,
    res.height,
    false,
    opts.capabilities.anisotropy,
    wrapS,
    wrapT,
    rx,
    ry,
  );
  const metalnessMap = buildDataTexture(
    res.metalnessBuffer,
    res.width,
    res.height,
    false,
    opts.capabilities.anisotropy,
    wrapS,
    wrapT,
    rx,
    ry,
  );

  return {
    map,
    normalMap,
    roughnessMap,
    metalnessMap,
    width: res.width,
    height: res.height,
    dispose: () => {
      map?.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
      metalnessMap.dispose();
    },
  };
}

export interface Craft8KProcessOptions {
  albedoSource: CanvasImageSource;
  craftProfile?: CraftPbrProfile;
  normalStrength?: number;
  skipAlbedo?: boolean;
  maxWidth?: number;
  repeatX?: number;
  repeatY?: number;
  seed?: number;
  capabilities: Pbr8KCapabilities;
  signal?: AbortSignal;
}

export async function processCraft8KPBR(
  opts: Craft8KProcessOptions,
): Promise<FullPbrTextureSet | null> {
  const albedo = extractImagePixels(opts.albedoSource);
  if (!albedo) return null;

  const target = resolveTargetDimensions(
    albedo.width,
    albedo.height,
    opts.capabilities,
    opts.maxWidth ?? 2048,
  );

  const res = await jobManager.runJob((jobId) => {
    const req: Craft8KJobRequest = {
      jobId,
      kind: 'craft',
      srcWidth: albedo.width,
      srcHeight: albedo.height,
      targetWidth: target.width,
      targetHeight: target.height,
      albedoPixels: albedo.buffer,
      craftProfile: opts.craftProfile ?? 'auto',
      normalStrength: opts.normalStrength ?? 3.4,
      skipAlbedo: opts.skipAlbedo ?? true,
      seed: opts.seed ?? 409,
    };
    return { req, transfers: [albedo.buffer] };
  }, opts.signal);

  if (!res) return null;

  const rx = opts.repeatX ?? 1;
  const ry = opts.repeatY ?? 1;

  const map = res.albedoBuffer
    ? buildDataTexture(
        res.albedoBuffer,
        res.width,
        res.height,
        true,
        opts.capabilities.anisotropy,
        THREE.RepeatWrapping,
        THREE.RepeatWrapping,
        rx,
        ry,
      )
    : null;
  const normalMap = buildDataTexture(
    res.normalBuffer,
    res.width,
    res.height,
    false,
    opts.capabilities.anisotropy,
    THREE.RepeatWrapping,
    THREE.RepeatWrapping,
    rx,
    ry,
  );
  const roughnessMap = buildDataTexture(
    res.roughnessBuffer,
    res.width,
    res.height,
    false,
    opts.capabilities.anisotropy,
    THREE.RepeatWrapping,
    THREE.RepeatWrapping,
    rx,
    ry,
  );
  const metalnessMap = buildDataTexture(
    res.metalnessBuffer,
    res.width,
    res.height,
    false,
    opts.capabilities.anisotropy,
    THREE.RepeatWrapping,
    THREE.RepeatWrapping,
    rx,
    ry,
  );

  return {
    map,
    normalMap,
    roughnessMap,
    metalnessMap,
    width: res.width,
    height: res.height,
    dispose: () => {
      map?.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
      metalnessMap.dispose();
    },
  };
}
