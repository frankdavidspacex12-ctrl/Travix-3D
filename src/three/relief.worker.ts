/// <reference lib="webworker" />
import { ReliefKernelOptions, computeReliefPixels } from './reliefKernel';

export interface ReliefJobRequest {
  jobId: number;
  width: number;
  height: number;
  pixels: ArrayBuffer;
  options: ReliefKernelOptions;
}

export interface ReliefJobResponse {
  jobId: number;
  width: number;
  height: number;
  normal: ArrayBuffer;
  rough: ArrayBuffer;
  metal: ArrayBuffer;
}

self.onmessage = (e: MessageEvent<ReliefJobRequest>) => {
  const { jobId, width, height, pixels, options } = e.data;
  const res = computeReliefPixels(
    new Uint8ClampedArray(pixels),
    width,
    height,
    options,
  );
  const out: ReliefJobResponse = {
    jobId,
    width,
    height,
    normal: res.normal.buffer as ArrayBuffer,
    rough: res.rough.buffer as ArrayBuffer,
    metal: res.metal.buffer as ArrayBuffer,
  };
  (self as unknown as Worker).postMessage(out, [
    out.normal,
    out.rough,
    out.metal,
  ]);
};
