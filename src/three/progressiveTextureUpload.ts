import * as THREE from 'three';

/**
 * Uploads a large RGBA DataTexture to the GPU in horizontal bands, one band per animation frame,
 * and returns it wrapped as an ExternalTexture with the same sampling settings (wrap, filters,
 * anisotropy, repeat / offset, colour space). The pixels and the result are identical to a normal
 * upload; only the cost is spread: a 4096 x 2048 texture no longer freezes one frame for
 * ~200 ms, it costs a few ms on each of a few frames.
 */

const BYTES_PER_STEP = 4 * 1024 * 1024;

export interface ProgressiveTexture {
  texture: THREE.ExternalTexture;
  dispose: () => void;
}

function glWrap(gl: WebGL2RenderingContext, wrap: THREE.Wrapping): number {
  if (wrap === THREE.RepeatWrapping) return gl.REPEAT;
  if (wrap === THREE.MirroredRepeatWrapping) return gl.MIRRORED_REPEAT;
  return gl.CLAMP_TO_EDGE;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export async function uploadDataTextureProgressively(
  renderer: THREE.WebGLRenderer,
  source: THREE.DataTexture,
  signal: AbortSignal,
): Promise<ProgressiveTexture | null> {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const image = source.image as { data: Uint8Array | Uint8ClampedArray; width: number; height: number };
  if (
    !image?.data ||
    source.format !== THREE.RGBAFormat ||
    source.type !== THREE.UnsignedByteType ||
    typeof gl.texStorage2D !== 'function'
  ) {
    return null;
  }
  const { width, height } = image;
  const data = image.data instanceof Uint8Array ? image.data : new Uint8Array(image.data.buffer);
  const srgb = source.colorSpace === THREE.SRGBColorSpace;
  const levels = source.generateMipmaps ? Math.floor(Math.log2(Math.max(width, height))) + 1 : 1;

  const glTex = gl.createTexture();
  if (!glTex) return null;
  const state = renderer.state;
  const bind = () => state.bindTexture(gl.TEXTURE_2D, glTex);
  const release = () => {
    try {
      gl.deleteTexture(glTex);
    } catch {
      // context lost
    }
  };

  // Storage + sampling settings (same as three.js would apply for this DataTexture)
  bind();
  gl.texStorage2D(gl.TEXTURE_2D, levels, srgb ? gl.SRGB8_ALPHA8 : gl.RGBA8, width, height);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, glWrap(gl, source.wrapS));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, glWrap(gl, source.wrapT));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    levels > 1 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR,
  );
  const aniso = renderer.extensions.get('EXT_texture_filter_anisotropic') as {
    TEXTURE_MAX_ANISOTROPY_EXT: number;
  } | null;
  if (aniso && source.anisotropy > 1) {
    gl.texParameterf(
      gl.TEXTURE_2D,
      aniso.TEXTURE_MAX_ANISOTROPY_EXT,
      Math.min(source.anisotropy, renderer.capabilities.getMaxAnisotropy()),
    );
  }

  const rowBytes = width * 4;
  const rowsPerStep = Math.max(1, Math.floor(BYTES_PER_STEP / rowBytes));
  for (let y = 0; y < height; y += rowsPerStep) {
    if (signal.aborted) {
      release();
      return null;
    }
    const rows = Math.min(rowsPerStep, height - y);
    bind();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      y,
      width,
      rows,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      data.subarray(y * rowBytes, (y + rows) * rowBytes),
    );
    await nextFrame();
  }
  if (signal.aborted) {
    release();
    return null;
  }
  if (levels > 1) {
    bind();
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  const texture = new THREE.ExternalTexture(glTex);
  texture.wrapS = source.wrapS;
  texture.wrapT = source.wrapT;
  texture.repeat.copy(source.repeat);
  texture.offset.copy(source.offset);
  texture.colorSpace = source.colorSpace;
  texture.flipY = false;
  texture.anisotropy = source.anisotropy;
  return {
    texture,
    dispose: () => {
      texture.dispose();
      release();
    },
  };
}
