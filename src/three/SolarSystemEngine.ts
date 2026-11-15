import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import type { ShipOverlay } from './shipOverlay';
import { computeIssSubpoint, refreshIssElements, type IssSubpoint } from '../astronomy/iss';
import { ProgressiveTexture, uploadDataTextureProgressively } from './progressiveTextureUpload';

/** HD PBR maps once on the GPU (band-uploaded ExternalTextures, or the DataTextures as fallback). */
interface UploadedPbrSet {
  map: THREE.Texture | null;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  metalnessMap: THREE.Texture;
  dispose: () => void;
}
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  AU_TO_UNITS,
  PLANET_ELEMENTS_J2000,
  computeAxialRotationRad,
  computeHeliocentricPosition,
  daysSinceJ2000,
  latLonToLocalVector3,
  sampleOrbitEllipsePoints,
} from '../astronomy/ephemeris';
import {
  ABANDONED_MISSIONS,
  AbandonedMission,
} from '../data/abandonedMissionsData';
import {
  CELESTIAL_BODIES,
  DEEP_SPACE_TARGETS,
  CelestialBodyData,
  CelestialBodyId,
  DeepSpaceTargetId,
  MoonData,
} from '../data/solarSystemData';
import type { DeepSpaceDioramaRuntime } from './blackHole';
import {
  createDetailedSaturnRingTexture,
  createNebulaPuffTexture,
  createProceduralEarthClouds,
  createProceduralEarthNightLights,
  createProceduralJupiterClouds,
  createProceduralMoonTextureSet,
  createProceduralPlanetTextureSet,
  createSunGlowTexture,
  createUranusRingTexture,
  deriveSurfaceReliefMapsAsync,
} from './proceduralTextures';
import type { MoonTextureSet, PlanetTextureSet } from './proceduralTextures';
import {
  FullPbrTextureSet,
  Pbr8KCapabilities,
  getPbr8KCapabilities,
  processSurface8KPBR,
} from './highResPbrProcessor';
import type { SurfacePbrProfile } from './pbr8k.worker';
import type {
  SurfaceCameraMode,
  SurfaceDioramaRuntime,
} from './surfaceDiorama';
import { locale, tr } from '../i18n';
import { keepPmremMaterials } from './pmremWarmup';
import { cometActivity, createCometEffects, getSoftDotTexture, type CometEffects } from './cometEffects';

// surfaceDiorama.ts used to enable this as an import side effect at startup; keep it identical now
// that the module is code-split.
THREE.Cache.enabled = true;

/* ---------------------------------------------------------------------------
 * Code-split dioramas: the surface (rovers/landers/GLB) and deep-space (black holes,
 * pulsars, nebulae) scenes are separate chunks, preloaded in the background once the
 * Solar System is running so a click never waits on them in practice.
 * ------------------------------------------------------------------------- */
type SurfaceDioramaModule = typeof import('./surfaceDiorama');
type DeepSpaceDioramaModule = typeof import('./blackHole');

let surfaceModule: SurfaceDioramaModule | null = null;
let surfaceModulePromise: Promise<SurfaceDioramaModule> | null = null;
let deepSpaceModule: DeepSpaceDioramaModule | null = null;
let deepSpaceModulePromise: Promise<DeepSpaceDioramaModule> | null = null;

function loadSurfaceModule(): Promise<SurfaceDioramaModule> {
  if (!surfaceModulePromise) {
    surfaceModulePromise = import('./surfaceDiorama').then(
      (m) => (surfaceModule = m),
      (err) => {
        surfaceModulePromise = null; // allow retry
        throw err;
      },
    );
  }
  return surfaceModulePromise;
}

function loadDeepSpaceModule(): Promise<DeepSpaceDioramaModule> {
  if (!deepSpaceModulePromise) {
    deepSpaceModulePromise = import('./blackHole').then(
      (m) => (deepSpaceModule = m),
      (err) => {
        deepSpaceModulePromise = null;
        throw err;
      },
    );
  }
  return deepSpaceModulePromise;
}

const _vec3A = new THREE.Vector3();

const numberFormats = new Map<string, Intl.NumberFormat>();
/**
 * Same text as n.toLocaleString(loc, { minimum/maximumFractionDigits: digits }), but the
 * formatter is built once: toLocaleString builds a new one on every call (the first one, with its
 * locale data, cost ~60 ms in the middle of a flight on a phone).
 */
function formatNumber(n: number, loc: string, digits?: number): string {
  const key = `${loc}|${digits ?? ''}`;
  let f = numberFormats.get(key);
  if (!f) {
    f = new Intl.NumberFormat(
      loc,
      digits === undefined ? undefined : { minimumFractionDigits: digits, maximumFractionDigits: digits },
    );
    numberFormats.set(key, f);
  }
  return f.format(n);
}
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _vec3D = new THREE.Vector3();
const _projVec = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();
const _upVec = new THREE.Vector3(0, 1, 0);

// Panoramic inner Solar System framing at NASA 1:215 solar-radius-to-AU scale
const OVERVIEW_CAM_POS = new THREE.Vector3(0, 1450, 3400);
const OVERVIEW_TARGET = new THREE.Vector3(0, 0, 0);

interface BasePbrSnapshot {
  map: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  roughnessMap: THREE.Texture | null;
  metalnessMap: THREE.Texture | null;
  metalness: number;
}

interface MoonRuntime {
  data: MoonData;
  parentId: CelestialBodyId;
  pivotGroup: THREE.Group;
  mesh: THREE.Mesh;
  hitProxy: THREE.Mesh;
  material: THREE.MeshPhysicalMaterial;
  basePbr: BasePbrSnapshot;
  albedoImage?: HTMLImageElement;
  bumpImage?: HTMLImageElement;
  angle: number;
  lastWorldPos: THREE.Vector3;
  currentWorldPos: THREE.Vector3;
}

interface PlanetRuntime {
  data: CelestialBodyData;
  inclinationGroup: THREE.Group;
  anchorGroup: THREE.Group;
  tiltGroup: THREE.Group;
  mesh: THREE.Mesh;
  hitProxy: THREE.Mesh;
  material?: THREE.MeshPhysicalMaterial;
  basePbr?: BasePbrSnapshot;
  albedoImage?: HTMLImageElement;
  bumpImage?: HTMLImageElement;
  specImage?: HTMLImageElement;
  cloudMesh?: THREE.Mesh;
  ringMesh?: THREE.Mesh;
  atmosphereMesh?: THREE.Mesh;
  orbitLine?: THREE.LineLoop;
  moons: MoonRuntime[];
  lastWorldPos: THREE.Vector3;
  currentWorldPos: THREE.Vector3;
}

interface MissionBeaconRuntime {
  mission: AbandonedMission;
  group: THREE.Group;
  ringMat: THREE.MeshBasicMaterial;
  dotMat: THREE.MeshBasicMaterial;
  hostRadius: number;
  lastWorldPos: THREE.Vector3;
  currentWorldPos: THREE.Vector3;
  worldNormal: THREE.Vector3;
}

export interface FocusSelection {
  bodyId: CelestialBodyId;
  moonId?: string;
  missionId?: string;
}

export interface EngineCallbacks {
  onSelectTarget: (selection: FocusSelection | null) => void;
  onHoverBody: (id: CelestialBodyId | null) => void;
  onClockUpdate: (epochMs: number, isActiveSiteSunlit: boolean | null) => void;
  onCameraModeChange: (mode: 'overview' | 'tracking' | 'free') => void;
  onSurfaceModeChange?: (active: boolean, viewMode: SurfaceCameraMode) => void;
  onDeepSpaceChange?: (id: DeepSpaceTargetId | null) => void;
  /** The camera finished flying to its destination (used for the arrival sound). */
  onArrive?: () => void;
}

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function createIrregularMoonGeometry(radius: number): THREE.SphereGeometry {
  const geo = new THREE.SphereGeometry(radius, 24, 18);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n =
      1 +
      0.16 * Math.sin(v.x * 9.0 + v.y * 5.0) +
      0.11 * Math.cos(v.z * 7.0 - v.x * 4.0);
    v.x *= 1.18 * n;
    v.y *= 0.84 * n;
    v.z *= 0.96 * n;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Bilobed "rubber-duck" contact binary shape for Comet 67P/Churyumov-Gerasimenko.
 */
function createComet67PGeometry(radius: number): THREE.SphereGeometry {
  const geo = new THREE.SphereGeometry(radius, 84, 60);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();

  // Prominent impact / sublimation pits matching OSIRIS radar topography
  const craters = [
    { dir: new THREE.Vector3(-0.72, 0.44, 0.53).normalize(), r: 0.42, depth: 0.14 },
    { dir: new THREE.Vector3(-0.35, -0.68, -0.64).normalize(), r: 0.36, depth: 0.11 },
    { dir: new THREE.Vector3(0.76, 0.32, -0.56).normalize(), r: 0.32, depth: 0.12 },
    { dir: new THREE.Vector3(0.42, -0.78, 0.46).normalize(), r: 0.28, depth: 0.09 },
  ];

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const dir = v.clone().normalize();

    // Pinched asymmetric Hapi canyon neck at x = +0.16 separating Ash (major lobe) & Ma'at (head lobe)
    const neckGauss = Math.exp(-Math.pow((dir.x - 0.16) / 0.21, 2));
    const waist = 1.0 - 0.44 * neckGauss;
    const stretch = dir.x < 0.16 ? 1.32 : 0.92;
    // Slight head-lobe upward offset (authentic "rubber duck" silhouette)
    const headLift = dir.x > 0.16 ? 0.16 * smoothstep01((dir.x - 0.16) / 0.5) : 0;

    // Terraced sedimentary strata & rocky fractures
    const strata =
      0.045 * Math.sin(dir.y * 14.0 + dir.x * 6.0) +
      0.032 * Math.cos(dir.z * 11.0 - dir.x * 9.0) +
      0.022 * Math.sin((dir.x + dir.y + dir.z) * 23.0);

    // Flat Imhotep equatorial bench on lower major lobe
    const flatImhotep =
      dir.x < -0.15 && dir.y < -0.2 ? -0.07 * (-dir.y - 0.2) : 0;

    let craterOffset = 0;
    for (const c of craters) {
      const angDist = dir.angleTo(c.dir);
      if (angDist < c.r) {
        const t = angDist / c.r;
        const rim = t > 0.78 ? Math.sin(((t - 0.78) / 0.22) * Math.PI) * c.depth * 0.28 : 0;
        const bowl = -(1 - t * t) * c.depth;
        craterOffset += bowl + rim;
      }
    }

    const relief = 1.0 + strata + flatImhotep + craterOffset;
    v.set(
      dir.x * radius * stretch * 1.18 * relief,
      (dir.y * waist * 0.84 + headLift) * radius * relief,
      dir.z * radius * waist * 0.88 * relief,
    );
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function smoothstep01(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

function createRadialRingGeometry(
  innerRadius: number,
  outerRadius: number,
  thetaSegments = 160,
  phiSegments = 6,
): THREE.RingGeometry {
  const geo = new THREE.RingGeometry(
    innerRadius,
    outerRadius,
    thetaSegments,
    phiSegments,
  );
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const v3 = new THREE.Vector3();
  const span = outerRadius - innerRadius;
  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    const radius = Math.sqrt(v3.x * v3.x + v3.y * v3.y);
    const u = THREE.MathUtils.clamp((radius - innerRadius) / span, 0, 1);
    const angle = (Math.atan2(v3.y, v3.x) + Math.PI) / (Math.PI * 2);
    uv.setXY(i, u, angle);
  }
  uv.needsUpdate = true;
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/**
 * On-screen brightness of self-emissive effects, independent of the auto-exposure.
 * Raise to make auroras / plumes stronger, lower to make them subtler (1 = shader's raw output).
 */
const AURORA_SCREEN_GAIN = 0.35;
const PLUME_SCREEN_GAIN = 0.8;
/** Earth's city lights (NASA Black Marble): emitted light, kept at a constant on-screen brightness */
const CITY_LIGHTS_SCREEN_GAIN = 1.6;

/**
 * Highest exposure the background sky (stars, Milky Way, nebulae) is shown at. The auto-exposure
 * reaches ~160x at Uranus and ~290x at Neptune to make up for the weak sunlight; applied to the
 * sky it turned deep space navy blue and blew the nebulae up. Space stays black at any distance,
 * and the inner Solar System (exposure below this cap) looks exactly as before.
 */
const SKY_MAX_SCREEN_EXPOSURE = 2.0;
/**
 * Same idea for the atmospheric limb glow of Uranus, Neptune and Pluto: at their exposure it
 * saturated into a thick white / cyan ring. Voyager 2 and New Horizons show only a thin hazy limb,
 * so their glow is shown at most as bright as Earth's limb looks. Other bodies are unchanged.
 */
const OUTER_ATMOSPHERE_MAX_SCREEN_EXPOSURE = 2.4;
/**
 * The Sun's geometry is at true scale (radius 4.65 units = 696,000 km at 1000 units / AU), so its
 * apparent size already shrinks as 1/distance. But beyond Mars the auto-exposure (up to ~290x at
 * Neptune) also multiplied its corona sprites and bloom, blowing it up into a huge disc. Its own
 * light is shown at most as bright as from Mars (exposure ~1.25): from Neptune or Pluto it becomes
 * the small, intense point seen in Voyager 1 / New Horizons images. Mars and inward are unchanged.
 */
const SUN_MAX_SCREEN_EXPOSURE = 1.3;
const SUN_INNER_GLOW_COLOR = new THREE.Color(0xffdf94);
/**
 * Seen from the outer planets the true-size Sun is far below one pixel (0.17 px from Neptune), but
 * it is still by far the brightest object in the sky (mag -21 from Neptune): it shows as a
 * brilliant star, as in Voyager 1's Family Portrait. Its inner glow never shrinks below this
 * radius in CSS px; from Mars inward the true size is larger, so nothing changes there.
 */
const SUN_MIN_GLOW_RADIUS_PX = 4.5;
const STAR_WHITE = new THREE.Color(0xfff8ec);
const SUN_OUTER_GLOW_COLOR = new THREE.Color(0xf97316);
const OUTER_ATMOSPHERE_BODIES = new Set(['uranus', 'neptune', 'pluto']);

/**
 * Achatamiento real de los gigantes gaseosos (radio polar / ecuatorial): Júpiter 0,935 y Saturno
 * 0,902. Se aplica igual al planeta, a su brillo de atmósfera y a sus auroras, para que nada
 * sobresalga de los polos.
 */
/**
 * Si un mapa de luna tiene grandes zonas negras (superficie que ninguna nave fotografió), devuelve
 * una imagen nueva con esas zonas rellenas por la textura procedural; null si el mapa está completo.
 */
async function fillUnmappedMoonAreas(
  img: HTMLImageElement,
  getProcedural: () => CanvasImageSource,
): Promise<HTMLImageElement | null> {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  const real = ctx.getImageData(0, 0, w, h);
  const rd = real.data;
  let black = 0;
  for (let i = 0; i < rd.length; i += 16) if (rd[i] + rd[i + 1] + rd[i + 2] < 24) black++;
  if (black / (rd.length / 16) < 0.3) return null; // mapa completo: no se toca
  ctx.drawImage(getProcedural(), 0, 0, w, h);
  const base = ctx.getImageData(0, 0, w, h);
  const bd = base.data;
  for (let i = 0; i < rd.length; i += 4) {
    // Peso de la foto real: 0 en lo negro (sin datos), 1 donde hay imagen (transición suave)
    const lum = (rd[i] + rd[i + 1] + rd[i + 2]) / 3;
    const t = Math.min(1, Math.max(0, (lum - 6) / 22));
    const k = t * t * (3 - 2 * t);
    bd[i] = bd[i] + (rd[i] - bd[i]) * k;
    bd[i + 1] = bd[i + 1] + (rd[i + 1] - bd[i + 1]) * k;
    bd[i + 2] = bd[i + 2] + (rd[i + 2] - bd[i + 2]) * k;
  }
  ctx.putImageData(base, 0, 0);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  // La URL no se libera: la imagen la siguen usando WebGL y el procesador 8K (solo pasa con Tritón)
  try {
    const out = new Image();
    out.src = url;
    await out.decode();
    return out;
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

/** Lunas principales de cada planeta que llevan etiqueta al mirarlo (máximo 4 por planeta). */
const MAIN_MOONS: Partial<Record<string, string[]>> = {
  earth: ['luna'],
  mars: ['phobos', 'deimos'],
  jupiter: ['io', 'europa', 'ganymede', 'callisto'],
  saturn: ['titan', 'rhea', 'iapetus', 'enceladus'],
  uranus: ['titania', 'oberon', 'ariel', 'miranda'],
  neptune: ['triton', 'proteus'],
  pluto: ['charon'],
};
export const MAX_COMPANION_LABELS = 4;
/** Máximo de etiquetas de misiones en superficie a la vez (las demás quedan agrupadas o en la lista). */
export const MAX_SURFACE_LABELS = 8;

const POLAR_FLATTENING: Partial<Record<string, number>> = { jupiter: 0.935, saturn: 0.902 };

function createAtmosphereShaderMaterial(
  colorHex: string,
  intensity: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uIntensity: { value: intensity },
    },
    vertexShader: `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        vec3 N = normalize(vWorldNormal);
        float rim = pow(clamp(1.0 + dot(viewDir, N), 0.0, 1.0), 3.35);
        vec3 sunDir = normalize(-vWorldPosition);
        float sunDot = dot(N, sunDir);
        // Sunlit day-side Rayleigh scatter + warm golden-amber twilight terminator ring
        float dayFactor = smoothstep(-0.22, 0.48, sunDot);
        // Explicit square (same result): pow() of a negative base is undefined on some GPUs
        float tb = sunDot / 0.16;
        float terminatorBand = exp(-tb * tb);
        vec3 scatterCol = mix(uColor, vec3(1.0, 0.56, 0.28), terminatorBand * 0.42);
        float alpha = rim * uIntensity * (dayFactor + terminatorBand * 0.24);
        gl_FragColor = vec4(scatterCol * (0.95 + 0.55 * dayFactor), clamp(alpha, 0.0, 1.0));
      }
    `,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * 1×1 stand-in texture used while the real NASA texture streams in. Keeps every
 * material's shader variant identical (map/normalMap/roughnessMap/metalnessMap all
 * bound) so swapping in the real texture never triggers a program recompile.
 */
function createSolidTexture(
  rgb: [number, number, number],
  isColor: boolean,
): THREE.DataTexture {
  const tex = new THREE.DataTexture(
    new Uint8Array([rgb[0], rgb[1], rgb[2], 255]),
    1,
    1,
    THREE.RGBAFormat,
  );
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function hexToRgb(hex: string): [number, number, number] {
  // getHex() returns sRGB bytes (Color stores linear internally under ColorManagement)
  const v = new THREE.Color(hex).getHex();
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function createSunSurfaceMaterial(initialTexture: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: initialTexture },
      uTime: { value: 0 },
      uFocusBoost: { value: 0 },
      uExposureComp: { value: 1 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vPosView;
      varying vec3 vLocalDir;
      void main() {
        vUv = uv;
        vLocalDir = normalize(position);
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vPosView = mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform sampler2D uTexture;
      uniform float uTime;
      uniform float uFocusBoost;
      uniform float uExposureComp;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vPosView;
      varying vec3 vLocalDir;

      float hash31(vec3 p) {
        return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
      }
      float vnoise3(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float n000 = hash31(i);
        float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
        float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
        float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
        float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
        float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
        float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
        float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
        return mix(
          mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
          mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
          f.z
        );
      }
      float fbm3(vec3 p) {
        float v = 0.0;
        float a = 0.52;
        for (int i = 0; i < 5; i++) {
          v += a * vnoise3(p);
          p = p * 2.08 + vec3(3.1, 1.7, 5.3);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv1 = vec2(fract(vUv.x + uTime * 0.004), vUv.y);
        vec2 uv2 = vec2(fract(vUv.x - uTime * 0.0025), clamp(vUv.y + sin(vUv.x * 12.566 + uTime * 0.22) * 0.008, 0.01, 0.99));
        vec3 texA = texture2D(uTexture, uv1).rgb;
        vec3 texB = texture2D(uTexture, uv2).rgb;
        vec3 baseTex = mix(texA, texB, 0.42);
        float texLum = dot(baseTex, vec3(0.299, 0.587, 0.114));

        // 3D spherical boiling convection cells + supergranulation (video 00:00 look)
        vec3 sp = vLocalDir * 6.5 + vec3(uTime * 0.06, -uTime * 0.04, uTime * 0.05);
        float warp = fbm3(sp * 0.65);
        float boil = fbm3(sp * 1.45 + vec3(warp * 2.4));
        float fineCells = fbm3(sp * 4.2 - vec3(0.0, uTime * 0.12, warp * 1.6));

        // Magnetic sunspot umbrae & bright surrounding faculae ridges
        float spotField = fbm3(vLocalDir * 3.8 + vec3(1.4, uTime * 0.015, -0.8));
        float sunspot = smoothstep(0.29, 0.16, spotField) * smoothstep(0.7, 0.18, abs(vLocalDir.y));
        float faculae = smoothstep(0.68, 0.92, boil * 0.65 + fineCells * 0.45);

        float plasmaTemp = clamp(texLum * 0.55 + boil * 0.52 + fineCells * 0.32 - sunspot * 0.62, 0.0, 1.35);

        vec3 umbraRed = vec3(0.32, 0.03, 0.0);
        vec3 deepSolarRed = vec3(1.15, 0.18, 0.01);
        vec3 moltenOrange = vec3(1.85, 0.58, 0.06);
        vec3 hotGold = vec3(2.45, 1.52, 0.34);
        vec3 flareWhite = vec3(3.2, 2.55, 1.35);

        vec3 plasmaCol = mix(umbraRed, deepSolarRed, smoothstep(0.05, 0.32, plasmaTemp));
        plasmaCol = mix(plasmaCol, moltenOrange, smoothstep(0.28, 0.62, plasmaTemp));
        plasmaCol = mix(plasmaCol, hotGold, smoothstep(0.56, 0.88, plasmaTemp));
        plasmaCol = mix(plasmaCol, flareWhite, smoothstep(0.84, 1.18, plasmaTemp + faculae * 0.25));

        // Physical photospheric limb darkening + blistering volcanic coronal rim
        vec3 viewDir = normalize(-vPosView);
        float ndv = clamp(dot(vNormalView, viewDir), 0.0, 1.0);
        float limbDark = pow(ndv, 0.38);
        float chromoRim = pow(1.0 - ndv, 3.2);

        float boost = mix(0.88, 1.48, uFocusBoost);
        vec3 coreOut = plasmaCol * (0.62 + 0.58 * limbDark) * boost;
        vec3 fireRim = vec3(3.4, 0.95, 0.14) * chromoRim * mix(0.95, 1.85, uFocusBoost);

        gl_FragColor = vec4((coreOut + fireRim) * uExposureComp, 1.0);
      }
    `,
  });
}

export class SolarSystemEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;

  // True physical PointLight (decay: 2) + focused 4K DirectionalLight ShadowMap rig
  private sunPointLight!: THREE.PointLight;
  private focusShadowLight: THREE.DirectionalLight | null = null;

  private bodies = new Map<CelestialBodyId, PlanetRuntime>();
  private moonsById = new Map<string, MoonRuntime>();
  private beaconsByMissionId = new Map<string, MissionBeaconRuntime>();
  private hitProxies: THREE.Mesh[] = [];
  private missionHitProxies: THREE.Mesh[] = [];
  private sunSurfaceMat: THREE.ShaderMaterial | null = null;
  private sunChromoMat: THREE.ShaderMaterial | null = null;
  private sunProminenceMats: THREE.ShaderMaterial[] = [];
  private sunProminences: Array<{ mesh: THREE.Mesh; mat: THREE.ShaderMaterial; period: number; offset: number }> = [];
  private sunInnerGlowMat: THREE.SpriteMaterial | null = null;
  private sunInnerGlow: THREE.Sprite | null = null;
  private sunOuterGlow: THREE.Sprite | null = null;
  private sunGlowBaseScale = { inner: 1, outer: 1 };
  /** "Modo nave": always-on starship layer (loaded on first use) */
  private shipOverlay: ShipOverlay | null = null;
  private shipPass: RenderPass | null = null;
  private shipModeOn = false;
  private renderSuspended = false;
  private shipLoading = false;
  private shipThrust = 0;
  private readonly shipSunDir = new THREE.Vector3();
  /** Camera turn rate (rad/s, + = turning left) so the ship banks into turns while flying */
  private shipTurn = 0;
  private readonly prevCamQuat = new THREE.Quaternion();
  private readonly turnQuat = new THREE.Quaternion();
  private sunOuterGlowMat: THREE.SpriteMaterial | null = null;
  private sunFocusBoost = 0;
  private auroraMats: THREE.ShaderMaterial[] = [];
  private cityLightsMat: THREE.ShaderMaterial | null = null;
  /** Background sky materials and their unscaled colours (see SKY_MAX_SCREEN_EXPOSURE) */
  private skyMats: Array<{ material: THREE.PointsMaterial | THREE.MeshBasicMaterial; baseColor: THREE.Color }> = [];
  /** Outer-system atmosphere shells and their intensity (see OUTER_ATMOSPHERE_MAX_SCREEN_EXPOSURE) */
  private outerAtmosphereMats: Array<{ material: THREE.ShaderMaterial; baseIntensity: number }> = [];
  private lastSkyComp = -1;
  private lastAtmoComp = -1;
  /** Enceladus' geysers: soft ice grains rising from the south pole */
  private moonPlumes: Array<{
    points: THREE.Points;
    radius: number;
    /** Unit direction of each grain (3 floats per grain) */
    dirs: Float32Array;
    /** 0..1 life of each grain (0 = leaving the surface, 1 = gone) */
    age: Float32Array;
    /** Life fraction per second */
    speed: number;
    material: THREE.PointsMaterial;
    baseColor: THREE.Color;
  }> = [];
  private asteroidBelt: THREE.InstancedMesh | null = null;
  private kuiperBelt: THREE.InstancedMesh | null = null;
  /** Coma and tails of comet 67P (cometEffects) */
  private cometFx: CometEffects | null = null;
  private orbitSatellites: Array<{ missionId: string; pivot: THREE.Group; speed: number; ledMat?: THREE.MeshBasicMaterial; phase: number }> = [];

  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;

  // Real-Time J2000 clock state (default strictly 1x Real Time synced to Date.now())
  private simEpochMs = Date.now();
  private timeMultiplier = 1;
  private isPaused = false;
  private sunAnimTime = 0;
  private surfaceElapsed = 0;
  private lastHudSync = 0;

  // Camera navigation, Clean Travel & FlyTo Surface
  private focusedBodyId: CelestialBodyId | null = null;
  private focusedMoonId: string | null = null;
  private focusedMissionId: string | null = null;
  private isFlying = false;
  private isTracking = false;
  private flightTargetPos = new THREE.Vector3().copy(OVERVIEW_CAM_POS);
  private flightLookTarget = new THREE.Vector3().copy(OVERVIEW_TARGET);
  private currentExposure = 1.85;

  private keysPressed = new Set<string>();
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private pointerDownPos = { x: 0, y: 0 };
  private hoveredId: CelestialBodyId | null = null;
  private lastHoverCheck = 0;

  private spaceRoot = new THREE.Group();
  private surfaceDiorama: SurfaceDioramaRuntime | null = null;
  private surfaceMission: AbandonedMission | null = null;
  private pendingSurfaceMission: AbandonedMission | null = null;
  private surfaceApproachElapsed = 0;
  private surfaceViewMode: SurfaceCameraMode = 'rover';
  private deepSpaceDiorama: DeepSpaceDioramaRuntime | null = null;
  private activeDeepSpaceId: DeepSpaceTargetId | null = null;
  /** Bumped by every navigation call so a late-arriving diorama chunk never hijacks a newer choice */
  private navRequestToken = 0;

  private labelElements = new Map<CelestialBodyId, HTMLElement>();
  /** Last style written per label, so the per-frame projection only touches the DOM on change */
  private labelStyleCache = new WeakMap<HTMLElement, { shown: boolean | null; transform: string }>();
  private labelsAllHidden = false;
  /** Always-on Sun reference marker (see updateSunMarker) */
  private sunMarkerEl: HTMLElement | null = null;
  private companionLabels: Array<{
    el: HTMLElement;
    text: HTMLElement | null;
    arrow: HTMLElement | null;
    tick: HTMLElement | null;
    state: { shown: boolean | null; transform: string; text: string; arrow: string; moonId: string };
  } | null> = [];
  private readonly issSubpoint: IssSubpoint = { latDeg: 0, lonDeg: 0, altKm: 0 };
  private surfaceLabels: Array<{
    el: HTMLElement;
    text: HTMLElement | null;
    state: { shown: boolean | null; transform: string; text: string; missionId: string };
  } | null> = [];
  private lastCompanionTextAt = 0;
  private sunMarkerArrow: HTMLElement | null = null;
  private sunMarkerText: HTMLElement | null = null;
  private sunMarkerState = { shown: null as boolean | null, transform: '', arrow: '', text: '', w: 0, h: 0 };
  private lastSunTextAt = 0;
  /** Sun direction in the active surface / mission diorama (diorama root is world-aligned) */
  private surfaceSunLocal = new THREE.Vector3(0, 1, 0);
  private viewportW = 0;
  private viewportH = 0;
  /** Screen area covered by UI panels (CSS px), reported by the React layer on phones */
  private viewInsetTop = 0;
  private viewInsetBottom = 0;
  /** Current (damped) vertical shift of the projection centre, in CSS px */
  private viewShiftPx = 0;
  private appliedViewShift = { shift: 0, w: 0, h: 0 };
  /** Fit factor the current tracked camera distance corresponds to (see updateFramingZoom) */
  private appliedFitFactor = 1;
  private roomEnvTex: THREE.Texture | null = null;
  private showOrbits = true;
  private currentOrbitOpacity = 0;
  private showLabels = true;

  private disposables: Array<{ dispose: () => void }> = [];
  private pbrCaps!: Pbr8KCapabilities;
  private active8KAbort: AbortController | null = null;
  private active8KUpgrade: {
    material: THREE.MeshPhysicalMaterial;
    restore: BasePbrSnapshot;
    set: UploadedPbrSet;
  } | null = null;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // Reading every program's info log forces the CPU to wait for the GPU compiler; skip it in
    // production builds (errors are still reported in development).
    this.renderer.debug.checkShaderErrors = !import.meta.env.PROD;
    this.renderer.toneMappingExposure = this.currentExposure;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    this.renderer.setSize(width, height);
    this.viewportW = width;
    this.viewportH = height;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    // three.js r187 removed PCFSoftShadowMap and swaps it for PCFShadowMap on the first shadow
    // render. Asking for PCF directly gives the very same shadows, and lets the shaders compiled
    // ahead of time (before that first render) match the ones actually used.
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.pbrCaps = getPbr8KCapabilities(this.renderer, this.isSoftwareGl);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';

    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    // Pure black: any tint here gets multiplied by the auto-exposure (up to ~290x at Neptune)
    this.scene.background = new THREE.Color(0x000000);
    this.scene.add(this.spaceRoot);

    // Initialize RoomEnvironment per spec but keep intensity strictly 0.0 so night hemispheres stay pitch-black
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    // Space mode runs at environmentIntensity 0, so the IBL term is exactly zero there; leaving the
    // environment unbound in that mode skips its per-pixel cube-UV fetches on every planet without
    // changing a single lit pixel. The surface / deep-space dioramas bind it (they use 0.68 / 0.28).
    this.roomEnvTex = envTex;
    this.scene.environment = null;
    this.scene.environmentIntensity = 0.0;
    this.disposables.push(envTex);
    // Lets the hyperspace view compile the same PMREM shaders in parallel later (pmremWarmup)
    keepPmremMaterials(pmremGenerator);
    pmremGenerator.dispose();

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 190000);
    this.camera.position.copy(this.getOverviewCamPos(_vec3A));

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.055;
    this.controls.enablePan = true;
    this.controls.enableZoom = true;
    this.controls.rotateSpeed = 0.68;
    this.controls.zoomSpeed = 1.05;
    this.controls.panSpeed = 0.85;
    this.controls.minDistance = 0.28;
    this.controls.maxDistance = 65000;
    this.controls.target.copy(OVERVIEW_TARGET);

    this.controls.addEventListener('start', () => {
      if (this.isFlying) {
        this.isFlying = false;
      }
    });

    if (!this.isSoftwareGl) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.34,
        0.58,
        0.94,
      );
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(new OutputPass());
    }

    this.buildLighting();
    this.buildDeepSpaceSky();
    this.buildAsteroidBelt();
    this.buildKuiperBelt();
    this.buildCelestialBodies();
    this.buildMissionBeacons();
    this.buildOrbitingSpacecraftMarkers();
    this.applyJ2000State(daysSinceJ2000(this.simEpochMs), true);
    void refreshIssElements(); // TLE más reciente de la ISS si hay internet (silencioso si no)
    this.bindEvents();

    if (this.isSoftwareGl) {
      this.startLoop();
    } else {
      this.warmUpShadersThenStart();
    }
    this.scheduleDioramaPreload();
  }

  private scheduleIdle(cb: () => void, fallbackDelayMs: number, timeoutMs = 4000): void {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(cb, { timeout: timeoutMs });
    } else {
      window.setTimeout(cb, fallbackDelayMs);
    }
  }

  /**
   * Compiles every space-mode shader through KHR_parallel_shader_compile (off the main thread where
   * the driver supports it) before the first frame, instead of one long blocking compile() call.
   * Then, in idle time, also compiles the variant used while a body is focused (Sun-aligned shadow
   * light switched on); without that, the first planet click recompiles every PBR material at once
   * and the fly-to stutters. Programs are identical either way, so the rendered image is unchanged.
   */
  /**
   * compileAsync() against the same target the real frames are drawn into. With the bloom
   * composer that is an off-screen buffer, whose shader variant differs from a direct-to-canvas
   * one (no tone mapping, linear output): compiling against the canvas prepared the wrong variant
   * and every material compiled again, synchronously, on its first real frame.
   */
  private compileForScreen(
    scene: THREE.Object3D,
    camera: THREE.Camera,
    targetScene: THREE.Scene | null = null,
  ): Promise<unknown> {
    const prev = this.renderer.getRenderTarget();
    if (this.composer) this.renderer.setRenderTarget(this.composer.readBuffer);
    try {
      return this.renderer.compileAsync(scene, camera, targetScene);
    } finally {
      this.renderer.setRenderTarget(prev);
    }
  }

  private warmUpShadersThenStart(): void {
    let started = false;
    const start = () => {
      if (started || this.disposed) return;
      started = true;
      this.startLoop();
      // Soon after the first frames (not seconds later): the focus-lighting variants of every
      // material, hidden mission markers included, must be ready before the first trip
      this.scheduleIdle(() => this.prewarmFocusShadowVariant(), 300, 1000);
      // Number formatters of the HUD distances, built before the first trip needs them
      this.scheduleIdle(() => {
        for (const d of [undefined, 1, 2]) formatNumber(1, locale(), d);
      }, 500);
      this.runTexturePreupload();
    };
    // Safety net: never hold the first frame back longer than this (render would just finish linking).
    window.setTimeout(start, 2500);
    try {
      this.compileForScreen(this.scene, this.camera).then(start, start);
    } catch {
      start();
    }
  }

  private prewarmFocusShadowVariant(): void {
    if (this.disposed || !this.focusShadowLight) return;
    if (!this.spaceRoot.visible) {
      // A diorama is open (space lights hidden); try again once back in space mode.
      this.scheduleIdle(() => this.prewarmFocusShadowVariant(), 3000);
      return;
    }
    this.runVariantPrewarm();
  }

  /**
   * Compiles, in parallel (KHR_parallel_shader_compile), every program a part of space mode can
   * need: each material lit with and without the focus shadow light, plus the depth programs of
   * the shadow pass. Without this they compiled synchronously on first use: the stalls when
   * arriving at a planet (shadow light switched on) and when going back to the overview. Only
   * programs are prepared; every change is undone in the same task, so nothing is ever drawn
   * differently.
   */
  private compileSpaceVariants(root: THREE.Object3D): Promise<unknown> {
    const dir = this.focusShadowLight;
    if (!dir) return this.compileForScreen(root, this.camera, this.scene);
    const wasOn = dir.visible;
    const revealed = this.revealHiddenForCompile(root);
    const pending: Array<Promise<unknown>> = [];
    try {
      // compile() only reads the visible lights, synchronously, so the light can be switched straight back
      for (const on of [wasOn, !wasOn]) {
        dir.visible = on;
        pending.push(this.compileForScreen(root, this.camera, this.scene).catch(() => {}));
        if (on) pending.push(this.compileShadowDepthPrograms(root));
      }
    } catch {
      // Not fatal: programs then compile on first use, as before
    } finally {
      dir.visible = wasOn;
      for (const o of revealed) o.visible = false;
    }
    return Promise.all(pending);
  }

  /** Program-relevant state of each part of space mode at its last pre-compile. */
  private readonly variantSignatures = new WeakMap<THREE.Object3D, string>();
  private variantQueue: THREE.Object3D[] = [];
  private variantPrewarmRunning = false;

  /**
   * Pre-compiles (see compileSpaceVariants) every part of space mode whose materials changed
   * since last time (textures and relief maps arrive after start-up), one part per idle slice so
   * no single task gets long, then keeps watching for changes.
   */
  private runVariantPrewarm(): void {
    if (this.disposed || this.variantPrewarmRunning) return;
    this.variantPrewarmRunning = true;
    const step = (deadline?: IdleDeadline) => {
      if (this.disposed) return;
      if (!this.spaceRoot.visible) {
        // A diorama is open (space lights hidden): wait until back in space mode
        this.variantQueue = [];
      } else {
        if (!this.variantQueue.length) {
          for (const part of this.spaceRoot.children) {
            const sig = this.computeVariantSignature(part);
            if (sig === null || this.variantSignatures.get(part) === sig) continue;
            this.variantSignatures.set(part, sig);
            this.variantQueue.push(part);
          }
        }
        const until = performance.now() + 8;
        do {
          const part = this.variantQueue.shift();
          if (!part) break;
          void this.compileSpaceVariants(part).catch(() => {});
        } while (deadline && deadline.timeRemaining() > 6 && performance.now() < until);
      }
      if (this.variantQueue.length) {
        this.requestIdle(step, 120);
      } else {
        window.setTimeout(() => this.requestIdle(step, 2000), 2500);
      }
    };
    this.requestIdle(step, 1000);
  }

  /**
   * A trip starts: make sure the destination's programs (shadow-lit ones included) are compiling
   * now, in parallel, so they are ready by the time the flight arrives.
   */
  private prewarmTripTarget(part: THREE.Object3D): void {
    if (this.disposed || !this.spaceRoot.visible || part.parent !== this.spaceRoot) return;
    const sig = this.computeVariantSignature(part);
    if (sig === null || this.variantSignatures.get(part) === sig) return;
    this.variantSignatures.set(part, sig);
    this.variantQueue = this.variantQueue.filter((p) => p !== part);
    void this.compileSpaceVariants(part).catch(() => {});
  }

  private texturePreuploadRunning = false;
  private readonly texturesSeenForUpload = new WeakSet<THREE.Texture>();

  /**
   * three.js uploads a texture the first time it is drawn. Jupiter and its four moons, for
   * example, first come into view mid-flight and their five maps were decoded and uploaded in
   * one frame (~300 ms on a phone). Here, in idle time, each image is decoded off the main thread
   * (img.decode()) and then uploaded with the very same three.js path (initTexture), one texture
   * per idle slice. Nothing is drawn differently; the work just moves out of the flights.
   */
  private runTexturePreupload(): void {
    if (this.disposed || this.texturePreuploadRunning) return;
    this.texturePreuploadRunning = true;
    const MAP_KEYS = [
      'map', 'emissiveMap', 'normalMap', 'bumpMap', 'roughnessMap', 'metalnessMap', 'alphaMap',
      'specularMap', 'aoMap', 'lightMap', 'clearcoatNormalMap', 'specularColorMap',
    ];
    const isUploaded = (tex: THREE.Texture) => {
      const props = this.renderer.properties.get(tex) as { __version?: number };
      return props.__version === tex.version;
    };
    const pending = (): THREE.Texture | null => {
      let found: THREE.Texture | null = null;
      this.spaceRoot.traverse((o) => {
        if (found) return;
        const m = (o as THREE.Mesh).material;
        if (!m) return;
        for (const mat of Array.isArray(m) ? m : [m]) {
          const rec = mat as unknown as Record<string, unknown>;
          for (const k of MAP_KEYS) {
            const tex = rec[k] as THREE.Texture | null | undefined;
            if (!tex || !tex.isTexture || this.texturesSeenForUpload.has(tex)) continue;
            if ((tex as THREE.Texture & { isExternalTexture?: boolean }).isExternalTexture) continue;
            if ((tex as THREE.Texture & { isRenderTargetTexture?: boolean }).isRenderTargetTexture) continue;
            const img = tex.image as { width?: number; complete?: boolean } | null;
            if (!img || !img.width || img.complete === false || tex.version === 0) continue;
            if (isUploaded(tex)) {
              this.texturesSeenForUpload.add(tex);
              continue;
            }
            found = tex;
            return;
          }
        }
      });
      return found;
    };
    const step = () => {
      if (this.disposed) return;
      const tex = this.spaceRoot.visible ? pending() : null;
      if (!tex) {
        // Nothing left right now: look again later (textures keep arriving after start-up)
        window.setTimeout(() => this.requestIdle(step, 3000), 3000);
        return;
      }
      this.texturesSeenForUpload.add(tex);
      const img = tex.image as HTMLImageElement;
      const decoded =
        typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement && typeof img.decode === 'function'
          ? img.decode().catch(() => {})
          : Promise.resolve();
      void decoded.then(() => {
        this.requestIdle(() => {
          if (this.disposed) return;
          try {
            if (!isUploaded(tex)) this.renderer.initTexture(tex);
          } catch {
            // uploaded on first use instead
          }
          this.requestIdle(step, 1000);
        }, 1500);
      });
    };
    this.requestIdle(step, 2000);
  }

  private requestIdle(cb: (deadline?: IdleDeadline) => void, timeoutMs: number): void {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(cb, { timeout: timeoutMs });
    } else {
      window.setTimeout(() => cb(), 50);
    }
  }

  /** Depth materials standing in for the shadow pass's own (same program key); kept alive so the
   *  programs stay cached. */
  private readonly shadowDepthStandIns = new WeakMap<THREE.Material, THREE.MeshDepthMaterial>();

  /**
   * The shadow pass draws every caster with a depth material (three.js' internal one, or the
   * object's customDepthMaterial) set up from the caster's own material, exactly as
   * WebGLShadowMap.getDepthMaterial does. Swap in an equivalent one, compile, swap back.
   */
  private compileShadowDepthPrograms(root: THREE.Object3D): Promise<unknown> {
    const sideFor: Record<number, THREE.Side> = {
      [THREE.FrontSide]: THREE.BackSide,
      [THREE.BackSide]: THREE.FrontSide,
      [THREE.DoubleSide]: THREE.DoubleSide,
    };
    type Caster = THREE.Mesh & { customDepthMaterial?: THREE.Material };
    type Props = Record<string, unknown>;
    const KEYS = [
      'visible', 'wireframe', 'side', 'alphaMap', 'alphaTest', 'map', 'clipShadows',
      'clippingPlanes', 'clipIntersection', 'displacementMap', 'displacementScale',
      'displacementBias', 'wireframeLinewidth', 'linewidth',
    ];
    const swapped: Array<{ obj: Caster; material: THREE.Material | THREE.Material[] }> = [];
    const customSaved = new Map<THREE.Material, Props>();
    const depthFor = (obj: Caster, m: THREE.Material): THREE.Material => {
      let result: THREE.Material;
      if (obj.customDepthMaterial) {
        result = obj.customDepthMaterial;
        if (!customSaved.has(result)) {
          const saved: Props = {};
          for (const k of KEYS) saved[k] = (result as unknown as Props)[k];
          customSaved.set(result, saved);
        }
      } else {
        let standIn = this.shadowDepthStandIns.get(m);
        if (!standIn) {
          standIn = new THREE.MeshDepthMaterial();
          this.shadowDepthStandIns.set(m, standIn);
        }
        result = standIn;
      }
      const src = m as unknown as Props;
      const dst = result as unknown as Props;
      dst.visible = m.visible;
      dst.wireframe = src.wireframe;
      dst.side = m.shadowSide !== null ? m.shadowSide : sideFor[m.side];
      dst.alphaMap = src.alphaMap;
      dst.alphaTest = m.alphaToCoverage === true ? 0.5 : m.alphaTest;
      dst.map = src.map;
      dst.clipShadows = m.clipShadows;
      dst.clippingPlanes = m.clippingPlanes;
      dst.clipIntersection = m.clipIntersection;
      dst.displacementMap = src.displacementMap;
      dst.displacementScale = src.displacementScale;
      dst.displacementBias = src.displacementBias;
      dst.wireframeLinewidth = src.wireframeLinewidth;
      dst.linewidth = src.linewidth;
      return result;
    };
    let compiled: Promise<unknown> = Promise.resolve();
    try {
      root.traverse((o) => {
        const obj = o as Caster;
        const drawable = obj.isMesh || (o as THREE.Line).isLine || (o as THREE.Points).isPoints;
        if (!drawable || !obj.castShadow || !obj.material) return;
        const material = obj.material;
        swapped.push({ obj, material });
        obj.material = Array.isArray(material)
          ? material.map((m) => depthFor(obj, m))
          : depthFor(obj, material);
      });
      // The shadow map is a render target, like the composer buffer compileForScreen() targets
      if (swapped.length) {
        compiled = this.compileForScreen(root, this.camera, this.scene).catch(() => {});
      }
    } catch {
      // compiled on first use instead
    } finally {
      for (const { obj, material } of swapped) obj.material = material;
      for (const [m, saved] of customSaved) Object.assign(m, saved);
    }
    return compiled;
  }

  /**
   * Material state of a part that decides which programs it needs (changes when maps arrive or
   * swap); null when it has nothing to draw.
   */
  private computeVariantSignature(part: THREE.Object3D): string | null {
    let objects = 0;
    let versions = 0;
    let count = 0;
    part.traverse((o) => {
      objects++;
      const m = (o as THREE.Mesh).material;
      if (!m) return;
      // Object state that is part of the program too
      if ((o as THREE.InstancedMesh).instanceColor) objects += 1000;
      if (o.castShadow) objects += 100000;
      if (o.receiveShadow) objects += 10000000;
      for (const mat of Array.isArray(m) ? m : [m]) {
        count++;
        versions += mat.version * 7 + mat.id;
      }
    });
    return count ? `${objects}:${count}:${versions}` : null;
  }

  /**
   * Applies a change that needs new shader programs (the HD maps) only once those are compiled:
   * the change is made for the synchronous part of a parallel compile and undone at once (nothing
   * is drawn meanwhile); the caller then applies it for real.
   */
  private async compileBeforeApplying(
    material: THREE.Material,
    apply: () => void,
    undo: () => void,
  ): Promise<void> {
    let compiled: Promise<unknown> = Promise.resolve();
    try {
      apply();
      material.needsUpdate = true;
      // Only the objects drawn with this material (children left out for the moment)
      const users: THREE.Object3D[] = [];
      this.spaceRoot.traverse((o) => {
        const m = (o as THREE.Mesh).material;
        if (m === material || (Array.isArray(m) && m.includes(material))) users.push(o);
      });
      compiled = Promise.all(
        users.map((o) => {
          const children = o.children;
          o.children = [];
          try {
            return this.compileSpaceVariants(o);
          } finally {
            o.children = children;
          }
        }),
      );
    } catch {
      // compiled on first use instead
    } finally {
      undo();
      material.needsUpdate = true;
    }
    await compiled.catch(() => {});
  }

  /** Current PBR maps of a material, and a function that puts them back. */
  private snapshotPbrMaps(mat: THREE.MeshStandardMaterial): () => void {
    const { map, normalMap, roughnessMap, metalnessMap, metalness } = mat;
    return () => {
      mat.map = map;
      mat.normalMap = normalMap;
      mat.roughnessMap = roughnessMap;
      mat.metalnessMap = metalnessMap;
      mat.metalness = metalness;
    };
  }

  /**
   * Makes every hidden object in space mode visible for the synchronous part of compile() and
   * returns them so the caller can hide them again in the same task: nothing is ever drawn in that
   * state. Lights keep their own visibility (they define which shader variant is compiled).
   */
  private revealHiddenForCompile(root: THREE.Object3D = this.spaceRoot): THREE.Object3D[] {
    const revealed: THREE.Object3D[] = [];
    root.traverse((o) => {
      if (o.visible || (o as THREE.Light).isLight) return;
      o.visible = true;
      revealed.push(o);
    });
    return revealed;
  }

  /** Fetch + parse the diorama chunks during idle time after the first frames are on screen. */
  private scheduleDioramaPreload(): void {
    this.scheduleIdle(() => {
      if (this.disposed) return;
      void loadSurfaceModule().catch(() => {});
      void loadDeepSpaceModule().catch(() => {});
    }, 2000);
  }

  private buildLighting(): void {
    // SOLE illumination source: PointLight with inverse-square decay = 2 tuned for vivid sunlit reflection & crisp night contrast
    this.sunPointLight = new THREE.PointLight(0xfff7ea, 1680000, 0, 2);
    this.sunPointLight.position.set(0, 0, 0);
    this.spaceRoot.add(this.sunPointLight);

    // Focused Sun-aligned high-resolution DirectionalLight ShadowMap (4096x4096) for crisp planet-on-ring, ring-on-planet & eclipse shadows
    if (!this.isSoftwareGl) {
      const shadowRes = Math.min(
        4096,
        this.renderer.capabilities.maxTextureSize || 4096,
      );
      const dir = new THREE.DirectionalLight(0xfff7ea, 0);
      dir.castShadow = true;
      dir.shadow.mapSize.set(shadowRes, shadowRes);
      dir.shadow.bias = -0.00018;
      dir.shadow.normalBias = 0.015;
      dir.shadow.radius = 2;
      dir.visible = false;
      this.spaceRoot.add(dir);
      this.spaceRoot.add(dir.target);
      this.focusShadowLight = dir;
    }
    // Zero AmbientLight, zero HemisphereLight in Space Mode: complete darkness on night sides
  }

  private buildDeepSpaceSky(): void {
    // 1. Multi-magnitude celestial starfield
    const starCount = 5600;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const palette = [
      new THREE.Color(0xcad8ff),
      new THREE.Color(0xf8fafc),
      new THREE.Color(0xfef3c7),
      new THREE.Color(0xfde68a),
    ];

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2 * Math.PI;
      const phi = Math.acos(2 * v - 1);
      const r = 68000 + Math.random() * 28000;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const baseCol = palette[Math.floor(Math.random() * palette.length)];
      const mag = 0.25 + Math.pow(Math.random(), 2.8) * 0.75;
      colors[i * 3] = baseCol.r * mag;
      colors[i * 3 + 1] = baseCol.g * mag;
      colors[i * 3 + 2] = baseCol.b * mag;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 74,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      toneMapped: false,
    });

    const stars = new THREE.Points(starGeo, starMat);
    this.scene.add(stars);
    this.disposables.push(starGeo, starMat);
    this.skyMats.push({ material: starMat, baseColor: starMat.color.clone() });

    // 2. Subtle Milky Way galactic band (inclined ~60.2 deg to ecliptic)
    const mwCount = 3800;
    const mwPos = new Float32Array(mwCount * 3);
    const mwCol = new Float32Array(mwCount * 3);
    const mwGroup = new THREE.Group();
    mwGroup.rotation.set(
      THREE.MathUtils.degToRad(60.2),
      THREE.MathUtils.degToRad(28.0),
      0,
    );

    for (let i = 0; i < mwCount; i++) {
      const lon = Math.random() * Math.PI * 2;
      // Gaussian concentration along galactic equator
      const u1 = Math.max(1e-5, Math.random());
      const u2 = Math.random();
      const gauss = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const lat = THREE.MathUtils.clamp(gauss * 0.11, -0.55, 0.55);
      const r = 74000 + Math.random() * 18000;

      mwPos[i * 3] = r * Math.cos(lat) * Math.cos(lon);
      mwPos[i * 3 + 1] = r * Math.sin(lat);
      mwPos[i * 3 + 2] = r * Math.cos(lat) * Math.sin(lon);

      const coreBulge = 0.55 + 0.45 * Math.max(0, Math.cos(lon));
      const faint = (0.14 + Math.random() * 0.24) * coreBulge;
      mwCol[i * 3] = faint * 0.85;
      mwCol[i * 3 + 1] = faint * 0.9;
      mwCol[i * 3 + 2] = faint * 1.05;
    }

    const mwGeo = new THREE.BufferGeometry();
    mwGeo.setAttribute('position', new THREE.BufferAttribute(mwPos, 3));
    mwGeo.setAttribute('color', new THREE.BufferAttribute(mwCol, 3));

    const mwMat = new THREE.PointsMaterial({
      size: 118,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      toneMapped: false,
    });

    this.skyMats.push({ material: mwMat, baseColor: mwMat.color.clone() });
    const mwPoints = new THREE.Points(mwGeo, mwMat);
    mwGroup.add(mwPoints);
    this.scene.add(mwGroup);
    this.disposables.push(mwGeo, mwMat);

    // 3. Milky Way Galactic Plane Nebulae & Star-Forming Regions (100% intra-galactic sky, zero external galaxies)
    const nebTex = createNebulaPuffTexture();
    this.disposables.push(nebTex);
    const nebPlaneGeo = new THREE.PlaneGeometry(1, 1);
    this.disposables.push(nebPlaneGeo);

    // Natural Milky Way tones: H-alpha emission reds / pinks, warm star clouds and dust (as in
    // NASA / ESA all-sky mosaics) instead of saturated cyan and indigo that read as a blue sky.
    const mwNebulaTints = [0xd9536f, 0xc9a27e, 0xe6d3b3, 0xb04a5a, 0xa89a8a];
    const mwNebulaCount = 36;
    for (let i = 0; i < mwNebulaCount; i++) {
      const lon = (i / mwNebulaCount) * Math.PI * 2 + (i % 3) * 0.14;
      const lat = ((i % 5) - 2) * 0.048;
      const r = 74000 + (i % 4) * 3200;

      const nx = r * Math.cos(lat) * Math.cos(lon);
      const ny = r * Math.sin(lat);
      const nz = r * Math.cos(lat) * Math.sin(lon);

      const nMat = new THREE.MeshBasicMaterial({
        map: nebTex,
        color: mwNebulaTints[i % mwNebulaTints.length],
        transparent: true,
        opacity: 0.14 + (i % 3) * 0.04,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      this.skyMats.push({ material: nMat, baseColor: nMat.color.clone() });
      const nMesh = new THREE.Mesh(nebPlaneGeo, nMat);
      nMesh.position.set(nx, ny, nz);
      nMesh.lookAt(0, 0, 0);
      nMesh.rotateZ(i * 0.65);
      const nSize = 4800 + (i % 4) * 1900;
      nMesh.scale.set(nSize, nSize * 0.62, 1);

      mwGroup.add(nMesh);
      this.disposables.push(nMat);
    }
  }

  private buildAsteroidBelt(): void {
    // Realistic Main Asteroid Belt between 2.15 AU and 3.25 AU (2150..3250 world units)
    const count = 1100;
    const geo = new THREE.DodecahedronGeometry(0.45, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x8d94a0,
      roughness: 0.96,
      metalness: 0.0,
    });
    const instanced = new THREE.InstancedMesh(geo, mat, count);
    instanced.frustumCulled = false;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = (2.15 + Math.random() * 1.1) * AU_TO_UNITS;
      const y = (Math.random() - 0.5) * 95;
      _vec3A.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      _quat.setFromEuler(
        new THREE.Euler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        ),
      );
      const s = 0.7 + Math.pow(Math.random(), 2) * 2.6;
      _scale.set(s, s * (0.65 + Math.random() * 0.55), s);
      _mat4.compose(_vec3A, _quat, _scale);
      instanced.setMatrixAt(i, _mat4);

      const shade = 0.5 + Math.random() * 0.45;
      _color.setRGB(shade, shade * 0.95, shade * 0.88);
      instanced.setColorAt(i, _color);
    }

    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
    instanced.computeBoundingSphere();

    this.asteroidBelt = instanced;
    this.spaceRoot.add(instanced);
    this.disposables.push(geo, mat);
  }

  private buildKuiperBelt(): void {
    // Realistic Outer Kuiper Belt icy objects between 30.8 AU and 50.5 AU
    const count = 1200;
    const geo = new THREE.DodecahedronGeometry(0.65, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xa5b4c8,
      roughness: 0.9,
      metalness: 0.04,
    });
    const instanced = new THREE.InstancedMesh(geo, mat, count);
    instanced.frustumCulled = false;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = (30.8 + Math.random() * 19.7) * AU_TO_UNITS;
      const y = (Math.random() - 0.5) * 2600;
      _vec3A.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      _quat.setFromEuler(
        new THREE.Euler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        ),
      );
      const s = 1.4 + Math.pow(Math.random(), 2) * 4.5;
      _scale.set(s, s * (0.7 + Math.random() * 0.5), s);
      _mat4.compose(_vec3A, _quat, _scale);
      instanced.setMatrixAt(i, _mat4);

      const shade = 0.55 + Math.random() * 0.4;
      _color.setRGB(shade * 0.9, shade * 0.96, shade);
      instanced.setColorAt(i, _color);
    }

    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
    instanced.computeBoundingSphere();

    this.kuiperBelt = instanced;
    this.spaceRoot.add(instanced);
    this.disposables.push(geo, mat);
  }

  private buildCelestialBodies(): void {
    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    // Shared neutral PBR placeholders (flat normal, fully rough, non-metal)
    const flatNormal = createSolidTexture([128, 128, 255], false);
    const fullRough = createSolidTexture([255, 255, 255], false);
    const zeroMetal = createSolidTexture([0, 0, 0], false);
    const blackColor = createSolidTexture([0, 0, 0], true);
    const whiteColor = createSolidTexture([255, 255, 255], true);
    this.disposables.push(flatNormal, fullRough, zeroMetal, blackColor, whiteColor);

    for (const data of CELESTIAL_BODIES) {
      const inclinationGroup = new THREE.Group();
      this.spaceRoot.add(inclinationGroup);

      // True J2000 elliptical orbit line (hidden by default & strictly off during FlyTo)
      let orbitLine: THREE.LineLoop | undefined;
      const kepler = PLANET_ELEMENTS_J2000[data.id];
      if (kepler) {
        const pts = sampleOrbitEllipsePoints(kepler, 256, AU_TO_UNITS);
        const orbitGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const orbitMat = new THREE.LineBasicMaterial({
          color: new THREE.Color(data.accentColor),
          transparent: true,
          opacity: 0,
          depthWrite: false,
          toneMapped: false,
        });
        orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
        orbitLine.visible = false;
        inclinationGroup.add(orbitLine);
        this.disposables.push(orbitGeo, orbitMat);
      }

      const anchorGroup = new THREE.Group();
      inclinationGroup.add(anchorGroup);

      const tiltGroup = new THREE.Group();
      if (data.id === 'earth') {
        // Polo norte terrestre real: inclinado hacia la longitud eclíptica 90° (escena: x, z, -y), así que
        // el giro es alrededor de +X (equinoccio vernal). Con esto, día/noche y estaciones coinciden con
        // la hora UTC real (punto subsolar verificado contra la fórmula GMST/declinación, error < 1°).
        tiltGroup.rotation.x = -THREE.MathUtils.degToRad(data.axialTiltDeg);
      } else {
        tiltGroup.rotation.z = THREE.MathUtils.degToRad(data.axialTiltDeg);
      }
      anchorGroup.add(tiltGroup);

      const sphereGeo =
        data.id === 'comet67p'
          ? createComet67PGeometry(data.visualRadius)
          : new THREE.SphereGeometry(data.visualRadius, 72, 54);
      if (data.shapeScale) {
        // Elongated small bodies (433 Eros): stretch the sphere into its real tri-axial shape
        sphereGeo.scale(data.shapeScale[0], data.shapeScale[1], data.shapeScale[2]);
      }
      this.disposables.push(sphereGeo);

      // Real NASA textures replace these 1×1 placeholders as soon as they load. The costly
      // per-pixel procedural set is only generated if a real texture fails to load.
      const placeholderMap = createSolidTexture(hexToRgb(data.accentColor), true);
      this.disposables.push(placeholderMap);
      const texSet = {
        map: placeholderMap as THREE.Texture,
        normalMap: flatNormal as THREE.Texture,
        roughnessMap: fullRough as THREE.Texture,
        metalnessMap: zeroMetal as THREE.Texture,
      };
      let proceduralSet: PlanetTextureSet | null = null;
      const getProceduralSet = (): PlanetTextureSet => {
        if (!proceduralSet) {
          proceduralSet = createProceduralPlanetTextureSet(data.id, maxAnisotropy);
          this.disposables.push(
            proceduralSet.map,
            proceduralSet.normalMap,
            proceduralSet.roughnessMap,
            proceduralSet.metalnessMap,
          );
        }
        return proceduralSet;
      };

      let mesh: THREE.Mesh;
      let planetMat: THREE.MeshPhysicalMaterial | undefined;
      let basePbr: BasePbrSnapshot | undefined;

      if (data.id === 'sun') {
        const sunMat = createSunSurfaceMaterial(texSet.map);
        this.sunSurfaceMat = sunMat;
        mesh = new THREE.Mesh(sphereGeo, sunMat);
        tiltGroup.add(mesh);
        this.disposables.push(sunMat);

        const chromoGeo = new THREE.SphereGeometry(
          data.visualRadius * 1.075,
          48,
          36,
        );
        const chromoMat = new THREE.ShaderMaterial({
          uniforms: {
            uColor: { value: new THREE.Color(0xffae38) },
            uFocusBoost: { value: 0 },
      uExposureComp: { value: 1 },
          },
          vertexShader: `
            varying vec3 vNormalView;
            varying vec3 vPosView;
            void main() {
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              vPosView = mv.xyz;
              vNormalView = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * mv;
            }
          `,
          fragmentShader: `
            uniform vec3 uColor;
            uniform float uFocusBoost;
            uniform float uExposureComp;
            varying vec3 vNormalView;
            varying vec3 vPosView;
            void main() {
              vec3 viewDir = normalize(-vPosView);
              float rim = pow(clamp(1.0 + dot(viewDir, vNormalView), 0.0, 1.0), 2.2);
              gl_FragColor = vec4(uColor * mix(1.18, 2.35, uFocusBoost) * uExposureComp, rim * mix(0.5, 0.94, uFocusBoost));
            }
          `,
          side: THREE.BackSide,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        this.sunChromoMat = chromoMat;
        const chromoMesh = new THREE.Mesh(chromoGeo, chromoMat);
        anchorGroup.add(chromoMesh);
        this.disposables.push(chromoGeo, chromoMat);

        // Corona sprites (bright natural stellar radiance across overview & blazing close-up)
        const glowTex = createSunGlowTexture();
        const innerGlowMat = new THREE.SpriteMaterial({
          map: glowTex,
          color: 0xffdf94,
          transparent: true,
          opacity: 0.48,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        });
        this.sunInnerGlowMat = innerGlowMat;
        const innerGlow = new THREE.Sprite(innerGlowMat);
        this.sunInnerGlow = innerGlow;
        this.sunGlowBaseScale.inner = data.visualRadius * 3.8;
        innerGlow.scale.set(
          data.visualRadius * 3.8,
          data.visualRadius * 3.8,
          1,
        );
        anchorGroup.add(innerGlow);

        const outerGlowMat = new THREE.SpriteMaterial({
          map: glowTex,
          color: 0xf97316,
          transparent: true,
          opacity: 0.16,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        });
        this.sunOuterGlowMat = outerGlowMat;
        const outerGlow = new THREE.Sprite(outerGlowMat);
        this.sunOuterGlow = outerGlow;
        this.sunGlowBaseScale.outer = data.visualRadius * 6.8;
        outerGlow.scale.set(
          data.visualRadius * 6.8,
          data.visualRadius * 6.8,
          1,
        );
        anchorGroup.add(outerGlow);
        this.disposables.push(glowTex, innerGlowMat, outerGlowMat);

        // Animated magnetic solar prominence flare loops anchored to solar photosphere
        const promSpecs = [
          { lat: 0.28, lon: 0.4, tilt: 0.35, scale: 1.04 },
          { lat: -0.34, lon: 2.1, tilt: -0.25, scale: 1.26 },
          { lat: 0.18, lon: 3.9, tilt: 0.5, scale: 0.92 },
          { lat: -0.22, lon: 5.2, tilt: -0.4, scale: 1.12 },
          { lat: 0.4, lon: 2.85, tilt: 0.28, scale: 0.96 },
          { lat: -0.14, lon: 1.15, tilt: -0.5, scale: 1.18 },
        ];
        for (let p = 0; p < promSpecs.length; p++) {
          const sp = promSpecs[p];
          const arcGeo = new THREE.TorusGeometry(
            data.visualRadius * 0.24 * sp.scale,
            data.visualRadius * 0.017,
            10,
            28,
            Math.PI,
          );
          const arcMat = new THREE.ShaderMaterial({
            uniforms: {
              uTime: { value: 0 },
              uFocusBoost: { value: 0 },
      uExposureComp: { value: 1 },
              uSeed: { value: p * 1.9 },
              uLife: { value: 1 },
              uFlare: { value: 0 },
            },
            vertexShader: `
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform float uTime;
              uniform float uFocusBoost;
              uniform float uExposureComp;
              uniform float uSeed;
              uniform float uLife;
              uniform float uFlare;
              varying vec2 vUv;
              void main() {
                // Plasma que corre a lo largo del arco (más rápido que antes para que se note)
                float flow = 0.55 + 0.45 * sin(vUv.x * 18.0 - uTime * 3.4 + uSeed);
                float edgeFade = sin(vUv.x * 3.14159);
                vec3 col = mix(vec3(1.0, 0.42, 0.12), vec3(1.0, 0.86, 0.42), flow);
                col = mix(col, vec3(1.0, 0.95, 0.75), uFlare * 0.6);
                float alpha = edgeFade * (0.38 + 0.42 * flow) * mix(0.75, 1.5, uFocusBoost) * uLife;
                gl_FragColor = vec4(col * mix(1.35, 2.55, uFocusBoost) * (1.0 + uFlare * 1.4) * uExposureComp, alpha);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
          });
          const arcMesh = new THREE.Mesh(arcGeo, arcMat);
          const surfR = data.visualRadius * 0.96;
          arcMesh.position.set(
            Math.cos(sp.lat) * Math.cos(sp.lon) * surfR,
            Math.sin(sp.lat) * surfR,
            Math.cos(sp.lat) * Math.sin(sp.lon) * surfR,
          );
          arcMesh.lookAt(arcMesh.position.clone().multiplyScalar(2));
          arcMesh.rotateX(Math.PI / 2);
          arcMesh.rotateZ(sp.tilt);
          tiltGroup.add(arcMesh);
          this.sunProminenceMats.push(arcMat);
          // Cada arco vive su propio ciclo (nace, sube, a veces estalla, se apaga), desfasado de los demás
          this.sunProminences.push({ mesh: arcMesh, mat: arcMat, period: 9 + p * 2.3, offset: p * 3.7 });
          this.disposables.push(arcGeo, arcMat);
        }

        loader.load(
          data.textures.map,
          (tex) => {
            if (this.disposed) {
              tex.dispose();
              return;
            }
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.wrapS = THREE.RepeatWrapping;
            tex.anisotropy = maxAnisotropy;
            sunMat.uniforms.uTexture.value = tex;
            this.disposables.push(tex);
          },
          undefined,
          () => {
            if (this.disposed) return;
            if (sunMat.uniforms.uTexture.value === placeholderMap) {
              sunMat.uniforms.uTexture.value = getProceduralSet().map;
            }
          },
        );
      } else {
        const isGasGiant =
          data.id === 'jupiter' ||
          data.id === 'saturn' ||
          data.id === 'uranus' ||
          data.id === 'neptune';
        const isIcyWorld = data.id === 'pluto' || data.id === 'eris';

        const planetMetalness =
          isGasGiant || isIcyWorld || data.id === 'earth' ? 0.0 : 0.05;
        planetMat = new THREE.MeshPhysicalMaterial({
          map: texSet.map,
          normalMap: texSet.normalMap,
          normalScale: new THREE.Vector2(
            isGasGiant ? 0.24 : data.id === 'comet67p' ? 1.15 : 0.72,
            isGasGiant ? 0.24 : data.id === 'comet67p' ? 1.15 : 0.72,
          ),
          roughness: 1.0,
          roughnessMap: texSet.roughnessMap,
          metalness: planetMetalness,
          metalnessMap: texSet.metalnessMap,
          // Eliminate plastic specular on gas giants & dusty regolith; reserve wet glint strictly for Earth's oceans
          specularIntensity:
            data.id === 'earth'
              ? 1.25
              : isIcyWorld
                ? 0.48
                : isGasGiant
                  ? 0.14
                  : 0.24,
          clearcoat: data.id === 'earth' ? 0.08 : 0.0,
          clearcoatRoughness: 0.28,
          envMapIntensity: 0.0,
        });
        basePbr = {
          map: texSet.map,
          normalMap: texSet.normalMap,
          roughnessMap: texSet.roughnessMap,
          metalnessMap: texSet.metalnessMap,
          metalness: planetMetalness,
        };

        mesh = new THREE.Mesh(sphereGeo, planetMat);
        // True astrophysical equatorial oblateness on rapidly spinning gas giants
        const flattening = POLAR_FLATTENING[data.id];
        if (flattening) mesh.scale.set(1, flattening, 1);
        if (!this.isSoftwareGl) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
        tiltGroup.add(mesh);
        this.disposables.push(planetMat);

        // Coma, ion tail and dust tail of comet 67P (soft, physically oriented: see cometEffects)
        if (data.id === 'comet67p') {
          const fx = createCometEffects(data.visualRadius);
          anchorGroup.add(fx.group);
          this.cometFx = fx;
          this.disposables.push(fx);
        }

        const activePlanetMat = planetMat;
        const activeBasePbr = basePbr;

        // Only reached if a real texture fails: fill any slot still on its placeholder with the
        // procedural set (exactly what the material held before when a load failed).
        const fillPlaceholdersWithProcedural = () => {
          if (this.disposed) return;
          const p = getProceduralSet();
          const slots = [
            ['map', placeholderMap, p.map],
            ['normalMap', flatNormal, p.normalMap],
            ['roughnessMap', fullRough, p.roughnessMap],
            ['metalnessMap', zeroMetal, p.metalnessMap],
          ] as const;
          for (const [key, placeholder, procedural] of slots) {
            if (activePlanetMat[key] === placeholder) activePlanetMat[key] = procedural;
            if (activeBasePbr[key] === placeholder) activeBasePbr[key] = procedural;
          }
          activePlanetMat.needsUpdate = true;
        };

        loader.load(
          data.textures.map,
          (tex) => {
            if (this.disposed) {
              tex.dispose();
              return;
            }
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.wrapS = THREE.RepeatWrapping;
            tex.anisotropy = maxAnisotropy;
            activePlanetMat.map = tex;
            activeBasePbr.map = tex;

            if (tex.image instanceof HTMLImageElement) {
              const rt = this.bodies.get(data.id);
              if (rt) rt.albedoImage = tex.image;
            }
            activePlanetMat.needsUpdate = true;
            this.disposables.push(tex);

            // Sobel relief derived directly from the real NASA photo (computed in a Web Worker)
            if (!data.textures.normalMap && !data.textures.bumpMap && tex.image) {
              void deriveSurfaceReliefMapsAsync(tex.image as HTMLImageElement, {
                normalStrength: isGasGiant ? 1.15 : data.id === 'comet67p' ? 5.2 : 3.6,
                anisotropy: maxAnisotropy,
                isGasGiant,
                isIcy: isIcyWorld,
              }).then((relief) => {
                if (this.disposed) {
                  relief.normalMap.dispose();
                  relief.roughnessMap.dispose();
                  relief.metalnessMap.dispose();
                  return;
                }
                activePlanetMat.normalMap = relief.normalMap;
                activeBasePbr.normalMap = relief.normalMap;
                if (!data.textures.specularMap) {
                  activePlanetMat.roughnessMap = relief.roughnessMap;
                  activeBasePbr.roughnessMap = relief.roughnessMap;
                } else {
                  relief.roughnessMap.dispose();
                }
                activePlanetMat.metalnessMap = relief.metalnessMap;
                activeBasePbr.metalnessMap = relief.metalnessMap;
                activePlanetMat.normalScale.set(
                  isGasGiant ? 0.28 : data.id === 'comet67p' ? 1.25 : 0.85,
                  isGasGiant ? 0.28 : data.id === 'comet67p' ? 1.25 : 0.85,
                );
                this.disposables.push(
                  relief.normalMap,
                  relief.roughnessMap,
                  relief.metalnessMap,
                );
                activePlanetMat.needsUpdate = true;
                if (this.focusedBodyId === data.id && !this.focusedMoonId) {
                  this.schedule8KUpgrade(data.id, null);
                }
              });
            } else if (this.focusedBodyId === data.id && !this.focusedMoonId) {
              this.schedule8KUpgrade(data.id, null);
            }
          },
          undefined,
          fillPlaceholdersWithProcedural,
        );

        if (data.textures.bumpMap) {
          loader.load(
            data.textures.bumpMap,
            (tex) => {
              if (this.disposed) {
                tex.dispose();
                return;
              }
              if (tex.image instanceof HTMLImageElement) {
                const rt = this.bodies.get(data.id);
                if (rt) rt.bumpImage = tex.image;
              }
              if (!data.textures.normalMap && tex.image) {
                // Convert NASA elevation/bump heightmap into a true tangent-space normalMap (computed in a Web Worker)
                const reliefPromise = deriveSurfaceReliefMapsAsync(tex.image as HTMLImageElement, {
                  normalStrength: data.id === 'mercury' || data.id === 'mars' ? 4.4 : 2.2,
                  anisotropy: maxAnisotropy,
                  isGasGiant,
                  isIcy: isIcyWorld,
                });
                // Pixels were already read synchronously inside the call above
                tex.dispose();
                void reliefPromise.then((relief) => {
                  if (this.disposed) {
                    relief.normalMap.dispose();
                    relief.roughnessMap.dispose();
                    relief.metalnessMap.dispose();
                    return;
                  }
                  activePlanetMat.normalMap = relief.normalMap;
                  activeBasePbr.normalMap = relief.normalMap;
                  activePlanetMat.normalScale.set(
                    data.id === 'venus' ? 0.42 : 0.92,
                    data.id === 'venus' ? 0.42 : 0.92,
                  );
                  if (!data.textures.specularMap) {
                    activePlanetMat.roughnessMap = relief.roughnessMap;
                    activeBasePbr.roughnessMap = relief.roughnessMap;
                  } else {
                    relief.roughnessMap.dispose();
                  }
                  activePlanetMat.metalnessMap = relief.metalnessMap;
                  activeBasePbr.metalnessMap = relief.metalnessMap;
                  activePlanetMat.bumpMap = null;
                  this.disposables.push(
                    relief.normalMap,
                    relief.roughnessMap,
                    relief.metalnessMap,
                  );
                  activePlanetMat.needsUpdate = true;
                  if (this.focusedBodyId === data.id && !this.focusedMoonId) {
                    this.schedule8KUpgrade(data.id, null);
                  }
                });
                return;
              } else {
                tex.wrapS = THREE.RepeatWrapping;
                tex.anisotropy = maxAnisotropy;
                activePlanetMat.bumpMap = tex;
                activePlanetMat.bumpScale = 0.024;
                this.disposables.push(tex);
              }
              activePlanetMat.needsUpdate = true;
              if (this.focusedBodyId === data.id && !this.focusedMoonId) {
                this.schedule8KUpgrade(data.id, null);
              }
            },
            undefined,
            fillPlaceholdersWithProcedural,
          );
        }

        if (data.textures.normalMap) {
          loader.load(
            data.textures.normalMap,
            (tex) => {
              if (this.disposed) {
                tex.dispose();
                return;
              }
              tex.wrapS = THREE.RepeatWrapping;
              tex.anisotropy = maxAnisotropy;
              if (tex.image instanceof HTMLImageElement) {
                const rt = this.bodies.get(data.id);
                if (rt) rt.bumpImage = tex.image;
              }
              activePlanetMat.normalMap = tex;
              activeBasePbr.normalMap = tex;
              activePlanetMat.normalScale.set(0.82, 0.82);
              activePlanetMat.bumpMap = null;
              activePlanetMat.needsUpdate = true;
              this.disposables.push(tex);
            },
            undefined,
            fillPlaceholdersWithProcedural,
          );
        }

        if (data.textures.specularMap) {
          loader.load(
            data.textures.specularMap,
            (tex) => {
              if (this.disposed) {
                tex.dispose();
                return;
              }
              const img = tex.image as HTMLImageElement;
              if (img && img.width && img.height) {
                const rt = this.bodies.get(data.id);
                if (rt) rt.specImage = img;
                const c = document.createElement('canvas');
                c.width = Math.min(2048, img.width);
                c.height = Math.min(1024, img.height);
                // CPU-backed: its pixels are read right away (no GPU readback stall)
                const ctx = c.getContext('2d', { willReadFrequently: true });
                if (ctx) {
                  ctx.drawImage(img, 0, 0, c.width, c.height);
                  const idata = ctx.getImageData(0, 0, c.width, c.height);
                  const d = idata.data;
                  for (let i = 0; i < d.length; i += 4) {
                    const spec = d[i] / 255;
                    // Matte continents (0.94 roughness), specular sunlit oceans (0.20 roughness)
                    const rough = Math.round((0.94 - spec * 0.74) * 255);
                    d[i] = rough;
                    d[i + 1] = rough;
                    d[i + 2] = rough;
                  }
                  ctx.putImageData(idata, 0, 0);
                  const roughTex = new THREE.CanvasTexture(c);
                  roughTex.wrapS = THREE.RepeatWrapping;
                  roughTex.anisotropy = maxAnisotropy;
                  activePlanetMat.roughness = 1.0;
                  activePlanetMat.roughnessMap = roughTex;
                  activeBasePbr.roughnessMap = roughTex;
                  activePlanetMat.needsUpdate = true;
                  this.disposables.push(roughTex);
                }
              }
              tex.dispose();
              if (this.focusedBodyId === data.id && !this.focusedMoonId) {
                this.schedule8KUpgrade(data.id, null);
              }
            },
            undefined,
            fillPlaceholdersWithProcedural,
          );
        }
      }

      // Day-side atmospheric Fresnel shell
      let atmosphereMesh: THREE.Mesh | undefined;
      if (data.atmosphereColor && data.atmosphereIntensity) {
        // En los gigantes gaseosos el borde real es una línea fina: cáscara más ceñida (1,5 % en vez
        // de 4,5 %), más tenue y achatada como el planeta (antes sobresalía en los polos como un aro).
        const flattening = POLAR_FLATTENING[data.id];
        const atmoGeo = new THREE.SphereGeometry(
          data.visualRadius * (flattening ? 1.015 : 1.045),
          48,
          36,
        );
        const atmoMat = createAtmosphereShaderMaterial(
          data.atmosphereColor,
          data.atmosphereIntensity * (flattening ? 0.55 : 1),
        );
        if (OUTER_ATMOSPHERE_BODIES.has(data.id)) {
          this.outerAtmosphereMats.push({ material: atmoMat, baseIntensity: data.atmosphereIntensity });
        }
        atmosphereMesh = new THREE.Mesh(atmoGeo, atmoMat);
        if (flattening) atmosphereMesh.scale.set(1, flattening, 1);
        tiltGroup.add(atmosphereMesh);
        this.disposables.push(atmoGeo, atmoMat);
      }

      // Independent Cloud Decks for Earth and Jupiter
      let cloudMesh: THREE.Mesh | undefined;
      if (data.id === 'earth') {
        const cloudGeo = new THREE.SphereGeometry(
          data.visualRadius * 1.018,
          48,
          36,
        );
        // Cloud deck stays hidden until the real NASA cloud texture arrives; the procedural
        // cloud texture is generated only if that load fails.
        const cloudMat = new THREE.MeshStandardMaterial({
          map: whiteColor,
          transparent: true,
          opacity: 0.88,
          depthWrite: false,
          roughness: 0.92,
        });
        const earthCloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
        cloudMesh = earthCloudMesh;
        earthCloudMesh.visible = false;
        if (!this.isSoftwareGl) earthCloudMesh.receiveShadow = true;
        tiltGroup.add(earthCloudMesh);
        this.disposables.push(cloudGeo, cloudMat);

        const useProceduralClouds = () => {
          if (this.disposed) return;
          const fallbackClouds = createProceduralEarthClouds(maxAnisotropy);
          this.disposables.push(fallbackClouds);
          cloudMat.map = fallbackClouds;
          cloudMat.needsUpdate = true;
          earthCloudMesh.visible = true;
        };

        if (data.textures.cloudsMap) {
          loader.load(
            data.textures.cloudsMap,
            (tex) => {
              if (this.disposed) {
                tex.dispose();
                return;
              }
              tex.colorSpace = THREE.SRGBColorSpace;
              tex.wrapS = THREE.RepeatWrapping;
              tex.anisotropy = maxAnisotropy;
              cloudMat.map = tex;
              cloudMat.needsUpdate = true;
              earthCloudMesh.visible = true;
              this.disposables.push(tex);
            },
            undefined,
            useProceduralClouds,
          );
        } else {
          useProceduralClouds();
        }

        // Earth Night City Lights on Dark Hemisphere (immediate offline lights + optional HD upgrade)
        const lightsGeo = new THREE.SphereGeometry(
          data.visualRadius * 1.003,
          48,
          36,
        );
        const lightsMat = new THREE.ShaderMaterial({
          uniforms: {
            // Black = no city lights until the real NASA night-lights texture loads
            uLightsMap: { value: blackColor as THREE.Texture },
            uExposureComp: { value: CITY_LIGHTS_SCREEN_GAIN },
          },
          // The renderer uses a logarithmic depth buffer: without these chunks this shell wrote
          // depth on a different scale than the Earth below it and was always hidden.
          vertexShader: `
            #include <common>
            #include <logdepthbuf_pars_vertex>
            varying vec2 vUv;
            varying vec3 vWorldNormal;
            varying vec3 vWorldPos;
            void main() {
              vUv = uv;
              vec4 wp = modelMatrix * vec4(position, 1.0);
              vWorldPos = wp.xyz;
              vWorldNormal = normalize(mat3(modelMatrix) * normal);
              gl_Position = projectionMatrix * viewMatrix * wp;
              #include <logdepthbuf_vertex>
            }
          `,
          fragmentShader: `
            #include <logdepthbuf_pars_fragment>
            uniform sampler2D uLightsMap;
            uniform float uExposureComp;
            varying vec2 vUv;
            varying vec3 vWorldNormal;
            varying vec3 vWorldPos;
            void main() {
              #include <logdepthbuf_fragment>
              vec3 sunDir = normalize(-vWorldPos);
              float sunDot = dot(normalize(vWorldNormal), sunDir);
              // Lights come on through civil twilight and are fully on past the terminator
              float nightMask = smoothstep(0.06, -0.16, sunDot);
              vec3 col = texture2D(uLightsMap, vUv).rgb;
              // Linear response (small towns stay visible), minus a floor that hides compression noise
              col = max(col - vec3(0.012), vec3(0.0));
              // Sodium / LED mix seen from orbit (warm amber, NASA Black Marble)
              vec3 lit = col * vec3(1.18, 0.96, 0.66) * uExposureComp * nightMask;
              gl_FragColor = vec4(lit, 1.0);
            }
          `,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        this.cityLightsMat = lightsMat;
        const lightsMesh = new THREE.Mesh(lightsGeo, lightsMat);
        mesh.add(lightsMesh);
        this.disposables.push(lightsGeo, lightsMat);

        loader.load(
          '/textures/planets/earth_lights_2048.png',
          (lightsTex) => {
            if (this.disposed) {
              lightsTex.dispose();
              return;
            }
            lightsTex.colorSpace = THREE.SRGBColorSpace;
            lightsTex.wrapS = THREE.RepeatWrapping;
            lightsTex.anisotropy = maxAnisotropy;
            lightsMat.uniforms.uLightsMap.value = lightsTex;
            this.disposables.push(lightsTex);
          },
          undefined,
          () => {
            if (this.disposed) return;
            const offlineLightsTex = createProceduralEarthNightLights(maxAnisotropy);
            this.disposables.push(offlineLightsTex);
            lightsMat.uniforms.uLightsMap.value = offlineLightsTex;
          },
        );
      } else if (data.id === 'jupiter') {
        const jupCloudGeo = new THREE.SphereGeometry(
          data.visualRadius * 1.014,
          48,
          36,
        );
        const jupCloudTex = createProceduralJupiterClouds(maxAnisotropy);
        const jupCloudMat = new THREE.MeshStandardMaterial({
          map: jupCloudTex,
          transparent: true,
          opacity: 0.56,
          depthWrite: false,
          roughness: 0.85,
        });
        cloudMesh = new THREE.Mesh(jupCloudGeo, jupCloudMat);
        // Achatada como el planeta: si no, asomaba sobre los polos como un casquete claro
        cloudMesh.scale.set(1, POLAR_FLATTENING.jupiter ?? 1, 1);
        if (!this.isSoftwareGl) cloudMesh.receiveShadow = true;
        tiltGroup.add(cloudMesh);
        this.disposables.push(jupCloudGeo, jupCloudTex, jupCloudMat);
      }

      // Planetary Ring Systems (Saturn & Uranus)
      let ringMesh: THREE.Mesh | undefined;
      if (data.rings) {
        const innerR = data.visualRadius * data.rings.innerMultiplier;
        const outerR = data.visualRadius * data.rings.outerMultiplier;
        const ringGeo = createRadialRingGeometry(innerR, outerR, 180, 6);

        const proceduralRingTex = data.rings.hasCassiniDetail
          ? createDetailedSaturnRingTexture(maxAnisotropy)
          : createUranusRingTexture(maxAnisotropy);

        const ringMat = new THREE.MeshStandardMaterial({
          map: proceduralRingTex,
          transparent: true,
          opacity: data.rings.opacity,
          side: THREE.DoubleSide,
          shadowSide: THREE.DoubleSide,
          roughness: 0.78,
          metalness: 0.04,
          depthWrite: false,
          alphaTest: 0.015,
        });

        ringMesh = new THREE.Mesh(ringGeo, ringMat);
        let ringDepthMat: THREE.MeshDepthMaterial | undefined;
        if (!this.isSoftwareGl) {
          ringMesh.castShadow = true;
          ringMesh.receiveShadow = true;
          ringDepthMat = new THREE.MeshDepthMaterial({
            depthPacking: THREE.RGBADepthPacking,
            map: proceduralRingTex,
            alphaTest: 0.22,
            side: THREE.DoubleSide,
          });
          ringMesh.customDepthMaterial = ringDepthMat;
          this.disposables.push(ringDepthMat);
        }
        tiltGroup.add(ringMesh);
        this.disposables.push(ringGeo, proceduralRingTex, ringMat);

        if (data.rings.hasCassiniDetail && data.textures.ringColorMap) {
          loader.load(
            data.textures.ringColorMap,
            (colorTex) => {
              if (this.disposed) {
                colorTex.dispose();
                return;
              }
              const img = colorTex.image as HTMLImageElement;
              const baseCanvas = proceduralRingTex.image as HTMLCanvasElement;
              if (img && baseCanvas) {
                const merged = document.createElement('canvas');
                merged.width = baseCanvas.width;
                merged.height = baseCanvas.height;
                const ctx = merged.getContext('2d', { willReadFrequently: true });
                if (ctx) {
                  ctx.drawImage(baseCanvas, 0, 0);
                  const alphaData = ctx.getImageData(
                    0,
                    0,
                    merged.width,
                    merged.height,
                  );
                  const temp = document.createElement('canvas');
                  temp.width = merged.width;
                  temp.height = merged.height;
                  const tctx = temp.getContext('2d', { willReadFrequently: true })!;
                  tctx.drawImage(img, 0, 0, merged.width, merged.height);
                  const colorData = tctx.getImageData(
                    0,
                    0,
                    merged.width,
                    merged.height,
                  );

                  for (let i = 0; i < alphaData.data.length; i += 4) {
                    alphaData.data[i] = Math.round(
                      colorData.data[i] * 0.78 + alphaData.data[i] * 0.22,
                    );
                    alphaData.data[i + 1] = Math.round(
                      colorData.data[i + 1] * 0.78 +
                        alphaData.data[i + 1] * 0.22,
                    );
                    alphaData.data[i + 2] = Math.round(
                      colorData.data[i + 2] * 0.78 +
                        alphaData.data[i + 2] * 0.22,
                    );
                  }
                  ctx.putImageData(alphaData, 0, 0);
                  const combinedTex = new THREE.CanvasTexture(merged);
                  combinedTex.colorSpace = THREE.SRGBColorSpace;
                  combinedTex.wrapS = THREE.ClampToEdgeWrapping;
                  combinedTex.wrapT = THREE.ClampToEdgeWrapping;
                  combinedTex.anisotropy = maxAnisotropy;
                  ringMat.map = combinedTex;
                  ringMat.needsUpdate = true;
                  if (ringDepthMat) {
                    ringDepthMat.map = combinedTex;
                    ringDepthMat.needsUpdate = true;
                  }
                  this.disposables.push(combinedTex);
                }
              }
              colorTex.dispose();
            },
            undefined,
            () => {},
          );
        }
      }

      // Animated Polar Auroras for Jupiter & Saturn
      if (data.id === 'jupiter' || data.id === 'saturn') {
        const auroraColor =
          data.id === 'jupiter' ? new THREE.Color(0x38bdf8) : new THREE.Color(0xa78bfa);
        for (const poleSign of [-1, 1]) {
          // Óvalo auroral real: anillo fino hacia los 75° de latitud, pegado a la superficie achatada
          // (antes era un casquete ancho a 0,94 radios, flotando por encima del polo).
          const aurLat = THREE.MathUtils.degToRad(75);
          const aurRing = data.visualRadius * Math.cos(aurLat);
          const aurGeo = new THREE.CylinderGeometry(
            aurRing * 1.06,
            aurRing,
            data.visualRadius * 0.06,
            48,
            1,
            true,
          );
          const aurMat = new THREE.ShaderMaterial({
            uniforms: {
              uTime: { value: 0 },
              uColor: { value: auroraColor },
              // Cancels the Sun-distance auto-exposure (see updateSelfEmissiveExposure)
              uExposureComp: { value: 1 },
            },
            vertexShader: `
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform float uTime;
              uniform vec3 uColor;
              uniform float uExposureComp;
              varying vec2 vUv;
              void main() {
                float curtain = 0.5 + 0.5 * sin(vUv.x * 25.132 + uTime * 2.1) * cos(vUv.x * 12.566 - uTime * 1.4);
                float vert = sin(vUv.y * 3.14159);
                // Más tenue: casi toda la luz de estas auroras es ultravioleta (invisible al ojo)
                float alpha = vert * (0.08 + 0.27 * curtain);
                gl_FragColor = vec4(uColor * (0.9 + curtain * 0.6) * uExposureComp, alpha);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
          });
          const aurMesh = new THREE.Mesh(aurGeo, aurMat);
          aurMesh.position.y =
            poleSign * data.visualRadius * Math.sin(aurLat) * (POLAR_FLATTENING[data.id] ?? 1) * 1.01;
          if (poleSign < 0) aurMesh.rotation.x = Math.PI;
          tiltGroup.add(aurMesh);
          this.auroraMats.push(aurMat);
          this.disposables.push(aurGeo, aurMat);
        }
      }

      // Moon Systems
      const moonParent = data.id === 'uranus' ? tiltGroup : anchorGroup;
      const moons: MoonRuntime[] = [];

      for (const mData of data.moons) {
        const pivotGroup = new THREE.Group();
        pivotGroup.rotation.z = THREE.MathUtils.degToRad(mData.inclinationDeg);
        moonParent.add(pivotGroup);

        const moonGeo = mData.irregular
          ? createIrregularMoonGeometry(mData.radius)
          : new THREE.SphereGeometry(mData.radius, 36, 28);
        // Moons with a real NASA texture start on 1×1 placeholders; the procedural set is built
        // up-front only for moons without one (e.g. Proteus) or lazily if a real load fails.
        let moonProceduralSet: MoonTextureSet | null = null;
        const getMoonProceduralSet = (): MoonTextureSet => {
          if (!moonProceduralSet) {
            moonProceduralSet = createProceduralMoonTextureSet(mData.style, maxAnisotropy);
            this.disposables.push(
              moonProceduralSet.map,
              moonProceduralSet.normalMap,
              moonProceduralSet.roughnessMap,
              moonProceduralSet.metalnessMap,
            );
          }
          return moonProceduralSet;
        };
        const moonPlaceholderMap = mData.textureUrl
          ? createSolidTexture([140, 140, 140], true)
          : null;
        if (moonPlaceholderMap) this.disposables.push(moonPlaceholderMap);
        const moonSet: {
          map: THREE.Texture;
          normalMap: THREE.Texture;
          roughnessMap: THREE.Texture;
          metalnessMap: THREE.Texture;
        } = moonPlaceholderMap
          ? {
              map: moonPlaceholderMap,
              normalMap: flatNormal,
              roughnessMap: fullRough,
              metalnessMap: zeroMetal,
            }
          : getMoonProceduralSet();
        const isIcyMoon =
          mData.style === 'enceladus' ||
          mData.style === 'europa' ||
          mData.style === 'triton';
        const moonMetalness = isIcyMoon ? 0.0 : 0.05;
        const moonMat = new THREE.MeshPhysicalMaterial({
          map: moonSet.map,
          normalMap: moonSet.normalMap,
          normalScale: new THREE.Vector2(0.76, 0.76),
          roughness: 1.0,
          roughnessMap: moonSet.roughnessMap,
          metalness: moonMetalness,
          metalnessMap: moonSet.metalnessMap,
          specularIntensity: isIcyMoon ? 0.52 : 0.24,
          clearcoat: 0.0,
          envMapIntensity: 0.0,
        });
        const moonBasePbr: BasePbrSnapshot = {
          map: moonSet.map,
          normalMap: moonSet.normalMap,
          roughnessMap: moonSet.roughnessMap,
          metalnessMap: moonSet.metalnessMap,
          metalness: moonMetalness,
        };

        const moonMesh = new THREE.Mesh(moonGeo, moonMat);
        if (!this.isSoftwareGl) {
          moonMesh.castShadow = true;
          moonMesh.receiveShadow = true;
        }
        pivotGroup.add(moonMesh);
        this.disposables.push(moonGeo, moonMat);

        const fillMoonPlaceholders = () => {
          if (this.disposed || !moonPlaceholderMap) return;
          const p = getMoonProceduralSet();
          const slots = [
            ['map', moonPlaceholderMap, p.map],
            ['normalMap', flatNormal, p.normalMap],
            ['roughnessMap', fullRough, p.roughnessMap],
            ['metalnessMap', zeroMetal, p.metalnessMap],
          ] as const;
          for (const [key, placeholder, procedural] of slots) {
            if (moonMat[key] === placeholder) moonMat[key] = procedural;
            if (moonBasePbr[key] === placeholder) moonBasePbr[key] = procedural;
          }
          moonMat.needsUpdate = true;
        };

        if (mData.atmosphereColor) {
          const mAtmoGeo = new THREE.SphereGeometry(mData.radius * 1.07, 24, 18);
          const mAtmoMat = createAtmosphereShaderMaterial(
            mData.atmosphereColor,
            0.5,
          );
          const mAtmo = new THREE.Mesh(mAtmoGeo, mAtmoMat);
          moonMesh.add(mAtmo);
          this.disposables.push(mAtmoGeo, mAtmoMat);
        }

        // Enceladus: the south-polar geysers ("tiger stripes") that Cassini flew through. Faint
        // jets of ice grains, drawn as soft dots that thin out as they rise. Io gets no effect:
        // its volcanic plumes reach only ~1/6 of its radius and are not visible at this scale.
        if (mData.id === 'enceladus') {
          const jets = [
            new THREE.Vector3(0.1, -1, 0.05),
            new THREE.Vector3(-0.12, -1, 0.09),
            new THREE.Vector3(0.05, -1, -0.15),
            new THREE.Vector3(-0.07, -1, -0.05),
          ].map((v) => v.normalize());
          const count = 150;
          const pArr = new Float32Array(count * 3);
          const pCol = new Float32Array(count * 3);
          const dirs = new Float32Array(count * 3);
          const age = new Float32Array(count);
          const d = new THREE.Vector3();
          for (let pi = 0; pi < count; pi++) {
            const jet = jets[pi % jets.length];
            d.set(
              jet.x + (Math.random() - 0.5) * 0.3,
              jet.y,
              jet.z + (Math.random() - 0.5) * 0.3,
            ).normalize();
            dirs[pi * 3] = d.x;
            dirs[pi * 3 + 1] = d.y;
            dirs[pi * 3 + 2] = d.z;
            age[pi] = Math.random();
          }
          const pGeo = new THREE.BufferGeometry();
          pGeo.setAttribute('position', new THREE.BufferAttribute(pArr, 3));
          pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
          const pMat = new THREE.PointsMaterial({
            map: getSoftDotTexture(),
            color: new THREE.Color(0.72, 0.86, 1.0),
            size: mData.radius * 0.5,
            vertexColors: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          });
          const plumePts = new THREE.Points(pGeo, pMat);
          plumePts.frustumCulled = false;
          moonMesh.add(plumePts);
          this.moonPlumes.push({
            points: plumePts,
            radius: mData.radius,
            dirs,
            age,
            speed: 0.22,
            material: pMat,
            baseColor: pMat.color.clone(),
          });
          this.disposables.push(pGeo, pMat);
        }

        if (mData.textureUrl) {
          loader.load(
            mData.textureUrl,
            async (loadedTex) => {
              if (this.disposed) {
                loadedTex.dispose();
                return;
              }
              // Mapas incompletos (p. ej. Tritón: Voyager 2 solo fotografió ~1/5 de su superficie y el
              // resto del mapa es negro): lo no fotografiado se rellena con la textura procedural
              // del mismo tipo de luna; la foto real se conserva tal cual donde existe.
              let tex = loadedTex;
              if (tex.image instanceof HTMLImageElement) {
                const filled = await fillUnmappedMoonAreas(
                  tex.image,
                  () => getMoonProceduralSet().map.image as CanvasImageSource,
                );
                if (this.disposed) {
                  loadedTex.dispose();
                  return;
                }
                if (filled) {
                  loadedTex.dispose();
                  tex = new THREE.Texture(filled);
                  tex.needsUpdate = true;
                }
              }
              tex.colorSpace = THREE.SRGBColorSpace;
              tex.wrapS = THREE.RepeatWrapping;
              tex.anisotropy = maxAnisotropy;
              moonMat.map = tex;
              moonBasePbr.map = tex;
              if (tex.image instanceof HTMLImageElement) {
                const mrt = this.moonsById.get(mData.id);
                if (mrt) mrt.albedoImage = tex.image;
              }
              moonMat.needsUpdate = true;
              this.disposables.push(tex);
              if (!mData.bumpUrl && tex.image) {
                void deriveSurfaceReliefMapsAsync(tex.image as HTMLImageElement, {
                  normalStrength: 3.4,
                  anisotropy: maxAnisotropy,
                  isIcy: isIcyMoon,
                  maxWidth: 1024,
                }).then((relief) => {
                  if (this.disposed) {
                    relief.normalMap.dispose();
                    relief.roughnessMap.dispose();
                    relief.metalnessMap.dispose();
                    return;
                  }
                  moonMat.normalMap = relief.normalMap;
                  moonMat.roughnessMap = relief.roughnessMap;
                  moonMat.metalnessMap = relief.metalnessMap;
                  moonBasePbr.normalMap = relief.normalMap;
                  moonBasePbr.roughnessMap = relief.roughnessMap;
                  moonBasePbr.metalnessMap = relief.metalnessMap;
                  moonMat.normalScale.set(0.86, 0.86);
                  this.disposables.push(
                    relief.normalMap,
                    relief.roughnessMap,
                    relief.metalnessMap,
                  );
                  moonMat.needsUpdate = true;
                  if (this.focusedMoonId === mData.id) {
                    this.schedule8KUpgrade(data.id, mData.id);
                  }
                });
              } else if (this.focusedMoonId === mData.id) {
                this.schedule8KUpgrade(data.id, mData.id);
              }
            },
            undefined,
            fillMoonPlaceholders,
          );
        }

        if (mData.bumpUrl) {
          loader.load(
            mData.bumpUrl,
            (tex) => {
              if (this.disposed) {
                tex.dispose();
                return;
              }
              if (tex.image instanceof HTMLImageElement) {
                const mrt = this.moonsById.get(mData.id);
                if (mrt) mrt.bumpImage = tex.image;
                const reliefPromise = deriveSurfaceReliefMapsAsync(tex.image as HTMLImageElement, {
                  normalStrength: 4.2,
                  anisotropy: maxAnisotropy,
                  isIcy: isIcyMoon,
                  maxWidth: 1024,
                });
                // Pixels were already read synchronously inside the call above
                tex.dispose();
                void reliefPromise.then((relief) => {
                  if (this.disposed) {
                    relief.normalMap.dispose();
                    relief.roughnessMap.dispose();
                    relief.metalnessMap.dispose();
                    return;
                  }
                  moonMat.normalMap = relief.normalMap;
                  moonMat.roughnessMap = relief.roughnessMap;
                  moonMat.metalnessMap = relief.metalnessMap;
                  moonBasePbr.normalMap = relief.normalMap;
                  moonBasePbr.roughnessMap = relief.roughnessMap;
                  moonBasePbr.metalnessMap = relief.metalnessMap;
                  moonMat.normalScale.set(0.95, 0.95);
                  moonMat.bumpMap = null;
                  this.disposables.push(
                    relief.normalMap,
                    relief.roughnessMap,
                    relief.metalnessMap,
                  );
                  moonMat.needsUpdate = true;
                  if (this.focusedMoonId === mData.id) {
                    this.schedule8KUpgrade(data.id, mData.id);
                  }
                });
                return;
              } else {
                tex.wrapS = THREE.RepeatWrapping;
                tex.anisotropy = maxAnisotropy;
                moonMat.bumpMap = tex;
                moonMat.bumpScale = 0.032;
                this.disposables.push(tex);
              }
              moonMat.needsUpdate = true;
              if (this.focusedMoonId === mData.id) {
                this.schedule8KUpgrade(data.id, mData.id);
              }
            },
            undefined,
            fillMoonPlaceholders,
          );
        }

        const mHitGeo = new THREE.SphereGeometry(
          Math.max(mData.radius * 2.2, 0.55),
          12,
          10,
        );
        const mHitMat = new THREE.MeshBasicMaterial({ visible: false });
        const mHitProxy = new THREE.Mesh(mHitGeo, mHitMat);
        mHitProxy.userData.bodyId = data.id;
        mHitProxy.userData.moonId = mData.id;
        moonMesh.add(mHitProxy);
        this.hitProxies.push(mHitProxy);
        this.disposables.push(mHitGeo, mHitMat);

        const moonRuntime: MoonRuntime = {
          data: mData,
          parentId: data.id,
          pivotGroup,
          mesh: moonMesh,
          hitProxy: mHitProxy,
          material: moonMat,
          basePbr: moonBasePbr,
          angle: THREE.MathUtils.degToRad(mData.j2000MeanLonDeg),
          lastWorldPos: new THREE.Vector3(),
          currentWorldPos: new THREE.Vector3(),
        };
        moons.push(moonRuntime);
        this.moonsById.set(mData.id, moonRuntime);
      }

      // Generous invisible planet hit-proxy for effortless clicking across 1000-unit AU distances
      const hitRadius = Math.max(data.visualRadius * 1.6, 18.0);
      const hitGeo = new THREE.SphereGeometry(hitRadius, 16, 12);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitProxy = new THREE.Mesh(hitGeo, hitMat);
      hitProxy.userData.bodyId = data.id;
      anchorGroup.add(hitProxy);
      this.hitProxies.push(hitProxy);
      this.disposables.push(hitGeo, hitMat);

      const runtime: PlanetRuntime = {
        data,
        inclinationGroup,
        anchorGroup,
        tiltGroup,
        mesh,
        hitProxy,
        material: planetMat,
        basePbr,
        cloudMesh,
        ringMesh,
        atmosphereMesh,
        orbitLine,
        moons,
        lastWorldPos: new THREE.Vector3(),
        currentWorldPos: new THREE.Vector3(),
      };

      this.bodies.set(data.id, runtime);
    }
  }

  /**
   * Places discrete scientific surface beacons at exact spherical (lat, lon) coordinates
   * directly inside each host planet/moon/comet's rotating mesh.
   */
  private buildMissionBeacons(): void {
    for (const mission of ABANDONED_MISSIONS) {
      let hostMesh: THREE.Mesh | undefined;
      let hostRadius = 1;
      let hostShape: [number, number, number] | undefined;

      if (mission.targetMoonId) {
        const moon = this.moonsById.get(mission.targetMoonId);
        if (moon) {
          hostMesh = moon.mesh;
          hostRadius = moon.data.radius;
        }
      } else {
        const planet = this.bodies.get(mission.targetBodyId);
        if (planet) {
          hostMesh = planet.mesh;
          hostRadius = planet.data.visualRadius;
          hostShape = planet.data.shapeScale;
        }
      }

      if (!hostMesh) continue;

      const orbitalAltitude =
        mission.missionRole === 'orbital' ? 1.16 : 1.006;
      const localPos = latLonToLocalVector3(
        mission.latDeg,
        mission.lonDeg,
        hostRadius * orbitalAltitude,
      );
      const localNormal = localPos.clone().normalize();
      if (hostShape) {
        // Project onto the tri-axial ellipsoid: scaled sphere point + true ellipsoid normal
        const [ax, ay, az] = hostShape;
        localNormal.set(
          localNormal.x / ax,
          localNormal.y / ay,
          localNormal.z / az,
        ).normalize();
        localPos.set(localPos.x * ax, localPos.y * ay, localPos.z * az);
      }

      const group = new THREE.Group();
      group.position.copy(localPos);
      group.quaternion.setFromUnitVectors(_upVec, localNormal);
      group.visible = false; // Discrete: revealed cleanly on host body / mission focus
      hostMesh.add(group);

      const dotSize = Math.max(0.018, hostRadius * 0.018);
      const dotGeo = new THREE.SphereGeometry(dotSize, 12, 10);
      const dotMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(mission.accentColor),
        toneMapped: false,
      });
      const dotMesh = new THREE.Mesh(dotGeo, dotMat);
      dotMesh.position.y = dotSize * 0.5;
      group.add(dotMesh);

      const ringGeo = new THREE.RingGeometry(dotSize * 2.0, dotSize * 2.8, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(mission.accentColor),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        toneMapped: false,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = dotSize * 0.2;
      group.add(ringMesh);

      const beaconHitGeo = new THREE.SphereGeometry(dotSize * 4.5, 10, 8);
      const beaconHitMat = new THREE.MeshBasicMaterial({ visible: false });
      const beaconHitProxy = new THREE.Mesh(beaconHitGeo, beaconHitMat);
      beaconHitProxy.userData.missionId = mission.id;
      group.add(beaconHitProxy);
      this.missionHitProxies.push(beaconHitProxy);

      this.disposables.push(
        dotGeo,
        dotMat,
        ringGeo,
        ringMat,
        beaconHitGeo,
        beaconHitMat,
      );

      const runtime: MissionBeaconRuntime = {
        mission,
        group,
        ringMat,
        dotMat,
        hostRadius,
        lastWorldPos: new THREE.Vector3(),
        currentWorldPos: new THREE.Vector3(),
        worldNormal: new THREE.Vector3(),
      };
      this.beaconsByMissionId.set(mission.id, runtime);
    }
  }

  /**
   * Adds multi-part physical orbiting spacecraft markers (ISS, Hubble, LRO, MRO, Juno, Cassini) around host worlds in Space Mode.
   */
  private buildOrbitingSpacecraftMarkers(): void {
    const specs: Array<{
      missionId: string;
      bodyId: CelestialBodyId;
      moonId?: string;
      orbitR: number;
      inclination: number;
      speed: number;
      color: number;
      radialWings?: boolean;
    }> = [
      // ISS: no gira en una órbita ficticia; cuelga de su marca, que sigue la posición real (updateIssBeacon)
      { missionId: 'iss', bodyId: 'earth', orbitR: 0, inclination: 0, speed: 0, color: 0xf59e0b },
      { missionId: 'hubble', bodyId: 'earth', orbitR: 1.15, inclination: 0.5, speed: 0.44, color: 0x60a5fa },
      { missionId: 'lro', bodyId: 'earth', moonId: 'luna', orbitR: 0.34, inclination: 1.45, speed: 0.65, color: 0x93c5fd },
      { missionId: 'mro', bodyId: 'mars', orbitR: 0.72, inclination: 1.52, speed: 0.52, color: 0xf87171 },
      { missionId: 'juno', bodyId: 'jupiter', orbitR: 11.4, inclination: 1.55, speed: 0.38, color: 0x38bdf8, radialWings: true },
      { missionId: 'cassini', bodyId: 'saturn', orbitR: 13.8, inclination: 1.05, speed: 0.32, color: 0xfbbf24 },
      // Dawn: unpowered, stable orbit around Ceres since 2018 (drifts slowly, no attitude control)
      { missionId: 'dawn', bodyId: 'ceres', orbitR: 0.42, inclination: 1.45, speed: 0.22, color: 0xf472b6 },
    ];

    for (let idx = 0; idx < specs.length; idx++) {
      const s = specs[idx];
      const parentObj =
        s.missionId === 'iss'
          ? this.beaconsByMissionId.get('iss')?.group
          : s.moonId
            ? this.moonsById.get(s.moonId)?.mesh
            : this.bodies.get(s.bodyId)?.anchorGroup;
      if (!parentObj) continue;

      const scaleFactor = s.orbitR > 8 ? 2.4 : 1.0;

      const pivot = new THREE.Group();
      pivot.visible = false; // Strictly hidden when inspecting pure planets/moons; shown only on specific mission selection
      pivot.rotation.z = s.inclination;
      parentObj.add(pivot);

      const satGroup = new THREE.Group();
      // La ISS va justo encima de su marca (el «arriba» local apunta hacia fuera de la Tierra)
      if (s.missionId === 'iss') satGroup.position.set(0, 0.05, 0);
      else satGroup.position.set(s.orbitR, 0, 0);
      satGroup.scale.setScalar(scaleFactor);
      pivot.add(satGroup);

      const busGeo = new THREE.BoxGeometry(0.032, 0.022, 0.056);
      const wingGeo = new THREE.BoxGeometry(0.14, 0.005, 0.024);
      const dishGeo = new THREE.CylinderGeometry(0.02, 0.005, 0.012, 12);
      const busMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, toneMapped: false });
      const wingMat = new THREE.MeshBasicMaterial({ color: s.color, toneMapped: false });
      const ledMat = new THREE.MeshBasicMaterial({
        color: s.color,
        transparent: true,
        opacity: 1,
        toneMapped: false,
      });
      const ledGeo = new THREE.SphereGeometry(0.014, 8, 6);

      const core = new THREE.Mesh(busGeo, busMat);
      const dish = new THREE.Mesh(dishGeo, busMat);
      dish.position.y = 0.016;
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.y = 0.028;
      satGroup.add(core, dish, led);

      if (s.radialWings) {
        for (let w = 0; w < 3; w++) {
          const wg = new THREE.Mesh(wingGeo, wingMat);
          wg.rotation.y = (w * Math.PI * 2) / 3;
          wg.position.set(Math.cos(wg.rotation.y) * 0.075, 0, -Math.sin(wg.rotation.y) * 0.075);
          satGroup.add(wg);
        }
      } else {
        const wings = new THREE.Mesh(wingGeo, wingMat);
        satGroup.add(wings);
      }

      const hitGeo = new THREE.SphereGeometry(0.095, 8, 8);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hit = new THREE.Mesh(hitGeo, hitMat);
      hit.userData.missionId = s.missionId;
      satGroup.add(hit);
      this.missionHitProxies.push(hit);

      this.disposables.push(busGeo, wingGeo, dishGeo, ledGeo, busMat, wingMat, ledMat, hitGeo, hitMat);
      this.orbitSatellites.push({
        missionId: s.missionId,
        pivot,
        speed: s.speed,
        ledMat,
        phase: idx * 1.3,
      });
    }
  }

  /**
   * Computes exact J2000 orbital positions, sidereal axial rotations, and lunar tidal-locked positions.
   */
  /**
   * La ISS no está fija: su marca (y el modelo en órbita que cuelga de ella) se coloca cada fotograma
   * sobre el punto real de la Tierra que tiene debajo, calculado desde su TLE para la fecha simulada.
   * La altura se mantiene exagerada (1,16 radios, como las demás misiones orbitales) para que se vea.
   */
  private updateIssBeacon(dJ2000: number): void {
    const beacon = this.beaconsByMissionId.get('iss');
    if (!beacon) return;
    const ms = (dJ2000 + 2451545.0 - 2440587.5) * 86400000;
    const p = computeIssSubpoint(ms, this.issSubpoint);
    latLonToLocalVector3(p.latDeg, p.lonDeg, beacon.hostRadius * 1.16, beacon.group.position);
    _vec3A.copy(beacon.group.position).normalize();
    beacon.group.quaternion.setFromUnitVectors(_upVec, _vec3A);
    beacon.group.updateMatrixWorld(true);
  }

  private applyJ2000State(dJ2000: number, snapHistory = false): void {
    this.bodies.forEach((runtime, id) => {
      runtime.lastWorldPos.copy(runtime.currentWorldPos);

      const kepler = PLANET_ELEMENTS_J2000[id];
      if (kepler) {
        computeHeliocentricPosition(
          kepler,
          dJ2000,
          runtime.anchorGroup.position,
          AU_TO_UNITS,
        );
      } else {
        runtime.anchorGroup.position.set(0, 0, 0);
      }

      const rotRad = computeAxialRotationRad(id, dJ2000);
      runtime.mesh.rotation.y = rotRad;
      if (runtime.cloudMesh) {
        // Subtle atmospheric super-rotation relative to surface
        runtime.cloudMesh.rotation.y = rotRad + dJ2000 * 0.12;
      }

      runtime.anchorGroup.updateMatrixWorld(true);
      runtime.anchorGroup.getWorldPosition(runtime.currentWorldPos);
      if (snapHistory) {
        runtime.lastWorldPos.copy(runtime.currentWorldPos);
      }

      if (id === 'comet67p' && this.cometFx && kepler) {
        // Tails point away from the Sun; the dust tail bends back along the orbit, so the
        // direction of motion is needed: position one day later, in world space
        computeHeliocentricPosition(kepler, dJ2000 + 1, _vec3B, AU_TO_UNITS);
        _vec3B.sub(runtime.anchorGroup.position);
        if (runtime.anchorGroup.parent) _vec3B.transformDirection(runtime.anchorGroup.parent.matrixWorld);
        this.cometFx.orient(runtime.currentWorldPos, _vec3B);
      }

      for (const m of runtime.moons) {
        m.lastWorldPos.copy(m.currentWorldPos);
        const angleDeg =
          m.data.j2000MeanLonDeg + (360 / m.data.orbitalPeriodDays) * dJ2000;
        m.angle = THREE.MathUtils.degToRad(angleDeg);
        m.mesh.position.set(
          Math.cos(m.angle) * m.data.orbitRadius,
          0,
          -Math.sin(m.angle) * m.data.orbitRadius,
        );
        // Synchronous tidal lock: lon=0 (+X) always faces parent planet
        m.mesh.rotation.y = m.angle + Math.PI;
        m.mesh.updateMatrixWorld(true);
        m.mesh.getWorldPosition(m.currentWorldPos);
        if (snapHistory) {
          m.lastWorldPos.copy(m.currentWorldPos);
        }
      }
    });

    this.updateIssBeacon(dJ2000);

    // Update all surface beacon world positions & outward normals
    this.beaconsByMissionId.forEach((beacon) => {
      beacon.lastWorldPos.copy(beacon.currentWorldPos);
      beacon.group.getWorldPosition(beacon.currentWorldPos);
      if (snapHistory) {
        beacon.lastWorldPos.copy(beacon.currentWorldPos);
      }

      const hostPos = beacon.mission.targetMoonId
        ? this.moonsById.get(beacon.mission.targetMoonId)?.currentWorldPos
        : this.bodies.get(beacon.mission.targetBodyId)?.currentWorldPos;
      if (hostPos) {
        beacon.worldNormal
          .subVectors(beacon.currentWorldPos, hostPos)
          .normalize();
      }
    });
  }

  private bindEvents(): void {
    const dom = this.renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(
        e.clientX - this.pointerDownPos.x,
        e.clientY - this.pointerDownPos.y,
      );
      if (dist > 6) return;

      const rect = dom.getBoundingClientRect();
      this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointerNdc, this.camera);

      // 1. Puntos de misión visibles: la misión elegida o las de la superficie del cuerpo enfocado
      if (this.focusedMissionId || this.focusedBodyId) {
        const visibleBeacons = this.missionHitProxies.filter(
          (p) => p.parent?.visible,
        );
        const beaconHits = this.raycaster.intersectObjects(
          visibleBeacons,
          false,
        );
        for (const hit of beaconHits) {
          const mId = hit.object.userData.missionId as string | undefined;
          const beacon = mId ? this.beaconsByMissionId.get(mId) : undefined;
          if (!beacon) continue;
          const isOrbitalMarker = hit.object.parent !== beacon.group;
          if (isOrbitalMarker) {
            this.flyToMission(beacon.mission);
            return;
          }
          // Ensure surface beacon is on the camera-facing hemisphere (not through the planet)
          _vec3A
            .subVectors(this.camera.position, beacon.currentWorldPos)
            .normalize();
          if (beacon.worldNormal.dot(_vec3A) > 0.05) {
            this.flyToMission(beacon.mission);
            return;
          }
        }
      }

      // 2. Parados en una luna: su zona de clic invisible (mucho mayor que la luna) cubre media pantalla
      // y la cámara queda dentro de la del planeta, que desde dentro no responde. Se decide con las
      // superficies reales: la luna o su planeta, gana el que esté más cerca a lo largo del clic.
      if (this.focusedMoonId && this.focusedBodyId) {
        const moonRt = this.moonsById.get(this.focusedMoonId);
        const host = this.bodies.get(this.focusedBodyId);
        const moonHit = moonRt ? this.raycaster.intersectObject(moonRt.mesh, false)[0] : undefined;
        const hostHit = host ? this.raycaster.intersectObject(host.mesh, false)[0] : undefined;
        if (hostHit && (!moonHit || hostHit.distance < moonHit.distance)) {
          this.flyToBody(this.focusedBodyId);
          return;
        }
        if (moonHit) {
          this.flyToMoon(this.focusedBodyId, this.focusedMoonId);
          return;
        }
      }

      const allHits = this.raycaster.intersectObjects(this.hitProxies, false);
      // La zona invisible de la luna actual no cuenta (ya se resolvió arriba con su superficie real)
      const intersects = this.focusedMoonId
        ? allHits.filter((i) => i.object.userData.moonId !== this.focusedMoonId)
        : allHits;
      if (intersects.length > 0) {
        // When focused on a planet, prioritize moon clicks even if inside planet's overview hit proxy
        const preferred =
          (this.focusedBodyId
            ? intersects.find(
                (i) =>
                  i.object.userData.moonId &&
                  i.object.userData.bodyId === this.focusedBodyId,
              )
            : undefined) ?? intersects[0];
        const hit = preferred.object.userData;
        const bodyId = hit.bodyId as CelestialBodyId;
        const moonId = hit.moonId as string | undefined;
        if (moonId) {
          this.flyToMoon(bodyId, moonId);
        } else {
          this.flyToBody(bodyId);
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - this.lastHoverCheck < 45) return;
      this.lastHoverCheck = now;

      const rect = dom.getBoundingClientRect();
      this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointerNdc, this.camera);
      const intersects = this.raycaster.intersectObjects(this.hitProxies, false);
      const hitId =
        intersects.length > 0
          ? (intersects[0].object.userData.bodyId as CelestialBodyId)
          : null;

      if (hitId !== this.hoveredId) {
        this.hoveredId = hitId;
        dom.style.cursor = hitId ? 'pointer' : 'grab';
        this.callbacks.onHoverBody(hitId);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      this.keysPressed.add(e.code);
      if (e.code === 'Escape') {
        this.resetToOverview();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keysPressed.delete(e.code);
    };

    const onResize = () => {
      if (this.disposed) return;
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.viewportW = w;
      this.viewportH = h;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      if (this.composer) this.composer.setSize(w, h);
      this.shipOverlay?.setViewport(w, h, this.viewInsetTop, this.viewInsetBottom);
      if (this.bloomPass) this.bloomPass.resolution.set(w, h);
    };

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };

    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('webglcontextlost', onContextLost);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);

    this.disposables.push({
      dispose: () => {
        dom.removeEventListener('pointerdown', onPointerDown);
        dom.removeEventListener('pointerup', onPointerUp);
        dom.removeEventListener('pointermove', onPointerMove);
        dom.removeEventListener('webglcontextlost', onContextLost);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('resize', onResize);
      },
    });
  }

  private updateBeaconVisibilities(): void {
    // Mirando un planeta o una luna (sin misión elegida) se muestran los puntos de las misiones que
    // están en su superficie, para poder encontrarlas y tocarlas; con una misión elegida, solo la suya.
    const hostBody = !this.focusedMissionId ? this.focusedBodyId : null;
    const hostMoon = this.focusedMoonId ?? undefined;
    this.beaconsByMissionId.forEach((beacon, id) => {
      const isSelected = id === this.focusedMissionId;
      const m = beacon.mission;
      const onHost =
        !!hostBody &&
        m.missionRole === 'surface' &&
        m.targetBodyId === hostBody &&
        (m.targetMoonId ?? undefined) === hostMoon;
      beacon.group.visible = isSelected || onHost;
      beacon.ringMat.opacity = isSelected ? 0.92 : onHost ? 0.4 : 0.0;
    });
    for (const sat of this.orbitSatellites) {
      sat.pivot.visible = this.focusedMissionId === sat.missionId;
    }
  }

  public flyToBody(id: CelestialBodyId): void {
    this.navRequestToken++;
    this.shipOverlay?.resetInspection();
    const runtime = this.bodies.get(id);
    if (!runtime) return;
    this.prewarmTripTarget(runtime.inclinationGroup);

    this.pendingSurfaceMission = null;
    if (this.deepSpaceDiorama) {
      this.exitDeepSpaceMode();
      this.computeIdealCameraOffset(
        runtime.currentWorldPos,
        runtime.data.visualRadius,
        runtime.data.cameraDistanceFactor * 1.3,
        id === 'sun',
        id === 'saturn',
        _vec3B,
        this.getFramingCompanion(id),
      );
      this.camera.position.copy(runtime.currentWorldPos).add(_vec3B);
      this.controls.target.copy(runtime.currentWorldPos);
    }
    if (this.surfaceDiorama) {
      this.exitSurfaceMode();
      // Snap camera smoothly near target body after exiting surface diorama
      this.computeIdealCameraOffset(
        runtime.currentWorldPos,
        runtime.data.visualRadius,
        runtime.data.cameraDistanceFactor * 1.3,
        id === 'sun',
        id === 'saturn',
        _vec3B,
        this.getFramingCompanion(id),
      );
      this.camera.position.copy(runtime.currentWorldPos).add(_vec3B);
      this.controls.target.copy(runtime.currentWorldPos);
    }

    this.focusedBodyId = id;
    this.focusedMoonId = null;
    this.focusedMissionId = null;
    this.isFlying = true;
    this.isTracking = true;
    this.controls.minDistance = Math.max(0.45, runtime.data.visualRadius * 1.35);
    this.updateBeaconVisibilities();
    this.schedule8KUpgrade(id, null);
    this.callbacks.onSelectTarget({ bodyId: id });
    this.callbacks.onCameraModeChange('tracking');
  }

  public flyToMoon(bodyId: CelestialBodyId, moonId: string): void {
    this.navRequestToken++;
    this.shipOverlay?.resetInspection();
    const moon = this.moonsById.get(moonId);
    if (!moon || moon.parentId !== bodyId) return;
    const host = this.bodies.get(bodyId);
    if (host) this.prewarmTripTarget(host.inclinationGroup);

    this.pendingSurfaceMission = null;
    if (this.deepSpaceDiorama) {
      this.exitDeepSpaceMode();
      this.computeIdealCameraOffset(
        moon.currentWorldPos,
        moon.data.radius,
        5.0,
        false,
        false,
        _vec3B,
      );
      this.camera.position.copy(moon.currentWorldPos).add(_vec3B);
      this.controls.target.copy(moon.currentWorldPos);
    }
    if (this.surfaceDiorama) {
      this.exitSurfaceMode();
      this.computeIdealCameraOffset(
        moon.currentWorldPos,
        moon.data.radius,
        5.0,
        false,
        false,
        _vec3B,
      );
      this.camera.position.copy(moon.currentWorldPos).add(_vec3B);
      this.controls.target.copy(moon.currentWorldPos);
    }

    this.focusedBodyId = bodyId;
    this.focusedMoonId = moonId;
    this.focusedMissionId = null;
    this.isFlying = true;
    this.isTracking = true;
    this.controls.minDistance = Math.max(0.28, moon.data.radius * 1.6);
    this.updateBeaconVisibilities();
    this.schedule8KUpgrade(bodyId, moonId);
    this.callbacks.onSelectTarget({ bodyId, moonId });
    this.callbacks.onCameraModeChange('tracking');
  }

  public flyToMission(mission: AbandonedMission): void {
    const token = ++this.navRequestToken;
    this.shipOverlay?.resetInspection();
    const needsDioramaNow =
      (this.surfaceDiorama && this.surfaceMission?.id !== mission.id) ||
      (!this.surfaceDiorama && mission.missionRole === 'deepspace');
    if (needsDioramaNow && !surfaceModule) {
      void loadSurfaceModule()
        .then(() => {
          if (!this.disposed && token === this.navRequestToken) {
            this.flyToMission(mission);
          }
        })
        .catch(() => {});
      return;
    }

    if (this.deepSpaceDiorama) {
      this.exitDeepSpaceMode();
    }

    const beacon = this.beaconsByMissionId.get(mission.id);
    if (!beacon) {
      this.flyToBody(mission.targetBodyId);
      return;
    }

    if (this.surfaceDiorama && this.surfaceMission?.id === mission.id) {
      this.setSurfaceCameraMode('rover');
      return;
    }

    if (this.surfaceDiorama || mission.missionRole === 'deepspace') {
      this.enterSurfaceMode(mission);
      this.focusedBodyId = mission.targetBodyId;
      this.focusedMoonId = mission.targetMoonId ?? null;
      this.focusedMissionId = mission.id;
      this.updateBeaconVisibilities();
      this.callbacks.onSelectTarget({
        bodyId: mission.targetBodyId,
        moonId: mission.targetMoonId,
        missionId: mission.id,
      });
      return;
    }

    this.focusedBodyId = mission.targetBodyId;
    this.focusedMoonId = mission.targetMoonId ?? null;
    this.focusedMissionId = mission.id;
    this.pendingSurfaceMission = mission;
    this.surfaceApproachElapsed = 0;
    this.isFlying = true;
    this.isTracking = true;
    this.controls.minDistance = Math.max(0.25, beacon.hostRadius * 0.45);
    this.updateBeaconVisibilities();
    this.callbacks.onSelectTarget({
      bodyId: mission.targetBodyId,
      moonId: mission.targetMoonId,
      missionId: mission.id,
    });
    this.callbacks.onCameraModeChange('tracking');
  }

  public flyToDeepSpace(id: DeepSpaceTargetId): void {
    const token = ++this.navRequestToken;
    this.shipOverlay?.resetInspection();
    const mod = deepSpaceModule;
    if (!mod) {
      void loadDeepSpaceModule()
        .then(() => {
          if (!this.disposed && token === this.navRequestToken) {
            this.flyToDeepSpace(id);
          }
        })
        .catch(() => {});
      return;
    }

    this.pendingSurfaceMission = null;
    this.exitSurfaceMode();
    this.exitDeepSpaceMode();

    const diorama = mod.createDeepSpaceDiorama(id);
    this.deepSpaceDiorama = diorama;
    this.activeDeepSpaceId = id;

    this.focusedBodyId = null;
    this.focusedMoonId = null;
    this.focusedMissionId = null;
    this.isFlying = false;
    this.isTracking = false;

    this.spaceRoot.visible = false;
    this.scene.environment = this.roomEnvTex;
    this.scene.environmentIntensity = 0.28;
    this.scene.fog = null;
    this.scene.add(diorama.root);

    this.camera.position.copy(diorama.defaultCamPos);
    this.controls.target.copy(diorama.defaultTarget);
    this.controls.enableZoom = true;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 420;
    this.controls.update();

    this.renderer.toneMappingExposure = 1.25;
    this.updateBeaconVisibilities();
    this.callbacks.onSelectTarget(null);
    this.callbacks.onDeepSpaceChange?.(id);
    this.callbacks.onCameraModeChange('free');
  }

  private exitDeepSpaceMode(): void {
    if (this.deepSpaceDiorama) {
      this.scene.remove(this.deepSpaceDiorama.root);
      this.deepSpaceDiorama.dispose();
      this.deepSpaceDiorama = null;
    }
    if (this.activeDeepSpaceId !== null) {
      this.activeDeepSpaceId = null;
      this.callbacks.onDeepSpaceChange?.(null);
    }
    if (!this.surfaceDiorama) {
      this.scene.environment = null;
      this.scene.environmentIntensity = 0.0;
      this.spaceRoot.visible = true;
      this.controls.minDistance = 0.35;
      this.controls.maxDistance = 65000;
    }
  }

  public setSurfaceCameraMode(mode: SurfaceCameraMode): void {
    if (!this.surfaceDiorama) return;
    this.surfaceViewMode = mode;

    if (mode === 'pov') {
      // First-person mast PanCam: rotate 360° smoothly from the rover's optical eye
      _vec3A
        .subVectors(
          this.surfaceDiorama.povCamTarget,
          this.surfaceDiorama.povCamPos,
        )
        .normalize();
      this.camera.position.copy(this.surfaceDiorama.povCamPos);
      this.controls.target
        .copy(this.surfaceDiorama.povCamPos)
        .addScaledVector(_vec3A, 0.25);
      this.controls.enableZoom = false;
      this.controls.minDistance = 0.25;
      this.controls.maxDistance = 0.25;
    } else {
      this.camera.position.copy(this.surfaceDiorama.roverCamPos);
      this.controls.target.copy(this.surfaceDiorama.roverCamTarget);
      this.controls.enableZoom = true;
      this.controls.minDistance = 1.2;
      this.controls.maxDistance = 42;
    }

    this.controls.update();
    this.callbacks.onSurfaceModeChange?.(true, mode);
  }

  public exitSurfaceToBody(): void {
    const bodyId = this.focusedBodyId;
    const moonId = this.focusedMoonId;
    if (moonId && bodyId) {
      this.flyToMoon(bodyId, moonId);
    } else if (bodyId) {
      this.flyToBody(bodyId);
    } else {
      this.resetToOverview();
    }
  }

  private enterSurfaceMode(mission: AbandonedMission): void {
    const mod = surfaceModule;
    // Callers guarantee the chunk is loaded; this guard only protects against misuse.
    if (!mod) return;
    this.exitSurfaceMode();
    this.clearActive8KUpgrade();
    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const diorama = mod.createSurfaceDiorama(mission, maxAnisotropy, this.pbrCaps);
    this.surfaceDiorama = diorama;
    this.surfaceMission = mission;
    this.pendingSurfaceMission = null;
    this.isFlying = false;
    this.isTracking = false;

    this.spaceRoot.visible = false;
    this.scene.environment = this.roomEnvTex;
    this.scene.environmentIntensity = 0.68;
    this.scene.add(diorama.root);

    if (diorama.theme.fogColor !== null) {
      this.scene.fog = new THREE.FogExp2(
        diorama.theme.fogColor,
        diorama.theme.fogDensity,
      );
    } else {
      this.scene.fog = null;
    }

    this.renderer.toneMappingExposure = 1.05;
    this.updateSurfaceSunOrientation();
    this.setSurfaceCameraMode('rover');
  }

  private exitSurfaceMode(): void {
    if (this.surfaceDiorama) {
      this.scene.remove(this.surfaceDiorama.root);
      this.surfaceDiorama.dispose();
      this.surfaceDiorama = null;
    }
    this.surfaceMission = null;
    this.scene.fog = null;
    if (!this.deepSpaceDiorama) {
      this.scene.environment = null;
      this.scene.environmentIntensity = 0.0;
    }
    this.spaceRoot.visible = true;
    this.controls.enableZoom = true;
    this.controls.minDistance = 0.35;
    this.controls.maxDistance = 65000;
    this.callbacks.onSurfaceModeChange?.(false, 'rover');
  }

  private updateSurfaceSunOrientation(): void {
    if (!this.surfaceDiorama || !this.surfaceMission) return;
    const b = this.beaconsByMissionId.get(this.surfaceMission.id);
    if (!b) return;
    // Transform astronomical Sun vector (-beacon.worldPos) into local East/Up/North surface coordinates
    const sunDirWorld = _vec3A.copy(b.currentWorldPos).negate().normalize();
    const up = _vec3B.copy(b.worldNormal).normalize();
    const east = _vec3C.set(0, 1, 0).cross(up);
    if (east.lengthSq() < 1e-4) {
      east.set(1, 0, 0);
    } else {
      east.normalize();
    }
    const north = _vec3D.crossVectors(up, east).normalize();

    const sx = sunDirWorld.dot(east);
    const sy = sunDirWorld.dot(up);
    const sz = -sunDirWorld.dot(north);
    const sunLocal = new THREE.Vector3(sx, sy, sz).normalize();
    this.surfaceSunLocal.copy(sunLocal);
    this.surfaceDiorama.updateSun(sunLocal);
  }

  private clearActive8KUpgrade(): void {
    if (this.active8KAbort) {
      this.active8KAbort.abort();
      this.active8KAbort = null;
    }
    if (this.active8KUpgrade) {
      const { material, restore, set } = this.active8KUpgrade;
      if (set.map && restore.map) {
        material.map = restore.map;
      }
      material.normalMap = restore.normalMap;
      material.roughnessMap = restore.roughnessMap;
      material.metalnessMap = restore.metalnessMap;
      material.metalness = restore.metalness;
      material.needsUpdate = true;
      set.dispose();
      this.active8KUpgrade = null;
    }
  }

  /**
   * Uploads an HD PBR set to the GPU in bands spread over many frames (see
   * progressiveTextureUpload) instead of all four 4096 px textures in one frame. Falls back to
   * the regular three.js upload for any texture the band path can't handle. Same pixels, same
   * sampling; resolves to null if the upgrade was cancelled meanwhile.
   */
  private async uploadPbrSetProgressively(
    set: FullPbrTextureSet,
    signal: AbortSignal,
  ): Promise<UploadedPbrSet | null> {
    const sources = [set.map, set.normalMap, set.roughnessMap, set.metalnessMap];
    const out: Array<THREE.Texture | null> = [];
    const uploaded: ProgressiveTexture[] = [];
    for (const tex of sources) {
      if (!tex) {
        out.push(null);
        continue;
      }
      let result: ProgressiveTexture | null = null;
      try {
        result = await uploadDataTextureProgressively(this.renderer, tex, signal);
      } catch {
        result = null;
      }
      if (signal.aborted || this.disposed) {
        result?.dispose();
        uploaded.forEach((u) => u.dispose());
        return null;
      }
      if (result) {
        uploaded.push(result);
        out.push(result.texture);
      } else {
        out.push(tex); // regular upload on first use, as before
      }
    }
    return {
      map: out[0],
      normalMap: out[1] as THREE.Texture,
      roughnessMap: out[2] as THREE.Texture,
      metalnessMap: out[3] as THREE.Texture,
      dispose: () => {
        uploaded.forEach((u) => u.dispose());
        set.dispose();
      },
    };
  }

  private schedule8KUpgrade(
    bodyId: CelestialBodyId,
    moonId: string | null,
  ): void {
    this.clearActive8KUpgrade();
    if (this.disposed || bodyId === 'sun') return;

    const abort = new AbortController();
    this.active8KAbort = abort;

    if (moonId) {
      const mRuntime = this.moonsById.get(moonId);
      if (!mRuntime || !mRuntime.albedoImage) return;
      const isIcyMoon =
        mRuntime.data.style === 'enceladus' ||
        mRuntime.data.style === 'europa' ||
        mRuntime.data.style === 'triton';
      const profile: SurfacePbrProfile = isIcyMoon ? 'icy' : 'rocky';

      void processSurface8KPBR({
        albedoSource: mRuntime.albedoImage,
        bumpSource: mRuntime.bumpImage ?? null,
        profile,
        normalStrength: mRuntime.bumpImage ? 3.8 : 3.2,
        skipAlbedo: true,
        maxWidth: 4096,
        seed: moonId.charCodeAt(0) * 19 + moonId.length * 7,
        capabilities: this.pbrCaps,
        signal: abort.signal,
      }).then(async (set) => {
        if (!set || abort.signal.aborted || this.disposed) {
          set?.dispose();
          return;
        }
        // GPU upload spread over many frames instead of one long freeze
        const up = await this.uploadPbrSetProgressively(set, abort.signal);
        if (!up || abort.signal.aborted || this.disposed) {
          if (!up) set.dispose();
          else up.dispose();
          return;
        }
        const mm = mRuntime.material;
        const applyMoon = () => {
          if (up.map) {
            mm.map = up.map;
          }
          mm.normalMap = up.normalMap;
          mm.roughnessMap = up.roughnessMap;
          mm.metalnessMap = up.metalnessMap;
          mm.metalness = isIcyMoon ? 0.0 : 0.05;
        };
        // Programs for the HD maps compiled in parallel first: no stall when they switch on
        await this.compileBeforeApplying(mm, applyMoon, this.snapshotPbrMaps(mm));
        if (abort.signal.aborted || this.disposed) {
          up.dispose();
          return;
        }
        applyMoon();
        mm.needsUpdate = true;
        this.active8KUpgrade = {
          material: mRuntime.material,
          restore: mRuntime.basePbr,
          set: up,
        };
      });
      return;
    }

    const runtime = this.bodies.get(bodyId);
    if (!runtime || !runtime.material || !runtime.basePbr || !runtime.albedoImage) {
      return;
    }

    const isGas =
      bodyId === 'jupiter' ||
      bodyId === 'saturn' ||
      bodyId === 'uranus' ||
      bodyId === 'neptune';
    const isIcy = bodyId === 'pluto' || bodyId === 'eris';
    const profile: SurfacePbrProfile =
      bodyId === 'earth'
        ? 'earth'
        : bodyId === 'comet67p'
          ? 'comet'
          : isGas
            ? 'gas'
            : isIcy
              ? 'icy'
              : 'rocky';

    const mat = runtime.material;
    const base = runtime.basePbr;

    void processSurface8KPBR({
      albedoSource: runtime.albedoImage,
      bumpSource: runtime.bumpImage ?? null,
      specSource: runtime.specImage ?? null,
      profile,
      normalStrength:
        isGas ? 1.15 : bodyId === 'comet67p' ? 4.8 : bodyId === 'earth' ? 2.4 : 3.6,
      skipAlbedo: true,
      maxWidth: 4096,
      seed: bodyId.charCodeAt(0) * 23 + bodyId.length * 11,
      capabilities: this.pbrCaps,
      signal: abort.signal,
    }).then(async (set) => {
      if (!set || abort.signal.aborted || this.disposed) {
        set?.dispose();
        return;
      }
      // GPU upload spread over many frames instead of one long freeze
      const up = await this.uploadPbrSetProgressively(set, abort.signal);
      if (!up || abort.signal.aborted || this.disposed) {
        if (!up) set.dispose();
        else up.dispose();
        return;
      }
      const applyBody = () => {
        if (up.map) {
          mat.map = up.map;
        }
        mat.normalMap = up.normalMap;
        mat.roughnessMap = up.roughnessMap;
        mat.metalnessMap = up.metalnessMap;
        mat.metalness = isGas || isIcy || bodyId === 'earth' ? 0.0 : 0.05;
      };
      // Programs for the HD maps compiled in parallel first: no stall when they switch on
      await this.compileBeforeApplying(mat, applyBody, this.snapshotPbrMaps(mat));
      if (abort.signal.aborted || this.disposed) {
        up.dispose();
        return;
      }
      applyBody();
      mat.needsUpdate = true;
      this.active8KUpgrade = {
        material: mat,
        restore: base,
        set: up,
      };
    });
  }

  public resetToOverview(): void {
    this.navRequestToken++;
    this.shipOverlay?.resetInspection();
    this.pendingSurfaceMission = null;
    this.clearActive8KUpgrade();
    if (this.deepSpaceDiorama) {
      this.exitDeepSpaceMode();
      this.camera.position.copy(this.getOverviewCamPos(_vec3A));
      this.controls.target.copy(OVERVIEW_TARGET);
    }
    if (this.surfaceDiorama) {
      this.exitSurfaceMode();
      this.camera.position.copy(this.getOverviewCamPos(_vec3A));
      this.controls.target.copy(OVERVIEW_TARGET);
    }
    this.focusedBodyId = null;
    this.focusedMoonId = null;
    this.focusedMissionId = null;
    this.isFlying = true;
    this.isTracking = false;
    this.getOverviewCamPos(this.flightTargetPos);
    this.flightLookTarget.copy(OVERVIEW_TARGET);
    this.controls.minDistance = 16.0;
    this.updateBeaconVisibilities();
    this.callbacks.onSelectTarget(null);
    this.callbacks.onCameraModeChange('overview');
  }

  public releaseTracking(): void {
    this.pendingSurfaceMission = null;
    if (this.surfaceDiorama || this.deepSpaceDiorama) return;
    this.isFlying = false;
    this.isTracking = false;
    this.controls.minDistance = 0.35;
    this.callbacks.onCameraModeChange('free');
  }

  public setTimeMultiplier(mult: number): void {
    this.timeMultiplier = Math.max(1, mult);
  }

  public syncToNow(): void {
    this.simEpochMs = Date.now();
    this.timeMultiplier = 1;
    this.isPaused = false;
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  public setShowOrbits(show: boolean): void {
    this.showOrbits = show;
  }

  /**
   * Tells the engine how much of the screen the UI covers at the top / bottom (CSS px). The
   * projection centre then glides to the middle of the uncovered band, so the focused body stays
   * fully visible next to open panels, and new fly-tos frame it to fit that band.
   * Camera position, lighting and the simulation are unaffected.
   */
  public setViewInsets(top: number, bottom: number): void {
    this.viewInsetTop = Math.max(0, top);
    this.viewInsetBottom = Math.max(0, bottom);
    this.shipOverlay?.setViewport(this.viewportW, this.viewportH, this.viewInsetTop, this.viewInsetBottom);
  }

  /**
   * Skip drawing while something opaque covers the whole view (the hyperspace jump); the
   * simulation, camera flight and HUD keep updating. Nothing visible changes.
   */
  public setRenderSuspended(suspended: boolean): void {
    this.renderSuspended = suspended;
  }

  /** Shows / hides the always-on starship of "Modo nave" (model loaded on first use). */
  public setShipMode(on: boolean): void {
    this.shipModeOn = on;
    if (this.shipOverlay) {
      this.shipOverlay.setVisible(on);
      return;
    }
    if (!on || this.shipLoading) return;
    this.shipLoading = true;
    void import('./shipOverlay')
      .then(({ ShipOverlay }) => {
        if (this.disposed) return;
        const overlay = new ShipOverlay(this.roomEnvTex);
        overlay.setViewport(this.viewportW, this.viewportH, this.viewInsetTop, this.viewInsetBottom);
        overlay.setVisible(this.shipModeOn);
        this.shipOverlay = overlay;
        this.setupShipInteraction();
        // Upload its textures and compile its shaders (for the real render target) before the
        // first frame that shows it, so the fade-in never stalls
        overlay.modelReady
          .then(() => {
            if (this.disposed) return;
            for (const tex of overlay.getTextures()) {
              try {
                this.renderer.initTexture(tex);
              } catch {
                // uploaded on first use instead
              }
            }
            const restore = overlay.revealForCompile();
            let compiled: Promise<unknown>;
            try {
              compiled = this.compileForScreen(overlay.scene, overlay.camera);
            } catch {
              compiled = Promise.resolve();
            } finally {
              restore();
            }
            const done = () => overlay.markReady();
            compiled.then(done, done);
          })
          .catch(() => {});
        if (this.composer) {
          // Drawn right after the 3D view, on a cleared depth buffer: never clips into planets
          const pass = new RenderPass(overlay.scene, overlay.camera);
          pass.clear = false;
          pass.clearDepth = true;
          pass.enabled = false;
          this.composer.insertPass(pass, 1);
          this.shipPass = pass;
        }
      })
      .catch(() => {})
      .finally(() => {
        this.shipLoading = false;
      });
  }

  /** Screen circle (CSS px) of what the user is looking at, so the ship never covers it. */
  private getFocusScreenCircle(): { x: number; y: number; r: number } | null {
    const w = this.viewportW || window.innerWidth;
    const h = this.viewportH || window.innerHeight;
    if (this.surfaceDiorama || this.deepSpaceDiorama) {
      // The rover / spacecraft / deep-space object is framed in the middle of the view
      return { x: w / 2, y: h / 2, r: Math.min(w, h) * 0.3 };
    }
    let pos: THREE.Vector3 | null = null;
    let radius = 0;
    let minPx = 0;
    if (this.focusedMissionId) {
      const beacon = this.beaconsByMissionId.get(this.focusedMissionId);
      if (beacon) {
        pos = beacon.currentWorldPos;
        radius = beacon.hostRadius * 0.5;
        minPx = 70;
      }
    } else if (this.focusedMoonId) {
      const moon = this.moonsById.get(this.focusedMoonId);
      if (moon) {
        pos = moon.currentWorldPos;
        radius = moon.data.radius * 1.15;
      }
    } else if (this.focusedBodyId) {
      const body = this.bodies.get(this.focusedBodyId);
      if (body) {
        pos = body.currentWorldPos;
        const rings = body.data.rings?.outerMultiplier ?? 1;
        radius = body.data.visualRadius * Math.max(1.12, rings) * (body.data.id === 'sun' ? 1.5 : 1);
      }
    }
    if (!pos) return null;
    _projVec.copy(pos).project(this.camera);
    if (_projVec.z > 1) return null;
    const dist = Math.max(this.camera.position.distanceTo(pos), 1e-3);
    const halfTan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const r = Math.max(minPx, (radius / (dist * halfTan)) * (h / 2));
    return { x: (_projVec.x * 0.5 + 0.5) * w, y: (-_projVec.y * 0.5 + 0.5) * h, r };
  }

  /**
   * Hand inspection of the ship: press on it to grab it (the 3D view camera stays put), drag to
   * turn it, wheel / two-finger pinch to bring it closer, double click to send it back on course.
   */
  private setupShipInteraction(): void {
    const el = this.container;
    const canvas = this.renderer.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchDist = 0;
    const local = (e: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onShip = (e: { clientX: number; clientY: number }) => {
      const o = this.shipOverlay;
      if (!o) return false;
      const p = local(e);
      return o.hitTest(p.x, p.y);
    };
    const setCursor = (c: string) => {
      if (canvas.style.cursor !== c) canvas.style.cursor = c;
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // A second finger joins an ongoing ship grab: pinch
      if (pointers.size === 0 && !onShip(e)) return;
      e.stopPropagation();
      e.preventDefault();
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // pointer already released
      }
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
      setCursor('grabbing');
    };
    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) {
        if (e.pointerType === 'mouse' && e.buttons === 0) setCursor(onShip(e) ? 'grab' : '');
        return;
      }
      e.stopPropagation();
      e.preventDefault();
      const o = this.shipOverlay;
      if (pointers.size >= 2) {
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0 && d > 0) o?.zoomBy(d / pinchDist);
        pinchDist = d;
        return;
      }
      o?.rotateBy(e.clientX - prev.x, e.clientY - prev.y);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };
    const onUp = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      e.stopPropagation();
      pointers.delete(e.pointerId);
      pinchDist = 0;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // already released
      }
      if (pointers.size === 0) setCursor(e.pointerType === 'mouse' && onShip(e) ? 'grab' : '');
    };
    const onWheel = (e: WheelEvent) => {
      if (!onShip(e)) return;
      e.stopPropagation();
      e.preventDefault();
      this.shipOverlay?.zoomBy(Math.exp(-e.deltaY * 0.0015));
    };
    const onDblClick = (e: MouseEvent) => {
      if (!onShip(e)) return;
      e.stopPropagation();
      this.shipOverlay?.resetInspection();
    };

    // Capture phase on the container: runs before the camera controls on the canvas
    el.addEventListener('pointerdown', onDown, { capture: true });
    el.addEventListener('pointermove', onMove, { capture: true });
    el.addEventListener('pointerup', onUp, { capture: true });
    el.addEventListener('pointercancel', onUp, { capture: true });
    el.addEventListener('wheel', onWheel, { capture: true, passive: false });
    el.addEventListener('dblclick', onDblClick, { capture: true });
    this.disposables.push({
      dispose: () => {
        el.removeEventListener('pointerdown', onDown, { capture: true });
        el.removeEventListener('pointermove', onMove, { capture: true });
        el.removeEventListener('pointerup', onUp, { capture: true });
        el.removeEventListener('pointercancel', onUp, { capture: true });
        el.removeEventListener('wheel', onWheel, { capture: true });
        el.removeEventListener('dblclick', onDblClick, { capture: true });
      },
    });
  }

  private updateShipOverlay(dt: number): void {
    const overlay = this.shipOverlay;
    if (!overlay) return;
    if (this.deepSpaceDiorama) {
      this.shipSunDir.set(-0.5, 0.6, 0.4).normalize();
    } else if (this.surfaceDiorama) {
      this.shipSunDir.copy(this.surfaceSunLocal).normalize();
    } else {
      this.shipSunDir.copy(this.camera.position).negate().normalize();
    }
    this.shipThrust = THREE.MathUtils.damp(this.shipThrust, this.isFlying ? 1 : 0.12, 3, dt);
    const inv = this.composer ? 1 / Math.max(this.currentExposure, 1e-3) : 1;
    // Yaw rate of the view in its own frame (small-angle: 2 * q.y / dt)
    this.turnQuat.copy(this.prevCamQuat).invert().multiply(this.camera.quaternion);
    this.prevCamQuat.copy(this.camera.quaternion);
    const yawRate = dt > 0 ? THREE.MathUtils.clamp((2 * this.turnQuat.y) / dt, -2, 2) : 0;
    this.shipTurn = THREE.MathUtils.damp(this.shipTurn, yawRate, 4, dt);
    overlay.update(
      dt,
      this.camera,
      this.shipSunDir,
      inv,
      this.shipThrust,
      this.getFocusScreenCircle(),
      this.shipTurn,
    );
    if (this.shipPass) this.shipPass.enabled = overlay.isActive;
  }

  /** Free (uncovered) viewport band, never smaller than 30% of the screen. */
  private getFreeViewBand(): { top: number; height: number } {
    const h = this.viewportH || window.innerHeight;
    const minFree = h * 0.3;
    let top = this.viewInsetTop;
    let bottom = this.viewInsetBottom;
    const covered = top + bottom;
    if (h - covered < minFree && covered > 0) {
      const scale = (h - minFree) / covered;
      top *= scale;
      bottom *= scale;
    }
    return { top, height: h - top - bottom };
  }

  private updateViewOffset(dt: number): void {
    const w = this.viewportW || window.innerWidth;
    const h = this.viewportH || window.innerHeight;
    const band = this.getFreeViewBand();
    // Positive = body drawn lower than the screen centre.
    const targetShift = band.top + band.height / 2 - h / 2;
    this.viewShiftPx = THREE.MathUtils.damp(this.viewShiftPx, targetShift, 6, dt);
    if (Math.abs(this.viewShiftPx - targetShift) < 0.25) this.viewShiftPx = targetShift;

    const applied = this.appliedViewShift;
    if (
      Math.abs(applied.shift - this.viewShiftPx) < 0.05 &&
      applied.w === w &&
      applied.h === h
    ) {
      return;
    }
    applied.shift = this.viewShiftPx;
    applied.w = w;
    applied.h = h;
    if (Math.abs(this.viewShiftPx) < 0.05) {
      this.camera.clearViewOffset();
    } else {
      // Rendering a window shifted up by `shift` inside a same-size virtual view moves content down.
      this.camera.setViewOffset(w, h, 0, -this.viewShiftPx, w, h);
    }
  }

  /**
   * Extra camera distance so a framed body fits the shorter side of the visible band: 1 on a
   * landscape screen with no panels (desktop framing unchanged), larger on portrait phones so
   * wide bodies such as Saturn's rings are not cut at the sides.
   */
  private getFramingFitFactor(): number {
    const w = this.viewportW || window.innerWidth;
    const h = this.viewportH || window.innerHeight;
    const band = this.getFreeViewBand();
    const limiting = Math.min(w, band.height);
    if (limiting <= 0) return 1;
    const raw = h / limiting;
    // Small breathing margin once we are fitting a narrower side, so ring tips don't touch edges.
    return THREE.MathUtils.clamp(raw > 1.001 ? raw * 1.12 : 1, 1, 3.6);
  }

  /**
   * While a body is tracked, follow changes of the free band (a panel opened, minimized or closed)
   * by scaling the current camera distance by the change in fit factor, smoothly. The user's own
   * pinch / wheel zoom is kept: only the panel-induced ratio is applied.
   */
  private updateFramingZoom(dt: number): void {
    const fit = this.getFramingFitFactor();
    const tracking =
      this.isTracking &&
      this.focusedBodyId !== null &&
      !this.surfaceDiorama &&
      !this.deepSpaceDiorama;
    if (!tracking || this.isFlying) {
      this.appliedFitFactor = fit;
      return;
    }
    let next = THREE.MathUtils.damp(this.appliedFitFactor, fit, 5, dt);
    if (Math.abs(next - fit) < 1e-4) next = fit;
    if (next === this.appliedFitFactor) return;
    const ratio = next / this.appliedFitFactor;
    this.appliedFitFactor = next;
    _vec3A
      .subVectors(this.camera.position, this.controls.target)
      .multiplyScalar(ratio);
    this.camera.position.copy(this.controls.target).add(_vec3A);
  }

  /** Overview camera spot, pulled back on portrait screens (capped so planets don't become specks). */
  private getOverviewCamPos(out: THREE.Vector3): THREE.Vector3 {
    return out
      .copy(OVERVIEW_CAM_POS)
      .multiplyScalar(Math.min(this.getFramingFitFactor(), 1.9));
  }

  /**
   * The Sun is the universal reference: a marker that always says where it is and how far,
   * from any planet, moon, spacecraft diorama or deep-space view. Elements inside `el`:
   * [data-sun-arrow] (rotated toward the Sun when it is off-screen) and [data-sun-text].
   */
  /**
   * Pequeñas etiquetas de las lunas principales del planeta enfocado (ver updateCompanionLabels).
   * El motor coloca cada una y escribe en data-body-id / data-moon-id a qué luna apunta.
   */
  public registerCompanionLabel(index: number, el: HTMLElement | null): void {
    this.companionLabels[index] = el
      ? {
          el,
          text: el.querySelector<HTMLElement>('[data-companion-text]'),
          arrow: el.querySelector<HTMLElement>('[data-companion-arrow]'),
          tick: el.querySelector<HTMLElement>('[data-companion-tick]'),
          state: { shown: null, transform: '', text: '', arrow: '', moonId: '' },
        }
      : null;
    this.lastCompanionTextAt = 0;
  }

  /**
   * A tamaño y distancia reales las lunas son puntos diminutos lejos del planeta: cada luna principal
   * que esté a la vista lleva debajo una etiqueta pequeña con su nombre (la Luna, además, su distancia
   * real a la Tierra). Si ninguna está a la vista, una sola etiqueta en el borde con una flecha señala
   * la más cercana, así siempre se pueden encontrar sin llenar la pantalla.
   */
  /** Etiquetas con el nombre de las misiones en la superficie del cuerpo enfocado (ver updateSurfaceLabels). */
  public registerSurfaceLabel(index: number, el: HTMLElement | null): void {
    this.surfaceLabels[index] = el
      ? {
          el,
          text: el.querySelector<HTMLElement>('[data-surface-text]'),
          state: { shown: null, transform: '', text: '', missionId: '' },
        }
      : null;
  }

  /**
   * Nombre de cada misión cuyo punto está en la cara visible del planeta o la luna. Si dos quedan
   * casi en el mismo sitio de la pantalla (p. ej. el módulo, el vehículo y la estación del Apolo 15),
   * se agrupan en una sola etiqueta «Apolo 15 +2» y gana la que aparece primero en el catálogo.
   */
  private updateSurfaceLabels(): void {
    const labels = this.surfaceLabels;
    if (labels.length === 0) return;
    const active =
      !this.surfaceDiorama && !this.deepSpaceDiorama && !this.isFlying && !this.focusedMissionId && !!this.focusedBodyId;
    const w = this.viewportW || window.innerWidth;
    const h = this.viewportH || window.innerHeight;
    const top = Math.max(70, this.viewInsetTop + 16);
    const bottom = h - Math.max(110, this.viewInsetBottom + 16);
    const placed: Array<{ x: number; y: number; mission: AbandonedMission; count: number }> = [];
    if (active) {
      for (const beacon of this.beaconsByMissionId.values()) {
        if (!beacon.group.visible || beacon.mission.missionRole !== 'surface') continue;
        // Solo la cara que mira a la cámara (no a través del planeta)
        _vec3A.subVectors(this.camera.position, beacon.currentWorldPos).normalize();
        if (beacon.worldNormal.dot(_vec3A) < 0.2) continue;
        _projVec.copy(beacon.currentWorldPos).project(this.camera);
        if (_projVec.z > 1) continue;
        const x = (_projVec.x * 0.5 + 0.5) * w;
        const y = (-_projVec.y * 0.5 + 0.5) * h;
        if (x < 30 || x > w - 30 || y < top || y > bottom) continue;
        const near = placed.find((p) => Math.abs(p.x - x) < 84 && Math.abs(p.y - y) < 20);
        if (near) {
          near.count++;
          continue;
        }
        if (placed.length < labels.length) placed.push({ x, y, mission: beacon.mission, count: 1 });
      }
    }
    for (let i = 0; i < labels.length; i++) {
      const lab = labels[i];
      if (!lab) continue;
      const st = lab.state;
      const p = placed[i];
      const shown = Boolean(p);
      if (st.shown !== shown) {
        st.shown = shown;
        lab.el.style.opacity = shown ? '1' : '0';
        lab.el.style.pointerEvents = shown ? 'auto' : 'none';
      }
      if (!p) continue;
      if (st.missionId !== p.mission.id) {
        st.missionId = p.mission.id;
        lab.el.dataset.missionId = p.mission.id;
        lab.el.setAttribute('aria-label', `${tr('Ir a', 'Go to')} ${p.mission.name}`);
        lab.el.title = `${p.mission.name} · ${p.mission.region}. ${tr('Toca para ir.', 'Tap to go.')}`;
      }
      const text = p.count > 1 ? `${p.mission.name} +${p.count - 1}` : p.mission.name;
      if (text !== st.text) {
        st.text = text;
        if (lab.text) lab.text.textContent = text;
      }
      const transform = `translate3d(${p.x.toFixed(1)}px, ${(p.y + 7).toFixed(1)}px, 0) translateX(-50%)`;
      if (transform !== st.transform) {
        st.transform = transform;
        lab.el.style.transform = transform;
      }
    }
  }

  private updateCompanionLabels(): void {
    const labels = this.companionLabels;
    if (labels.length === 0) return;
    const inSpace = !this.surfaceDiorama && !this.deepSpaceDiorama;
    const bodyId = this.focusedBodyId;
    // Mirando un planeta: sus lunas principales. Parados en una luna: su planeta (siempre localizable,
    // con flecha si no está a la vista) y las lunas hermanas que estén a la vista.
    type Target = { key: string; name: string; pos: THREE.Vector3; moonId: string };
    const targets: Target[] = [];
    let planetKey = '';
    if (inSpace && bodyId && !this.focusedMissionId && !this.isFlying) {
      if (this.focusedMoonId) {
        const planet = this.bodies.get(bodyId);
        if (planet) {
          targets.push({ key: bodyId, name: planet.data.name, pos: planet.currentWorldPos, moonId: '' });
          planetKey = bodyId;
        }
      }
      for (const id of MAIN_MOONS[bodyId] ?? []) {
        if (id === this.focusedMoonId) continue;
        const moon = this.moonsById.get(id);
        if (moon) targets.push({ key: id, name: moon.data.name, pos: moon.currentWorldPos, moonId: id });
      }
    }
    const w = this.viewportW || window.innerWidth;
    const h = this.viewportH || window.innerHeight;
    const top = Math.max(70, this.viewInsetTop + 16);
    const bottom = h - Math.max(110, this.viewInsetBottom + 16);

    type Placed = Target & { sx: number; sy: number; onScreen: boolean; dist: number };
    const visible: Placed[] = [];
    let nearest: Placed | null = null;
    let planetPlaced: Placed | null = null;
    for (const tg of targets) {
      _projVec.copy(tg.pos).project(this.camera);
      const behind = _projVec.z > 1;
      const nx = behind ? -_projVec.x : _projVec.x;
      const ny = behind ? -_projVec.y : _projVec.y;
      const sx = (nx * 0.5 + 0.5) * w;
      const sy = (-ny * 0.5 + 0.5) * h;
      const p: Placed = {
        ...tg,
        sx,
        sy,
        onScreen: !behind && sx >= 24 && sx <= w - 24 && sy >= top && sy <= bottom,
        dist: this.camera.position.distanceTo(tg.pos),
      };
      if (tg.key === planetKey) planetPlaced = p;
      else if (p.onScreen) visible.push(p);
      else if (!nearest || p.dist < nearest.dist) nearest = p;
    }
    // En una luna: el planeta siempre (etiqueta o flecha) + las lunas hermanas a la vista
    const shown: Placed[] = planetPlaced
      ? [planetPlaced, ...visible]
      : visible.length > 0
        ? visible
        : nearest
          ? [nearest]
          : [];

    const now = performance.now();
    const refreshText = now - this.lastCompanionTextAt > 500;
    if (refreshText) this.lastCompanionTextAt = now;
    const used: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < labels.length; i++) {
      const lab = labels[i];
      if (!lab) continue;
      const st = lab.state;
      const p = shown[i];
      const setShown = (on: boolean) => {
        if (st.shown === on) return;
        st.shown = on;
        lab.el.style.opacity = on ? '1' : '0';
        lab.el.style.pointerEvents = on ? 'auto' : 'none';
      };
      if (!p || !bodyId) {
        setShown(false);
        continue;
      }
      const moonId = p.moonId;
      if (st.moonId !== p.key) {
        st.moonId = p.key;
        st.text = '';
        lab.el.dataset.bodyId = bodyId;
        lab.el.dataset.moonId = moonId; // vacío = el planeta
        lab.el.setAttribute('aria-label', `${tr('Ir a', 'Go to')} ${p.name}`);
        lab.el.title = `${p.name} ${tr('en su posición real. Toca para ir.', 'at its real position. Tap to go.')}`;
      }
      if (refreshText || !st.text) {
        // ☾ para lunas, ● para el planeta
        let text = `${moonId ? '☾' : '●'} ${p.name}`;
        const planet = this.bodies.get(bodyId);
        if (moonId === 'luna' && planet) {
          // Órbita de la Luna en la escena: 55,5 unidades para los 384.400 km reales
          const luna = this.moonsById.get('luna');
          const km = luna ? (planet.currentWorldPos.distanceTo(p.pos) / luna.data.orbitRadius) * 384400 : 384400;
          text = `☾ ${p.name} · ${formatNumber(Math.round(km / 100) * 100, locale())} km`;
        }
        if (text !== st.text) {
          st.text = text;
          if (lab.text) lab.text.textContent = text;
        }
      }
      let transform: string;
      let arrow = 'none';
      if (p.onScreen) {
        // Justo debajo del disco (diminuto) de la luna; si choca con otra etiqueta, un poco más abajo
        let y = p.sy + 9;
        for (const u of used) if (Math.abs(u.x - p.sx) < 70 && Math.abs(u.y - y) < 18) y = u.y + 18;
        used.push({ x: p.sx, y });
        transform = `translate3d(${p.sx.toFixed(1)}px, ${y.toFixed(1)}px, 0) translateX(-50%)`;
      } else {
        // Fuera de la vista: en el borde del área libre, en la línea hacia la luna, con una flecha
        const left = 70;
        const right = w - 70;
        const ox = w / 2;
        const oy = (top + bottom) / 2;
        let dx = p.sx - ox;
        let dy = p.sy - oy;
        if (Math.abs(dx) < 1e-3 && Math.abs(dy) < 1e-3) dy = -1;
        const tx = dx !== 0 ? (dx > 0 ? right - ox : left - ox) / dx : Infinity;
        const ty = dy !== 0 ? (dy > 0 ? bottom - oy : top - oy) / dy : Infinity;
        const t = Math.max(0, Math.min(tx, ty));
        transform = `translate3d(${(ox + dx * t).toFixed(1)}px, ${(oy + dy * t).toFixed(1)}px, 0) translate(-50%, -50%)`;
        arrow = `rotate(${Math.atan2(dy, dx).toFixed(3)}rad)`;
      }
      if (transform !== st.transform) {
        st.transform = transform;
        lab.el.style.transform = transform;
      }
      if (arrow !== st.arrow) {
        st.arrow = arrow;
        if (lab.arrow) {
          lab.arrow.style.display = arrow === 'none' ? 'none' : '';
          if (arrow !== 'none') lab.arrow.style.transform = arrow;
        }
        if (lab.tick) lab.tick.style.display = arrow === 'none' ? '' : 'none';
      }
      setShown(true);
    }
  }

  public registerSunMarker(el: HTMLElement | null): void {
    this.sunMarkerEl = el;
    this.sunMarkerArrow = el?.querySelector<HTMLElement>('[data-sun-arrow]') ?? null;
    this.sunMarkerText = el?.querySelector<HTMLElement>('[data-sun-text]') ?? null;
    this.sunMarkerState = { shown: null, transform: '', arrow: '', text: '', w: 0, h: 0 };
  }

  private formatSunDistance(au: number): { dist: string; light: string } {
    const fmt = (v: number, d: number) => formatNumber(v, locale(), d);
    const lightMin = au * 8.3167;
    const light =
      lightMin < 1
        ? `${Math.max(1, Math.round(lightMin * 60))} ${tr('s luz', 'light-s')}`
        : lightMin < 60
          ? `${fmt(lightMin, 1)} ${tr('min luz', 'light-min')}`
          : `${fmt(lightMin / 60, 1)} ${tr('h luz', 'light-h')}`;
    const dist = au < 0.05 ? `${fmt(au * 149.6, 1)} M km` : `${fmt(au, au < 10 ? 2 : 1)} ${tr('UA', 'AU')}`;
    return { dist, light };
  }

  /** Heliocentric distance (AU) of whatever the user is looking at right now. */
  private currentSunDistanceAu(): number {
    const mission = this.surfaceMission ?? (this.focusedMissionId
      ? this.beaconsByMissionId.get(this.focusedMissionId)?.mission
      : undefined);
    if (mission?.sunDistanceAu) return mission.sunDistanceAu;
    if (this.focusedMissionId) {
      const b = this.beaconsByMissionId.get(this.focusedMissionId);
      if (b) return b.currentWorldPos.length() / AU_TO_UNITS;
    }
    if (this.focusedMoonId) {
      const m = this.moonsById.get(this.focusedMoonId);
      if (m) return m.currentWorldPos.length() / AU_TO_UNITS;
    }
    if (this.focusedBodyId) {
      const b = this.bodies.get(this.focusedBodyId);
      if (b) return b.currentWorldPos.length() / AU_TO_UNITS;
    }
    return this.camera.position.length() / AU_TO_UNITS;
  }

  private setSunMarkerShown(shown: boolean): void {
    const el = this.sunMarkerEl;
    if (!el || this.sunMarkerState.shown === shown) return;
    this.sunMarkerState.shown = shown;
    el.style.opacity = shown ? '1' : '0';
    el.style.pointerEvents = shown ? 'auto' : 'none';
  }

  private updateSunMarker(): void {
    const el = this.sunMarkerEl;
    if (!el) return;
    const inSpace = !this.surfaceDiorama && !this.deepSpaceDiorama;
    // Overview already shows the "Sol" label (clickable); at the Sun itself no marker is needed.
    const overviewLabels =
      inSpace && !this.focusedBodyId && this.showLabels && !this.isFlying;
    const atSun =
      inSpace && this.focusedBodyId === 'sun' && !this.focusedMoonId && !this.focusedMissionId;
    if (overviewLabels || atSun) {
      this.setSunMarkerShown(false);
      return;
    }
    this.setSunMarkerShown(true);
    const state = this.sunMarkerState;

    // Text (throttled: distances change slowly)
    const now = performance.now();
    if (now - this.lastSunTextAt > 400 || !state.text) {
      this.lastSunTextAt = now;
      // Compact on screen (Sun icon + distance); the full detail goes in the tooltip / label
      let text: string;
      let detail: string;
      if (this.deepSpaceDiorama) {
        const t = DEEP_SPACE_TARGETS.find((d) => d.id === this.activeDeepSpaceId);
        text = t ? t.distanceLabel : tr('Brazo de Orión', 'Orion Arm');
        detail = `${tr('Sol', 'Sun')} · ${text}`;
      } else {
        const d = this.formatSunDistance(this.currentSunDistanceAu());
        text = d.dist;
        detail = `${tr('Sol', 'Sun')} · ${d.dist} · ${d.light}`;
      }
      if (text !== state.text) {
        state.text = text;
        if (this.sunMarkerText) this.sunMarkerText.textContent = text;
        el.title = `${detail}. ${tr('Toca para ir al Sol.', 'Tap to go to the Sun.')}`;
        el.setAttribute('aria-label', `${tr('Ir al Sol', 'Go to the Sun')} (${detail})`);
        state.w = el.offsetWidth;
        state.h = el.offsetHeight;
      }
    }

    const w = this.viewportW || window.innerWidth;
    const h = this.viewportH || window.innerHeight;
    const mw = state.w || 90;
    const mh = state.h || 20;
    const top = Math.max(64, this.viewInsetTop + 10) + mh / 2;
    const bottom = h - Math.max(104, this.viewInsetBottom + 10) - mh / 2;
    const left = 10 + mw / 2;
    const right = w - 10 - mw / 2;

    let cx: number;
    let cy: number;
    let arrow = 'none';

    if (this.deepSpaceDiorama) {
      // Thousands of light-years away: no on-screen direction, keep it pinned under the header.
      cx = w / 2;
      cy = top;
    } else {
      if (this.surfaceDiorama) {
        _projVec.copy(this.surfaceSunLocal).multiplyScalar(420);
      } else {
        _projVec.set(0, 0, 0);
      }
      _projVec.project(this.camera);
      const behind = _projVec.z > 1;
      let nx = _projVec.x;
      let ny = _projVec.y;
      if (behind) {
        nx = -nx;
        ny = -ny;
      }
      const sx = (nx * 0.5 + 0.5) * w;
      const sy = (-ny * 0.5 + 0.5) * h;
      const onScreen = !behind && sx >= left && sx <= right && sy - mh >= top - mh / 2 && sy <= bottom + mh;
      if (onScreen) {
        cx = THREE.MathUtils.clamp(sx, left, right);
        cy = THREE.MathUtils.clamp(sy - mh, top, bottom);
        arrow = 'rotate(90deg)';
      } else {
        // Pin to the edge of the free area, on the line from its centre toward the Sun
        const ox = w / 2;
        const oy = (top + bottom) / 2;
        let dx = sx - ox;
        let dy = sy - oy;
        if (Math.abs(dx) < 1e-3 && Math.abs(dy) < 1e-3) dy = -1;
        const tx = dx !== 0 ? (dx > 0 ? right - ox : left - ox) / dx : Infinity;
        const ty = dy !== 0 ? (dy > 0 ? bottom - oy : top - oy) / dy : Infinity;
        const t = Math.max(0, Math.min(tx, ty));
        cx = ox + dx * t;
        cy = oy + dy * t;
        arrow = `rotate(${Math.atan2(dy, dx).toFixed(3)}rad)`;
      }
    }

    const transform = `translate3d(${(cx - mw / 2).toFixed(1)}px, ${(cy - mh / 2).toFixed(1)}px, 0)`;
    if (transform !== state.transform) {
      state.transform = transform;
      el.style.transform = transform;
    }
    if (arrow !== state.arrow && this.sunMarkerArrow) {
      state.arrow = arrow;
      this.sunMarkerArrow.style.display = arrow === 'none' ? 'none' : '';
      if (arrow !== 'none') this.sunMarkerArrow.style.transform = arrow;
    }
  }

  public registerLabelElement(
    id: CelestialBodyId,
    element: HTMLElement | null,
  ): void {
    if (element) {
      this.labelElements.set(id, element);
    } else {
      this.labelElements.delete(id);
    }
    // A fresh element has no cached style yet; make the next frame write every label.
    this.labelsAllHidden = false;
  }

  /**
   * Object kept in frame next to a focused planet, at its real position (the Moon for the Earth).
   * Returns its world position, or null.
   */
  private getFramingCompanion(bodyId: CelestialBodyId): THREE.Vector3 | null {
    if (bodyId !== 'earth') return null;
    return this.moonsById.get('luna')?.currentWorldPos ?? null;
  }

  /**
   * Camera direction that shows the planet and its companion together, without moving either:
   * the camera sits on the far side of the planet, looking almost toward the companion, which
   * then appears beside the planet (to the side on wide screens, above on tall ones) at its real
   * position and real angular size.
   */
  private companionViewOffset(
    worldPos: THREE.Vector3,
    radius: number,
    dist: number,
    companion: THREE.Vector3,
    out: THREE.Vector3,
  ): boolean {
    const u = _vec3C.subVectors(companion, worldPos);
    const dM = u.length();
    if (dM < dist * 1.5) return false;
    u.divideScalar(dM);
    const aspect = this.camera.aspect;
    const halfV = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const halfH = Math.atan(Math.tan(halfV) * aspect);
    const wide = aspect >= 1;
    const halfAxis = wide ? halfH : halfV;
    // Clear of the planet's disc (and its glow), well inside the frame
    const planetHalf = Math.asin(Math.min(0.99, radius / dist));
    const alpha = Math.min(planetHalf * 1.45 + THREE.MathUtils.degToRad(3), halfAxis * 0.72);
    if (alpha <= planetHalf) return false;
    // Angle between the view direction and the planet -> companion line
    const theta = alpha + Math.asin(Math.min(1, (dist * Math.sin(alpha)) / dM));

    const up = _vec3D.set(0, 1, 0);
    const w = new THREE.Vector3();
    if (wide) {
      // Horizontal offset; pick the side that puts the camera more toward the Sun (lit faces)
      w.crossVectors(u, up);
      if (w.lengthSq() < 1e-8) w.set(1, 0, 0);
      w.normalize();
      const sun = new THREE.Vector3().copy(worldPos).negate().normalize();
      const vA = new THREE.Vector3().copy(u).multiplyScalar(Math.cos(theta)).addScaledVector(w, Math.sin(theta));
      const vB = new THREE.Vector3().copy(u).multiplyScalar(Math.cos(theta)).addScaledVector(w, -Math.sin(theta));
      if (vB.dot(sun) < vA.dot(sun)) w.negate();
    } else {
      // Companion above the planet: the view direction tilts below the planet -> companion line
      w.copy(up).addScaledVector(u, -up.dot(u));
      if (w.lengthSq() < 1e-8) w.set(0, 0, 1);
      w.normalize().negate();
    }
    const v = new THREE.Vector3().copy(u).multiplyScalar(Math.cos(theta)).addScaledVector(w, Math.sin(theta)).normalize();
    // Camera behind the planet along -v
    out.copy(v).multiplyScalar(-dist);
    return true;
  }

  private computeIdealCameraOffset(
    worldPos: THREE.Vector3,
    radius: number,
    distanceFactor: number,
    isSun: boolean,
    isSaturn: boolean,
    out: THREE.Vector3,
    companion: THREE.Vector3 | null = null,
  ): void {
    const dist = radius * distanceFactor * this.getFramingFitFactor();
    if (isSun) {
      out.set(dist * 0.45, dist * 0.32, dist * 0.85);
      return;
    }
    if (companion && this.companionViewOffset(worldPos, radius, dist, companion, out)) return;

    _vec3C.copy(worldPos).normalize();
    const tangentX = -_vec3C.z;
    const tangentZ = _vec3C.x;
    const elevation = isSaturn ? 0.42 : 0.25;
    out
      .set(
        -_vec3C.x * 0.62 + tangentX * 0.74,
        elevation,
        -_vec3C.z * 0.62 + tangentZ * 0.74,
      )
      .normalize()
      .multiplyScalar(dist);
  }

  private updateFocusShadowRig(): void {
    if (!this.focusShadowLight) return;

    if (
      !this.focusedBodyId ||
      this.focusedBodyId === 'sun' ||
      this.surfaceDiorama ||
      this.deepSpaceDiorama
    ) {
      this.focusShadowLight.visible = false;
      this.sunPointLight.intensity = 1680000;
      return;
    }

    const runtime = this.bodies.get(this.focusedBodyId);
    if (!runtime) {
      this.focusShadowLight.visible = false;
      this.sunPointLight.intensity = 1680000;
      return;
    }

    const focusedMoon = this.focusedMoonId
      ? this.moonsById.get(this.focusedMoonId)
      : undefined;
    const targetPos = focusedMoon
      ? focusedMoon.currentWorldPos
      : runtime.currentWorldPos;
    const dist = targetPos.length();
    if (dist < 1) {
      this.focusShadowLight.visible = false;
      this.sunPointLight.intensity = 1680000;
      return;
    }

    // Direction FROM target TOWARD the Sun at world origin
    const sunDir = _vec3A.copy(targetPos).normalize().negate();

    // Match inverse-square solar irradiance at target distance while letting DirectionalLight cast 100% crisp dark shadows
    this.sunPointLight.intensity = 0;
    this.focusShadowLight.intensity = 1680000 / (dist * dist);
    this.focusShadowLight.visible = true;

    let boxHalf: number;
    let lightBackDist: number;
    let farDist: number;

    if (focusedMoon) {
      boxHalf = Math.max(focusedMoon.data.radius * 3.2, 0.8);
      lightBackDist = Math.max(boxHalf * 2.6, 6);
      farDist = lightBackDist + boxHalf * 3.0;

      // Include parent planet + rings in shadow frustum whenever parent can eclipse the focused moon
      const toParent = _vec3B.subVectors(runtime.currentWorldPos, targetPos);
      const alongSun = toParent.dot(sunDir);
      const perpSq = Math.max(0, toParent.lengthSq() - alongSun * alongSun);
      const perpDist = Math.sqrt(perpSq);
      const parentExtent = runtime.data.rings
        ? runtime.data.visualRadius * runtime.data.rings.outerMultiplier
        : runtime.data.visualRadius;

      if (alongSun > -parentExtent * 1.4 && perpDist < parentExtent * 2.1 + boxHalf) {
        boxHalf = Math.min(Math.max(boxHalf, perpDist + parentExtent * 1.25), 42);
        lightBackDist = Math.max(lightBackDist, alongSun + parentExtent * 2.2);
        farDist = lightBackDist + boxHalf * 3.0;
      }
    } else {
      boxHalf = runtime.data.rings
        ? runtime.data.visualRadius * runtime.data.rings.outerMultiplier * 1.25
        : runtime.data.visualRadius * 2.8;

      let extraAntiSunFar = 0;
      for (const m of runtime.moons) {
        if (m.data.orbitRadius <= runtime.data.visualRadius * 9.0) {
          boxHalf = Math.max(boxHalf, m.data.orbitRadius + m.data.radius * 2.5);
        } else {
          // Extend depth range if a distant moon enters the planet's antisolar shadow cone
          const toMoon = _vec3B.subVectors(m.currentWorldPos, targetPos);
          const alongAntiSun = -toMoon.dot(sunDir);
          const perp = Math.sqrt(Math.max(0, toMoon.lengthSq() - alongAntiSun * alongAntiSun));
          if (alongAntiSun > 0 && perp < runtime.data.visualRadius * 2.2) {
            extraAntiSunFar = Math.max(extraAntiSunFar, alongAntiSun + m.data.radius * 3.0);
          }
        }
      }

      boxHalf = Math.min(boxHalf, 48);
      lightBackDist = Math.max(boxHalf * 2.6, 12);
      farDist = lightBackDist + Math.max(boxHalf * 2.8, extraAntiSunFar + boxHalf);
    }

    this.focusShadowLight.position
      .copy(targetPos)
      .addScaledVector(sunDir, lightBackDist);
    this.focusShadowLight.target.position.copy(targetPos);
    this.focusShadowLight.target.updateMatrixWorld();

    const cam = this.focusShadowLight.shadow.camera;
    cam.left = -boxHalf;
    cam.right = boxHalf;
    cam.top = boxHalf;
    cam.bottom = -boxHalf;
    cam.near = 0.5;
    cam.far = farDist;
    cam.updateProjectionMatrix();
  }

  private updateSunVisualIntensity(dt: number): void {
    const isFocusedOnSun =
      this.focusedBodyId === 'sun' &&
      !this.surfaceDiorama &&
      !this.deepSpaceDiorama;
    const targetBoost = isFocusedOnSun ? 1 : 0;
    this.sunFocusBoost = THREE.MathUtils.damp(this.sunFocusBoost, targetBoost, 5.5, dt);

    if (this.sunSurfaceMat) {
      this.sunSurfaceMat.uniforms.uFocusBoost.value = this.sunFocusBoost;
    }
    if (this.sunChromoMat) {
      this.sunChromoMat.uniforms.uFocusBoost.value = this.sunFocusBoost;
    }
    for (const pMat of this.sunProminenceMats) {
      pMat.uniforms.uFocusBoost.value = this.sunFocusBoost;
    }
    // Sun's own light capped at its Mars-distance screen brightness (see SUN_MAX_SCREEN_EXPOSURE)
    const sunComp = this.composer
      ? Math.min(1, SUN_MAX_SCREEN_EXPOSURE / Math.max(this.currentExposure, 1e-3))
      : 1;
    if (this.sunSurfaceMat) this.sunSurfaceMat.uniforms.uExposureComp.value = sunComp;
    if (this.sunChromoMat) this.sunChromoMat.uniforms.uExposureComp.value = sunComp;
    for (const pMat of this.sunProminenceMats) {
      pMat.uniforms.uExposureComp.value = sunComp;
    }
    if (this.sunInnerGlowMat) {
      this.sunInnerGlowMat.opacity = THREE.MathUtils.lerp(0.56, 1.0, this.sunFocusBoost);
      this.sunInnerGlowMat.color.copy(SUN_INNER_GLOW_COLOR).multiplyScalar(sunComp);
    }
    if (this.sunOuterGlowMat) {
      this.sunOuterGlowMat.opacity = THREE.MathUtils.lerp(0.22, 0.58, this.sunFocusBoost);
      this.sunOuterGlowMat.color.copy(SUN_OUTER_GLOW_COLOR).multiplyScalar(sunComp);
    }
    if (this.bloomPass) {
      if (this.deepSpaceDiorama) {
        this.bloomPass.strength = 0.56;
        this.bloomPass.threshold = 0.84;
      } else if (this.surfaceDiorama) {
        this.bloomPass.strength = 0.14;
        this.bloomPass.threshold = 1.12;
      } else {
        // Bloom runs before the exposure is applied, so beyond Mars the auto-exposure blew the
        // glare of self-lit things (Sun, comet 67P's coma) up into large halos. Same cap as the Sun.
        this.bloomPass.strength =
          THREE.MathUtils.lerp(0.32, 0.66, this.sunFocusBoost) * sunComp;
        this.bloomPass.threshold = THREE.MathUtils.lerp(0.94, 0.78, this.sunFocusBoost);
      }
    }

    // Star-like minimum size for the Sun when its true disc is sub-pixel (outer Solar System)
    if (this.sunInnerGlow && this.sunOuterGlow) {
      const camDist = this.camera.position.length();
      const fovRad = THREE.MathUtils.degToRad(this.camera.fov);
      const pxPerUnit = (this.viewportH || window.innerHeight) / (2 * Math.tan(fovRad / 2) * camDist);
      const minDiameter = (2 * SUN_MIN_GLOW_RADIUS_PX) / Math.max(pxPerUnit, 1e-9);
      const inner = Math.max(this.sunGlowBaseScale.inner, minDiameter);
      const outer = Math.max(this.sunGlowBaseScale.outer, minDiameter * 1.6);
      if (this.sunInnerGlow.scale.x !== inner) this.sunInnerGlow.scale.set(inner, inner, 1);
      if (this.sunOuterGlow.scale.x !== outer) this.sunOuterGlow.scale.set(outer, outer, 1);
      // As a point source the Sun reads as a brilliant white star, not an orange disc
      const star = THREE.MathUtils.clamp(minDiameter / this.sunGlowBaseScale.inner - 1, 0, 1);
      if (star > 0 && this.sunInnerGlowMat && this.sunOuterGlowMat) {
        this.sunInnerGlowMat.color.lerp(_color.copy(STAR_WHITE).multiplyScalar(sunComp * 2.2), star);
        this.sunOuterGlowMat.color.multiplyScalar(1 - 0.6 * star);
      }
    }
  }

  private updateAstrophysicalExposure(dt: number): void {
    if (this.deepSpaceDiorama) {
      this.currentExposure = THREE.MathUtils.damp(
        this.currentExposure,
        1.25,
        6.5,
        dt,
      );
      this.renderer.toneMappingExposure = this.currentExposure;
      return;
    }

    if (this.surfaceDiorama) {
      this.currentExposure = THREE.MathUtils.damp(
        this.currentExposure,
        1.05,
        6.5,
        dt,
      );
      this.renderer.toneMappingExposure = this.currentExposure;
      return;
    }

    // Spacecraft optical auto-exposure compensates for inverse-square (decay=2) sunlight while keeping sunlit hemispheres luminous & unclipped
    const camAU = Math.max(0.22, this.camera.position.length() / AU_TO_UNITS);
    let targetExp = THREE.MathUtils.clamp(
      0.56 * Math.pow(camAU, 1.92),
      0.068,
      290,
    );
    if (this.focusedBodyId === 'sun') {
      targetExp = 0.95;
    } else if (!this.focusedBodyId && camAU > 2.2) {
      targetExp = THREE.MathUtils.clamp(0.54 * Math.pow(camAU, 0.88), 0.72, 6.2);
    }
    this.currentExposure = THREE.MathUtils.damp(
      this.currentExposure,
      targetExp,
      6.5,
      dt,
    );
    this.renderer.toneMappingExposure = this.currentExposure;
  }

  /**
   * Auroras and moon plumes emit their own light, but the auto-exposure scales every pixel by up to
   * ~40x at Saturn to make up for the weak sunlight there. Applied to these effects, that gain blew
   * them out into white "spotlights" on the poles. Dividing by the current exposure keeps their
   * on-screen brightness constant at any distance; sunlit surfaces and atmospheres are untouched.
   */
  private updateSelfEmissiveExposure(): void {
    // Exposure is only applied by the composer's OutputPass; the software-GL path renders raw values.
    const inv = this.composer ? 1 / Math.max(this.currentExposure, 1e-3) : 1;
    const auroraComp = AURORA_SCREEN_GAIN * inv;
    for (const aMat of this.auroraMats) {
      aMat.uniforms.uExposureComp.value = auroraComp;
    }
    if (this.cityLightsMat) {
      this.cityLightsMat.uniforms.uExposureComp.value = CITY_LIGHTS_SCREEN_GAIN * inv;
    }
    const plumeComp = PLUME_SCREEN_GAIN * inv;
    for (const plume of this.moonPlumes) {
      plume.material.color.copy(plume.baseColor).multiplyScalar(plumeComp);
    }

    // Background sky and atmosphere glows: only capped from above, never brightened
    const skyComp = Math.min(1, SKY_MAX_SCREEN_EXPOSURE * inv);
    if (Math.abs(skyComp - this.lastSkyComp) > 1e-4) {
      this.lastSkyComp = skyComp;
      for (const sky of this.skyMats) {
        sky.material.color.copy(sky.baseColor).multiplyScalar(skyComp);
      }
    }
    // The comet's coma and tails are thin, faint light: same on-screen brightness at any exposure
    this.cometFx?.setGain(inv);
    const atmoComp = Math.min(1, OUTER_ATMOSPHERE_MAX_SCREEN_EXPOSURE * inv);
    if (Math.abs(atmoComp - this.lastAtmoComp) > 1e-4) {
      this.lastAtmoComp = atmoComp;
      for (const atmo of this.outerAtmosphereMats) {
        atmo.material.uniforms.uIntensity.value = atmo.baseIntensity * atmoComp;
      }
    }
  }

  private updateOrbitVisibility(dt: number): void {
    // Clean Travel: fade orbits completely to 0 during FlyTo or while focused on any planet/moon/mission
    const cleanTravelHidden =
      this.focusedBodyId !== null ||
      this.isFlying ||
      this.deepSpaceDiorama !== null;
    const targetOpacity = this.showOrbits && !cleanTravelHidden ? 0.14 : 0;

    this.currentOrbitOpacity = THREE.MathUtils.damp(
      this.currentOrbitOpacity,
      targetOpacity,
      8.0,
      dt,
    );

    const visible = this.currentOrbitOpacity > 0.004;
    this.bodies.forEach((runtime) => {
      if (!runtime.orbitLine) return;
      runtime.orbitLine.visible = visible;
      if (visible) {
        const mat = runtime.orbitLine.material as THREE.LineBasicMaterial;
        mat.opacity = this.currentOrbitOpacity;
      }
    });
  }

  private updateSimulation(dt: number): void {
    this.updateShipOverlay(dt);
    this.updateViewOffset(dt);
    this.updateFramingZoom(dt);
    if (!this.isPaused) {
      this.simEpochMs += dt * 1000 * this.timeMultiplier;
    }
    this.surfaceElapsed += dt;

    const dJ2000 = daysSinceJ2000(this.simEpochMs);
    this.applyJ2000State(dJ2000, false);

    // Ilustrativo (no son las erupciones reales de hoy): la superficie hierve el doble de rápido
    // que antes para que en tiempo real (1×) no parezca quieta.
    this.sunAnimTime +=
      dt * 2 * (this.isPaused ? 0.2 : 1 + Math.log10(Math.max(1, this.timeMultiplier)) * 0.4);
    if (this.sunSurfaceMat) {
      this.sunSurfaceMat.uniforms.uTime.value = this.sunAnimTime;
    }
    for (const pMat of this.sunProminenceMats) {
      pMat.uniforms.uTime.value = this.surfaceElapsed;
    }
    // Ciclo de vida de cada protuberancia: crece y sube, brilla en su punto más alto
    // (destello breve, como una erupción) y se desvanece antes de volver a nacer.
    for (const pr of this.sunProminences) {
      const u = (((this.surfaceElapsed + pr.offset) / pr.period) % 1 + 1) % 1;
      const life = Math.pow(Math.sin(Math.PI * u), 0.7);
      const grow = 0.55 + 0.75 * (u * u * (3 - 2 * u));
      pr.mesh.scale.setScalar(grow);
      pr.mat.uniforms.uLife.value = life;
      pr.mat.uniforms.uFlare.value = Math.exp(-Math.pow((u - 0.62) / 0.06, 2));
    }
    for (const aMat of this.auroraMats) {
      aMat.uniforms.uTime.value = this.surfaceElapsed;
    }
    if (this.cometFx) {
      const comet = this.bodies.get('comet67p');
      const au = comet ? comet.currentWorldPos.length() / AU_TO_UNITS : 5;
      this.cometFx.update(dt, this.surfaceElapsed, cometActivity(au));
    }
    for (const plume of this.moonPlumes) {
      const geo = plume.points.geometry;
      const pos = geo.attributes.position.array as Float32Array;
      const col = geo.attributes.color.array as Float32Array;
      const { dirs, age, radius } = plume;
      for (let i = 0; i < age.length; i++) {
        let a = age[i] + dt * plume.speed;
        if (a > 1) a -= 1;
        age[i] = a;
        // Rises up to ~1.4 radii above the pole, spreading slightly, fading as it thins out
        const h = radius * (0.98 + 1.4 * a);
        pos[i * 3] = dirs[i * 3] * h * (1 + a * 1.1);
        pos[i * 3 + 1] = dirs[i * 3 + 1] * h;
        pos[i * 3 + 2] = dirs[i * 3 + 2] * h * (1 + a * 1.1);
        // Dim per grain: together they read as a fine mist rather than separate dots
        const b = 0.22 * THREE.MathUtils.smoothstep(a, 0, 0.08) * Math.pow(1 - a, 1.6);
        col[i * 3] = b;
        col[i * 3 + 1] = b;
        col[i * 3 + 2] = b;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    }

    if (this.asteroidBelt && !this.isPaused) {
      this.asteroidBelt.rotation.y += dt * this.timeMultiplier * 1.2e-7;
    }
    if (this.kuiperBelt && !this.isPaused) {
      this.kuiperBelt.rotation.y += dt * this.timeMultiplier * 2.5e-8;
    }
    for (const sat of this.orbitSatellites) {
      sat.pivot.rotation.y += dt * sat.speed;
      if (sat.ledMat) {
        const pulse = Math.sin(this.surfaceElapsed * 4.2 + sat.phase) > 0.35 ? 1.0 : 0.25;
        sat.ledMat.opacity = pulse;
      }
    }

    this.updateFocusShadowRig();
    this.updateAstrophysicalExposure(dt);
    this.updateSelfEmissiveExposure();
    this.updateSunVisualIntensity(dt);

    if (this.deepSpaceDiorama) {
      this.deepSpaceDiorama.update(dt, this.surfaceElapsed);
      this.controls.update();
      this.updateOrbitVisibility(dt);
      this.updateProjectedLabels();
    } else if (this.surfaceDiorama) {
      this.updateSurfaceSunOrientation();
      this.surfaceDiorama.update(dt, this.surfaceElapsed);
      this.controls.update();
      this.updateOrbitVisibility(dt);
      this.updateProjectedLabels();
    } else {
      // Free-flight WASD / Arrow movement in Space Mode
      const hasMoveKey =
        this.keysPressed.has('KeyW') ||
        this.keysPressed.has('KeyS') ||
        this.keysPressed.has('KeyA') ||
        this.keysPressed.has('KeyD') ||
        this.keysPressed.has('KeyQ') ||
        this.keysPressed.has('KeyE') ||
        this.keysPressed.has('ArrowUp') ||
        this.keysPressed.has('ArrowDown') ||
        this.keysPressed.has('ArrowLeft') ||
        this.keysPressed.has('ArrowRight');

      if (hasMoveKey) {
        if (this.isTracking || this.isFlying) {
          this.releaseTracking();
        }
        const distFromTarget = this.camera.position.distanceTo(
          this.controls.target,
        );
        const moveSpeed = Math.max(6, distFromTarget * 0.75) * dt;

        this.camera.getWorldDirection(_vec3A);
        _vec3B.crossVectors(_vec3A, this.camera.up).normalize();

        const moveDelta = _vec3C.set(0, 0, 0);
        if (this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp')) {
          moveDelta.addScaledVector(_vec3A, moveSpeed);
        }
        if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown')) {
          moveDelta.addScaledVector(_vec3A, -moveSpeed);
        }
        if (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight')) {
          moveDelta.addScaledVector(_vec3B, moveSpeed);
        }
        if (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft')) {
          moveDelta.addScaledVector(_vec3B, -moveSpeed);
        }
        if (this.keysPressed.has('KeyE')) moveDelta.y += moveSpeed;
        if (this.keysPressed.has('KeyQ')) moveDelta.y -= moveSpeed;

        this.camera.position.add(moveDelta);
        this.controls.target.add(moveDelta);
      }

      // Tracking & FlyTo / FlyTo Surface camera motion
      if (this.focusedBodyId && this.isTracking) {
        const targetMissionBeacon = this.focusedMissionId
          ? this.beaconsByMissionId.get(this.focusedMissionId)
          : undefined;
        const targetMoon = this.focusedMoonId
          ? this.moonsById.get(this.focusedMoonId)
          : undefined;
        const targetPlanet = this.bodies.get(this.focusedBodyId);

        if (targetMissionBeacon) {
          _vec3A.subVectors(
            targetMissionBeacon.currentWorldPos,
            targetMissionBeacon.lastWorldPos,
          );
          this.camera.position.add(_vec3A);
          this.controls.target.add(_vec3A);

          if (this.isFlying) {
            const r = targetMissionBeacon.hostRadius;
            _vec3D.copy(targetMissionBeacon.worldNormal);
            _vec3B
              .set(-_vec3D.z, 0.25, _vec3D.x)
              .normalize()
              .multiplyScalar(r * 0.55 * this.getFramingFitFactor())
              .addScaledVector(_vec3D, r * 1.45 * this.getFramingFitFactor());

            this.flightLookTarget.copy(targetMissionBeacon.currentWorldPos);
            this.flightTargetPos
              .copy(targetMissionBeacon.currentWorldPos)
              .add(_vec3B);
            this.dampCameraToFlightTarget(dt);
          }

          if (this.pendingSurfaceMission) {
            this.surfaceApproachElapsed += dt;
            const distToSite = this.camera.position.distanceTo(
              targetMissionBeacon.currentWorldPos,
            );
            if (
              distToSite < targetMissionBeacon.hostRadius * 3.8 ||
              this.surfaceApproachElapsed > 1.25
            ) {
              if (surfaceModule) {
                this.enterSurfaceMode(this.pendingSurfaceMission);
              } else {
                // Keep tracking the landing site until the chunk arrives (normally already preloaded)
                void loadSurfaceModule().catch(() => {});
              }
            }
          }
        } else if (targetMoon) {
          _vec3A.subVectors(
            targetMoon.currentWorldPos,
            targetMoon.lastWorldPos,
          );
          this.camera.position.add(_vec3A);
          this.controls.target.add(_vec3A);

          if (this.isFlying) {
            this.computeIdealCameraOffset(
              targetMoon.currentWorldPos,
              targetMoon.data.radius,
              4.0,
              false,
              false,
              _vec3B,
            );
            this.flightLookTarget.copy(targetMoon.currentWorldPos);
            this.flightTargetPos.copy(targetMoon.currentWorldPos).add(_vec3B);
            this.dampCameraToFlightTarget(dt);
          }
        } else if (targetPlanet) {
          _vec3A.subVectors(
            targetPlanet.currentWorldPos,
            targetPlanet.lastWorldPos,
          );
          this.camera.position.add(_vec3A);
          this.controls.target.add(_vec3A);

          if (this.isFlying) {
            this.computeIdealCameraOffset(
              targetPlanet.currentWorldPos,
              targetPlanet.data.visualRadius,
              targetPlanet.data.cameraDistanceFactor,
              targetPlanet.data.id === 'sun',
              targetPlanet.data.id === 'saturn',
              _vec3B,
              this.getFramingCompanion(targetPlanet.data.id),
            );
            this.flightLookTarget.copy(targetPlanet.currentWorldPos);
            this.flightTargetPos.copy(targetPlanet.currentWorldPos).add(_vec3B);
            this.dampCameraToFlightTarget(dt);
          }
        }
      } else if (this.isFlying) {
        this.dampCameraToFlightTarget(dt);
      }

      this.controls.update();
      this.updateOrbitVisibility(dt);
      this.updateProjectedLabels();
    }

    this.updateSunMarker();
    this.updateCompanionLabels();
    this.updateSurfaceLabels();

    const now = performance.now();
    if (now - this.lastHudSync > 120) {
      this.lastHudSync = now;
      let sunlit: boolean | null = null;
      if (this.focusedMissionId) {
        const b = this.beaconsByMissionId.get(this.focusedMissionId);
        if (b && b.mission.missionRole === 'surface') {
          _vec3A.copy(b.currentWorldPos).negate().normalize();
          sunlit = b.worldNormal.dot(_vec3A) > 0;
        }
      }
      this.callbacks.onClockUpdate(this.simEpochMs, sunlit);
    }
  }

  private dampCameraToFlightTarget(dt: number): void {
    const remainingDist = this.camera.position.distanceTo(this.flightTargetPos);
    const lambda = remainingDist > 120 ? 3.2 : 4.6;

    this.controls.target.x = THREE.MathUtils.damp(
      this.controls.target.x,
      this.flightLookTarget.x,
      lambda + 1.4,
      dt,
    );
    this.controls.target.y = THREE.MathUtils.damp(
      this.controls.target.y,
      this.flightLookTarget.y,
      lambda + 1.4,
      dt,
    );
    this.controls.target.z = THREE.MathUtils.damp(
      this.controls.target.z,
      this.flightLookTarget.z,
      lambda + 1.4,
      dt,
    );

    this.camera.position.x = THREE.MathUtils.damp(
      this.camera.position.x,
      this.flightTargetPos.x,
      lambda,
      dt,
    );
    this.camera.position.y = THREE.MathUtils.damp(
      this.camera.position.y,
      this.flightTargetPos.y,
      lambda,
      dt,
    );
    this.camera.position.z = THREE.MathUtils.damp(
      this.camera.position.z,
      this.flightTargetPos.z,
      lambda,
      dt,
    );

    if (
      remainingDist < 0.12 &&
      this.controls.target.distanceTo(this.flightLookTarget) < 0.08
    ) {
      this.isFlying = false;
      this.callbacks.onArrive?.();
    }
  }

  private updateProjectedLabels(): void {
    const hideForCleanTravel =
      !this.showLabels ||
      this.focusedBodyId !== null ||
      this.isFlying ||
      this.surfaceDiorama !== null ||
      this.deepSpaceDiorama !== null;

    if (hideForCleanTravel) {
      if (!this.labelsAllHidden) {
        this.labelElements.forEach((el) => this.setLabelShown(el, false));
        this.labelsAllHidden = true;
      }
      return;
    }
    this.labelsAllHidden = false;

    const width = this.viewportW || window.innerWidth;
    const height = this.viewportH || window.innerHeight;

    this.bodies.forEach((runtime, id) => {
      const el = this.labelElements.get(id);
      if (!el) return;

      _projVec.copy(runtime.currentWorldPos);
      _projVec.y += runtime.data.visualRadius + (id === 'sun' ? 4.5 : 2.5);
      _projVec.project(this.camera);

      const isBehind = _projVec.z > 1 || _projVec.z < -1;
      const sx = (_projVec.x * 0.5 + 0.5) * width;
      const sy = (-_projVec.y * 0.5 + 0.5) * height;
      const outOfBounds =
        sx < -40 || sx > width + 40 || sy < -30 || sy > height + 30;

      if (isBehind || outOfBounds) {
        this.setLabelShown(el, false);
      } else {
        const cache = this.setLabelShown(el, true);
        const transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%)`;
        if (cache.transform !== transform) {
          cache.transform = transform;
          el.style.transform = transform;
        }
      }
    });
  }

  private setLabelShown(
    el: HTMLElement,
    shown: boolean,
  ): { shown: boolean | null; transform: string } {
    let cache = this.labelStyleCache.get(el);
    if (!cache) {
      cache = { shown: null, transform: '' };
      this.labelStyleCache.set(el, cache);
    }
    if (cache.shown !== shown) {
      cache.shown = shown;
      el.style.opacity = shown ? '0.9' : '0';
      el.style.pointerEvents = shown ? 'auto' : 'none';
    }
    return cache;
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop(): void {
    this.clock.start();
    const tick = () => {
      if (this.disposed) return;
      const dt = Math.min(this.clock.getDelta(), 0.1);
      this.updateSimulation(dt);

      if (this.renderSuspended) {
        // Covered by the hyperspace jump: nothing to draw
      } else if (this.isSoftwareGl || !this.composer) {
        this.renderer.render(this.scene, this.camera);
        if (this.shipOverlay?.isActive) {
          this.renderer.autoClear = false;
          this.renderer.clearDepth();
          this.renderer.render(this.shipOverlay.scene, this.shipOverlay.camera);
          this.renderer.autoClear = true;
        }
      } else {
        this.composer.render();
      }

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 0);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
    this.clearActive8KUpgrade();
    this.exitSurfaceMode();
    this.exitDeepSpaceMode();
    this.controls.dispose();
    this.composer?.dispose();
    this.shipOverlay?.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
