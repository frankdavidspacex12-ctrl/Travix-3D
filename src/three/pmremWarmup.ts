import * as THREE from 'three';

/**
 * PMREMGenerator.fromScene() compiles its blur / GGX shaders synchronously on first use: the
 * renderer then waits for the GPU driver (~300 ms on a desktop, more on a phone). The main view
 * pays that once while loading; the hyperspace view (own WebGL context) paid it again when ship
 * mode was switched on. The main view keeps copies of those internal shader materials here, so a
 * second renderer can compile the very same programs in parallel (KHR_parallel_shader_compile)
 * before calling fromScene(), which then finds them ready. The resulting environment is identical.
 */

let kept: THREE.ShaderMaterial[] = [];

/** Call right after fromScene(), before dispose(). Reads PMREMGenerator internals defensively. */
export function keepPmremMaterials(generator: THREE.PMREMGenerator): void {
  const g = generator as unknown as Record<string, unknown>;
  kept = ['_blurMaterial', '_ggxMaterial', '_integrationMaterial']
    .map((k) => g[k] as THREE.ShaderMaterial | null | undefined)
    .filter((m): m is THREE.ShaderMaterial => Boolean(m && m.isShaderMaterial))
    .map((m) => {
      // Their uniforms point at the generator's render targets, which can't be cloned (and
      // don't matter for compiling): leave them out of the copy
      const saved: Array<[THREE.IUniform, unknown]> = [];
      for (const u of Object.values(m.uniforms)) {
        if ((u.value as THREE.Texture | null)?.isTexture) {
          saved.push([u, u.value]);
          u.value = null;
        }
      }
      try {
        return m.clone();
      } finally {
        for (const [u, v] of saved) u.value = v;
      }
    });
}

/**
 * Compiles, in parallel, the programs fromScene(scene) will use on `renderer`: the PMREM shaders
 * and the scene's own materials, both against a half-float cube target like the real one.
 * Resolves when they are ready (or right away if there is nothing to compile).
 */
export function precompilePmrem(renderer: THREE.WebGLRenderer, scene: THREE.Object3D): Promise<unknown> {
  const target = new THREE.WebGLCubeRenderTarget(16, {
    type: THREE.HalfFloatType,
    colorSpace: THREE.LinearSRGBColorSpace,
    generateMipmaps: false,
  });
  const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 100);
  const box = new THREE.BoxGeometry(5, 5, 5);
  const shaders = new THREE.Group();
  // Clones per renderer: the copies stay alive (programs cached) until fromScene() has used them
  for (const m of kept) shaders.add(new THREE.Mesh(box, m.clone()));
  const previous = renderer.getRenderTarget();
  const pending: Array<Promise<unknown>> = [];
  try {
    renderer.setRenderTarget(target);
    if (shaders.children.length) pending.push(renderer.compileAsync(shaders, camera));
    pending.push(renderer.compileAsync(scene, camera));
  } finally {
    renderer.setRenderTarget(previous);
  }
  return Promise.all(pending).finally(() => {
    target.dispose();
    box.dispose();
  });
}
