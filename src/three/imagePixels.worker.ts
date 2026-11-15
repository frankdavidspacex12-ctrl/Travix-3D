/// <reference lib="webworker" />

/**
 * Reads the RGBA pixels of an image (by URL) at a given size, entirely off the main thread:
 * fetch (served from the HTTP / service-worker cache) → decode + resize in createImageBitmap →
 * OffscreenCanvas → getImageData. On the main thread the same work blocked the click that starts
 * a flight for 100-250 ms on a phone.
 */

interface PixelsRequest {
  id: number;
  url: string;
  width: number;
  height: number;
  /** Source size: no resampling at all when it already matches */
  srcWidth: number;
  srcHeight: number;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (event: MessageEvent<PixelsRequest>) => {
  const { id, url, width, height, srcWidth, srcHeight } = event.data;
  try {
    const blob = await (await fetch(url)).blob();
    const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'default' });
    if (bitmap.width !== srcWidth || bitmap.height !== srcHeight) {
      bitmap.close();
      ctx.postMessage({ id, buffer: null });
      return;
    }
    const canvas = new OffscreenCanvas(width, height);
    const c2d = canvas.getContext('2d', { willReadFrequently: true });
    if (!c2d) {
      bitmap.close();
      ctx.postMessage({ id, buffer: null });
      return;
    }
    c2d.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const data = c2d.getImageData(0, 0, width, height).data;
    ctx.postMessage({ id, buffer: data.buffer }, [data.buffer]);
  } catch {
    ctx.postMessage({ id, buffer: null });
  }
};
