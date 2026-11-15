import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import {
  AbandonedMission,
  CraftModelType,
  MissionRole,
} from '../data/abandonedMissionsData';
import { CELESTIAL_BODIES } from '../data/solarSystemData';
import { getSoftDotTexture } from './cometEffects';
import {
  CraftTextureSet,
  createCraftTextureSet,
  createTerrainPBRTextures,
} from './craftTextures';
import {
  createDetailedSaturnRingTexture,
  createProceduralEarthClouds,
  createProceduralMoonTextureSet,
  createProceduralPlanetTextureSet,
} from './proceduralTextures';
import {
  Pbr8KCapabilities,
  processCraft8KPBR,
  processSurface8KPBR,
} from './highResPbrProcessor';
import type { CraftPbrProfile, SurfacePbrProfile } from './pbr8k.worker';

export type SurfaceCameraMode = 'rover' | 'pov';

THREE.Cache.enabled = true;

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
const nasaGltfLoader = new GLTFLoader();
nasaGltfLoader.setDRACOLoader(dracoLoader);
nasaGltfLoader.setCrossOrigin('anonymous');

interface NasaGlbSpec {
  path: string;
  targetMaxDim: number;
  anchor: 'ground' | 'center';
  rotY?: number;
  rotX?: number;
  offset?: [number, number, number];
  keepFallback?: boolean;
  companionPath?: string;
  companionMaxDim?: number;
  companionOffset?: [number, number, number];
}

const MISSION_GLB_MAP: Partial<Record<string, NasaGlbSpec>> = {
  perseverance: {
    path: '/models/perseverance.glb',
    targetMaxDim: 2.95,
    anchor: 'ground',
    rotY: Math.PI,
    companionPath: '/models/ingenuity.glb',
    companionMaxDim: 1.15,
    companionOffset: [1.95, 1.32, -1.1],
  },
  curiosity: {
    path: '/models/perseverance.glb',
    targetMaxDim: 2.95,
    anchor: 'ground',
    rotY: Math.PI,
  },
  insight: {
    path: '/models/insight.glb',
    targetMaxDim: 3.9,
    anchor: 'ground',
    rotY: Math.PI * 0.15,
  },
  apollo11: {
    path: '/models/apollo_lm.glb',
    targetMaxDim: 3.6,
    anchor: 'ground',
  },
  apollo12: {
    path: '/models/apollo_lm.glb',
    targetMaxDim: 3.6,
    anchor: 'ground',
  },
  apollo14: {
    path: '/models/apollo_lm.glb',
    targetMaxDim: 3.6,
    anchor: 'ground',
  },
  apollo15: {
    path: '/models/apollo_lm.glb',
    targetMaxDim: 3.6,
    anchor: 'ground',
  },
  apollo16: {
    path: '/models/apollo_lm.glb',
    targetMaxDim: 3.6,
    anchor: 'ground',
  },
  apollo17: {
    path: '/models/apollo_lm.glb',
    targetMaxDim: 3.6,
    anchor: 'ground',
  },
  hubble: {
    path: '/models/hubble.glb',
    targetMaxDim: 4.6,
    anchor: 'center',
    rotY: -Math.PI * 0.25,
  },
  jwst: {
    path: '/models/jwst.glb',
    targetMaxDim: 5.5,
    anchor: 'center',
    rotY: Math.PI * 0.85,
  },
  lro: {
    path: '/models/lro.glb',
    targetMaxDim: 4.0,
    anchor: 'center',
    rotY: Math.PI * 0.2,
  },
  mro: {
    path: '/models/mro.glb',
    targetMaxDim: 4.6,
    anchor: 'center',
    rotY: Math.PI * 0.1,
  },
  juno: {
    path: '/models/juno.glb',
    targetMaxDim: 6.4,
    anchor: 'center',
  },
  cassini: {
    path: '/models/cassini.glb',
    targetMaxDim: 3.9,
    anchor: 'center',
    rotY: Math.PI * 0.2,
  },
  huygens: {
    path: '/models/huygens.glb',
    targetMaxDim: 2.75,
    anchor: 'ground',
    rotY: Math.PI * 0.15,
  },
  messenger: {
    path: '/models/messenger.glb',
    targetMaxDim: 3.9,
    anchor: 'center',
    rotY: Math.PI * 0.25,
  },
  rosetta_philae: {
    path: '/models/rosetta.glb',
    targetMaxDim: 4.3,
    anchor: 'center',
    offset: [1.7, 2.55, -1.35],
    keepFallback: true, // Keep Philae lander sitting on Comet 67P below Rosetta!
  },
  ingenuity: {
    path: '/models/ingenuity.glb',
    targetMaxDim: 1.25,
    anchor: 'ground',
    rotY: Math.PI * 0.2,
  },
  voyager1: {
    path: '/models/voyager.glb',
    targetMaxDim: 5.1,
    anchor: 'center',
    rotY: -Math.PI * 0.35,
  },
  voyager2: {
    path: '/models/voyager.glb',
    targetMaxDim: 5.1,
    anchor: 'center',
    rotY: -Math.PI * 0.35,
  },
};

function disposeObjectTree(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const m of mats) {
        if (!m) continue;
        const std = m as THREE.MeshStandardMaterial;
        std.map?.dispose();
        std.normalMap?.dispose();
        std.roughnessMap?.dispose();
        std.metalnessMap?.dispose();
        std.emissiveMap?.dispose();
        m.dispose();
      }
    }
  });
}

function normalizeAndPrepareGlb(
  rawScene: THREE.Object3D,
  targetMaxDim: number,
  anchor: 'ground' | 'center',
  rotX = 0,
  rotY = 0,
  craftTex?: CraftTextureSet,
  pbrCaps?: Pbr8KCapabilities,
  abortSignal?: AbortSignal,
  disposables?: Array<{ dispose: () => void }>,
): THREE.Group {
  const wrapper = new THREE.Group();
  const model = rawScene;
  model.rotation.set(rotX, rotY, 0);
  model.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const scale = targetMaxDim / maxDim;
  model.scale.multiplyScalar(scale);
  model.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = new THREE.Vector3();
  scaledBox.getCenter(scaledCenter);

  model.position.x -= scaledCenter.x;
  model.position.z -= scaledCenter.z;
  if (anchor === 'ground') {
    model.position.y -= scaledBox.min.y;
  } else {
    model.position.y -= scaledCenter.y;
  }

  const matsByTexture = new Map<
    string,
    { image: CanvasImageSource; mats: THREE.MeshStandardMaterial[] }
  >();

  model.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const m of mats) {
        const std = m as THREE.MeshStandardMaterial;
        if (!std || !('envMapIntensity' in std)) continue;
        std.envMapIntensity = 0.94;

        if (std.map && std.map.image) {
          std.map.anisotropy = pbrCaps?.anisotropy ?? 4;
          const texUuid = std.map.uuid;
          let bucket = matsByTexture.get(texUuid);
          if (!bucket) {
            bucket = { image: std.map.image as CanvasImageSource, mats: [] };
            matsByTexture.set(texUuid, bucket);
          }
          bucket.mats.push(std);
        } else if (craftTex) {
          // Provide micro-surface brushed metal or aerospace panel PBR detail on untextured GLB sub-parts
          const isMetallic = (std.metalness ?? 0) > 0.45;
          if (!std.normalMap) {
            std.normalMap = isMetallic ? craftTex.brushedMetalNormal : craftTex.panelNormal;
            std.normalScale = new THREE.Vector2(0.45, 0.45);
          }
          if (!std.roughnessMap) {
            std.roughnessMap = isMetallic
              ? craftTex.brushedMetalRoughness
              : craftTex.panelRoughness;
          }
          if (!std.metalnessMap && isMetallic) {
            std.metalnessMap = craftTex.brushedMetalMetalness;
            std.metalness = 1.0;
          }
          std.needsUpdate = true;
        }
      }
    }
  });

  if (pbrCaps && matsByTexture.size > 0) {
    const texMaxW = matsByTexture.size > 3 ? 1024 : 2048;
    let idx = 0;
    matsByTexture.forEach(({ image, mats }) => {
      const seed = 313 + idx++ * 29;
      void processCraft8KPBR({
        albedoSource: image,
        craftProfile: 'auto',
        normalStrength: 3.2,
        skipAlbedo: true,
        maxWidth: texMaxW,
        seed,
        capabilities: pbrCaps,
        signal: abortSignal,
      }).then((set) => {
        if (!set || abortSignal?.aborted) {
          set?.dispose();
          return;
        }
        disposables?.push(set);
        const hasGltfUv = mats.some((m) => m.map?.flipY === false);
        if (hasGltfUv) {
          // Preserve GLTF UV orientation (glTF textures have flipY=false)
          if (set.map) {
            set.map.repeat.y = -1;
            set.map.offset.y = 1;
          }
          set.normalMap.repeat.y = -1;
          set.normalMap.offset.y = 1;
          set.roughnessMap.repeat.y = -1;
          set.roughnessMap.offset.y = 1;
          set.metalnessMap.repeat.y = -1;
          set.metalnessMap.offset.y = 1;
        }
        for (const std of mats) {
          if (set.map) {
            std.map = set.map;
          }
          if (!std.normalMap) {
            std.normalMap = set.normalMap;
            std.normalScale = new THREE.Vector2(0.75, hasGltfUv ? -0.75 : 0.75);
          }
          if (!std.roughnessMap) {
            std.roughnessMap = set.roughnessMap;
            std.roughness = 1.0;
          }
          if (!std.metalnessMap && (std.metalness ?? 0) > 0.35) {
            std.metalnessMap = set.metalnessMap;
          }
          std.needsUpdate = true;
        }
      });
    });
  }

  wrapper.add(model);
  return wrapper;
}

interface WorldVisualTheme {
  terrainBase: number;
  terrainAccent: number;
  rockColor: number;
  skyZenith: number;
  skyHorizon: number;
  fogColor: number | null;
  fogDensity: number;
  sunColor: number;
  sunIntensity: number;
  ambientSky: number;
  ambientGround: number;
  ambientIntensity: number;
  terrainRoughness: number;
  amplitude: number;
  craterDepth: number;
  hasTracks: boolean;
  isOrbital: boolean;
  isDeepSpace: boolean;
  pbrWorld: 'mars' | 'luna' | 'titan' | 'venus' | 'mercury' | 'comet' | 'clouds';
}

function getWorldTheme(mission: AbandonedMission): WorldVisualTheme {
  const isOrbital = mission.missionRole === 'orbital';
  const isDeepSpace = mission.missionRole === 'deepspace';

  if (mission.targetBodyId === 'mars') {
    return {
      terrainBase: mission.id === 'phoenix' ? 0x996b54 : 0xb35c3b,
      terrainAccent: mission.id === 'phoenix' ? 0xc4a290 : 0x73331e,
      rockColor: 0x4b2c20,
      skyZenith: 0x472c21,
      skyHorizon: 0xc27b52,
      fogColor: isOrbital ? null : 0x7c4830,
      fogDensity: isOrbital ? 0 : 0.0075,
      sunColor: 0xfff0dd,
      sunIntensity: 1.95,
      ambientSky: 0xa46a4a,
      ambientGround: 0x3b1c12,
      ambientIntensity: isOrbital ? 0.32 : 0.44,
      terrainRoughness: 0.94,
      amplitude: mission.id === 'spirit' ? 2.4 : 1.2,
      craterDepth: 1.25,
      hasTracks: mission.category === 'rover',
      isOrbital,
      isDeepSpace,
      pbrWorld: 'mars',
    };
  }

  if (mission.targetMoonId === 'luna') {
    return {
      terrainBase: 0x73767e,
      terrainAccent: 0x45484f,
      rockColor: 0x545861,
      skyZenith: 0x000000,
      skyHorizon: 0x000000,
      fogColor: null,
      fogDensity: 0,
      sunColor: 0xffffff,
      sunIntensity: 2.15,
      ambientSky: 0x262b35,
      ambientGround: 0x16181c,
      ambientIntensity: 0.16,
      terrainRoughness: 0.96,
      amplitude: 1.35,
      craterDepth: 1.75,
      hasTracks: mission.category === 'rover' || mission.craftType === 'lander_apollo_lrv',
      isOrbital,
      isDeepSpace,
      pbrWorld: 'luna',
    };
  }

  if (mission.targetMoonId === 'titan') {
    return {
      terrainBase: 0x854e21,
      terrainAccent: 0x4e2d12,
      rockColor: 0xa1774f,
      skyZenith: 0x5e3410,
      skyHorizon: 0xb97128,
      fogColor: isOrbital ? null : 0x7a4618,
      fogDensity: isOrbital ? 0 : 0.02,
      sunColor: 0xffb35c,
      sunIntensity: 1.25,
      ambientSky: 0xa46224,
      ambientGround: 0x331b0a,
      ambientIntensity: 0.56,
      terrainRoughness: 0.9,
      amplitude: 0.75,
      craterDepth: 0.25,
      hasTracks: false,
      isOrbital,
      isDeepSpace,
      pbrWorld: 'titan',
    };
  }

  if (mission.targetBodyId === 'venus') {
    return {
      terrainBase: 0x74461d,
      terrainAccent: 0x3f240e,
      rockColor: 0x4b2f16,
      skyZenith: 0x6e4012,
      skyHorizon: 0xc57d2b,
      fogColor: 0x864f1a,
      fogDensity: 0.024,
      sunColor: 0xffc66e,
      sunIntensity: 1.3,
      ambientSky: 0xb5722b,
      ambientGround: 0x3a200c,
      ambientIntensity: 0.64,
      terrainRoughness: 0.92,
      amplitude: 0.95,
      craterDepth: 0.2,
      hasTracks: false,
      isOrbital,
      isDeepSpace,
      pbrWorld: 'venus',
    };
  }

  if (mission.targetBodyId === 'mercury') {
    return {
      terrainBase: 0x67615c,
      terrainAccent: 0x3f3b38,
      rockColor: 0x56514d,
      skyZenith: 0x000000,
      skyHorizon: 0x000000,
      fogColor: null,
      fogDensity: 0,
      sunColor: 0xfff8ee,
      sunIntensity: 2.05,
      ambientSky: 0x22201e,
      ambientGround: 0x161412,
      ambientIntensity: 0.16,
      terrainRoughness: 0.95,
      amplitude: 1.8,
      craterDepth: 2.1,
      hasTracks: false,
      isOrbital,
      isDeepSpace,
      pbrWorld: 'mercury',
    };
  }

  if (mission.targetBodyId === 'eros') {
    // 433 Eros: airless S-type regolith, boulder fields, black sky, harsh unfiltered sunlight
    return {
      terrainBase: 0x8a7458,
      terrainAccent: 0x5a4a37,
      rockColor: 0x6e5c46,
      skyZenith: 0x000000,
      skyHorizon: 0x000000,
      fogColor: null,
      fogDensity: 0,
      sunColor: 0xfff6e8,
      sunIntensity: 2.0,
      ambientSky: 0x221d18,
      ambientGround: 0x14110e,
      ambientIntensity: 0.16,
      terrainRoughness: 0.97,
      amplitude: 2.4,
      craterDepth: 1.6,
      hasTracks: false,
      isOrbital,
      isDeepSpace,
      pbrWorld: 'mercury',
    };
  }

  if (mission.targetBodyId === 'comet67p') {
    return {
      terrainBase: 0x2e3136,
      terrainAccent: 0x17181b,
      rockColor: 0x3a3e45,
      skyZenith: 0x000000,
      skyHorizon: 0x000000,
      fogColor: null,
      fogDensity: 0,
      sunColor: 0xf4f7ff,
      sunIntensity: 1.85,
      ambientSky: 0x1c2028,
      ambientGround: 0x101216,
      ambientIntensity: 0.22,
      terrainRoughness: 0.98,
      amplitude: 3.3,
      craterDepth: 1.4,
      hasTracks: false,
      isOrbital,
      isDeepSpace,
      pbrWorld: 'comet',
    };
  }

  // Earth, Jupiter, Saturn, Pluto orbital & Deep Space missions
  return {
    terrainBase: 0xc2a26b,
    terrainAccent: 0x8f7245,
    rockColor: 0x8f7245,
    skyZenith: 0x000000,
    skyHorizon: 0x000000,
    fogColor: null,
    fogDensity: 0,
    sunColor: 0xfff7ea,
    sunIntensity: 2.1,
    ambientSky: 0x385078,
    ambientGround: 0x1e293b,
    ambientIntensity: 0.34,
    terrainRoughness: 0.88,
    amplitude: 1.2,
    craterDepth: 0,
    hasTracks: false,
    isOrbital,
    isDeepSpace,
    pbrWorld: 'clouds',
  };
}

function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function sampleTerrainHeight(
  x: number,
  z: number,
  theme: WorldVisualTheme,
): number {
  const distFromCenter = Math.hypot(x, z);
  const centerFlatten = THREE.MathUtils.smoothstep(distFromCenter, 4.2, 11.2);

  const undulation =
    (Math.sin(x * 0.09) * Math.cos(z * 0.07) * 0.55 +
      Math.sin(x * 0.24 + z * 0.19) * 0.25 +
      Math.cos(x * 0.52 - z * 0.43) * 0.1) *
    theme.amplitude;

  const horizonRidge =
    z < -18
      ? Math.max(0, (-z - 18) * 0.085) *
        (0.65 + 0.45 * Math.sin(x * 0.08 + 1.2)) *
        theme.amplitude
      : 0;

  const crater1 = Math.hypot(x - 11, z + 18);
  const c1Depth =
    crater1 < 8.5
      ? (-Math.cos((crater1 / 8.5) * Math.PI) * 0.5 - 0.5) *
        theme.craterDepth *
        0.9
      : Math.exp(-Math.pow((crater1 - 8.8) / 1.8, 2)) *
        theme.craterDepth *
        0.45;

  const crater2 = Math.hypot(x + 15, z + 26);
  const c2Depth =
    crater2 < 11.0
      ? (-Math.cos((crater2 / 11.0) * Math.PI) * 0.5 - 0.5) *
        theme.craterDepth *
        1.1
      : Math.exp(-Math.pow((crater2 - 11.3) / 2.2, 2)) *
        theme.craterDepth *
        0.5;

  let trackGroove = 0;
  if (theme.hasTracks && z > 0.3 && z < 36) {
    const leftWheel = Math.exp(-Math.pow((x + 0.55) / 0.14, 2));
    const rightWheel = Math.exp(-Math.pow((x - 0.55) / 0.14, 2));
    trackGroove = -(leftWheel + rightWheel) * 0.068;
  }

  return (
    (undulation + horizonRidge + c1Depth + c2Depth) * centerFlatten + trackGroove
  );
}

export interface SurfaceDioramaRuntime {
  root: THREE.Group;
  theme: WorldVisualTheme;
  missionRole: MissionRole;
  roverCamPos: THREE.Vector3;
  roverCamTarget: THREE.Vector3;
  povCamPos: THREE.Vector3;
  povCamTarget: THREE.Vector3;
  updateSun: (sunLocalDir: THREE.Vector3) => void;
  update: (dt: number, elapsed: number) => void;
  dispose: () => void;
}

interface CraftBuildResult {
  group: THREE.Group;
  povOrigin: THREE.Vector3;
  povLook: THREE.Vector3;
  camPos: THREE.Vector3;
  camTarget: THREE.Vector3;
  animate: (dt: number, elapsed: number) => void;
}

function buildSpacecraftModel(
  mission: AbandonedMission,
  textures: CraftTextureSet,
  disposables: Array<{ dispose: () => void }>,
  pbrCaps?: Pbr8KCapabilities,
  abortSignal?: AbortSignal,
): CraftBuildResult {
  const craftType: CraftModelType = mission.craftType;
  const group = new THREE.Group();

  let modelDisposed = false;
  disposables.push({
    dispose: () => {
      modelDisposed = true;
    },
  });

  // Photorealistic 4-map aerospace PBR materials (Albedo + Normal + Roughness + Metalness)
  const goldFoil = new THREE.MeshStandardMaterial({
    map: textures.kaptonMap,
    normalMap: textures.kaptonNormal,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughnessMap: textures.kaptonRoughness,
    roughness: 1.0,
    metalnessMap: textures.kaptonMetalness,
    metalness: 1.0,
  });
  const silverMetal = new THREE.MeshStandardMaterial({
    map: textures.brushedMetalMap,
    normalMap: textures.brushedMetalNormal,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughnessMap: textures.brushedMetalRoughness,
    roughness: 1.0,
    metalnessMap: textures.brushedMetalMetalness,
    metalness: 1.0,
  });
  const darkTitanium = new THREE.MeshStandardMaterial({
    map: textures.carbonMap,
    normalMap: textures.carbonNormal,
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughnessMap: textures.carbonRoughness,
    roughness: 1.0,
    metalnessMap: textures.carbonMetalness,
    metalness: 1.0,
  });
  const solarArrayMat = new THREE.MeshStandardMaterial({
    map: textures.solarMap,
    normalMap: textures.solarNormal,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughnessMap: textures.solarRoughness,
    roughness: 1.0,
    metalnessMap: textures.solarMetalness,
    metalness: 1.0,
    side: THREE.DoubleSide,
  });
  const issSolarMat = new THREE.MeshStandardMaterial({
    map: textures.issSolarMap,
    normalMap: textures.issSolarNormal,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughnessMap: textures.issSolarRoughness,
    roughness: 1.0,
    metalnessMap: textures.issSolarMetalness,
    metalness: 1.0,
    side: THREE.DoubleSide,
  });
  const issBetaMat = new THREE.MeshStandardMaterial({
    map: textures.issBetaMap,
    normalMap: textures.issBetaNormal,
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughnessMap: textures.issBetaRoughness,
    roughness: 1.0,
    metalnessMap: textures.issBetaMetalness,
    metalness: 1.0,
  });
  const radiatorMat = new THREE.MeshStandardMaterial({
    map: textures.radiatorMap,
    normalMap: textures.radiatorNormal,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughnessMap: textures.radiatorRoughness,
    roughness: 1.0,
    metalnessMap: textures.radiatorMetalness,
    metalness: 1.0,
    side: THREE.DoubleSide,
  });
  const whitePanelMat = new THREE.MeshStandardMaterial({
    map: textures.panelMap,
    normalMap: textures.panelNormal,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: textures.panelRoughness,
    roughness: 1.0,
    metalnessMap: textures.panelMetalness,
    metalness: 1.0,
  });
  const wheelMat = new THREE.MeshStandardMaterial({
    map: textures.wheelMap,
    normalMap: textures.wheelNormal,
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughnessMap: textures.wheelRoughness,
    roughness: 1.0,
    metalnessMap: textures.wheelMetalness,
    metalness: 1.0,
  });
  const jwstMirrorMat = new THREE.MeshStandardMaterial({
    map: textures.jwstMirrorMap,
    normalMap: textures.jwstMirrorNormal,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughnessMap: textures.jwstMirrorRoughness,
    roughness: 1.0,
    metalnessMap: textures.jwstMirrorMetalness,
    metalness: 1.0,
  });
  const copperMat = new THREE.MeshStandardMaterial({
    map: textures.copperMap,
    normalMap: textures.copperNormal,
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughnessMap: textures.copperRoughness,
    roughness: 1.0,
    metalnessMap: textures.copperMetalness,
    metalness: 1.0,
  });
  const lensGlassMat = new THREE.MeshStandardMaterial({
    map: textures.lensMap,
    normalMap: textures.lensNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: textures.lensRoughness,
    roughness: 1.0,
    metalnessMap: textures.lensMetalness,
    metalness: 1.0,
  });
  const accentMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(mission.accentColor),
    toneMapped: false,
  });

  disposables.push(
    goldFoil,
    silverMetal,
    darkTitanium,
    solarArrayMat,
    issSolarMat,
    issBetaMat,
    radiatorMat,
    whitePanelMat,
    wheelMat,
    jwstMirrorMat,
    copperMat,
    lensGlassMat,
    accentMat,
  );

  const addMesh = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    parent: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
  ) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    disposables.push(geo);
    return m;
  };

  const addBox = (
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    rx = 0,
    ry = 0,
    rz = 0,
    parent: THREE.Object3D = group,
  ) => addMesh(new THREE.BoxGeometry(w, h, d), mat, parent, x, y, z, rx, ry, rz);

  const addCyl = (
    rt: number,
    rb: number,
    h: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    rx = 0,
    ry = 0,
    rz = 0,
    seg = 20,
    parent: THREE.Object3D = group,
  ) =>
    addMesh(
      new THREE.CylinderGeometry(rt, rb, h, seg),
      mat,
      parent,
      x,
      y,
      z,
      rx,
      ry,
      rz,
    );

  const addWheel = (
    radius: number,
    width: number,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = group,
  ) => {
    addCyl(radius, radius, width, wheelMat, x, y, z, 0, 0, Math.PI / 2, 24, parent);
    addCyl(
      radius * 0.48,
      radius * 0.48,
      width + 0.02,
      silverMetal,
      x,
      y,
      z,
      0,
      0,
      Math.PI / 2,
      14,
      parent,
    );
  };

  const addStrut = (
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    radius: number,
    mat: THREE.Material,
    parent: THREE.Object3D = group,
    seg = 10,
  ) => {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    if (len < 0.0001) return null;
    const geo = new THREE.CylinderGeometry(radius, radius, len, seg);
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(p1).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    disposables.push(geo);
    return m;
  };

  let povOrigin = new THREE.Vector3(0, 1.5, -0.4);
  let povLook = new THREE.Vector3(0, 1.25, -10.0);
  let camPos = new THREE.Vector3(-2.9, 1.9, 3.6);
  let camTarget = new THREE.Vector3(0, 0.85, -3.2);

  let scanningMastHead: THREE.Group | null = null;
  let scanningDish: THREE.Object3D | null = null;
  let heliGroup: THREE.Group | null = null;
  let rotorUpper: THREE.Mesh | null = null;
  let rotorLower: THREE.Mesh | null = null;
  let spinCraft: THREE.Object3D | null = null;
  let idleFloatGroup: THREE.Object3D | null = null;
  let apolloFlagMesh: THREE.Mesh | null = null;
  let apolloBeaconMat: THREE.MeshBasicMaterial | null = null;
  const issWingRoots: Array<{ root: THREE.Group; phase: number }> = [];
  let issArmPivot: THREE.Group | null = null;
  let issStrobePortMat: THREE.MeshBasicMaterial | null = null;
  let issStrobeStbdMat: THREE.MeshBasicMaterial | null = null;
  let libsBeamMesh: THREE.Mesh | null = null;
  let libsBeamMat: THREE.MeshBasicMaterial | null = null;
  let libsSparkMesh: THREE.Mesh | null = null;
  let libsSparkMat: THREE.MeshBasicMaterial | null = null;
  const seismicRings: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; phase: number }> = [];
  const rfWaveRings: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; phase: number }> = [];

  // Static ground props (Apollo Lunar Roving Vehicle & Flag stay grounded even when NASA LM GLB loads)
  const groundExtrasGroup = new THREE.Group();
  group.add(groundExtrasGroup);
  const craftFallbackGroup = new THREE.Group();
  group.add(craftFallbackGroup);

  // ---------------- 1. MSL Curiosity / Perseverance + Ingenuity ----------------
  if (craftType === 'rover_msl') {
    const bodyGrp = craftFallbackGroup;
    // White riveted chassis & gold Kapton thermal electronics belly
    addBox(0.95, 0.42, 1.38, whitePanelMat, 0, 0.72, 0, 0, 0, 0, bodyGrp);
    addBox(0.84, 0.24, 1.18, goldFoil, 0, 0.5, 0, 0, 0, 0, bodyGrp);
    addBox(1.02, 0.04, 1.44, silverMetal, 0, 0.94, 0, 0, 0, 0, bodyGrp);

    // Rear MMRTG nuclear generator with angled white cooling fins
    const rtgGroup = new THREE.Group();
    rtgGroup.position.set(0, 0.82, 0.9);
    rtgGroup.rotation.x = 0.42;
    bodyGrp.add(rtgGroup);
    addCyl(0.14, 0.16, 0.72, darkTitanium, 0, 0, 0, Math.PI / 2, 0, 0, 16, rtgGroup);
    for (let f = 0; f < 6; f++) {
      const a = (f * Math.PI) / 3;
      addBox(0.025, 0.38, 0.64, whitePanelMat, Math.cos(a) * 0.18, Math.sin(a) * 0.18, 0, 0, 0, a, rtgGroup);
    }

    // 6 Aluminum machined wheels + Rocker-Bogie Titanium struts
    const wxList = [-0.88, 0.88];
    const wzList = [-0.86, 0.02, 0.92];
    for (const wx of wxList) {
      const sign = Math.sign(wx);
      addBox(0.055, 0.06, 1.25, silverMetal, wx * 0.84, 0.46, 0.08, -0.08, 0, 0, bodyGrp);
      addBox(0.05, 0.05, 0.96, darkTitanium, wx * 0.84, 0.28, 0.48, 0, 0, 0, bodyGrp);
      for (const wz of wzList) {
        addWheel(0.24, 0.22, wx, 0.24, wz, bodyGrp);
        addBox(0.045, 0.34, 0.045, silverMetal, wx - sign * 0.12, 0.42, wz, 0, 0, 0, bodyGrp);
      }
    }

    // Articulated 5-DOF Robotic Turret Arm
    const arm = new THREE.Group();
    arm.position.set(-0.28, 0.74, -0.7);
    bodyGrp.add(arm);
    addBox(0.08, 0.08, 0.48, silverMetal, 0, 0.05, -0.22, -0.18, 0, 0, arm);
    addBox(0.07, 0.07, 0.42, darkTitanium, 0.08, 0.14, -0.58, 0.25, -0.2, 0, arm);
    addCyl(0.16, 0.16, 0.18, goldFoil, 0.16, 0.05, -0.82, Math.PI / 2, 0, 0, 14, arm);
    addCyl(0.04, 0.01, 0.22, silverMetal, 0.16, 0.05, -0.96, Math.PI / 2, 0, 0, 10, arm);

    // Remote Sensing Mast + Animated Scanning ChemCam/Mastcam-Z Head
    addCyl(0.05, 0.06, 0.92, whitePanelMat, 0.26, 1.4, -0.45, 0, 0, 0, 16, bodyGrp);
    const mastHead = new THREE.Group();
    mastHead.position.set(0.26, 1.88, -0.45);
    bodyGrp.add(mastHead);
    scanningMastHead = mastHead;
    addBox(0.42, 0.18, 0.24, whitePanelMat, 0, 0, 0, 0, 0, 0, mastHead);
    addCyl(0.06, 0.06, 0.09, lensGlassMat, 0, 0.02, -0.14, Math.PI / 2, 0, 0, 16, mastHead);
    addCyl(0.035, 0.035, 0.08, darkTitanium, -0.13, -0.02, -0.14, Math.PI / 2, 0, 0, 12, mastHead);
    addCyl(0.035, 0.035, 0.08, darkTitanium, 0.13, -0.02, -0.14, Math.PI / 2, 0, 0, 12, mastHead);
    addBox(0.04, 0.04, 0.04, accentMat, 0, 0.09, -0.11, 0, 0, 0, mastHead);

    // Steerable High-Gain Dish
    const dishGroup = new THREE.Group();
    dishGroup.position.set(-0.28, 1.08, 0.34);
    dishGroup.rotation.set(0.55, 0.25, 0);
    bodyGrp.add(dishGroup);
    scanningDish = dishGroup;
    addCyl(0.28, 0.04, 0.09, whitePanelMat, 0, 0, 0, 0, 0, 0, 24, dishGroup);
    addCyl(0.015, 0.015, 0.18, silverMetal, 0, 0.09, 0, 0, 0, 0, 8, dishGroup);
    addCyl(0.02, 0.02, 0.45, silverMetal, -0.32, 1.18, 0.56, 0, 0, 0, 10, bodyGrp);

    // Ingenuity Mars Helicopter fallback (replaced cleanly if NASA Ingenuity GLB loads)
    const heliFallbackHolder = new THREE.Group();
    group.add(heliFallbackHolder);
    if (mission.hasIngenuity) {
      heliGroup = new THREE.Group();
      heliGroup.position.set(1.95, 1.25, -1.15);
      heliFallbackHolder.add(heliGroup);
      addBox(0.2, 0.18, 0.2, goldFoil, 0, 0, 0, 0, 0, 0, heliGroup);
      addBox(0.42, 0.02, 0.18, solarArrayMat, 0, 0.28, 0, 0, 0, 0, heliGroup);
      addCyl(0.02, 0.02, 0.38, darkTitanium, 0, 0.14, 0, 0, 0, 0, 10, heliGroup);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        addBox(0.016, 0.38, 0.016, darkTitanium, Math.cos(a) * 0.15, -0.18, Math.sin(a) * 0.15, Math.sin(a) * 0.42, 0, -Math.cos(a) * 0.42, heliGroup);
      }
      const bladeGeo = new THREE.BoxGeometry(1.18, 0.008, 0.065);
      const bladeMat = new THREE.MeshStandardMaterial({
        color: 0x1e242d,
        roughness: 0.35,
        metalness: 0.4,
      });
      disposables.push(bladeGeo, bladeMat);
      rotorUpper = new THREE.Mesh(bladeGeo, bladeMat);
      rotorUpper.position.y = 0.24;
      rotorLower = new THREE.Mesh(bladeGeo, bladeMat);
      rotorLower.position.y = 0.18;
      heliGroup.add(rotorUpper, rotorLower);
    }

    povOrigin = new THREE.Vector3(0.26, 1.9, -0.62);
    povLook = new THREE.Vector3(0.26, 1.35, -12.0);
    camPos = new THREE.Vector3(-3.2, 2.15, 3.8);
    camTarget = new THREE.Vector3(0.35, 1.0, -2.0);
  }
  // ---------------- 2. Mars Exploration Rover (Opportunity / Spirit) ----------------
  else if (craftType === 'rover_mer') {
    const mer = craftFallbackGroup;
    // Warm Electronics Box (gold Kapton MLI + aerogel side plates + solar deck wings)
    addBox(0.88, 0.38, 1.08, goldFoil, 0, 0.62, 0, 0, 0, 0, mer);
    addBox(0.92, 0.08, 1.12, whitePanelMat, 0, 0.8, 0, 0, 0, 0, mer);
    addBox(1.58, 0.04, 1.2, solarArrayMat, 0, 0.85, 0.04, 0, 0, 0, mer);
    addBox(0.62, 0.04, 0.96, solarArrayMat, -0.86, 0.83, 0.14, 0, 0.25, 0.06, mer);
    addBox(0.62, 0.04, 0.96, solarArrayMat, 0.86, 0.83, 0.14, 0, -0.25, -0.06, mer);
    // Solar deck hinge clasps & rear radiator louver strip
    for (const hx of [-0.52, 0.52]) {
      addBox(0.06, 0.04, 0.14, copperMat, hx, 0.85, 0.1, 0, 0, 0, mer);
    }
    addBox(0.54, 0.06, 0.18, radiatorMat, 0, 0.86, 0.56, 0, 0, 0, mer);

    // Authentic 6-Wheel Rocker-Bogie Titanium Linkage + Differential Pivot Bar
    addStrut(new THREE.Vector3(-0.46, 0.68, 0.04), new THREE.Vector3(0.46, 0.68, 0.04), 0.022, darkTitanium, mer, 10);
    for (const wx of [-0.62, 0.62]) {
      const sign = Math.sign(wx);
      const pivot = new THREE.Vector3(wx - sign * 0.14, 0.64, -0.04);
      const frontHub = new THREE.Vector3(wx, 0.15, -0.58);
      const bogieJoint = new THREE.Vector3(wx - sign * 0.08, 0.38, 0.28);
      const midHub = new THREE.Vector3(wx, 0.15, 0.0);
      const rearHub = new THREE.Vector3(wx, 0.15, 0.58);
      addStrut(pivot, frontHub, 0.026, silverMetal, mer, 10);
      addStrut(pivot, bogieJoint, 0.026, silverMetal, mer, 10);
      addStrut(bogieJoint, midHub, 0.022, darkTitanium, mer, 10);
      addStrut(bogieJoint, rearHub, 0.022, darkTitanium, mer, 10);
      for (const wz of [-0.58, 0.0, 0.58]) {
        addWheel(0.15, 0.14, wx, 0.15, wz, mer);
        addCyl(0.055, 0.055, 0.04, copperMat, wx + sign * 0.075, 0.15, wz, 0, 0, Math.PI / 2, 12, mer);
      }
    }

    // 5-DOF Instrument Deployment Device (IDD Arm) + RAT Rock Abrasion Tool + Mössbauer + APXS Turret
    const arm = new THREE.Group();
    arm.position.set(-0.22, 0.58, -0.54);
    mer.add(arm);
    addStrut(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.04, 0.04, -0.34), 0.024, silverMetal, arm, 10);
    addStrut(new THREE.Vector3(-0.04, 0.04, -0.34), new THREE.Vector3(0.06, -0.08, -0.62), 0.02, darkTitanium, arm, 10);
    addCyl(0.11, 0.11, 0.12, goldFoil, 0.06, -0.1, -0.66, Math.PI / 2, 0, 0, 16, arm);
    addCyl(0.045, 0.045, 0.11, copperMat, 0.14, -0.1, -0.7, 0, 0, Math.PI / 2, 12, arm); // APXS
    addCyl(0.032, 0.015, 0.14, silverMetal, 0.06, -0.1, -0.78, Math.PI / 2, 0, 0, 12, arm); // RAT Grinder

    // Pancam Mast Assembly (PMA) + Stereo Pancam + Navcam + Mini-TES + Calibration Sundial
    addCyl(0.036, 0.045, 0.74, whitePanelMat, 0.18, 1.18, -0.32, 0, 0, 0, 14, mer);
    addCyl(0.05, 0.05, 0.06, copperMat, 0.18, 0.88, -0.32, 0, 0, 0, 12, mer);
    const mastHead = new THREE.Group();
    mastHead.position.set(0.18, 1.56, -0.34);
    mer.add(mastHead);
    scanningMastHead = mastHead;
    addBox(0.38, 0.12, 0.16, whitePanelMat, 0, 0, 0, 0, 0, 0, mastHead);
    addCyl(0.032, 0.032, 0.06, lensGlassMat, -0.12, 0.01, -0.085, Math.PI / 2, 0, 0, 14, mastHead);
    addCyl(0.032, 0.032, 0.06, lensGlassMat, 0.12, 0.01, -0.085, Math.PI / 2, 0, 0, 14, mastHead);
    addCyl(0.02, 0.02, 0.05, darkTitanium, -0.045, -0.01, -0.085, Math.PI / 2, 0, 0, 10, mastHead);
    addCyl(0.02, 0.02, 0.05, darkTitanium, 0.045, -0.01, -0.085, Math.PI / 2, 0, 0, 10, mastHead);
    addBox(0.035, 0.035, 0.035, accentMat, 0, 0.075, -0.06, 0, 0, 0, mastHead);

    // High-Gain Parabolic Dish + UHF Helical Antenna + MarsDial Sundial
    const dishGroup = new THREE.Group();
    dishGroup.position.set(-0.28, 1.04, 0.34);
    dishGroup.rotation.set(0.45, 0, 0);
    mer.add(dishGroup);
    scanningDish = dishGroup;
    addCyl(0.25, 0.04, 0.08, whitePanelMat, 0, 0, 0, 0, 0, 0, 24, dishGroup);
    addCyl(0.014, 0.014, 0.14, silverMetal, 0, 0.08, 0, 0, 0, 0, 8, dishGroup);
    addCyl(0.045, 0.045, 0.04, goldFoil, 0.34, 0.87, 0.42, 0, 0, 0, 14, mer); // MarsDial base
    addCyl(0.01, 0.01, 0.07, darkTitanium, 0.34, 0.91, 0.42, 0, 0, 0, 8, mer); // Gnomon shadow post
    addCyl(0.015, 0.015, 0.36, silverMetal, -0.42, 1.04, 0.48, 0, 0, 0, 8, mer); // UHF whip

    povOrigin = new THREE.Vector3(0.18, 1.58, -0.5);
    povLook = new THREE.Vector3(0.18, 1.32, -10.0);
  }
  // ---------------- 3. Sojourner / Lunokhod ----------------
  else if (craftType === 'rover_sojourner') {
    const sj = craftFallbackGroup;
    addBox(0.56, 0.22, 0.72, goldFoil, 0, 0.29, 0, 0, 0, 0, sj);
    addBox(0.64, 0.03, 0.78, solarArrayMat, 0, 0.42, 0, 0, 0, 0, sj);
    for (const wx of [-0.38, 0.38]) {
      const sign = Math.sign(wx);
      const piv = new THREE.Vector3(wx - sign * 0.09, 0.28, -0.02);
      const bog = new THREE.Vector3(wx - sign * 0.05, 0.18, 0.15);
      addStrut(piv, new THREE.Vector3(wx, 0.09, -0.3), 0.015, silverMetal, sj, 8);
      addStrut(piv, bog, 0.015, silverMetal, sj, 8);
      addStrut(bog, new THREE.Vector3(wx, 0.09, 0), 0.013, darkTitanium, sj, 8);
      addStrut(bog, new THREE.Vector3(wx, 0.09, 0.3), 0.013, darkTitanium, sj, 8);
      for (const wz of [-0.3, 0, 0.3]) {
        addWheel(0.09, 0.08, wx, 0.09, wz, sj);
      }
    }
    // Forward stereo hazard cameras + laser stripe projectors + rear APXS drum + UHF whip
    addCyl(0.025, 0.025, 0.05, lensGlassMat, -0.1, 0.3, -0.37, Math.PI / 2, 0, 0, 12, sj);
    addCyl(0.025, 0.025, 0.05, lensGlassMat, 0.1, 0.3, -0.37, Math.PI / 2, 0, 0, 12, sj);
    addCyl(0.06, 0.06, 0.1, copperMat, 0, 0.24, 0.42, Math.PI / 2, 0, 0, 14, sj);
    addCyl(0.015, 0.015, 0.32, silverMetal, 0.22, 0.56, 0.24, 0, 0, 0, 10, sj);
    povOrigin = new THREE.Vector3(0, 0.46, -0.45);
  } else if (craftType === 'rover_lunokhod') {
    const lk = craftFallbackGroup;
    // Iconic Soviet Pressurized Lunar Instrument "Bathtub" + Gold Kapton Foil Band
    addCyl(0.66, 0.52, 0.48, silverMetal, 0, 0.56, 0, 0, 0, 0, 24, lk);
    addCyl(0.67, 0.58, 0.16, goldFoil, 0, 0.62, 0, 0, 0, 0, 24, lk);
    // Open Clamshell Solar-Array Lid + Inner Radiator Deck
    addCyl(0.64, 0.64, 0.05, solarArrayMat, 0, 1.06, 0.32, -0.82, 0, 0, 24, lk);
    addCyl(0.6, 0.6, 0.03, radiatorMat, 0, 0.82, 0, 0, 0, 0, 20, lk);
    addStrut(new THREE.Vector3(-0.35, 0.8, 0.1), new THREE.Vector3(-0.35, 1.02, 0.3), 0.016, copperMat, lk, 8);
    addStrut(new THREE.Vector3(0.35, 0.8, 0.1), new THREE.Vector3(0.35, 1.02, 0.3), 0.016, copperMat, lk, 8);
    // 8 Wire-Mesh Wheels with Individual Torsion-Bar Arms
    for (const wx of [-0.66, 0.66]) {
      const sign = Math.sign(wx);
      for (const wz of [-0.56, -0.19, 0.19, 0.56]) {
        addWheel(0.15, 0.1, wx, 0.15, wz, lk);
        addStrut(
          new THREE.Vector3(wx * 0.68, 0.42, wz * 0.72),
          new THREE.Vector3(wx - sign * 0.05, 0.15, wz),
          0.022,
          silverMetal,
          lk,
          10,
        );
      }
    }
    // Dual Forward Armored TV Cameras + Helical Cone Antenna + French Laser Retroreflector Prism + 9th Odometer Wheel
    addBox(0.14, 0.12, 0.16, whitePanelMat, -0.2, 0.64, -0.58, 0, 0, 0, lk);
    addBox(0.14, 0.12, 0.16, whitePanelMat, 0.2, 0.64, -0.58, 0, 0, 0, lk);
    addCyl(0.05, 0.05, 0.1, lensGlassMat, -0.2, 0.64, -0.66, Math.PI / 2, 0, 0, 14, lk);
    addCyl(0.05, 0.05, 0.1, lensGlassMat, 0.2, 0.64, -0.66, Math.PI / 2, 0, 0, 14, lk);
    addCyl(0.09, 0.02, 0.32, copperMat, 0.36, 0.96, -0.24, 0.35, 0, -0.2, 16, lk);
    addBox(0.24, 0.08, 0.16, lensGlassMat, 0, 0.84, -0.52, -0.45, 0, 0, lk); // French TLSR corner-cube retroreflector
    addStrut(new THREE.Vector3(0, 0.42, 0.56), new THREE.Vector3(0, 0.1, 0.94), 0.015, silverMetal, lk, 8);
    addWheel(0.08, 0.05, 0, 0.08, 0.94, lk); // 9th trailing odometer wheel
    povOrigin = new THREE.Vector3(0, 0.72, -0.72);
  }
  // ---------------- 3b. Apollo Lunar Roving Vehicle (LRV-1/2/3) as its own artifact ----------------
  else if (craftType === 'rover_lrv') {
    const lv = craftFallbackGroup;
    // Same proportions as the LRV parked next to the Apollo 15–17 lunar modules, at the origin
    addBox(0.75, 0.08, 1.28, silverMetal, 0, 0.26, 0, 0, 0, 0, lv); // chassis
    addBox(0.32, 0.32, 0.22, silverMetal, -0.18, 0.44, 0.1, 0, 0, 0, lv); // seats
    addBox(0.32, 0.32, 0.22, silverMetal, 0.18, 0.44, 0.1, 0, 0, 0, lv);
    addCyl(0.34, 0.05, 0.08, goldFoil, -0.16, 0.76, -0.45, 0.35, 0, 0, 20, lv); // high-gain antenna dish
    addBox(0.1, 0.1, 0.16, lensGlassMat, 0.22, 0.64, -0.58, 0, 0, 0, lv); // TV camera that filmed the LM liftoff
    addStrut(new THREE.Vector3(0.22, 0.3, -0.5), new THREE.Vector3(0.22, 0.6, -0.58), 0.012, silverMetal, lv, 8);
    addBox(0.2, 0.18, 0.12, darkTitanium, 0, 0.42, -0.52, 0, 0, 0, lv); // control console
    addBox(0.62, 0.04, 0.3, silverMetal, 0, 0.36, 0.56, 0, 0, 0, lv); // rear cargo pallet
    for (const lx of [-0.46, 0.46]) {
      for (const lz of [-0.52, 0.52]) {
        addWheel(0.19, 0.12, lx, 0.19, lz, lv);
        addBox(0.26, 0.02, 0.36, darkTitanium, lx, 0.4, lz, 0, 0, 0, lv); // fenders
      }
    }
    povOrigin = new THREE.Vector3(0.22, 0.66, -0.6);
    povLook = new THREE.Vector3(0.22, 0.5, -10.0);
  }
  // ---------------- 3c. Mars Pathfinder lander (Sagan Memorial Station) ----------------
  else if (craftType === 'lander_pathfinder') {
    const pf = craftFallbackGroup;
    // Tetrahedral base with three solar-cell petals opened flat on the ground
    addCyl(0.42, 0.42, 0.3, goldFoil, 0, 0.2, 0, 0, Math.PI / 6, 0, 3, pf);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const px = Math.cos(a) * 0.62;
      const pz = Math.sin(a) * 0.62;
      addCyl(0.5, 0.5, 0.03, solarArrayMat, px, 0.06, pz, 0, -a + Math.PI / 6, 0, 3, pf);
      addCyl(0.52, 0.52, 0.02, silverMetal, px, 0.04, pz, 0, -a + Math.PI / 6, 0, 3, pf);
      // Deflated airbag remnants bunched under each petal
      addCyl(0.16, 0.2, 0.08, whitePanelMat, Math.cos(a) * 1.0, 0.04, Math.sin(a) * 1.0, 0, 0, 0, 10, pf);
    }
    // Rover egress ramp that Sojourner drove down
    addBox(0.22, 0.02, 0.6, silverMetal, 0.75, 0.08, -0.62, 0.12, 0.6, 0, pf);
    // IMP stereo camera on its 0.8 m pop-up mast + low-gain antenna + meteorology mast
    addCyl(0.02, 0.02, 0.8, silverMetal, 0, 0.75, 0, 0, 0, 0, 10, pf);
    addBox(0.16, 0.1, 0.1, darkTitanium, 0, 1.18, 0, 0, 0, 0, pf);
    addCyl(0.025, 0.025, 0.04, lensGlassMat, -0.05, 1.18, -0.06, Math.PI / 2, 0, 0, 10, pf);
    addCyl(0.025, 0.025, 0.04, lensGlassMat, 0.05, 1.18, -0.06, Math.PI / 2, 0, 0, 10, pf);
    addCyl(0.12, 0.02, 0.06, goldFoil, 0.22, 0.46, 0.1, 0.4, 0, 0, 16, pf);
    addCyl(0.01, 0.01, 0.9, silverMetal, -0.85, 0.45, 0.4, 0, 0, 0, 8, pf);
    povOrigin = new THREE.Vector3(0, 1.18, -0.08);
    povLook = new THREE.Vector3(0, 0.9, -10.0);
  }
  // ---------------- 4. Apollo Lunar Modules (Eagle..Challenger + LRV) ----------------
  else if (craftType === 'lander_apollo' || craftType === 'lander_apollo_lrv') {
    const lm = craftFallbackGroup;
    // A. Octagonal Kapton Gold Descent Stage + DPS Engine Bell + MESA
    addCyl(1.18, 1.18, 0.78, goldFoil, 0, 0.96, 0, 0, Math.PI / 8, 0, 8, lm);
    addBox(1.78, 0.74, 1.78, goldFoil, 0, 0.96, 0, 0, 0, 0, lm);
    addCyl(0.24, 0.48, 0.48, darkTitanium, 0, 0.36, 0, 0, 0, 0, 22, lm); // DPS Bell
    addBox(0.84, 0.14, 0.42, silverMetal, 0, 1.05, -1.16, 0, 0, 0, lm); // Forward EVA Porch

    // 4 Articulated Telescoping Landing Legs + Diagonal V-Struts strictly joining brackets to footpads
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2; // Cardinal axes (+X, -X, +Z, -Z) matching authentic LM spider stance
      const fx = Math.cos(a) * 1.66;
      const fz = Math.sin(a) * 1.66;
      const foot = new THREE.Vector3(fx, 0.07, fz);
      const upperAttach = new THREE.Vector3(Math.cos(a) * 1.08, 1.24, Math.sin(a) * 1.08);
      const lowerMid = new THREE.Vector3().lerpVectors(foot, upperAttach, 0.45);
      const sidePerp = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
      const leftInner = new THREE.Vector3(Math.cos(a) * 0.92, 0.64, Math.sin(a) * 0.92).addScaledVector(sidePerp, 0.42);
      const rightInner = new THREE.Vector3(Math.cos(a) * 0.92, 0.64, Math.sin(a) * 0.92).addScaledVector(sidePerp, -0.42);

      // Circular Dish Footpad + Contact Probe
      addCyl(0.32, 0.28, 0.06, goldFoil, fx, 0.03, fz, 0, 0, 0, 18, lm);
      addCyl(0.014, 0.014, 0.42, silverMetal, fx * 1.08, 0.16, fz * 1.08, 0, 0, 0, 8, lm);
      // Primary telescoping shock-absorber strut + V-braces
      addStrut(foot, upperAttach, 0.048, goldFoil, lm, 12);
      addStrut(lowerMid, leftInner, 0.026, silverMetal, lm, 10);
      addStrut(lowerMid, rightInner, 0.026, silverMetal, lm, 10);
      addStrut(upperAttach, leftInner, 0.022, darkTitanium, lm, 8);
      addStrut(upperAttach, rightInner, 0.022, darkTitanium, lm, 8);
    }
    // 9-rung Aluminium Egress Ladder on front leg
    const ladderTop = new THREE.Vector3(0, 1.05, -1.16);
    const ladderBot = new THREE.Vector3(0, 0.22, -1.58);
    addStrut(ladderTop.clone().add(new THREE.Vector3(-0.12, 0, 0)), ladderBot.clone().add(new THREE.Vector3(-0.12, 0, 0)), 0.016, silverMetal, lm, 8);
    addStrut(ladderTop.clone().add(new THREE.Vector3(0.12, 0, 0)), ladderBot.clone().add(new THREE.Vector3(0.12, 0, 0)), 0.016, silverMetal, lm, 8);
    for (let r = 0; r < 6; r++) {
      const t = (r + 0.5) / 6;
      const rungP = new THREE.Vector3().lerpVectors(ladderBot, ladderTop, t);
      addStrut(rungP.clone().add(new THREE.Vector3(-0.12, 0, 0)), rungP.clone().add(new THREE.Vector3(0.12, 0, 0)), 0.012, silverMetal, lm, 8);
    }

    // B. Complete Ascent Stage Crew Cabin (Zero Cut-in-Half Silhouette!)
    addCyl(0.92, 1.02, 0.22, darkTitanium, 0, 1.44, 0, 0, Math.PI / 8, 0, 8, lm); // Interstage Collar
    // Forward pressurized cockpit cylinder (oriented laterally) + faceted crew housing
    addCyl(0.76, 0.76, 1.48, darkTitanium, 0, 2.02, -0.18, 0, 0, Math.PI / 2, 22, lm);
    addBox(1.12, 0.86, 0.94, silverMetal, 0, 2.02, -0.26, 0, 0, 0, lm);
    addBox(0.92, 0.72, 0.58, whitePanelMat, 0, 2.04, -0.58, 0, 0, 0, lm);
    // Forward square EVA ingress hatch + canted dark glass cockpit windows
    addBox(0.42, 0.44, 0.06, darkTitanium, 0, 1.78, -0.88, 0, 0, 0, lm);
    addBox(0.28, 0.22, 0.08, lensGlassMat, -0.24, 2.18, -0.86, -0.24, 0.14, 0, lm);
    addBox(0.28, 0.22, 0.08, lensGlassMat, 0.24, 2.18, -0.86, -0.24, -0.14, 0, lm);
    // Aft equipment bay + propellant tank pods + upper CSM docking tunnel
    addBox(1.36, 0.78, 0.78, darkTitanium, 0, 2.0, 0.34, 0, 0, 0, lm);
    addBox(0.32, 0.64, 0.68, goldFoil, -0.78, 1.98, 0.22, 0, 0, 0, lm);
    addBox(0.32, 0.64, 0.68, goldFoil, 0.78, 1.98, 0.22, 0, 0, 0, lm);
    addCyl(0.36, 0.38, 0.28, silverMetal, 0, 2.54, 0.02, 0, 0, 0, 20, lm); // Upper docking hatch
    // S-Band Steerable Dish & Quad-Helix + Rendezvous Radar
    addCyl(0.34, 0.04, 0.1, whitePanelMat, 0.32, 2.74, -0.34, 0.52, -0.22, 0, 24, lm);
    addCyl(0.22, 0.03, 0.07, silverMetal, -0.28, 2.66, -0.32, 0.4, 0.18, 0, 20, lm);
    // 4 Corner RCS Thruster Quads
    for (const sx of [-0.88, 0.88]) {
      for (const sz of [-0.52, 0.52]) {
        addCyl(0.06, 0.08, 0.22, darkTitanium, sx, 2.05, sz, 0, 0, 0, 12, lm);
        addCyl(0.035, 0.055, 0.14, silverMetal, sx + Math.sign(sx) * 0.08, 2.05, sz, 0, 0, -Math.sign(sx) * Math.PI / 2, 10, lm);
      }
    }

    // US Lunar Flag (Textured Stars & Stripes canvas) & Ascent Telemetry Beacon
    addCyl(0.02, 0.02, 1.45, silverMetal, -2.15, 0.72, -1.35, 0, 0, 0, 10, groundExtrasGroup);
    addBox(0.64, 0.02, 0.02, silverMetal, -1.83, 1.44, -1.35, 0, 0, 0, groundExtrasGroup);
    const flagCanvas = document.createElement('canvas');
    flagCanvas.width = 256;
    flagCanvas.height = 144;
    const fCtx = flagCanvas.getContext('2d')!;
    for (let s = 0; s < 13; s++) {
      fCtx.fillStyle = s % 2 === 0 ? '#b91c1c' : '#f8fafc';
      fCtx.fillRect(0, (s * 144) / 13, 256, 144 / 13 + 1);
    }
    fCtx.fillStyle = '#1e3a8a';
    fCtx.fillRect(0, 0, 104, (7 * 144) / 13);
    fCtx.fillStyle = '#ffffff';
    for (let ry = 8; ry < 70; ry += 12) {
      for (let rx = 8; rx < 96; rx += 14) {
        fCtx.fillRect(rx, ry, 3, 3);
      }
    }
    const flagTex = new THREE.CanvasTexture(flagCanvas);
    flagTex.colorSpace = THREE.SRGBColorSpace;
    const flagGeo = new THREE.PlaneGeometry(0.64, 0.36, 12, 4);
    const flagPos = flagGeo.attributes.position;
    for (let i = 0; i < flagPos.count; i++) {
      const fx = flagPos.getX(i);
      const t = (fx + 0.32) / 0.64;
      flagPos.setZ(i, Math.sin(t * Math.PI * 2.5) * 0.032 * t);
    }
    flagGeo.computeVertexNormals();
    const flagMat = new THREE.MeshStandardMaterial({
      map: flagTex,
      roughness: 0.72,
      side: THREE.DoubleSide,
    });
    apolloFlagMesh = new THREE.Mesh(flagGeo, flagMat);
    apolloFlagMesh.position.set(-1.83, 1.25, -1.35);
    apolloFlagMesh.castShadow = true;
    groundExtrasGroup.add(apolloFlagMesh);
    disposables.push(flagTex, flagGeo, flagMat);

    const apolloBeaconGeo = new THREE.SphereGeometry(0.042, 10, 8);
    apolloBeaconMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, toneMapped: false });
    const apolloBeacon = new THREE.Mesh(apolloBeaconGeo, apolloBeaconMat);
    apolloBeacon.position.set(0, 2.74, 0.02);
    groundExtrasGroup.add(apolloBeacon);
    disposables.push(apolloBeaconGeo, apolloBeaconMat);

    if (craftType === 'lander_apollo_lrv') {
      const lrv = new THREE.Group();
      lrv.position.set(2.45, 0, -1.35);
      lrv.rotation.y = 0.42;
      groundExtrasGroup.add(lrv);
      addBox(0.75, 0.08, 1.28, silverMetal, 0, 0.26, 0, 0, 0, 0, lrv);
      addBox(0.32, 0.32, 0.22, silverMetal, -0.18, 0.44, 0.1, 0, 0, 0, lrv);
      addBox(0.32, 0.32, 0.22, silverMetal, 0.18, 0.44, 0.1, 0, 0, 0, lrv);
      addCyl(0.34, 0.05, 0.08, goldFoil, -0.16, 0.76, -0.45, 0.35, 0, 0, 20, lrv);
      addBox(0.1, 0.1, 0.16, lensGlassMat, 0.22, 0.64, -0.58, 0, 0, 0, lrv);
      for (const lx of [-0.46, 0.46]) {
        for (const lz of [-0.52, 0.52]) {
          addWheel(0.19, 0.12, lx, 0.19, lz, lrv);
        }
      }
    }

    povOrigin = new THREE.Vector3(0, 2.15, -1.05);
    povLook = new THREE.Vector3(0, 1.25, -10.0);
    camPos = new THREE.Vector3(-3.8, 2.35, 4.6);
    camTarget = new THREE.Vector3(0.4, 1.35, -1.0);
  }
  // ---------------- 5. Stationary Landers (InSight, Phoenix, Surveyor, Venera, Huygens, Philae) ----------------
  else if (craftType === 'lander_solar' || craftType === 'lander_phoenix') {
    const ld = craftFallbackGroup;
    addCyl(0.82, 0.7, 0.36, goldFoil, 0, 0.74, 0, 0, 0, 0, 8, ld);
    addBox(0.9, 0.16, 0.85, darkTitanium, 0, 0.96, 0, 0, 0, 0, ld);
    // Twin UltraFlex circular decagonal solar wings
    addCyl(0.95, 0.95, 0.03, solarArrayMat, -1.52, 0.86, 0, 0, 0, 0, 10, ld);
    addCyl(0.95, 0.95, 0.03, solarArrayMat, 1.52, 0.86, 0, 0, 0, 0, 10, ld);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const lx = Math.cos(a) * 1.12;
      const lz = Math.sin(a) * 1.12;
      const foot = new THREE.Vector3(lx, 0.04, lz);
      const topAttach = new THREE.Vector3(Math.cos(a) * 0.62, 0.72, Math.sin(a) * 0.62);
      addCyl(0.18, 0.18, 0.04, silverMetal, lx, 0.02, lz, 0, 0, 0, 14, ld);
      addStrut(foot, topAttach, 0.035, silverMetal, ld, 10);
      addStrut(foot, new THREE.Vector3(Math.cos(a + 0.32) * 0.62, 0.6, Math.sin(a + 0.32) * 0.62), 0.02, darkTitanium, ld, 8);
      addStrut(foot, new THREE.Vector3(Math.cos(a - 0.32) * 0.62, 0.6, Math.sin(a - 0.32) * 0.62), 0.02, darkTitanium, ld, 8);
    }
    if (craftType === 'lander_phoenix') {
      // Phoenix articulated excavation scoop arm + white stereo SSI mast + TEGA/MECA deck instruments
      addCyl(0.035, 0.04, 0.56, whitePanelMat, 0.28, 1.24, -0.22, 0, 0, 0, 12, ld);
      addBox(0.28, 0.1, 0.14, whitePanelMat, 0.28, 1.54, -0.22, 0, 0, 0, ld);
      addCyl(0.025, 0.025, 0.05, lensGlassMat, 0.2, 1.54, -0.3, Math.PI / 2, 0, 0, 10, ld);
      addCyl(0.025, 0.025, 0.05, lensGlassMat, 0.36, 1.54, -0.3, Math.PI / 2, 0, 0, 10, ld);
      // Robotic digging arm reaching toward trench
      addBox(0.055, 0.055, 0.9, silverMetal, -0.15, 0.82, -0.82, 0.32, 0.15, 0, ld);
      addBox(0.05, 0.05, 0.75, darkTitanium, -0.26, 0.44, -1.42, 0.78, 0, 0, ld);
      addBox(0.16, 0.08, 0.2, silverMetal, -0.26, 0.14, -1.78, 0.25, 0, 0, ld);
      povOrigin = new THREE.Vector3(0.28, 1.56, -0.35);
    } else {
      addCyl(0.24, 0.28, 0.26, copperMat, 0.45, 0.13, -1.48, 0, 0, 0, 18, ld);
      addCyl(0.035, 0.035, 0.48, whitePanelMat, -0.25, 1.12, -0.2, 0, 0, 0, 12, ld);
      povOrigin = new THREE.Vector3(-0.25, 1.38, -0.32);
    }

    // InSight Marsquake seismic ground wave rings radiating from SEIS seismometer
    if (mission.id === 'insight') {
      for (let w = 0; w < 3; w++) {
        const sGeo = new THREE.RingGeometry(0.32, 0.38, 36);
        sGeo.rotateX(-Math.PI / 2);
        const sMat = new THREE.MeshBasicMaterial({
          color: 0xf97316,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          depthWrite: false,
          toneMapped: false,
        });
        const sMesh = new THREE.Mesh(sGeo, sMat);
        sMesh.position.set(0.45, 0.03, -1.48);
        groundExtrasGroup.add(sMesh);
        disposables.push(sGeo, sMat);
        seismicRings.push({ mesh: sMesh, mat: sMat, phase: w / 3 });
      }
    }
  } else if (craftType === 'lander_surveyor') {
    const sv = craftFallbackGroup;
    // Open triangular aluminum spaceframe + 2 solid vernier thrusters + TV mirror turret + soil-mechanics claw arm
    addBox(0.68, 0.52, 0.68, whitePanelMat, 0, 0.74, 0, 0, 0, 0, sv);
    addCyl(0.24, 0.24, 0.36, goldFoil, -0.2, 0.76, 0.22, 0, 0, 0, 16, sv);
    addCyl(0.22, 0.22, 0.34, copperMat, 0.22, 0.76, -0.18, 0, 0, 0, 16, sv);
    addBox(0.88, 0.04, 0.58, solarArrayMat, 0, 1.6, 0.12, 0.35, 0, 0, sv);
    addCyl(0.045, 0.045, 0.84, silverMetal, 0, 1.16, 0, 0, 0, 0, 14, sv);
    // Survey TV camera hood + articulated surface-sampler pantograph arm
    addCyl(0.075, 0.075, 0.38, whitePanelMat, 0.22, 1.12, -0.22, 0, 0, 0, 14, sv);
    addCyl(0.05, 0.05, 0.08, lensGlassMat, 0.22, 1.32, -0.24, 0.35, 0, 0, 12, sv);
    addStrut(new THREE.Vector3(-0.24, 0.62, -0.34), new THREE.Vector3(-0.46, 0.16, -0.92), 0.018, silverMetal, sv, 8);
    addBox(0.09, 0.06, 0.14, darkTitanium, -0.46, 0.12, -0.98, 0.25, 0, 0, sv);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const lx = Math.cos(a) * 1.12;
      const lz = Math.sin(a) * 1.12;
      addCyl(0.18, 0.18, 0.05, silverMetal, lx, 0.03, lz, 0, 0, 0, 14, sv);
      addStrut(new THREE.Vector3(lx, 0.05, lz), new THREE.Vector3(Math.cos(a) * 0.44, 0.66, Math.sin(a) * 0.44), 0.034, silverMetal, sv, 10);
      addStrut(new THREE.Vector3(lx * 0.82, 0.22, lz * 0.82), new THREE.Vector3(Math.cos(a + 0.4) * 0.34, 0.56, Math.sin(a + 0.4) * 0.34), 0.018, darkTitanium, sv, 8);
    }
    povOrigin = new THREE.Vector3(0, 1.2, -0.45);
  } else if (craftType === 'lander_venera') {
    const vn = craftFallbackGroup;
    // Serrated Crushable Shock-Ring + Armored Titanium Pressure Sphere + Serrated Aerodynamic Drag Brake + Penetrometer
    addCyl(0.76, 0.84, 0.12, darkTitanium, 0, 0.06, 0, 0, 0, 0, 24, vn);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      addStrut(new THREE.Vector3(Math.cos(a) * 0.68, 0.1, Math.sin(a) * 0.68), new THREE.Vector3(Math.cos(a) * 0.44, 0.36, Math.sin(a) * 0.44), 0.025, copperMat, vn, 8);
    }
    addCyl(0.46, 0.56, 0.68, silverMetal, 0, 0.46, 0, 0, 0, 0, 24, vn);
    addCyl(0.84, 0.5, 0.24, whitePanelMat, 0, 0.92, 0, 0, 0, 0, 22, vn); // Serrated drag ring
    addCyl(0.18, 0.18, 0.36, goldFoil, 0, 1.18, 0, 0, 0, 0, 16, vn);
    addCyl(0.05, 0.05, 0.12, lensGlassMat, 0, 0.56, -0.5, Math.PI / 2, 0, 0, 14, vn);
    addStrut(new THREE.Vector3(0.32, 0.44, -0.35), new THREE.Vector3(0.68, 0.04, -0.68), 0.018, silverMetal, vn, 8);
    povOrigin = new THREE.Vector3(0, 0.72, -0.62);
  } else if (craftType === 'lander_huygens') {
    const hg = craftFallbackGroup;
    addCyl(1.14, 0.62, 0.32, goldFoil, 0, 0.22, 0, 0, 0, 0, 26, hg);
    addCyl(0.72, 0.96, 0.34, silverMetal, 0, 0.52, 0, 0, 0, 0, 22, hg);
    addCyl(0.12, 0.12, 0.28, lensGlassMat, 0, 0.76, -0.22, 0, 0, 0, 14, hg);
    povOrigin = new THREE.Vector3(0, 0.66, -0.82);
  } else if (craftType === 'lander_philae') {
    const ph = craftFallbackGroup;
    addBox(0.76, 0.54, 0.72, solarArrayMat, 0, 0.68, 0, 0, 0, 0, ph);
    addBox(0.56, 0.08, 0.14, goldFoil, 0, 0.98, 0, 0, 0, 0, ph);
    addCyl(0.16, 0.22, 0.18, silverMetal, 0, 0.42, 0, 0, 0, 0, 14, ph);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const lx = Math.cos(a) * 0.98;
      const lz = Math.sin(a) * 0.98;
      addCyl(0.12, 0.12, 0.04, darkTitanium, lx, 0.02, lz, 0, 0, 0, 12, ph);
      addStrut(new THREE.Vector3(lx, 0.04, lz), new THREE.Vector3(Math.cos(a) * 0.42, 0.54, Math.sin(a) * 0.42), 0.028, silverMetal, ph, 10);
    }
    povOrigin = new THREE.Vector3(0, 0.85, -0.45);
  }
  // ---------------- 6. ORBITAL SATELLITES & SPACE TELESCOPES ----------------
  else if (craftType === 'sat_iss') {
    // Museum-grade 109m-proportion International Space Station (Non-LEGO Real NASA Architecture)
    const iss = craftFallbackGroup;
    idleFloatGroup = iss;

    // Stream real NASA ISS photo textures onto the solar wings & pressurized hulls + derive PBR relief without overwriting .map
    const issTexLoader = new THREE.TextureLoader();
    issTexLoader.setCrossOrigin('anonymous');
    issTexLoader.load(
      '/textures/iss/iss_panels_038.jpg',
      (tex) => {
        if (modelDisposed) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 4);
        issSolarMat.map = tex;
        issSolarMat.needsUpdate = true;
        disposables.push(tex);
        if (pbrCaps && tex.image) {
          void processCraft8KPBR({
            albedoSource: tex.image as HTMLImageElement,
            craftProfile: 'solar',
            normalStrength: 3.4,
            skipAlbedo: true,
            repeatX: 2,
            repeatY: 4,
            maxWidth: 2048,
            seed: 733,
            capabilities: pbrCaps,
            signal: abortSignal,
          }).then((set) => {
            if (!set || abortSignal?.aborted || modelDisposed) {
              set?.dispose();
              return;
            }
            disposables.push(set);
            issSolarMat.normalMap = set.normalMap;
            issSolarMat.roughnessMap = set.roughnessMap;
            issSolarMat.metalnessMap = set.metalnessMap;
            issSolarMat.needsUpdate = true;
          });
        }
      },
      undefined,
      () => {},
    );
    issTexLoader.load(
      '/textures/iss/iss_panels_beta.jpg',
      (tex) => {
        if (modelDisposed) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        issBetaMat.map = tex;
        issBetaMat.needsUpdate = true;
        disposables.push(tex);
        if (pbrCaps && tex.image) {
          void processCraft8KPBR({
            albedoSource: tex.image as HTMLImageElement,
            craftProfile: 'panel',
            normalStrength: 3.4,
            skipAlbedo: true,
            maxWidth: 2048,
            seed: 751,
            capabilities: pbrCaps,
            signal: abortSignal,
          }).then((set) => {
            if (!set || abortSignal?.aborted || modelDisposed) {
              set?.dispose();
              return;
            }
            disposables.push(set);
            issBetaMat.normalMap = set.normalMap;
            issBetaMat.roughnessMap = set.roughnessMap;
            issBetaMat.metalnessMap = set.metalnessMap;
            issBetaMat.needsUpdate = true;
          });
        }
      },
      undefined,
      () => {},
    );

    // A. Open 3D Integrated Truss Structure (P6..S6, 8.6 units span) with diagonal girder cross-bracing
    const trussHalfSpan = 4.35;
    const h = 0.095;
    // 4 main longitudinal truss rails
    for (const [ry, rz] of [
      [-h, -h],
      [h, -h],
      [-h, h],
      [h, h],
    ]) {
      addBox(trussHalfSpan * 2, 0.022, 0.022, silverMetal, 0, ry, rz, 0, 0, 0, iss);
    }
    // Cross-frames & diagonal K-bracing bays every 0.34 units
    const bayCount = 24;
    const bayStep = (trussHalfSpan * 2) / bayCount;
    for (let b = 0; b <= bayCount; b++) {
      const bx = -trussHalfSpan + b * bayStep;
      addBox(0.018, h * 2, 0.018, darkTitanium, bx, 0, -h, 0, 0, 0, iss);
      addBox(0.018, h * 2, 0.018, darkTitanium, bx, 0, h, 0, 0, 0, iss);
      addBox(0.018, 0.018, h * 2, darkTitanium, bx, h, 0, 0, 0, 0, iss);
      addBox(0.018, 0.018, h * 2, darkTitanium, bx, -h, 0, 0, 0, 0, iss);
      if (b < bayCount) {
        const mx = bx + bayStep * 0.5;
        addBox(bayStep * 1.15, 0.014, 0.014, silverMetal, mx, h, 0, 0, 0.52, 0, iss);
        addBox(bayStep * 1.15, 0.014, 0.014, silverMetal, mx, 0, h, 0, 0, 0.52, iss);
      }
    }
    // SARJ (Solar Alpha Rotary Joints) on P3/P4 & S3/S4
    addCyl(0.18, 0.18, 0.14, goldFoil, -2.05, 0, 0, 0, 0, Math.PI / 2, 16, iss);
    addCyl(0.18, 0.18, 0.14, goldFoil, 2.05, 0, 0, 0, 0, Math.PI / 2, 16, iss);
    // Z1 Zenith Truss tower & nadir Mobile Transporter cart
    addBox(0.32, 0.42, 0.32, darkTitanium, 0, 0.25, 0.28, 0, 0, 0, iss);
    addBox(0.3, 0.12, 0.26, goldFoil, 0.4, 0.06, -0.14, 0, 0, 0, iss);

    // B. 8 Iconic Copper-Amber Double Solar Array Wings (P6, P4, S4, S6) + iROSA Roll-Out Arrays (Sun-tracking SARJ pivots)
    const wingPositions = [-4.05, -2.92, 2.92, 4.05];
    for (let wi = 0; wi < wingPositions.length; wi++) {
      const sx = wingPositions[wi];
      const wingRoot = new THREE.Group();
      wingRoot.position.set(sx, 0.02, 0);
      iss.add(wingRoot);
      issWingRoots.push({ root: wingRoot, phase: wi * 0.35 });
      // Gimbal mast box & tension canisters
      addCyl(0.09, 0.09, 0.32, silverMetal, 0, 0, 0, Math.PI / 2, 0, 0, 12, wingRoot);
      for (const dir of [-1, 1]) {
        const wingTilt = sx < 0 ? 0.14 : -0.12;
        const mastLen = 2.68;
        // Central deployment lattice mast
        addCyl(0.02, 0.02, mastLen, silverMetal, 0, Math.sin(wingTilt) * 0.22, dir * (mastLen * 0.5 + 0.18), Math.PI / 2 + wingTilt, 0, 0, 8, wingRoot);
        // Paired twin Kapton solar blankets either side of central mast
        addBox(0.28, 0.015, 2.52, issSolarMat, -0.19, Math.sin(wingTilt) * 0.22, dir * 1.48, wingTilt, 0, 0, wingRoot);
        addBox(0.28, 0.015, 2.52, issSolarMat, 0.19, Math.sin(wingTilt) * 0.22, dir * 1.48, wingTilt, 0, 0, wingRoot);
        // Silver blanket tip bar
        addBox(0.72, 0.025, 0.03, silverMetal, 0, Math.sin(wingTilt) * 0.36, dir * 2.76, wingTilt, 0, 0, wingRoot);
      }
      // Modern iROSA dark high-efficiency solar blanket on inner wing
      if (Math.abs(sx) < 3.5) {
        addBox(0.32, 0.018, 1.35, solarArrayMat, 0, 0.08, -0.95, 0.12, 0, 0, wingRoot);
      }
    }

    // C. 6 White Accordion Thermal Control Radiators (EATCS on P1/S1 + PVR on P4/S6)
    for (const rx of [-1.42, -1.08, -0.74, 0.74, 1.08, 1.42]) {
      addBox(0.22, 0.016, 1.28, radiatorMat, rx, 0.16, 0.88, 0.08, 0, 0, iss);
    }
    addBox(0.28, 0.016, 1.15, radiatorMat, -2.25, -0.18, 0.76, -0.06, 0, 0, iss);
    addBox(0.28, 0.016, 1.15, radiatorMat, 2.25, -0.18, 0.76, -0.06, 0, 0, iss);

    // D. Authentic USOS & Russian Orbital Segment Module Stack along Z-axis
    const modY = -0.18;
    // 1. Zvezda Service Module (aft, +Z) + Russian solar paddles + Progress cargo
    addCyl(0.18, 0.22, 1.18, issBetaMat, 0, modY, 2.1, Math.PI / 2, 0, 0, 20, iss);
    addCyl(0.12, 0.18, 0.25, darkTitanium, 0, modY, 2.75, Math.PI / 2, 0, 0, 16, iss);
    addBox(1.45, 0.016, 0.28, solarArrayMat, 0, modY + 0.06, 2.2, 0.22, 0, 0, iss);
    // Zarya FGB + twin folded solar arrays
    addCyl(0.2, 0.2, 1.05, issBetaMat, 0, modY, 1.18, Math.PI / 2, 0, 0, 20, iss);
    addBox(1.18, 0.014, 0.22, solarArrayMat, 0, modY + 0.05, 1.18, 0.18, 0, 0, iss);
    // Nauka & Soyuz docked nadir-aft
    addCyl(0.14, 0.16, 0.62, darkTitanium, 0, modY - 0.42, 1.55, 0, 0, 0, 16, iss);
    addBox(0.76, 0.012, 0.16, solarArrayMat, 0, modY - 0.56, 1.55, 0.2, 0, 0, iss);
    // Soyuz docked aft of Zvezda
    addCyl(0.11, 0.11, 0.48, darkTitanium, 0, modY, 3.08, Math.PI / 2, 0, 0, 14, iss);
    addBox(0.68, 0.01, 0.14, solarArrayMat, 0, modY, 3.16, 0.1, 0, 0, iss);

    // 2. Unity (Node 1) + Pressurized Mating Adapter + Quest Airlock (starboard +X) + Tranquility + Cupola (nadir)
    addCyl(0.23, 0.23, 0.62, issBetaMat, 0, modY, 0.42, Math.PI / 2, 0, 0, 20, iss);
    addCyl(0.18, 0.22, 0.24, silverMetal, 0, modY, 0.78, Math.PI / 2, 0, 0, 16, iss);
    // Quest Airlock + O2/N2 spherical tanks
    addCyl(0.18, 0.15, 0.58, silverMetal, 0.48, modY, 0.38, 0, 0, Math.PI / 2, 16, iss);
    addCyl(0.12, 0.12, 0.24, goldFoil, 0.52, modY + 0.16, 0.38, 0, 0, Math.PI / 2, 12, iss);
    // Tranquility (Node 3) port + 7-Window Cupola Observatory underneath
    addCyl(0.21, 0.21, 0.65, issBetaMat, -0.52, modY, 0.38, 0, 0, Math.PI / 2, 18, iss);
    addCyl(0.12, 0.17, 0.16, lensGlassMat, -0.56, modY - 0.22, 0.38, 0, 0, 0, 7, iss);
    addCyl(0.18, 0.18, 0.04, silverMetal, -0.56, modY - 0.14, 0.38, 0, 0, 0, 7, iss);

    // 3. US Lab Destiny (center under Truss S0) + MMOD Whipple bumper rings
    addCyl(0.24, 0.24, 0.96, issBetaMat, 0, modY, -0.35, Math.PI / 2, 0, 0, 22, iss);
    addCyl(0.255, 0.255, 0.06, silverMetal, 0, modY, -0.1, Math.PI / 2, 0, 0, 22, iss);
    addCyl(0.255, 0.255, 0.06, silverMetal, 0, modY, -0.6, Math.PI / 2, 0, 0, 22, iss);
    addBox(0.12, 0.14, 0.18, goldFoil, 0, modY + 0.16, -0.1, 0, 0, 0, iss); // Destiny window shutter

    // 4. Harmony (Node 2) + Columbus (ESA +X) + Kibo (JAXA -X + Exposed Facility) + Crew Dragon (forward -Z)
    addCyl(0.23, 0.23, 0.68, issBetaMat, 0, modY, -1.16, Math.PI / 2, 0, 0, 20, iss);
    // Columbus (ESA, starboard +X) + external EuTEF/SOLAR payload racks
    addCyl(0.22, 0.22, 0.78, issBetaMat, 0.68, modY, -1.16, 0, 0, Math.PI / 2, 18, iss);
    addBox(0.24, 0.16, 0.2, copperMat, 1.12, modY, -1.16, 0, 0, 0, iss);
    // Kibo (JAXA, port -X) + Logistics Module on top + Exposed Facility science platform + JEMRMS arm
    addCyl(0.23, 0.23, 1.05, issBetaMat, -0.82, modY, -1.16, 0, 0, Math.PI / 2, 20, iss);
    addCyl(0.16, 0.16, 0.42, issBetaMat, -0.78, modY + 0.3, -1.16, 0, 0, 0, 16, iss);
    addBox(0.42, 0.08, 0.48, darkTitanium, -1.52, modY - 0.04, -1.16, 0, 0, 0, iss);
    addCyl(0.1, 0.1, 0.18, goldFoil, -1.56, modY + 0.08, -1.04, 0, 0, 0, 12, iss);
    // Docked SpaceX Crew Dragon (forward -Z on Harmony IDA-2) + Progress Cargo (zenith Zvezda)
    addCyl(0.18, 0.2, 0.28, darkTitanium, 0, modY, -1.68, Math.PI / 2, 0, 0, 18, iss);
    addCyl(0.1, 0.18, 0.32, whitePanelMat, 0, modY, -1.96, Math.PI / 2, 0, 0, 18, iss);
    addCyl(0.1, 0.11, 0.42, silverMetal, 0, modY + 0.36, 2.05, 0, 0, 0, 14, iss);
    addBox(0.58, 0.012, 0.12, solarArrayMat, 0, modY + 0.44, 2.05, 0.18, 0, 0, iss);
    // Canadarm2 articulated SSRMS arm anchored near Destiny/Harmony
    issArmPivot = new THREE.Group();
    issArmPivot.position.set(0.18, modY + 0.16, -0.35);
    iss.add(issArmPivot);
    addBox(0.03, 0.03, 0.56, whitePanelMat, 0.08, 0.08, -0.24, 0.35, -0.4, 0, issArmPivot);
    addBox(0.03, 0.03, 0.54, silverMetal, 0.28, 0.24, -0.52, -0.25, 0.3, 0, issArmPivot);

    // Port (Red) & Starboard (Green) Orbital Navigation Strobe Beacons on Truss Tips
    const strobeGeo = new THREE.SphereGeometry(0.045, 10, 8);
    issStrobePortMat = new THREE.MeshBasicMaterial({ color: 0xef4444, toneMapped: false });
    issStrobeStbdMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, toneMapped: false });
    const strobePort = new THREE.Mesh(strobeGeo, issStrobePortMat);
    strobePort.position.set(-4.38, 0.14, 0);
    const strobeStbd = new THREE.Mesh(strobeGeo, issStrobeStbdMat);
    strobeStbd.position.set(4.38, 0.14, 0);
    iss.add(strobePort, strobeStbd);
    disposables.push(strobeGeo, issStrobePortMat, issStrobeStbdMat);

    povOrigin = new THREE.Vector3(-0.56, modY - 0.28, 0.38); // Looking Earthward from the 7-window Cupola!
    povLook = new THREE.Vector3(-0.56, -8.5, -2.5);
    camPos = new THREE.Vector3(-5.2, 2.45, 5.4);
    camTarget = new THREE.Vector3(0, -0.15, 0.1);
  } else if (craftType === 'sat_hubble') {
    const hst = craftFallbackGroup;
    idleFloatGroup = hst;
    // Aluminum cylindrical OTA mirror tube + aft shroud
    addCyl(0.62, 0.62, 2.6, silverMetal, 0, 0, 0, Math.PI / 2, 0, 0, 28, hst);
    addCyl(0.72, 0.72, 0.9, goldFoil, 0, 0, 1.4, Math.PI / 2, 0, 0, 24, hst);
    // Open aperture baffle door
    addBox(1.15, 0.04, 0.85, silverMetal, 0, 0.66, -1.55, -0.95, 0, 0, hst);
    addCyl(0.54, 0.54, 0.05, lensGlassMat, 0, 0, -1.28, Math.PI / 2, 0, 0, 24, hst);
    // Twin solar wings
    addBox(2.4, 0.03, 0.68, solarArrayMat, -1.9, 0.05, 0.2, 0.35, 0, 0, hst);
    addBox(2.4, 0.03, 0.68, solarArrayMat, 1.9, 0.05, 0.2, 0.35, 0, 0, hst);
    // High-gain antenna masts
    addCyl(0.025, 0.025, 1.35, silverMetal, 0, 1.0, 0.6, 0, 0, 0, 12, hst);
    addCyl(0.24, 0.04, 0.08, whitePanelMat, 0, 1.68, 0.6, 0.3, 0, 0, 18, hst);

    povOrigin = new THREE.Vector3(0, 0, -1.45);
    povLook = new THREE.Vector3(0, 1.2, -16.0);
    camPos = new THREE.Vector3(-3.6, 1.8, 3.8);
    camTarget = new THREE.Vector3(0, 0, 0);
  } else if (craftType === 'sat_jwst') {
    const jwst = craftFallbackGroup;
    idleFloatGroup = jwst;
    // 5-layer diamond silver Kapton sunshield
    for (let l = 0; l < 5; l++) {
      const geo = new THREE.ConeGeometry(3.2 - l * 0.08, 0.02, 4);
      geo.scale(1.0, 1.0, 1.48);
      geo.rotateY(Math.PI / 4);
      const mat = l === 4 ? goldFoil : silverMetal;
      addMesh(geo, mat, jwst, 0, -0.35 - l * 0.09, 0);
    }
    // 6.5m Hexagonal Gold Primary Mirror
    const mirrorGeo = new THREE.CylinderGeometry(1.45, 1.45, 0.12, 6);
    addMesh(mirrorGeo, jwstMirrorMat, jwst, 0, 0.95, -0.32, Math.PI / 2, 0, 0);
    // Tripod struts + Secondary mirror
    addBox(0.04, 1.75, 0.04, darkTitanium, 0, 1.42, -1.05, 0.72, 0, 0, jwst);
    addBox(0.04, 1.75, 0.04, darkTitanium, -0.68, 0.68, -1.05, -0.58, 0, -0.45, jwst);
    addBox(0.04, 1.75, 0.04, darkTitanium, 0.68, 0.68, -1.05, -0.58, 0, 0.45, jwst);
    addCyl(0.18, 0.18, 0.06, jwstMirrorMat, 0, 0.95, -1.78, Math.PI / 2, 0, 0, 12, jwst);
    // Aft Instrument module ISIM
    addBox(0.86, 0.92, 0.56, darkTitanium, 0, 0.95, 0.08, 0, 0, 0, jwst);

    povOrigin = new THREE.Vector3(0, 0.95, -1.9);
    povLook = new THREE.Vector3(0, 1.2, -18.0);
    camPos = new THREE.Vector3(-4.2, 2.2, 4.6);
    camTarget = new THREE.Vector3(0, 0.35, -0.3);
  } else if (craftType === 'sat_lro' || craftType === 'sat_mro') {
    const sat = craftFallbackGroup;
    idleFloatGroup = sat;
    const isMro = craftType === 'sat_mro';
    addBox(1.1, 1.25, 1.0, goldFoil, 0, 0.2, 0, 0, 0, 0, sat);
    // Large solar wings
    addBox(isMro ? 3.2 : 2.3, 0.03, 0.95, solarArrayMat, isMro ? -2.25 : -1.75, 0.25, 0, 0.25, 0, 0, sat);
    if (isMro) {
      addBox(3.2, 0.03, 0.95, solarArrayMat, 2.25, 0.25, 0, 0.25, 0, 0, sat);
    }
    // Parabolic high-gain dish on top & nadir telescope barrel looking at planet/Moon
    addCyl(isMro ? 0.95 : 0.48, 0.12, 0.22, whitePanelMat, 0, 1.08, 0, 0.15, 0, 0, 24, sat);
    addCyl(0.26, 0.28, 0.72, darkTitanium, 0, -0.58, -0.25, 0, 0, 0, 18, sat);
    addCyl(0.22, 0.22, 0.05, lensGlassMat, 0, -0.94, -0.25, 0, 0, 0, 18, sat);

    povOrigin = new THREE.Vector3(0, -1.02, -0.25);
    povLook = new THREE.Vector3(0, -12.0, -3.5);
    camPos = new THREE.Vector3(-3.8, 1.8, 4.2);
    camTarget = new THREE.Vector3(0, 0.1, 0);
  } else if (craftType === 'probe_juno') {
    const juno = craftFallbackGroup;
    spinCraft = juno;
    // Hexagonal vault body + top magnetometer/dish
    addCyl(0.88, 0.88, 0.65, goldFoil, 0, 0, 0, 0, 0, 0, 6, juno);
    addCyl(0.65, 0.1, 0.16, whitePanelMat, 0, 0.45, 0, 0, 0, 0, 24, juno);
    // 3 iconic giant 9m-proportion radial solar wings (120 deg apart)
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const wing = new THREE.Group();
      wing.rotation.y = a;
      juno.add(wing);
      addBox(3.6, 0.03, 0.92, solarArrayMat, 2.65, 0, 0, 0, 0, 0, wing);
      addBox(0.35, 0.04, 0.35, silverMetal, 0.95, 0, 0, 0, 0, 0, wing);
    }
    povOrigin = new THREE.Vector3(0, -0.45, -0.5);
    povLook = new THREE.Vector3(0, -10.0, -6.0);
    camPos = new THREE.Vector3(-4.8, 2.6, 5.2);
    camTarget = new THREE.Vector3(0, 0, 0);
  } else if (craftType === 'probe_voyager') {
    const voy = craftFallbackGroup;
    idleFloatGroup = voy;
    // Decagonal spacecraft bus + 3.7m white parabolic High-Gain Dish
    addCyl(0.75, 0.75, 0.48, darkTitanium, 0, 0, 0, Math.PI / 2, 0, 0, 10, voy);
    addCyl(1.48, 0.18, 0.32, whitePanelMat, 0, 0, -0.42, -Math.PI / 2, 0, 0, 28, voy);
    // Iconic Voyager Golden Record mounted on the side!
    addCyl(0.22, 0.22, 0.03, goldFoil, 0.76, 0, 0.02, 0, 0, Math.PI / 2, 24, voy);
    // RTG boom + 13m magnetometer lattice boom + plasma whip antennas
    addCyl(0.11, 0.11, 1.5, darkTitanium, -1.25, -0.35, 0.25, 0, 0, 1.25, 14, voy);
    addCyl(0.03, 0.03, 3.8, silverMetal, 1.85, 0.5, 0.3, 0, 0, -1.1, 10, voy);
    addCyl(0.015, 0.015, 2.6, silverMetal, -0.8, 1.15, 0.2, 0.2, 0, 0.65, 8, voy);
    addCyl(0.015, 0.015, 2.6, silverMetal, 0.8, -1.15, 0.2, -0.2, 0, -0.65, 8, voy);

    // Expanding Deep Space Network RF radio telemetry waves beaming back to Earth
    for (let r = 0; r < 3; r++) {
      const wGeo = new THREE.RingGeometry(0.45, 0.51, 32);
      const wMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      });
      const wMesh = new THREE.Mesh(wGeo, wMat);
      wMesh.position.set(0, 0, -0.65);
      groundExtrasGroup.add(wMesh);
      disposables.push(wGeo, wMat);
      rfWaveRings.push({ mesh: wMesh, mat: wMat, phase: r / 3 });
    }

    povOrigin = new THREE.Vector3(0, 0.2, -0.72);
    povLook = new THREE.Vector3(0, 0.2, -16.0);
    camPos = new THREE.Vector3(3.4, 1.6, 3.8);
    camTarget = new THREE.Vector3(0, 0, 0);
  } else if (craftType === 'probe_newhorizons') {
    const nh = craftFallbackGroup;
    idleFloatGroup = nh;
    // Triangular gold Kapton spacecraft + 2.1m white dish + RTG finned cylinder + LORRI telescope + SWAP/PEPSSI
    addCyl(0.85, 0.85, 0.5, goldFoil, 0, 0, 0, 0, 0, 0, 3, nh);
    addCyl(1.05, 0.14, 0.24, whitePanelMat, 0, 0.42, 0, 0, 0, 0, 26, nh);
    addCyl(0.02, 0.02, 0.28, silverMetal, 0, 0.62, 0, 0, 0, 0, 8, nh);
    addCyl(0.14, 0.16, 0.95, darkTitanium, -1.05, -0.1, 0.2, 0, 0, 1.35, 14, nh);
    addBox(0.75, 0.28, 0.03, copperMat, -1.05, -0.1, 0.2, 0, 0, 1.35, nh);
    addCyl(0.18, 0.18, 0.48, silverMetal, 0.45, -0.25, -0.55, Math.PI / 2, 0, 0, 16, nh);
    addCyl(0.14, 0.14, 0.05, lensGlassMat, 0.45, -0.25, -0.8, Math.PI / 2, 0, 0, 14, nh);
    addBox(0.24, 0.16, 0.22, darkTitanium, -0.35, -0.22, -0.48, 0, 0, 0, nh); // Ralph/Alice optics

    povOrigin = new THREE.Vector3(0.45, -0.25, -0.82);
    povLook = new THREE.Vector3(0.2, -6.0, -14.0);
    camPos = new THREE.Vector3(-3.2, 1.6, 3.4);
    camTarget = new THREE.Vector3(0, 0, 0);
  } else if (craftType === 'lander_viking') {
    // Viking Lander: hexagonal aluminium body, 3 legs, twin SNAP-19 RTGs with wind covers,
    // S-band high-gain dish on its mast, twin facsimile cameras, meteorology boom, sampler arm
    const vk = craftFallbackGroup;
    addCyl(0.82, 0.82, 0.42, silverMetal, 0, 0.82, 0, 0, 0, 0, 6, vk);
    addCyl(0.84, 0.84, 0.05, whitePanelMat, 0, 1.05, 0, 0, 0, 0, 6, vk);
    for (const side of [-1, 1]) {
      // RTG with finned wind cover
      addCyl(0.17, 0.17, 0.42, darkTitanium, side * 0.48, 1.3, 0.28, 0, 0, 0, 12, vk);
      addBox(0.44, 0.38, 0.03, darkTitanium, side * 0.48, 1.3, 0.28, 0, 0, 0, vk);
    }
    addCyl(0.035, 0.035, 0.9, silverMetal, -0.36, 1.5, -0.32, 0, 0, 0, 10, vk);
    addCyl(0.5, 0.06, 0.12, whitePanelMat, -0.36, 1.98, -0.32, 0.6, 0, 0, 22, vk);
    // Twin facsimile camera turrets
    for (const cx of [-0.28, 0.3]) {
      addCyl(0.1, 0.1, 0.42, whitePanelMat, cx, 1.3, -0.62, 0, 0, 0, 14, vk);
      addCyl(0.04, 0.04, 0.06, lensGlassMat, cx, 1.42, -0.72, Math.PI / 2, 0, 0, 10, vk);
    }
    // Meteorology boom
    addStrut(new THREE.Vector3(0.6, 1.05, 0.1), new THREE.Vector3(1.1, 1.7, 0.3), 0.022, silverMetal, vk, 8);
    addBox(0.16, 0.06, 0.1, darkTitanium, 1.12, 1.72, 0.3, 0, 0, 0, vk);
    // Surface sampler arm reaching into its trench
    addBox(0.07, 0.07, 1.2, silverMetal, 0.12, 0.62, -1.15, 0.38, 0, 0, vk);
    addBox(0.14, 0.1, 0.2, darkTitanium, 0.12, 0.22, -1.72, 0.3, 0, 0, vk);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3 + Math.PI / 6;
      const lx = Math.cos(a) * 1.25;
      const lz = Math.sin(a) * 1.25;
      addCyl(0.2, 0.22, 0.06, silverMetal, lx, 0.03, lz, 0, 0, 0, 16, vk);
      addStrut(new THREE.Vector3(lx, 0.06, lz), new THREE.Vector3(Math.cos(a) * 0.7, 0.72, Math.sin(a) * 0.7), 0.04, silverMetal, vk, 10);
      addStrut(new THREE.Vector3(lx * 0.85, 0.2, lz * 0.85), new THREE.Vector3(Math.cos(a + 0.45) * 0.62, 0.66, Math.sin(a + 0.45) * 0.62), 0.02, darkTitanium, vk, 8);
    }
    povOrigin = new THREE.Vector3(-0.28, 1.45, -0.72);
    camPos = new THREE.Vector3(-3.4, 2.1, 4.0);
    camTarget = new THREE.Vector3(0, 0.95, -0.4);
  } else if (craftType === 'package_alsep') {
    // Apollo 12 ALSEP: Central Station + sunshade + helical antenna, SNAP-27 RTG, Passive Seismic
    // Experiment under its thermal shroud, Lunar Surface Magnetometer and Solar Wind Spectrometer
    const al = craftFallbackGroup;
    addBox(0.62, 0.3, 0.44, goldFoil, 0, 0.2, 0, 0, 0, 0, al);
    addBox(0.78, 0.02, 0.6, silverMetal, 0, 0.62, 0, 0, 0, 0, al);
    for (const [sx, sz] of [[-0.36, -0.27], [0.36, -0.27], [-0.36, 0.27], [0.36, 0.27]]) {
      addCyl(0.012, 0.012, 0.28, silverMetal, sx, 0.48, sz, 0, 0, 0, 6, al);
    }
    addCyl(0.03, 0.03, 0.62, silverMetal, 0.2, 0.86, 0.08, 0.5, 0, 0, 8, al);
    // SNAP-27 RTG with radial cooling fins, 3 m away
    addCyl(0.16, 0.16, 0.46, darkTitanium, -2.6, 0.23, 0.6, 0, 0, 0, 16, al);
    for (let f = 0; f < 8; f++) {
      const a = (f * Math.PI) / 4;
      addBox(0.28, 0.42, 0.015, darkTitanium, -2.6 + Math.cos(a) * 0.14, 0.23, 0.6 + Math.sin(a) * 0.14, 0, -a, 0, al);
    }
    // Passive Seismic Experiment: drum + aluminised mylar skirt laid on the regolith
    addCyl(0.62, 0.62, 0.012, silverMetal, 1.9, 0.01, -1.3, 0, 0, 0, 28, al);
    addCyl(0.15, 0.17, 0.36, silverMetal, 1.9, 0.19, -1.3, 0, 0, 0, 16, al);
    // Lunar Surface Magnetometer: three booms with sensor heads
    for (let b = 0; b < 3; b++) {
      const a = (b * Math.PI * 2) / 3;
      addStrut(new THREE.Vector3(-1.4, 0.32, -1.6), new THREE.Vector3(-1.4 + Math.cos(a) * 0.8, 0.6, -1.6 + Math.sin(a) * 0.8), 0.015, silverMetal, al, 6);
      addCyl(0.05, 0.05, 0.12, whitePanelMat, -1.4 + Math.cos(a) * 0.8, 0.6, -1.6 + Math.sin(a) * 0.8, 0, 0, Math.PI / 2, 10, al);
    }
    addBox(0.26, 0.22, 0.22, goldFoil, -1.4, 0.22, -1.6, 0, 0, 0, al);
    // Solar Wind Spectrometer on its legs
    addBox(0.3, 0.24, 0.3, whitePanelMat, 1.3, 0.42, 1.25, 0, 0, 0, al);
    for (const [lx, lz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) {
      addCyl(0.012, 0.012, 0.32, silverMetal, 1.3 + lx, 0.16, 1.25 + lz, 0, 0, 0, 6, al);
    }
    // Flat ribbon cables running to the Central Station
    addBox(2.4, 0.006, 0.025, darkTitanium, -1.3, 0.004, 0.3, 0, -0.12, 0, al);
    addBox(2.2, 0.006, 0.025, darkTitanium, 0.95, 0.004, -0.65, 0, 0.6, 0, al);
    addBox(1.6, 0.006, 0.025, darkTitanium, 0.65, 0.004, 0.62, 0, -0.75, 0, al);
    povOrigin = new THREE.Vector3(0, 0.9, 1.2);
    povLook = new THREE.Vector3(0, 0.4, -10.0);
    camPos = new THREE.Vector3(-3.6, 2.4, 4.4);
    camTarget = new THREE.Vector3(-0.2, 0.25, -0.2);
  } else if (craftType === 'heli_ingenuity') {
    // Ingenuity parked at Valinor Hills: rotors stopped, one blade tip broken on flight 72
    const hg = craftFallbackGroup;
    addBox(0.2, 0.18, 0.2, goldFoil, 0, 0.36, 0, 0, 0, 0, hg);
    addBox(0.42, 0.02, 0.18, solarArrayMat, 0, 0.66, 0, 0, 0, 0, hg);
    addCyl(0.02, 0.02, 0.36, darkTitanium, 0, 0.5, 0, 0, 0, 0, 10, hg);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      addStrut(new THREE.Vector3(Math.cos(a) * 0.08, 0.3, Math.sin(a) * 0.08), new THREE.Vector3(Math.cos(a) * 0.3, 0.0, Math.sin(a) * 0.3), 0.009, darkTitanium, hg, 6);
    }
    addBox(1.2, 0.012, 0.07, darkTitanium, 0, 0.6, 0, 0, 0.4, 0, hg);
    addBox(0.92, 0.012, 0.07, darkTitanium, -0.14, 0.55, 0.06, 0, -0.9, 0.03, hg);
    povOrigin = new THREE.Vector3(0, 0.32, -0.12);
    povLook = new THREE.Vector3(0, 0.2, -10.0);
    camPos = new THREE.Vector3(-1.5, 0.95, 1.9);
    camTarget = new THREE.Vector3(0, 0.32, 0);
  } else if (craftType === 'probe_pioneer') {
    // Pioneer 10/11: 2.74 m high-gain dish, hexagonal equipment compartment, two RTG trusses,
    // magnetometer boom and the gold-anodised Pioneer plaque on the antenna struts
    const pn = craftFallbackGroup;
    idleFloatGroup = pn;
    addCyl(1.42, 0.2, 0.36, whitePanelMat, 0, 0, -0.2, -Math.PI / 2, 0, 0, 30, pn);
    addCyl(0.62, 0.62, 0.38, goldFoil, 0, 0, 0.32, Math.PI / 2, 0, 0, 6, pn);
    addCyl(0.035, 0.05, 0.62, silverMetal, 0, 0, -0.72, Math.PI / 2, 0, 0, 10, pn);
    for (const side of [-1, 1]) {
      const a = side > 0 ? 0.35 : Math.PI + 0.35;
      const end = new THREE.Vector3(Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0.45);
      addStrut(new THREE.Vector3(Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0.35), end, 0.025, silverMetal, pn, 8);
      addCyl(0.12, 0.12, 0.5, darkTitanium, end.x, end.y, end.z, 0, 0, a + Math.PI / 2, 12, pn);
    }
    addStrut(new THREE.Vector3(0, -0.55, 0.35), new THREE.Vector3(0, -3.6, 0.6), 0.015, silverMetal, pn, 6);
    addBox(0.3, 0.2, 0.012, goldFoil, 0.42, 0.42, 0.06, 0, 0, 0, pn);
    for (let r = 0; r < 3; r++) {
      const wGeo = new THREE.RingGeometry(0.45, 0.51, 32);
      const wMat = new THREE.MeshBasicMaterial({
        color: 0xfcd34d,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      });
      const wMesh = new THREE.Mesh(wGeo, wMat);
      wMesh.position.set(0, 0, -0.65);
      groundExtrasGroup.add(wMesh);
      disposables.push(wGeo, wMat);
      rfWaveRings.push({ mesh: wMesh, mat: wMat, phase: r / 3 });
    }
    povOrigin = new THREE.Vector3(0, 0.1, -0.9);
    povLook = new THREE.Vector3(0, 0.1, -16.0);
    camPos = new THREE.Vector3(3.6, 1.8, 4.2);
    camTarget = new THREE.Vector3(0, 0, 0);
  } else if (craftType === 'probe_dawn') {
    // Dawn: box bus, two 8.3 m solar wings (~20 m span), 1.5 m dish, three xenon ion thrusters
    const dw = craftFallbackGroup;
    idleFloatGroup = dw;
    addBox(1.0, 0.82, 1.1, goldFoil, 0, 0, 0, 0, 0, 0, dw);
    for (const side of [-1, 1]) {
      addBox(0.5, 0.03, 0.06, silverMetal, side * 0.75, 0, 0, 0, 0, 0, dw);
      addBox(3.9, 0.03, 0.95, solarArrayMat, side * 2.95, 0, 0, 0.12, 0, 0, dw);
    }
    addCyl(0.62, 0.1, 0.14, whitePanelMat, 0.15, 0.52, 0.1, 0.25, 0, 0, 24, dw);
    for (const tx of [-0.28, 0, 0.28]) {
      addCyl(0.13, 0.16, 0.14, copperMat, tx, -0.48, 0.25, 0, 0, 0, 16, dw);
    }
    addCyl(0.07, 0.07, 0.22, lensGlassMat, -0.3, -0.1, -0.6, Math.PI / 2, 0, 0, 12, dw);
    povOrigin = new THREE.Vector3(-0.3, -0.1, -0.75);
    povLook = new THREE.Vector3(0, -10.0, -8.0);
    camPos = new THREE.Vector3(-4.6, 2.4, 5.4);
    camTarget = new THREE.Vector3(0, 0, 0);
  } else if (craftType === 'probe_near') {
    // NEAR Shoemaker resting on Eros: octagonal bus, four fixed solar panels, 1.5 m dish;
    // it settled tilted on two panel edges and the bus, never designed to land
    const nr = new THREE.Group();
    nr.position.set(0, 0.55, 0);
    nr.rotation.set(-0.55, 0.3, 0.18);
    craftFallbackGroup.add(nr);
    addCyl(0.62, 0.62, 1.1, goldFoil, 0, 0, 0, 0, 0, 0, 8, nr);
    addCyl(0.64, 0.64, 0.04, whitePanelMat, 0, 0.56, 0, 0, 0, 0, 8, nr);
    addCyl(0.62, 0.1, 0.14, whitePanelMat, 0, 0.66, 0, 0, 0, 0, 24, nr);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const panel = new THREE.Group();
      panel.rotation.y = a;
      nr.add(panel);
      addBox(1.3, 0.03, 0.95, solarArrayMat, 1.3, 0.48, 0, 0, 0, 0, panel);
    }
    addCyl(0.1, 0.1, 0.2, lensGlassMat, 0.35, -0.6, 0.2, 0, 0, 0, 12, nr);
    povOrigin = new THREE.Vector3(0.35, 0.4, -0.6);
    povLook = new THREE.Vector3(0.5, 0.2, -10.0);
    camPos = new THREE.Vector3(-3.4, 2.2, 4.0);
    camTarget = new THREE.Vector3(0, 0.45, 0);
  } else if (craftType === 'sat_kepler') {
    // Kepler: 1.4 m Schmidt photometer barrel with slanted sun shade, fixed solar array on the
    // sun side, hexagonal spacecraft bus and two medium/low gain antennas
    const kp = craftFallbackGroup;
    idleFloatGroup = kp;
    addCyl(0.85, 0.85, 0.5, darkTitanium, 0, -1.25, 0, 0, 0, 0, 6, kp);
    addCyl(0.72, 0.72, 2.3, silverMetal, 0, 0.15, 0, 0, 0, 0, 28, kp);
    addCyl(0.74, 0.74, 0.08, goldFoil, 0, -0.95, 0, 0, 0, 0, 28, kp);
    addBox(1.6, 0.03, 1.5, silverMetal, 0, 1.42, -0.18, 0.55, 0, 0, kp);
    addCyl(0.66, 0.66, 0.04, lensGlassMat, 0, 1.2, 0, 0, 0, 0, 28, kp);
    addBox(2.4, 3.0, 0.04, solarArrayMat, 0, 0.0, 1.05, 0.12, 0, 0, kp);
    addCyl(0.26, 0.05, 0.08, whitePanelMat, 0.75, -1.45, -0.4, 0.5, 0, 0, 18, kp);
    povOrigin = new THREE.Vector3(0, 1.5, 0);
    povLook = new THREE.Vector3(0, 18.0, -4.0);
    camPos = new THREE.Vector3(-4.6, 1.6, -3.8);
    camTarget = new THREE.Vector3(0, 0, 0);
  } else {
    // Cassini / MESSENGER
    const probe = craftFallbackGroup;
    idleFloatGroup = probe;
    addCyl(0.46, 0.46, 1.4, goldFoil, 0, 0.25, 0, 0.2, 0, 0, 16, probe);
    addCyl(0.98, 0.18, 0.28, whitePanelMat, 0, 1.1, -0.16, 0.2, 0, 0, 26, probe);
    if (craftType === 'probe_cassini') {
      addCyl(0.04, 0.04, 2.9, silverMetal, 1.38, 0.15, 0, 0, 0, Math.PI / 2, 10, probe);
      addCyl(0.44, 0.44, 0.2, goldFoil, -0.54, 0.25, 0.1, 0, 0, Math.PI / 2, 18, probe);
    } else {
      addBox(1.45, 1.65, 0.08, whitePanelMat, 0, 0.35, 0.7, 0, 0, 0, probe);
      addBox(3.5, 0.04, 0.5, solarArrayMat, 0, 0.25, 0, 0, 0, 0, probe);
    }
    povOrigin = new THREE.Vector3(0, -0.2, -0.75);
    povLook = new THREE.Vector3(0, -9.0, -12.0);
    camPos = new THREE.Vector3(-3.6, 1.8, 4.0);
    camTarget = new THREE.Vector3(0, 0.2, 0);
  }

  // ChemCam / SuperCam LIBS green-cyan laser spectroscopy beam for Mars rovers
  if (craftType === 'rover_msl' || craftType === 'rover_mer') {
    const startPt =
      craftType === 'rover_msl'
        ? new THREE.Vector3(0.26, 1.88, -0.58)
        : new THREE.Vector3(0.18, 1.56, -0.45);
    const targetPt = new THREE.Vector3(0.22, 0.18, -3.55);
    const beamVec = targetPt.clone().sub(startPt);
    const beamLen = beamVec.length();
    const beamGeo = new THREE.CylinderGeometry(0.011, 0.011, beamLen, 8);
    beamGeo.translate(0, beamLen * 0.5, 0);
    beamGeo.rotateX(Math.PI / 2);
    libsBeamMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    libsBeamMesh = new THREE.Mesh(beamGeo, libsBeamMat);
    libsBeamMesh.position.copy(startPt);
    libsBeamMesh.lookAt(targetPt);
    libsBeamMesh.visible = false;
    groundExtrasGroup.add(libsBeamMesh);

    const sparkGeo = new THREE.SphereGeometry(0.08, 12, 10);
    libsSparkMat = new THREE.MeshBasicMaterial({
      color: 0xa7f3d0,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    libsSparkMesh = new THREE.Mesh(sparkGeo, libsSparkMat);
    libsSparkMesh.position.copy(targetPt);
    libsSparkMesh.visible = false;
    groundExtrasGroup.add(libsSparkMesh);
    disposables.push(beamGeo, libsBeamMat, sparkGeo, libsSparkMat);
  }

  // Stream real official NASA public-domain 3D .glb model & embedded photos when available
  let glbDisposed = false;
  let glbMainRoot: THREE.Group | null = null;
  let glbCompanionRoot: THREE.Group | null = null;
  let glbMixer: THREE.AnimationMixer | null = null;
  let glbIngenuityRotors: THREE.Object3D[] = [];
  let glbRosettaPanels: THREE.Object3D[] = [];
  let glbRosettaDish: THREE.Object3D | null = null;
  let glbInsightArm1: THREE.Object3D | null = null;
  let glbInsightArm2: THREE.Object3D | null = null;
  let glbPerseveranceHead: THREE.Object3D | null = null;
  const glbSpec = MISSION_GLB_MAP[mission.id];
  const glbBaseY = glbSpec?.offset?.[1] ?? 0;

  if (glbSpec) {
    const primaryUrl = glbSpec.path;
    nasaGltfLoader.load(
      primaryUrl,
      (gltf) => {
        if (glbDisposed) {
          disposeObjectTree(gltf.scene);
          return;
        }
        const prepared = normalizeAndPrepareGlb(
          gltf.scene,
          glbSpec.targetMaxDim,
          glbSpec.anchor,
          glbSpec.rotX ?? 0,
          glbSpec.rotY ?? 0,
          textures,
          pbrCaps,
          abortSignal,
          disposables,
        );
        if (glbSpec.offset) {
          prepared.position.set(
            glbSpec.offset[0],
            glbSpec.offset[1],
            glbSpec.offset[2],
          );
        }
        glbMainRoot = prepared;
        group.add(prepared);
        if (!glbSpec.keepFallback) {
          craftFallbackGroup.visible = false;
        }

        // Play authentic NASA GLB skeletal / part animations safely
        if (mission.id === 'perseverance' || mission.id === 'curiosity') {
          if (gltf.animations && gltf.animations.length > 0) {
            glbMixer = new THREE.AnimationMixer(gltf.scene);
            const clip = gltf.animations[0];
            const action = glbMixer.clipAction(clip);
            action.setLoop(THREE.LoopPingPong, Infinity);
            action.timeScale = 0.28;
            action.play();
          }
          glbPerseveranceHead = gltf.scene.getObjectByName('head') ?? null;
        } else if (mission.id === 'rosetta_philae') {
          const p1 = gltf.scene.getObjectByName('panels_01');
          const p2 = gltf.scene.getObjectByName('panels_02');
          if (p1) glbRosettaPanels.push(p1);
          if (p2) glbRosettaPanels.push(p2);
          glbRosettaDish = gltf.scene.getObjectByName('dish') ?? null;
        } else if (mission.id === 'insight') {
          glbInsightArm1 = gltf.scene.getObjectByName('arm_01') ?? null;
          glbInsightArm2 = gltf.scene.getObjectByName('arm_02') ?? null;
        }
      },
      undefined,
      () => {},
    );

    if (glbSpec.companionPath && mission.hasIngenuity) {
      const compUrl = glbSpec.companionPath;
      nasaGltfLoader.load(
        compUrl,
        (gltf) => {
          if (glbDisposed) {
            disposeObjectTree(gltf.scene);
            return;
          }
          const comp = normalizeAndPrepareGlb(
            gltf.scene,
            glbSpec.companionMaxDim ?? 1.15,
            'center',
            0,
            0,
            textures,
            pbrCaps,
            abortSignal,
            disposables,
          );
          const off = glbSpec.companionOffset ?? [1.95, 1.32, -1.1];
          comp.position.set(off[0], off[1], off[2]);
          glbCompanionRoot = comp;
          const r1 = gltf.scene.getObjectByName('rotors_01');
          const r2 = gltf.scene.getObjectByName('rotors_02');
          glbIngenuityRotors = [r1, r2].filter(Boolean) as THREE.Object3D[];
          group.add(comp);
          if (heliGroup) {
            heliGroup.visible = false;
          }
        },
        undefined,
        () => {},
      );
    }

    disposables.push({
      dispose: () => {
        glbDisposed = true;
        if (glbMixer) {
          glbMixer.stopAllAction();
          glbMixer = null;
        }
        if (glbMainRoot) {
          disposeObjectTree(glbMainRoot);
          glbMainRoot = null;
        }
        if (glbCompanionRoot) {
          disposeObjectTree(glbCompanionRoot);
          glbCompanionRoot = null;
        }
      },
    });
  }

  // Upgrade key hero procedural aerospace materials when fallback craft remains visible (preserving authentic .map)
  if ((!glbSpec || glbSpec.keepFallback) && pbrCaps) {
    const heroUpgrades: Array<{
      mat: THREE.MeshStandardMaterial;
      source: HTMLCanvasElement;
      craftProfile: CraftPbrProfile;
    }> = [
      {
        mat: goldFoil,
        source: textures.kaptonMap.image as HTMLCanvasElement,
        craftProfile: 'kapton',
      },
    ];
    if (craftType !== 'sat_iss') {
      heroUpgrades.push(
        {
          mat: solarArrayMat,
          source: textures.solarMap.image as HTMLCanvasElement,
          craftProfile: 'solar',
        },
        {
          mat: whitePanelMat,
          source: textures.panelMap.image as HTMLCanvasElement,
          craftProfile: 'panel',
        },
      );
    }
    heroUpgrades.forEach((u, idx) => {
      if (!u.source) return;
      void processCraft8KPBR({
        albedoSource: u.source,
        craftProfile: u.craftProfile,
        normalStrength: 3.4,
        skipAlbedo: true,
        maxWidth: 2048,
        seed: 701 + idx * 43,
        capabilities: pbrCaps,
        signal: abortSignal,
      }).then((set) => {
        if (!set || abortSignal?.aborted || modelDisposed) {
          set?.dispose();
          return;
        }
        disposables.push(set);
        if (set.map) {
          u.mat.map = set.map;
        }
        u.mat.normalMap = set.normalMap;
        u.mat.roughnessMap = set.roughnessMap;
        u.mat.metalnessMap = set.metalnessMap;
        u.mat.needsUpdate = true;
      });
    });
  }

  const animate = (dt: number, elapsed: number) => {
    if (glbMixer) {
      glbMixer.update(dt);
    }
    if (glbPerseveranceHead) {
      glbPerseveranceHead.rotation.y = Math.sin(elapsed * 0.45) * 0.35;
    }
    if (scanningMastHead) {
      scanningMastHead.rotation.y = Math.sin(elapsed * 0.48) * 0.48;
      scanningMastHead.rotation.x = Math.sin(elapsed * 0.31) * 0.09 - 0.05;
    }
    if (scanningDish) {
      scanningDish.rotation.y = Math.sin(elapsed * 0.25) * 0.35 + 0.2;
    }
    // Ingenuity counter-rotating coaxial carbon rotors + figure-8 aerial scouting flight
    const ingBaseX = glbSpec?.companionOffset?.[0] ?? 1.95;
    const ingBaseY = glbSpec?.companionOffset?.[1] ?? 1.32;
    const ingBaseZ = glbSpec?.companionOffset?.[2] ?? -1.1;
    const ingPosX = ingBaseX + Math.sin(elapsed * 0.55) * 1.15;
    const ingPosY = ingBaseY + 0.2 + Math.sin(elapsed * 2.1) * 0.14;
    const ingPosZ = ingBaseZ + Math.sin(elapsed * 1.1) * 0.72;
    const ingRoll = Math.cos(elapsed * 0.55) * 0.12;
    const ingPitch = Math.cos(elapsed * 1.1) * 0.09;

    if (heliGroup && rotorUpper && rotorLower) {
      rotorUpper.rotation.y += dt * 48;
      rotorLower.rotation.y -= dt * 48;
      heliGroup.position.set(ingPosX, ingPosY, ingPosZ);
      heliGroup.rotation.set(ingPitch, 0, ingRoll);
    }
    if (glbCompanionRoot) {
      if (glbIngenuityRotors[0]) glbIngenuityRotors[0].rotation.y += dt * 48;
      if (glbIngenuityRotors[1]) glbIngenuityRotors[1].rotation.y -= dt * 48;
      glbCompanionRoot.position.set(ingPosX, ingPosY, ingPosZ);
      glbCompanionRoot.rotation.set(ingPitch, 0, ingRoll);
    }

    // ChemCam / SuperCam LIBS laser burst & glowing plasma rock spark
    if (libsBeamMesh && libsBeamMat && libsSparkMesh && libsSparkMat) {
      const pulse = Math.sin(elapsed * 1.35);
      const firing = pulse > 0.72;
      libsBeamMesh.visible = firing;
      libsSparkMesh.visible = firing;
      if (firing) {
        const strength = (pulse - 0.72) / 0.28;
        const flicker = 0.75 + 0.25 * Math.sin(elapsed * 48);
        libsBeamMat.opacity = 0.72 * strength * flicker;
        libsSparkMat.opacity = 0.9 * strength * flicker;
        const sc = 0.8 + strength * 0.85 * flicker;
        libsSparkMesh.scale.set(sc, sc, sc);
      }
    }

    // InSight arm gentle probe + expanding Marsquake seismic rings
    if (glbInsightArm1) glbInsightArm1.rotation.x = Math.sin(elapsed * 0.4) * 0.08;
    if (glbInsightArm2) glbInsightArm2.rotation.x = -Math.sin(elapsed * 0.4) * 0.06;
    for (const ring of seismicRings) {
      const p = (elapsed * 0.35 + ring.phase) % 1;
      const sc = 1 + p * 7.5;
      ring.mesh.scale.set(sc, sc, 1);
      ring.mat.opacity = (1 - p) * 0.52;
    }

    // Rosetta sun-tracking panels & dish
    for (const p of glbRosettaPanels) {
      p.rotation.x = Math.sin(elapsed * 0.35) * 0.18;
    }
    if (glbRosettaDish) {
      glbRosettaDish.rotation.z = Math.sin(elapsed * 0.42) * 0.14;
    }

    // ISS SARJ sun-tracking solar wings, Canadarm2 sweep & navigation strobes
    for (const w of issWingRoots) {
      w.root.rotation.x = Math.sin(elapsed * 0.22 + w.phase) * 0.26;
    }
    if (issArmPivot) {
      issArmPivot.rotation.y = Math.sin(elapsed * 0.28) * 0.22;
      issArmPivot.rotation.x = Math.sin(elapsed * 0.19) * 0.12;
    }
    if (issStrobePortMat && issStrobeStbdMat) {
      const blink = Math.sin(elapsed * 4.5) > 0.65 ? 1.0 : 0.18;
      issStrobePortMat.color.setRGB(blink * 1.1, blink * 0.18, blink * 0.18);
      issStrobeStbdMat.color.setRGB(blink * 0.18, blink * 1.1, blink * 0.38);
    }

    // Voyager expanding Deep Space Network RF wave pulses
    for (const rw of rfWaveRings) {
      const p = (elapsed * 0.42 + rw.phase) % 1;
      rw.mesh.position.z = -0.65 - p * 4.8;
      const sc = 1 + p * 3.4;
      rw.mesh.scale.set(sc, sc, 1);
      rw.mat.opacity = (1 - p) * 0.48;
    }

    // Apollo subtle flag ripple + ascent telemetry strobe
    if (apolloFlagMesh) {
      apolloFlagMesh.rotation.y = Math.sin(elapsed * 2.2) * 0.04;
    }
    if (apolloBeaconMat) {
      const b = Math.sin(elapsed * 3.6) > 0.55 ? 1.1 : 0.15;
      apolloBeaconMat.color.setRGB(b, b * 0.72, b * 0.12);
    }

    // JWST golden beryllium mirror warm specular shimmer
    if (craftType === 'sat_jwst') {
      jwstMirrorMat.roughness = 0.11 + 0.05 * Math.sin(elapsed * 1.1);
    }

    if (spinCraft) {
      if (glbMainRoot) {
        glbMainRoot.rotation.y += dt * 0.24;
      } else {
        spinCraft.rotation.y += dt * 0.24;
      }
    }
    if (idleFloatGroup) {
      if (glbMainRoot) {
        glbMainRoot.position.y = glbBaseY + Math.sin(elapsed * 0.85) * 0.08;
        glbMainRoot.rotation.z = Math.sin(elapsed * 0.45) * 0.025;
      } else {
        idleFloatGroup.position.y = Math.sin(elapsed * 0.85) * 0.08;
        idleFloatGroup.rotation.z = Math.sin(elapsed * 0.45) * 0.025;
      }
    }
    if (glbMainRoot && mission.id === 'rosetta_philae') {
      glbMainRoot.position.y = glbBaseY + Math.sin(elapsed * 0.85) * 0.08;
      glbMainRoot.rotation.z = Math.sin(elapsed * 0.45) * 0.025;
    }
  };

  return {
    group,
    povOrigin,
    povLook,
    camPos,
    camTarget,
    animate,
  };
}

export function createSurfaceDiorama(
  mission: AbandonedMission,
  maxAnisotropy = 4,
  pbrCaps?: Pbr8KCapabilities,
): SurfaceDioramaRuntime {
  const disposables: Array<{ dispose: () => void }> = [];
  const abortController = new AbortController();
  let dioramaDisposed = false;
  disposables.push({
    dispose: () => {
      dioramaDisposed = true;
      abortController.abort();
    },
  });

  const resolvedCaps: Pbr8KCapabilities = pbrCaps ?? {
    maxTextureSize: 8192,
    anisotropy: maxAnisotropy,
    isSoftwareGl: false,
    deviceMemoryGb: 8,
  };

  const theme = getWorldTheme(mission);
  const root = new THREE.Group();

  const craftTex = createCraftTextureSet(maxAnisotropy);
  disposables.push(craftTex);

  const craftResult = buildSpacecraftModel(
    mission,
    craftTex,
    disposables,
    resolvedCaps,
    abortController.signal,
  );
  let groundY = 0;

  let orbitalPlanetMesh: THREE.Mesh | null = null;
  let orbitalCloudMesh: THREE.Mesh | null = null;
  let earthLightsMat: THREE.ShaderMaterial | null = null;
  let earthAirglowMat: THREE.ShaderMaterial | null = null;
  let junoAuroraMesh: THREE.Mesh | null = null;
  let dustPoints: THREE.Points | null = null;
  const dustDevils: Array<{ group: THREE.Group; baseX: number; baseZ: number; phase: number }> = [];
  /** Comet 67P gas / dust jets: soft grains rising and widening, fading as they thin out */
  const cryoJets: Array<{
    points: THREE.Points;
    origin: THREE.Vector3;
    /** Height of each grain above the vent, 0..JET_HEIGHT */
    height: Float32Array;
    /** Sideways drift direction of each grain (x, z) */
    side: Float32Array;
  }> = [];
  const JET_HEIGHT = 12;

  if (theme.isDeepSpace) {
    // Deep Space probe (JWST, Voyager 1 & 2): subtle cosmic dust motes drifting past
    const count = 280;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 44;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 28;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 44;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xcbd5e1,
      size: 0.08,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      toneMapped: false,
    });
    dustPoints = new THREE.Points(geo, mat);
    root.add(dustPoints);
    disposables.push(geo, mat);
  } else if (theme.isOrbital) {
    // Giant Curved Rotating Planet / Moon Globe beneath Orbital Satellites
    const globeR = 62;
    const globeGeo = new THREE.SphereGeometry(globeR, 64, 48);
    const bodyData = CELESTIAL_BODIES.find((b) => b.id === mission.targetBodyId);
    const moonData =
      mission.targetMoonId && bodyData
        ? bodyData.moons.find((m) => m.id === mission.targetMoonId)
        : undefined;

    const texSet = moonData
      ? createProceduralMoonTextureSet(moonData.style, maxAnisotropy)
      : createProceduralPlanetTextureSet(mission.targetBodyId, maxAnisotropy);
    const isEarthOrbital = mission.targetBodyId === 'earth' && !mission.targetMoonId;
    const isGasOrbital =
      mission.targetBodyId === 'jupiter' ||
      mission.targetBodyId === 'saturn' ||
      mission.targetBodyId === 'uranus' ||
      mission.targetBodyId === 'neptune';
    const isIcyOrbital =
      mission.targetBodyId === 'pluto' ||
      mission.targetBodyId === 'eris' ||
      moonData?.style === 'europa' ||
      moonData?.style === 'enceladus' ||
      moonData?.style === 'triton';
    const globeMetalness =
      isEarthOrbital || isGasOrbital || isIcyOrbital ? 0.0 : 0.05;
    const globeMat = new THREE.MeshPhysicalMaterial({
      map: texSet.map,
      normalMap: texSet.normalMap,
      normalScale: new THREE.Vector2(isGasOrbital ? 0.26 : 0.82, isGasOrbital ? 0.26 : 0.82),
      roughness: 1.0,
      roughnessMap: texSet.roughnessMap,
      metalness: globeMetalness,
      metalnessMap: texSet.metalnessMap,
      specularIntensity: isEarthOrbital ? 1.15 : isIcyOrbital ? 0.48 : isGasOrbital ? 0.14 : 0.26,
      clearcoat: isEarthOrbital ? 0.08 : 0.0,
      clearcoatRoughness: 0.3,
    });
    orbitalPlanetMesh = new THREE.Mesh(globeGeo, globeMat);
    orbitalPlanetMesh.position.set(0, -(globeR + 5.8), -8);
    orbitalPlanetMesh.rotation.z = 0.25;
    orbitalPlanetMesh.castShadow = true;
    orbitalPlanetMesh.receiveShadow = true;
    root.add(orbitalPlanetMesh);
    disposables.push(
      globeGeo,
      texSet.map,
      texSet.normalMap,
      texSet.roughnessMap,
      texSet.metalnessMap,
      globeMat,
    );

    // Stream real NASA high-res surface texture onto the curved orbital globe + 4K PBR relief (keeping real NASA .map)
    const texLoader = new THREE.TextureLoader();
    texLoader.setCrossOrigin('anonymous');
    const url = moonData?.textureUrl ?? bodyData?.textures.map;
    if (url) {
      texLoader.load(
        url,
        (tex) => {
          if (dioramaDisposed) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.wrapS = THREE.RepeatWrapping;
          tex.anisotropy = maxAnisotropy;
          globeMat.map = tex;
          globeMat.needsUpdate = true;
          disposables.push(tex);

          if (tex.image) {
            const globeProfile: SurfacePbrProfile = isEarthOrbital
              ? 'earth'
              : mission.targetBodyId === 'comet67p'
                ? 'comet'
                : isGasOrbital
                  ? 'gas'
                  : isIcyOrbital
                    ? 'icy'
                    : 'rocky';

            void processSurface8KPBR({
              albedoSource: tex.image as HTMLImageElement,
              profile: globeProfile,
              normalStrength: isGasOrbital ? 1.15 : 3.6,
              skipAlbedo: true,
              maxWidth: 4096,
              seed: mission.id.charCodeAt(0) * 17,
              capabilities: resolvedCaps,
              signal: abortController.signal,
            }).then((set) => {
              if (!set || abortController.signal.aborted || dioramaDisposed) {
                set?.dispose();
                return;
              }
              disposables.push(set);
              if (set.map) {
                globeMat.map = set.map;
              }
              globeMat.normalMap = set.normalMap;
              globeMat.roughnessMap = set.roughnessMap;
              globeMat.metalnessMap = set.metalnessMap;
              globeMat.metalness = globeMetalness;
              globeMat.needsUpdate = true;
            });
          }
        },
        undefined,
        () => {},
      );
    }

    // Cloud shell + Night City Lights + Blue Rayleigh Atmospheric Rim for Earth orbitals (ISS / Hubble)
    if (mission.targetBodyId === 'earth' && !mission.targetMoonId) {
      const cGeo = new THREE.SphereGeometry(globeR * 1.008, 64, 48);
      const cTex = createProceduralEarthClouds(maxAnisotropy);
      const cMat = new THREE.MeshStandardMaterial({
        map: cTex,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
      });
      orbitalCloudMesh = new THREE.Mesh(cGeo, cMat);
      orbitalPlanetMesh.add(orbitalCloudMesh);
      disposables.push(cGeo, cTex, cMat);

      texLoader.load(
        '/textures/planets/earth_clouds_1024.png',
        (tex) => {
          if (dioramaDisposed) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.wrapS = THREE.RepeatWrapping;
          tex.anisotropy = maxAnisotropy;
          cMat.map = tex;
          cMat.needsUpdate = true;
          disposables.push(tex);
        },
        undefined,
        () => {},
      );

      // Golden City Lights on Earth's rotating night hemisphere
      texLoader.load(
        '/textures/planets/earth_lights_2048.png',
        (lightsTex) => {
          if (dioramaDisposed || !orbitalPlanetMesh) {
            lightsTex.dispose();
            return;
          }
          lightsTex.colorSpace = THREE.SRGBColorSpace;
          lightsTex.wrapS = THREE.RepeatWrapping;
          lightsTex.anisotropy = maxAnisotropy;

          const lGeo = new THREE.SphereGeometry(globeR * 1.003, 64, 48);
          earthLightsMat = new THREE.ShaderMaterial({
            uniforms: {
              uLightsMap: { value: lightsTex },
              uSunDir: { value: new THREE.Vector3(1, 0.5, 0).normalize() },
            },
            vertexShader: `
              varying vec2 vUv;
              varying vec3 vWorldNormal;
              void main() {
                vUv = uv;
                vWorldNormal = normalize(mat3(modelMatrix) * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform sampler2D uLightsMap;
              uniform vec3 uSunDir;
              varying vec2 vUv;
              varying vec3 vWorldNormal;
              void main() {
                float sunDot = dot(normalize(vWorldNormal), normalize(uSunDir));
                float nightMask = smoothstep(0.12, -0.25, sunDot);
                vec3 lights = texture2D(uLightsMap, vUv).rgb;
                float lum = dot(lights, vec3(0.3, 0.59, 0.11));
                gl_FragColor = vec4(lights * vec3(1.5, 1.25, 0.85), nightMask * smoothstep(0.06, 0.55, lum) * 0.95);
              }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          });
          const lightsMesh = new THREE.Mesh(lGeo, earthLightsMat);
          orbitalPlanetMesh.add(lightsMesh);
          disposables.push(lightsTex, lGeo, earthLightsMat);
        },
        undefined,
        () => {},
      );

      // Luminous Blue Rayleigh Horizon Glow Ring around Earth
      const airGeo = new THREE.SphereGeometry(globeR * 1.028, 64, 48);
      earthAirglowMat = new THREE.ShaderMaterial({
        uniforms: {
          uSunDir: { value: new THREE.Vector3(1, 0.5, 0).normalize() },
        },
        vertexShader: `
          varying vec3 vWorldNormal;
          varying vec3 vWorldPos;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            vWorldNormal = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: `
          uniform vec3 uSunDir;
          varying vec3 vWorldNormal;
          varying vec3 vWorldPos;
          void main() {
            vec3 viewDir = normalize(cameraPosition - vWorldPos);
            float rim = pow(clamp(1.0 + dot(viewDir, vWorldNormal), 0.0, 1.0), 3.4);
            float day = smoothstep(-0.2, 0.55, dot(normalize(vWorldNormal), normalize(uSunDir)));
            gl_FragColor = vec4(vec3(0.28, 0.64, 1.0) * (0.65 + day * 0.75), rim * (0.28 + day * 0.62));
          }
        `,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const airMesh = new THREE.Mesh(airGeo, earthAirglowMat);
      orbitalPlanetMesh.add(airMesh);
      disposables.push(airGeo, earthAirglowMat);
    }

    // Saturn's sweeping textured rings in backdrop for Cassini!
    if (mission.targetBodyId === 'saturn') {
      const innerR = globeR * 1.26;
      const outerR = globeR * 2.42;
      const rGeo = new THREE.RingGeometry(innerR, outerR, 140, 4);
      const pos = rGeo.attributes.position;
      const uv = rGeo.attributes.uv;
      const v3 = new THREE.Vector3();
      const span = outerR - innerR;
      for (let i = 0; i < pos.count; i++) {
        v3.fromBufferAttribute(pos, i);
        const radius = Math.hypot(v3.x, v3.y);
        const u = THREE.MathUtils.clamp((radius - innerR) / span, 0, 1);
        const angle = (Math.atan2(v3.y, v3.x) + Math.PI) / (Math.PI * 2);
        uv.setXY(i, u, angle);
      }
      uv.needsUpdate = true;

      const ringTex = createDetailedSaturnRingTexture(maxAnisotropy);
      const rMat = new THREE.MeshStandardMaterial({
        map: ringTex,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        shadowSide: THREE.DoubleSide,
        roughness: 0.76,
        depthWrite: false,
      });
      const skyRings = new THREE.Mesh(rGeo, rMat);
      skyRings.castShadow = true;
      skyRings.receiveShadow = true;
      const skyRingDepthMat = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        map: ringTex,
        alphaTest: 0.22,
        side: THREE.DoubleSide,
      });
      skyRings.customDepthMaterial = skyRingDepthMat;
      skyRings.rotation.set(Math.PI * 0.43, 0.2, -0.18);
      orbitalPlanetMesh.add(skyRings);
      disposables.push(rGeo, ringTex, rMat, skyRingDepthMat);
    }

    // Glowing cyan-violet polar aurora ring on Jupiter for Juno
    if (mission.targetBodyId === 'jupiter') {
      const aGeo = new THREE.RingGeometry(globeR * 0.24, globeR * 0.36, 64);
      aGeo.rotateX(-Math.PI / 2);
      const aMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.52,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      junoAuroraMesh = new THREE.Mesh(aGeo, aMat);
      junoAuroraMesh.position.set(0, globeR * 0.96, 0);
      orbitalPlanetMesh.add(junoAuroraMesh);
      disposables.push(aGeo, aMat);
    }
  } else {
    // 1. Multi-Scale Photorealistic 3D Planetary Terrain (180x180m) with Normal + Roughness + Streamed NASA Surface Photos
    const terrainPBR = createTerrainPBRTextures(theme.pbrWorld, maxAnisotropy);
    disposables.push(terrainPBR);

    const size = 180;
    const segs = 112;
    const terrainGeo = new THREE.PlaneGeometry(size, size, segs, segs);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);
    const baseCol = new THREE.Color(theme.terrainBase);
    const accentCol = new THREE.Color(theme.terrainAccent);
    const tmpCol = new THREE.Color();

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const y = sampleTerrainHeight(x, z, theme);
      posAttr.setY(i, y);

      const blend =
        0.5 +
        0.32 * Math.sin(x * 0.18 + z * 0.14) +
        0.18 * (hash2(Math.floor(x), Math.floor(z)) - 0.5);
      tmpCol.copy(baseCol).lerp(accentCol, THREE.MathUtils.clamp(blend, 0, 1));
      colors[i * 3] = tmpCol.r;
      colors[i * 3 + 1] = tmpCol.g;
      colors[i * 3 + 2] = tmpCol.b;
    }
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      map: terrainPBR.map,
      normalMap: terrainPBR.normalMap,
      normalScale: new THREE.Vector2(1.48, 1.48),
      roughnessMap: terrainPBR.roughnessMap,
      metalnessMap: terrainPBR.metalnessMap,
      vertexColors: true,
      roughness: 1.0,
      metalness: 0.04,
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    root.add(terrainMesh);
    disposables.push(terrainGeo, terrainMat);

    // 2. Jagged Fractured Planetary Rocks, Boulders & Scattered Regolith Pebbles
    const rockCount = 110;
    const rockGeo = new THREE.DodecahedronGeometry(0.45, 2);
    const rPosAttr = rockGeo.attributes.position;
    const rVec = new THREE.Vector3();
    for (let i = 0; i < rPosAttr.count; i++) {
      rVec.fromBufferAttribute(rPosAttr, i);
      const n =
        1.0 +
        0.26 * Math.sin(rVec.x * 7.4 + rVec.y * 5.2) +
        0.16 * Math.cos(rVec.z * 9.1 - rVec.x * 4.8);
      rVec.multiplyScalar(n);
      rPosAttr.setXYZ(i, rVec.x, rVec.y * 0.78, rVec.z);
    }
    rockGeo.computeVertexNormals();

    const rockMat = new THREE.MeshStandardMaterial({
      map: terrainPBR.map,
      normalMap: terrainPBR.normalMap,
      normalScale: new THREE.Vector2(1.4, 1.4),
      roughnessMap: terrainPBR.roughnessMap,
      metalnessMap: terrainPBR.metalnessMap,
      color: theme.rockColor,
      roughness: 1.0,
      metalness: 0.04,
    });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    rocks.castShadow = true;
    rocks.receiveShadow = true;

    const m4 = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();

    for (let i = 0; i < rockCount; i++) {
      const r1 = hash2(i * 1.37, 4.1);
      const r2 = hash2(i * 2.91, 9.7);
      const ang = r1 * Math.PI * 2;
      const dist = 3.2 + Math.pow(r2, 0.72) * 48;
      const rx = Math.cos(ang) * dist;
      const rz = Math.sin(ang) * dist;
      const ry = sampleTerrainHeight(rx, rz, theme);
      const scale = 0.16 + Math.pow(hash2(i, 17.3), 2.0) * 1.95;
      p.set(rx, ry + scale * 0.08, rz);
      q.setFromEuler(
        new THREE.Euler(r1 * Math.PI, r2 * Math.PI, (r1 + r2) * Math.PI),
      );
      s.set(scale * 1.25, scale * 0.62, scale);
      m4.compose(p, q, s);
      rocks.setMatrixAt(i, m4);
    }
    rocks.instanceMatrix.needsUpdate = true;
    root.add(rocks);

    // Fine scattered regolith gravel & cobbles around landing site
    const pebbleCount = 180;
    const pebbles = new THREE.InstancedMesh(rockGeo, rockMat, pebbleCount);
    pebbles.castShadow = true;
    pebbles.receiveShadow = true;
    for (let i = 0; i < pebbleCount; i++) {
      const r1 = hash2(i * 3.71, 2.3);
      const r2 = hash2(i * 5.13, 8.9);
      const ang = r1 * Math.PI * 2;
      const dist = 1.6 + Math.pow(r2, 0.85) * 18;
      const px = Math.cos(ang) * dist;
      const pz = Math.sin(ang) * dist;
      const py = sampleTerrainHeight(px, pz, theme);
      const ps = 0.05 + hash2(i, 31.7) * 0.14;
      p.set(px, py + ps * 0.06, pz);
      q.setFromEuler(new THREE.Euler(r1 * Math.PI, r2 * Math.PI, r1 * 2));
      s.set(ps * 1.3, ps * 0.65, ps);
      m4.compose(p, q, s);
      pebbles.setMatrixAt(i, m4);
    }
    pebbles.instanceMatrix.needsUpdate = true;
    root.add(pebbles);
    disposables.push(rockGeo, rockMat);

    // Load bundled high-res NASA Mars / Moon geological photography onto terrain & rocks offline + 8K PBR relief
    const nasaTerrainUrl =
      theme.pbrWorld === 'mars'
        ? '/textures/terrain/mars_cambridge_bay.jpg'
        : theme.pbrWorld === 'luna'
          ? '/textures/terrain/moon_lunar_terrain.jpg'
          : null;

    if (nasaTerrainUrl) {
      const tLoader = new THREE.TextureLoader();
      tLoader.setCrossOrigin('anonymous');
      tLoader.load(
        nasaTerrainUrl,
        (tex) => {
          if (dioramaDisposed) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.repeat.set(9, 9);
          tex.anisotropy = maxAnisotropy;
          terrainMat.map = tex;
          rockMat.map = tex;
          terrainMat.needsUpdate = true;
          rockMat.needsUpdate = true;
          disposables.push(tex);

          if (tex.image) {
            void processSurface8KPBR({
              albedoSource: tex.image as HTMLImageElement,
              profile: 'terrain',
              normalStrength: 4.8,
              tileVertical: true,
              skipAlbedo: true,
              repeatX: 9,
              repeatY: 9,
              maxWidth: 4096,
              seed: theme.pbrWorld === 'mars' ? 501 : 509,
              capabilities: resolvedCaps,
              signal: abortController.signal,
            }).then((set) => {
              if (!set || abortController.signal.aborted || dioramaDisposed) {
                set?.dispose();
                return;
              }
              disposables.push(set);
              if (set.map) {
                terrainMat.map = set.map;
                rockMat.map = set.map;
              }
              terrainMat.normalMap = set.normalMap;
              terrainMat.roughnessMap = set.roughnessMap;
              terrainMat.metalnessMap = set.metalnessMap;
              rockMat.normalMap = set.normalMap;
              rockMat.roughnessMap = set.roughnessMap;
              rockMat.metalnessMap = set.metalnessMap;
              terrainMat.needsUpdate = true;
              rockMat.needsUpdate = true;
            });
          }
        },
        undefined,
        () => {},
      );
    }

    // Chevron Rover Wheel Track Imprints trailing behind the rover/LRV
    if (theme.hasTracks) {
      const trackMat = new THREE.MeshStandardMaterial({
        map: craftTex.trackImprintMap,
        transparent: true,
        opacity: 0.78,
        roughness: 0.98,
        depthWrite: false,
      });
      disposables.push(trackMat);

      for (const tx of [-0.55, 0.55]) {
        const trackGeo = new THREE.PlaneGeometry(0.42, 28, 2, 48);
        trackGeo.rotateX(-Math.PI / 2);
        const tPos = trackGeo.attributes.position;
        for (let i = 0; i < tPos.count; i++) {
          const vx = tPos.getX(i) + tx;
          const vz = tPos.getZ(i) + 14.4;
          tPos.setY(i, sampleTerrainHeight(vx, vz, theme) + 0.025);
        }
        trackGeo.computeVertexNormals();
        const trackMesh = new THREE.Mesh(trackGeo, trackMat);
        trackMesh.position.set(tx, 0, 14.4);
        trackMesh.receiveShadow = true;
        root.add(trackMesh);
        disposables.push(trackGeo);
      }
    }

    // 3. Drifting Atmospheric Wind Dust Particles (Mars / Titan / Venus)
    if (theme.fogColor !== null) {
      const dCount = 340;
      const dPos = new Float32Array(dCount * 3);
      for (let i = 0; i < dCount; i++) {
        dPos[i * 3] = (Math.random() - 0.5) * 42;
        dPos[i * 3 + 1] = 0.15 + Math.random() * 5.5;
        dPos[i * 3 + 2] = (Math.random() - 0.5) * 42;
      }
      const dGeo = new THREE.BufferGeometry();
      dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
      const dMat = new THREE.PointsMaterial({
        color: theme.skyHorizon,
        size: 0.065,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      });
      dustPoints = new THREE.Points(dGeo, dMat);
      root.add(dustPoints);
      disposables.push(dGeo, dMat);
    }

    // 4. Spinning Martian Dust Devils across distant plain
    if (theme.pbrWorld === 'mars') {
      for (let dv = 0; dv < 2; dv++) {
        const dvGrp = new THREE.Group();
        const bx = dv === 0 ? -18 : 22;
        const bz = dv === 0 ? -30 : -38;
        dvGrp.position.set(bx, sampleTerrainHeight(bx, bz, theme), bz);

        const pCount = 160;
        const pArr = new Float32Array(pCount * 3);
        for (let i = 0; i < pCount; i++) {
          const hFrac = Math.random();
          const rad = 0.35 + hFrac * 1.45;
          const ang = Math.random() * Math.PI * 2;
          pArr[i * 3] = Math.cos(ang) * rad;
          pArr[i * 3 + 1] = hFrac * 9.5;
          pArr[i * 3 + 2] = Math.sin(ang) * rad;
        }
        const pGeo = new THREE.BufferGeometry();
        pGeo.setAttribute('position', new THREE.BufferAttribute(pArr, 3));
        const pMat = new THREE.PointsMaterial({
          color: 0xd48b66,
          size: 0.18,
          transparent: true,
          opacity: 0.34,
          depthWrite: false,
        });
        const pPts = new THREE.Points(pGeo, pMat);
        dvGrp.add(pPts);
        root.add(dvGrp);
        disposables.push(pGeo, pMat);
        dustDevils.push({ group: dvGrp, baseX: bx, baseZ: bz, phase: dv * 2.4 });
      }
    }

    // 5. Active Comet 67P Cryo-Geyser Vapor Jets venting off sunlit cliffs
    if (theme.pbrWorld === 'comet') {
      const jetOrigins = [
        new THREE.Vector3(-5.5, sampleTerrainHeight(-5.5, -14, theme), -14),
        new THREE.Vector3(7.2, sampleTerrainHeight(7.2, -18, theme), -18),
      ];
      for (const orig of jetOrigins) {
        const cCount = 160;
        const cPos = new Float32Array(cCount * 3);
        const cCol = new Float32Array(cCount * 3);
        const height = new Float32Array(cCount);
        const side = new Float32Array(cCount * 2);
        for (let i = 0; i < cCount; i++) {
          height[i] = Math.random() * JET_HEIGHT;
          const a = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random());
          side[i * 2] = Math.cos(a) * r;
          side[i * 2 + 1] = Math.sin(a) * r;
        }
        const cGeo = new THREE.BufferGeometry();
        cGeo.setAttribute('position', new THREE.BufferAttribute(cPos, 3));
        cGeo.setAttribute('color', new THREE.BufferAttribute(cCol, 3));
        const cMat = new THREE.PointsMaterial({
          map: getSoftDotTexture(),
          color: 0xc4ecff,
          size: 0.55,
          vertexColors: true,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        });
        const pts = new THREE.Points(cGeo, cMat);
        pts.frustumCulled = false;
        root.add(pts);
        disposables.push(cGeo, cMat);
        cryoJets.push({ points: pts, origin: orig, height, side });
      }
    }

    groundY = sampleTerrainHeight(0, 0, theme);
  }

  // Mount Spacecraft at surface height (or orbital zero-G origin)
  craftResult.group.position.set(0, groundY, 0);
  root.add(craftResult.group);

  // Atmospheric Sky Dome (surface worlds with atmospheres only)
  let skyMat: THREE.ShaderMaterial | null = null;
  if (!theme.isOrbital && !theme.isDeepSpace && theme.fogColor !== null) {
    const skyGeo = new THREE.SphereGeometry(620, 32, 24);
    skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uZenith: { value: new THREE.Color(theme.skyZenith) },
        uHorizon: { value: new THREE.Color(theme.skyHorizon) },
        uDayFactor: { value: 1.0 },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uZenith;
        uniform vec3 uHorizon;
        uniform float uDayFactor;
        varying vec3 vDir;
        void main() {
          float h = clamp(vDir.y, 0.0, 1.0);
          vec3 col = mix(uHorizon, uZenith, pow(h, 0.55));
          float alpha = mix(0.28, 0.92, uDayFactor) * (1.0 - smoothstep(0.15, 0.85, h) * (1.0 - uDayFactor));
          gl_FragColor = vec4(col * mix(0.18, 1.0, uDayFactor), alpha);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    root.add(skyDome);
    disposables.push(skyGeo, skyMat);
  }

  // Real-time High-Resolution ShadowMap Directional Sunlight & Subtle Atmospheric Bounce + Visible Sky Sun Disc
  const dioramaShadowRes = resolvedCaps.isSoftwareGl
    ? 1024
    : Math.min(4096, resolvedCaps.maxTextureSize || 4096);
  const sunLight = new THREE.DirectionalLight(theme.sunColor, theme.sunIntensity);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(dioramaShadowRes, dioramaShadowRes);
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 160;
  sunLight.shadow.camera.left = -22;
  sunLight.shadow.camera.right = 22;
  sunLight.shadow.camera.top = 22;
  sunLight.shadow.camera.bottom = -22;
  sunLight.shadow.bias = -0.00025;
  sunLight.shadow.normalBias = 0.015;
  root.add(sunLight);
  root.add(sunLight.target);

  const hemiLight = new THREE.HemisphereLight(
    theme.ambientSky,
    theme.ambientGround,
    theme.ambientIntensity,
  );
  root.add(hemiLight);

  const nightStarFill = new THREE.DirectionalLight(0x88b0e0, 0.24);
  nightStarFill.position.set(-15, 25, 18);
  root.add(nightStarFill);

  const sunDiscGeo = new THREE.SphereGeometry(2.6, 16, 12);
  const sunDiscMat = new THREE.MeshBasicMaterial({
    color: 0xfff7e2,
    toneMapped: false,
  });
  const sunDisc = new THREE.Mesh(sunDiscGeo, sunDiscMat);
  root.add(sunDisc);
  disposables.push(sunDiscGeo, sunDiscMat);

  const roverCamPos = craftResult.camPos.clone().add(new THREE.Vector3(0, groundY, 0));
  const roverCamTarget = craftResult.camTarget
    .clone()
    .add(new THREE.Vector3(0, groundY, 0));
  const povCamPos = craftResult.povOrigin
    .clone()
    .add(new THREE.Vector3(0, groundY, 0));
  const povCamTarget = craftResult.povLook
    .clone()
    .add(new THREE.Vector3(0, groundY, 0));

  const updateSun = (sunLocalDir: THREE.Vector3) => {
    const elev = sunLocalDir.y;
    const dayFactor =
      theme.isOrbital || theme.isDeepSpace
        ? 1.0
        : THREE.MathUtils.smoothstep(elev, -0.1, 0.25);

    sunLight.position.copy(sunLocalDir).multiplyScalar(65);
    sunLight.intensity = theme.sunIntensity * dayFactor;
    hemiLight.intensity = Math.max(0.2, theme.ambientIntensity * dayFactor);
    nightStarFill.intensity = 0.2 + (1 - dayFactor) * 0.45;

    sunDisc.position.copy(sunLocalDir).multiplyScalar(420);
    sunDisc.visible = theme.isOrbital || theme.isDeepSpace || elev > -0.04;

    if (skyMat) {
      skyMat.uniforms.uDayFactor.value = dayFactor;
    }
    if (earthLightsMat) {
      earthLightsMat.uniforms.uSunDir.value.copy(sunLocalDir);
    }
    if (earthAirglowMat) {
      earthAirglowMat.uniforms.uSunDir.value.copy(sunLocalDir);
    }
  };

  const update = (dt: number, elapsed: number) => {
    craftResult.animate(dt, elapsed);

    if (orbitalPlanetMesh) {
      orbitalPlanetMesh.rotation.y += dt * 0.032;
    }
    if (orbitalCloudMesh) {
      orbitalCloudMesh.rotation.y += dt * 0.008;
    }
    if (junoAuroraMesh) {
      const mat = junoAuroraMesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.35 + 0.24 * Math.sin(elapsed * 2.3);
      junoAuroraMesh.rotation.z += dt * 0.4;
    }

    if (dustPoints) {
      const pos = dustPoints.geometry.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const speed = theme.isDeepSpace ? 0.65 : 1.85;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] += dt * speed;
        arr[i + 2] -= dt * speed * 0.35;
        if (arr[i] > 21) arr[i] = -21;
        if (arr[i + 2] < -21) arr[i + 2] = 21;
      }
      pos.needsUpdate = true;
    }

    for (const dv of dustDevils) {
      dv.group.rotation.y += dt * 5.8;
      dv.group.position.x = dv.baseX + Math.sin(elapsed * 0.18 + dv.phase) * 9.5;
      dv.group.position.z = dv.baseZ + Math.cos(elapsed * 0.14 + dv.phase) * 4.5;
    }

    for (const jet of cryoJets) {
      const geo = jet.points.geometry;
      const pos = geo.attributes.position.array as Float32Array;
      const col = geo.attributes.color.array as Float32Array;
      const { height, side, origin } = jet;
      for (let i = 0; i < height.length; i++) {
        let h = height[i] + dt * 3.2;
        if (h > JET_HEIGHT) h -= JET_HEIGHT;
        height[i] = h;
        // The jet widens as it rises and fades as the gas thins out
        const spread = 0.15 + h * 0.2;
        pos[i * 3] = origin.x + side[i * 2] * spread;
        pos[i * 3 + 1] = origin.y + h;
        pos[i * 3 + 2] = origin.z + side[i * 2 + 1] * spread;
        const t = h / JET_HEIGHT;
        const b = 0.32 * THREE.MathUtils.smoothstep(t, 0, 0.05) * Math.pow(1 - t, 1.4);
        col[i * 3] = b;
        col[i * 3 + 1] = b;
        col[i * 3 + 2] = b;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    }
  };

  const dispose = () => {
    disposables.forEach((d) => d.dispose());
  };

  return {
    root,
    theme,
    missionRole: mission.missionRole,
    roverCamPos,
    roverCamTarget,
    povCamPos,
    povCamTarget,
    updateSun,
    update,
    dispose,
  };
}
