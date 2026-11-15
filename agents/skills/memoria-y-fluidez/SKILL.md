---
name: memoria-y-fluidez
description: Guardián de memoria y fluidez de Travix-3D. Úsala en TODO cambio del proyecto (código en src/, modelos o texturas en public/, componentes de React, dependencias), antes de escribirlo y antes de hacer commit, para que la app no gaste memoria de más, no se cierre sola en celulares y no se trabe, sin sacrificar calidad visual de más.
---

# Memoria y fluidez en Travix-3D

Travix-3D es three.js r187 puro (sin React Three Fiber) dentro de React + Vite, con PWA.
React solo pinta los menús; el 3D lo maneja un solo motor (`src/three/SolarSystemEngine.ts`).

**Por qué existe esta skill:** en celular el navegador cierra la pestaña cuando la página usa
demasiada memoria y la recarga desde cero (los usuarios lo ven como "la app volvió a la
bienvenida"). Usuarios también reportan que la app se traba. Casi toda la memoria está en la
**GPU** (texturas), no en JavaScript: la memoria JS ronda 15-40 MB, la GPU 200-1000 MB.

## Regla de calidad

1. Primero, arreglos que **no cambian nada visual** (liberar, reutilizar, empaquetar, diferir).
2. Si no alcanza, recortes **solo en celular** (`isMemoryConstrained()` de
   `src/three/deviceProfile.ts`) y que casi no se noten en una pantalla de teléfono.
3. Nunca bajar la calidad en computador para ahorrar memoria en celular.
4. Cualquier cambio que sí se note (menos resolución, menos efectos) se consulta antes con el
   equipo. Dilo explícitamente en el resumen del cambio.

## Presupuesto (celular emulado, ver «Cómo medir»)

| Medida | Límite |
|---|---|
| GPU estimada al iniciar | ≤ 250 MB |
| GPU estimada pico en la ruta larga | ≤ 600 MB (meta: bajar) |
| GPU tras salir de una misión | vuelve a lo que había antes de entrar (± 20 MB) |
| Memoria JS tras GC | ≤ 80 MB |
| Tarea larga del hilo principal durante uso normal | ≤ 100 ms (las de > 50 ms, contadas y justificadas) |
| Recargas solas / errores en consola | 0 |

Un cambio que empeore cualquiera de estos números más de un 10 % no se sube sin arreglarlo o
sin explicarlo al equipo.

## Lista de revisión para cada cambio

### Memoria de GPU (lo que más pesa)
- **Toda** `Texture`, `BufferGeometry`, `Material`, `WebGLRenderTarget` nueva se libera:
  `.dispose()` al salir, o se agrega a `this.disposables` del motor si vive toda la sesión.
  En dioramas, `disposeObjectTree` (`src/three/surfaceDiorama.ts`) debe cubrir **todos** los
  mapas del material (map, normalMap, roughnessMap, metalnessMap, emissiveMap, aoMap, bumpMap,
  alphaMap, displacementMap, lightMap, clearcoat*, sheen*, transmission*, specular*…).
- Tamaño en GPU = ancho × alto × 4 bytes × 1,33 (mipmaps). Una de 2048×1024 = 10,7 MB;
  una de 4096×2048 = 43 MB. **Máximo 2048 px en celular.** No subir imágenes más grandes que
  lo que la pantalla puede mostrar.
- No duplicar texturas: reutilizar la misma instancia (p. ej. un solo mapa de "ruido" o
  "rugosidad" compartido). three.js lee rugosidad del canal **G** y metalicidad del canal
  **B**: si se generan ambos, pueden ir en **una** textura (mismo resultado, la mitad de memoria).
- Mapas derivados o constantes: si un mapa es uniforme, usar el valor escalar del material
  (`roughness`, `metalness`) en vez de una textura del tamaño del planeta.
- Mapas HD: solo uno activo a la vez (`schedule8KUpgrade` / `clearActive8KUpgrade`); siempre se
  sube por bandas (`uploadPbrSetProgressively`) y se suelta al cambiar de cuerpo.
- No crear otro `WebGLRenderer`/contexto WebGL. El único segundo contexto permitido es el del
  hipersalto (`src/three/warpScene.ts`) y debe soltar sus texturas al terminar.
- Sombras: 2048 en celular, 4096 en computador (ya está así; no subirlo).
- **Luces con sombra:** three.js nunca libera el mapa de sombras solo. Toda luz con
  `castShadow` que se quita de la escena necesita `light.dispose()` (en dioramas, en
  `disposables`). Esa fuga dejaba 32 MB por misión visitada.
- No generar mapas HD para materiales que nadie usa (revisar que algún mesh lo tenga antes de
  llamar a `processCraft8KPBR`/`processSurface8KPBR`).
- `THREE.Cache` está apagado en celular (`surfaceDiorama.ts`); no volver a encenderlo.

### Memoria de CPU
- No guardar copias de píxeles que ya están en la GPU (canvas, `ImageData`, `Uint8Array`)
  más tiempo del necesario. Ojo: three.js las necesita si se pierde el contexto WebGL; si se
  sueltan, hay que regenerarlas en `webglcontextrestored`.
- iOS limita la memoria total de **canvas** (unos cientos de MB): evitar canvases grandes que
  quedan vivos (`CanvasTexture` de 2048 px son 8 MB cada uno).
- Cachés (LRU, `Map` de recursos): con límite, y en celular más pequeñas o en 0.
- Los `ArrayBuffer` (píxeles de `DataTexture`, respuestas de workers) **no** aparecen en la
  memoria JS que mide el navegador, pero el celular sí los cuenta. Una `DataTexture` de
  4096² son 64 MB fuera del heap: liberar `image.data` cuando ya está en la GPU
  (`queueTextureUploads(texturas, true)` en el motor lo hace solo).

### Fluidez (que no se trabe)
- **Cero `new` dentro del bucle de cuadros** (`animate`/`update`/`tick`, `onBeforeRender`):
  usar los temporales del módulo (`_vec3A`, `_vec3B`…, `_projVec`) o crear los propios fuera.
  Nada de `.clone()`, arrays literales, closures ni `toFixed`/`Intl` por cuadro.
- No poner en estado de React cosas que cambian cada cuadro; si la UI muestra datos del motor,
  actualizarla ≤ 10 veces por segundo.
- Trabajo pesado de CPU (píxeles, relieve, decodificar) → Web Worker
  (`relief.worker.ts`, `pbr8k.worker.ts`, `imagePixels.worker.ts`) o en pedazos con
  `requestIdleCallback`. Nunca `getImageData` de imágenes grandes en el hilo principal.
- Shaders: compilar antes de mostrar (`compileAsync`, `compileBeforeApplying`, prewarm de
  variantes). No cambiar `defines` ni activar/desactivar mapas por cuadro; `material.needsUpdate`
  solo cuando cambia de verdad.
- Subidas grandes a la GPU (> 4 MB) repartidas en varios cuadros (`progressiveTextureUpload.ts`)
  o hechas mientras hay una transición tapando la pantalla.
- **Contenido de una misión que llega después** (modelos GLB, fotos, mapas HD): no se agrega
  "en caliente". Usar el `SurfacePreparer` de `surfaceDiorama.ts`: `revealWhenReady(obj, …)`
  para modelos (compila sus shaders en paralelo y sube sus texturas por partes antes de
  mostrarlo) y los envoltorios `processCraft8KPBR`/`processSurface8KPBR`, que ya suben los
  mapas HD uno por cuadro. Al entrar a una misión, `prepareSurfaceBeforeDrawing` hace lo mismo
  con toda la escena.
- **Texturas procedurales deterministas** (mismo resultado siempre): generarlas una vez por
  sesión y reutilizarlas (`getSharedCraftTextureSet`, `getSharedTerrainPBRTextures`); al salir
  solo se libera su copia en la GPU. Nunca llamar `createCraftTextureSet` en cada misión.
- Ruido procedural: `valueNoise` usa la rejilla memorizada (`latticeHash`); no volver a llamar
  `Math.sin` por píxel.
- Paneles pesados de React con `lazy()` (como `QuizPanel`, `ColombiansPanel`, `WarpOverlay`).
- Pixel ratio: ya limitado a 1,5 en celular y 2 en computador; no subirlo.

### Archivos y descargas
- Modelos GLB con Draco + texturas WebP, sin copias PNG de respaldo; ≤ 8 MB por archivo
  (límite del precache PWA en `vite.config.ts`).
- Imágenes nuevas: JPG/WebP ≤ 2048 px salvo razón fuerte.
- Cada archivo nuevo en `public/` entra al precache sin conexión: pensar si de verdad hace falta.

## Cómo medir (obligatorio si el cambio toca `src/three/`, `public/` o algo que se anima)

```bash
npm run build
npx vite preview --port 4180 --strictPort        # en otra terminal; NO usar el puerto 3000
node agents/skills/memoria-y-fluidez/scripts/medir-memoria.mjs <carpetaSalida> iphone
node agents/skills/memoria-y-fluidez/scripts/medir-memoria.mjs <carpetaSalida> desktop
```

El script recorre la app (Tierra, Marte, Júpiter, Saturno, 67P, 8 paradas del tour de hardware,
modo nave e hipersalto) y muestra en cada momento la memoria JS, la GPU estimada (con
`scripts/gpu-hook.js`, que cuenta lo que se sube a WebGL), las texturas más pesadas con su
archivo de origen, las tareas largas y los cuadros lentos. `CPU=4` simula un celular lento.

Comparar contra la tabla de abajo (mismo dispositivo emulado) **antes y después** del cambio.
Si un número empeora, encontrar la causa antes de subir.

## Medición de referencia (15 nov 2026, iPhone emulado)

| Momento | Antes de la estabilización | Después |
|---|---|---|
| GPU al iniciar | 205 MB | 184 MB |
| GPU tras Tierra, Marte, Saturno, 67P | 672 MB | 574 MB |
| GPU pico dentro de misiones | 1047 MB | ~917 MB |
| GPU tras salir del tour | 864 MB | 510 MB |
| GPU al final de la ruta | 892 MB | 538 MB |
| Peor congelamiento al entrar a una misión | 1,6 s | ~1 s (la mayoría < 0,5 s) |
| Tareas largas en 4 misiones (perfil) | 21,8 s | ~5,5 s |

Lo que más pesa hoy: los mapas de cada planeta (10,7 MB c/u, quedan en la GPU tras visitarlo),
el mapa de Eris (3840×1920, 37,5 MB) y los mapas de relieve derivados (normal + rugosidad/
metalicidad empaquetadas, 2 por cuerpo). Actualizar esta tabla cuando una mejora cambie los
números.

## Antes del commit
- [ ] La lista de revisión de arriba, aplicada a lo que se tocó.
- [ ] Medición antes/después si aplica, con los números en el mensaje del commit.
- [ ] Sin cambios visuales no pedidos (o consultados con el equipo).
- [ ] `npm run build` sin errores y 0 errores en consola en la medición.
