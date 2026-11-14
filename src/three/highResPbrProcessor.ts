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

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const copy = new Uint8ClampedArray(data);
  return { width: w, height: h, buffer: copy.buffer };
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
  const albedo = extractImagePixels(opts.albedoSource);
  if (!albedo) return null;

  const target = resolveTargetDimensions(
    albedo.width,
    albedo.height,
    opts.capabilities,
    opts.maxWidth ?? 4096,
  );

  const bump = opts.bumpSource ? extractImagePixels(opts.bumpSource) : null;
  const spec = opts.specSource ? extractImagePixels(opts.specSource) : null;

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
