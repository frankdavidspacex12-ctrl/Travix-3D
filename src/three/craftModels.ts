import * as THREE from 'three';
import type { CraftTextureSet } from './craftTextures';

/**
 * Hand-built models of NASA hardware with no official 3D model in NASA 3D Resources, rebuilt
 * from NASA photographs and published dimensions:
 * - Sojourner (Mars Pathfinder, 1997): photos PIA01122, PIA04421;
 * - Lunar Roving Vehicle (Apollo 15, 1971): AS15-86-11603, S71-30542;
 * - Surveyor lander (1966-68): AS12-48-7121, AS12-48-7133;
 * - ALSEP (Apollo 12, 1969): AS12-47-6918, AS12-47-6919, AS12-46-6813.
 * Each builder returns a group in metres with its base on y = 0 and its front toward -Z.
 */

type Disposable = { dispose: () => void };

export interface CraftMaterials {
  kapton: THREE.MeshStandardMaterial;
  goldKapton: THREE.MeshStandardMaterial;
  mylar: THREE.MeshStandardMaterial;
  alum: THREE.MeshStandardMaterial;
  whitePaint: THREE.MeshStandardMaterial;
  black: THREE.MeshStandardMaterial;
  cells: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  copperRibbon: THREE.MeshStandardMaterial;
  bronze: THREE.MeshStandardMaterial;
  fender: THREE.MeshStandardMaterial;
  wireMesh: THREE.MeshStandardMaterial;
  titanium: THREE.MeshStandardMaterial;
  seat: THREE.MeshStandardMaterial;
  goldMesh: THREE.MeshStandardMaterial;
  console: THREE.MeshStandardMaterial;
}

/** Materials tuned on the real hardware's look (metals, blankets, paints, solar cells). */
export function createCraftMaterials(tex: CraftTextureSet, disposables: Disposable[]): CraftMaterials {
  const crinkle = tex.kaptonNormal;
  const cellMap = tex.solarMap.clone();
  cellMap.repeat.set(3, 3);
  cellMap.needsUpdate = true;
  const cellNormal = tex.solarNormal.clone();
  cellNormal.repeat.set(3, 3);
  cellNormal.needsUpdate = true;
  disposables.push(cellMap, cellNormal);

  const m: CraftMaterials = {
    // Amber Kapton blanket over aluminium (Sojourner's WEB, Surveyor and LM blankets)
    kapton: new THREE.MeshStandardMaterial({
      color: 0xc0823c,
      metalness: 1,
      roughness: 0.4,
      normalMap: crinkle,
      normalScale: new THREE.Vector2(0.18, 0.18),
    }),
    // Brighter gold Kapton (LRV TV camera, LM descent stage)
    goldKapton: new THREE.MeshStandardMaterial({
      color: 0xd8a640,
      metalness: 1,
      roughness: 0.32,
      normalMap: crinkle,
      normalScale: new THREE.Vector2(0.22, 0.22),
    }),
    // Aluminised Mylar (ALSEP curtains, PSE skirt)
    mylar: new THREE.MeshStandardMaterial({
      color: 0xdde1e6,
      metalness: 1,
      roughness: 0.16,
      normalMap: crinkle,
      normalScale: new THREE.Vector2(0.3, 0.3),
      side: THREE.DoubleSide,
    }),
    alum: new THREE.MeshStandardMaterial({ color: 0xc5c9ce, metalness: 0.85, roughness: 0.38 }),
    // Thermal white paint (Surveyor, ALSEP, LCRU)
    whitePaint: new THREE.MeshStandardMaterial({ color: 0xe8e6df, metalness: 0, roughness: 0.62 }),
    black: new THREE.MeshStandardMaterial({ color: 0x1c1e22, metalness: 0.35, roughness: 0.55 }),
    cells: new THREE.MeshStandardMaterial({
      map: cellMap,
      normalMap: cellNormal,
      normalScale: new THREE.Vector2(0.5, 0.5),
      color: 0x7d8fbd,
      metalness: 0.12,
      roughness: 0.42,
    }),
    glass: new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.08 }),
    // Flat ALSEP cables: bright copper-orange ribbons on the regolith
    copperRibbon: new THREE.MeshStandardMaterial({ color: 0xc86a32, metalness: 0.75, roughness: 0.38 }),
    // SNAP-27 RTG fins
    bronze: new THREE.MeshStandardMaterial({ color: 0xa47c45, metalness: 1, roughness: 0.42 }),
    // LRV fiberglass fenders
    fender: new THREE.MeshStandardMaterial({ color: 0x9a4628, metalness: 0, roughness: 0.62, side: THREE.DoubleSide }),
    // LRV woven zinc-coated piano-wire tyres
    wireMesh: new THREE.MeshStandardMaterial({ color: 0x3a3b3d, metalness: 0.7, roughness: 0.55 }),
    titanium: new THREE.MeshStandardMaterial({ color: 0xb8b6b0, metalness: 0.9, roughness: 0.3 }),
    seat: new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.1, roughness: 0.85 }),
    // LRV high-gain umbrella: gold mesh, see-through
    goldMesh: new THREE.MeshStandardMaterial({
      color: 0xd7b25a,
      metalness: 1,
      roughness: 0.35,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    console: new THREE.MeshStandardMaterial({ color: 0x2d3036, metalness: 0.4, roughness: 0.5 }),
  };
  for (const k of Object.keys(m) as Array<keyof CraftMaterials>) disposables.push(m[k]);
  return m;
}

/** Small geometry helpers that record what they create for disposal. */
class Kit {
  constructor(private readonly disposables: Disposable[]) {}

  mesh(geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    this.disposables.push(geo);
    return m;
  }

  box(w: number, h: number, d: number, mat: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    return this.mesh(new THREE.BoxGeometry(w, h, d), mat, parent, x, y, z, rx, ry, rz);
  }

  cyl(rt: number, rb: number, h: number, mat: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, seg = 18) {
    return this.mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, parent, x, y, z, rx, ry, rz);
  }

  sphere(r: number, mat: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0, seg = 16) {
    return this.mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg >> 1)), mat, parent, x, y, z);
  }

  strut(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material, parent: THREE.Object3D, seg = 8) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    if (len < 1e-5) return null;
    const geo = new THREE.CylinderGeometry(r, r, len, seg);
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    this.disposables.push(geo);
    return m;
  }
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------------------------------------
// Sojourner: 65 x 48 x 30 cm, 10.6 kg. Flat GaAs solar panel over a small Kapton-wrapped Warm
// Electronics Box, six 13 cm cleated aluminium wheels on a rocker-bogie, whip antenna at the
// rear right corner, APXS on its deployment mechanism at the back, stereo cameras in front.
// ---------------------------------------------------------------------------------------------
export function buildSojourner(mats: CraftMaterials, disposables: Disposable[]): THREE.Group {
  const k = new Kit(disposables);
  const g = new THREE.Group();
  g.name = 'sojourner';
  const wr = 0.0665;
  const ww = 0.072;
  const zs = [-0.24, -0.01, 0.235];

  // Wheels: drums with 16 stainless-steel cleats each
  const wheel = (x: number, z: number) => {
    k.cyl(wr, wr, ww, mats.alum, g, x, wr, z, 0, 0, Math.PI / 2, 24);
    k.cyl(wr * 0.5, wr * 0.5, ww + 0.006, mats.black, g, x, wr, z, 0, 0, Math.PI / 2, 14);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      k.box(ww + 0.002, 0.011, 0.0055, mats.titanium, g, x, wr + Math.cos(a) * (wr + 0.003), z + Math.sin(a) * (wr + 0.003), a, 0, 0);
    }
  };
  for (const sx of [-1, 1]) for (const z of zs) wheel(sx * 0.205, z);

  // Rocker-bogie (thin aluminium tubes) and steering posts
  for (const sx of [-1, 1]) {
    const P = V(sx * 0.152, 0.2, 0.03);
    const K = V(sx * 0.19, 0.17, 0.2);
    const B = V(sx * 0.19, 0.145, -0.115);
    const hubTop = (z: number) => V(sx * 0.205, wr + 0.035, z);
    const hub = (z: number) => V(sx * 0.205, wr, z);
    k.strut(P, K, 0.0065, mats.alum, g);
    k.strut(K, hubTop(zs[2]), 0.0065, mats.alum, g);
    k.strut(P, B, 0.0065, mats.alum, g);
    k.strut(B, hubTop(zs[0]), 0.006, mats.alum, g);
    k.strut(B, hubTop(zs[1]), 0.006, mats.alum, g);
    for (const z of zs) k.strut(hubTop(z), hub(z), 0.0075, mats.alum, g, 6);
    k.cyl(0.012, 0.012, 0.02, mats.alum, g, P.x, P.y, P.z, 0, 0, Math.PI / 2, 10);
  }

  // Warm Electronics Box (Kapton) and the flat solar panel with its frame
  k.box(0.28, 0.13, 0.42, mats.kapton, g, 0, 0.205, 0);
  k.box(0.455, 0.008, 0.58, mats.cells, g, 0, 0.292, 0.005);
  k.box(0.465, 0.014, 0.01, mats.alum, g, 0, 0.292, 0.3);
  k.box(0.465, 0.014, 0.01, mats.alum, g, 0, 0.292, -0.29);
  k.box(0.01, 0.014, 0.6, mats.alum, g, 0.232, 0.292, 0.005);
  k.box(0.01, 0.014, 0.6, mats.alum, g, -0.232, 0.292, 0.005);
  for (const [px, pz] of [[-0.11, -0.17], [0.11, -0.17], [-0.11, 0.17], [0.11, 0.17]]) {
    k.cyl(0.006, 0.006, 0.02, mats.alum, g, px, 0.279, pz, 0, 0, 0, 6);
  }

  // Front: stereo B&W cameras and laser stripe projectors under the panel
  k.box(0.3, 0.032, 0.022, mats.black, g, 0, 0.236, -0.218);
  for (const x of [-0.055, 0.055]) k.cyl(0.011, 0.011, 0.016, mats.glass, g, x, 0.236, -0.232, Math.PI / 2, 0, 0, 12);
  for (const x of [-0.115, 0.115]) k.cyl(0.006, 0.006, 0.012, mats.copperRibbon, g, x, 0.236, -0.232, Math.PI / 2, 0, 0, 8);

  // Rear: colour camera and the APXS on its deployment mechanism
  k.box(0.04, 0.03, 0.02, mats.black, g, 0.07, 0.235, 0.218);
  k.strut(V(0, 0.2, 0.21), V(0, 0.15, 0.285), 0.006, mats.alum, g);
  k.cyl(0.026, 0.026, 0.05, mats.alum, g, 0, 0.115, 0.3, 0, 0, 0, 16);
  k.cyl(0.027, 0.027, 0.008, mats.kapton, g, 0, 0.142, 0.3, 0, 0, 0, 16);

  // UHF whip antenna rising from the rear right corner
  k.cyl(0.012, 0.014, 0.03, mats.alum, g, 0.19, 0.312, 0.255, 0, 0, 0, 12);
  k.cyl(0.0035, 0.0035, 0.34, mats.alum, g, 0.19, 0.497, 0.255, 0, 0, 0, 6);
  k.sphere(0.006, mats.alum, g, 0.19, 0.668, 0.255, 8);
  return g;
}

// ---------------------------------------------------------------------------------------------
// Lunar Roving Vehicle (Apollo 15 LRV-1), built at full size (3.1 m long, 1.83 m track, 0.82 m
// wire-mesh wheels with titanium chevrons, orange fibreglass fenders, umbrella high-gain antenna,
// gold-wrapped TV camera, LCRU, two seats, console and T-handle controller, rear tool pallet).
// ---------------------------------------------------------------------------------------------
export function buildLunarRover(mats: CraftMaterials, disposables: Disposable[]): THREE.Group {
  const k = new Kit(disposables);
  const g = new THREE.Group();
  g.name = 'lrv';
  const wr = 0.409;
  const ww = 0.23;
  const track = 0.915;
  const base = 1.145;

  // Wheels
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * track;
      const z = sz * base;
      k.cyl(wr, wr, ww, mats.wireMesh, g, x, wr, z, 0, 0, Math.PI / 2, 32);
      k.cyl(0.17, 0.17, ww + 0.02, mats.alum, g, x, wr, z, 0, 0, Math.PI / 2, 18);
      // Titanium chevrons in a V pattern over half of the tread
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        const cy = wr + Math.cos(a) * (wr + 0.006);
        const cz = z + Math.sin(a) * (wr + 0.006);
        for (const side of [-1, 1]) {
          k.box(0.12, 0.012, 0.028, mats.titanium, g, x + side * 0.055, cy, cz, a, side * 0.45, 0);
        }
      }
      // Traction drive housing and suspension arms
      k.cyl(0.11, 0.11, 0.14, mats.alum, g, x - sx * 0.17, wr, z, 0, 0, Math.PI / 2, 14);
      for (const dy of [0.07, -0.05]) {
        k.strut(V(sx * 0.6, wr + dy, z - 0.2), V(x - sx * 0.2, wr + dy, z), 0.022, mats.alum, g);
        k.strut(V(sx * 0.6, wr + dy, z + 0.2), V(x - sx * 0.2, wr + dy, z), 0.022, mats.alum, g);
      }
      // Fender: orange fibreglass shell over the top of the wheel (open cylinder arc, axis on X)
      const fender = new THREE.CylinderGeometry(wr + 0.05, wr + 0.05, ww + 0.06, 28, 1, true, 0.32, Math.PI - 0.64);
      k.mesh(fender, mats.fender, g, x, wr, z, 0, 0, Math.PI / 2);
    }
  }

  // Chassis: aluminium frame in three sections
  const fy = 0.44;
  for (const sx of [-1, 1]) k.strut(V(sx * 0.6, fy, -1.45), V(sx * 0.6, fy, 1.45), 0.03, mats.alum, g);
  for (const z of [-1.45, -0.55, 0.55, 1.45]) k.strut(V(-0.6, fy, z), V(0.6, fy, z), 0.025, mats.alum, g);
  k.box(1.16, 0.02, 1.08, mats.alum, g, 0, fy - 0.01, 0);

  // Seats (tubular frames with nylon webbing) and centre armrest with the T-handle controller
  for (const sx of [-1, 1]) {
    const x = sx * 0.32;
    k.box(0.46, 0.03, 0.42, mats.seat, g, x, 0.62, 0.08);
    k.box(0.46, 0.4, 0.03, mats.seat, g, x, 0.82, 0.3, -0.22, 0, 0);
    for (const [dx, dz] of [[-0.2, -0.12], [0.2, -0.12], [-0.2, 0.26], [0.2, 0.26]]) {
      k.strut(V(x + dx, fy, 0.08 + dz), V(x + dx, 0.61, 0.08 + dz), 0.012, mats.alum, g, 6);
    }
  }
  k.box(0.12, 0.2, 0.3, mats.console, g, 0, 0.56, 0.05);
  k.cyl(0.012, 0.012, 0.16, mats.black, g, 0, 0.74, -0.02, 0, 0, 0, 8);
  k.cyl(0.01, 0.01, 0.1, mats.black, g, 0, 0.82, -0.02, 0, 0, Math.PI / 2, 8);

  // Control and display console on its post in front of the seats
  k.strut(V(0, fy, -0.42), V(0, 0.9, -0.45), 0.025, mats.alum, g);
  k.box(0.44, 0.3, 0.06, mats.console, g, 0, 0.98, -0.47, -0.32, 0, 0);
  k.cyl(0.05, 0.05, 0.02, mats.alum, g, 0, 1.17, -0.5, 0, 0, 0, 16); // sun compass

  // Forward chassis: battery dust covers (mirror radiators), LCRU, TV camera, antennas
  for (const sx of [-1, 1]) {
    k.box(0.36, 0.08, 0.42, mats.whitePaint, g, sx * 0.3, fy + 0.05, -0.92);
    k.box(0.3, 0.005, 0.34, mats.mylar, g, sx * 0.3, fy + 0.093, -0.92);
  }
  k.box(0.42, 0.28, 0.3, mats.whitePaint, g, 0.12, 0.66, -1.22);
  k.box(0.43, 0.22, 0.31, mats.goldKapton, g, 0.12, 0.6, -1.22);
  k.box(0.32, 0.006, 0.22, mats.mylar, g, 0.12, 0.803, -1.22);
  // GCTA TV camera, gold-wrapped, on its mast
  k.strut(V(0.32, fy, -1.32), V(0.32, 1.02, -1.32), 0.02, mats.alum, g);
  k.box(0.14, 0.13, 0.3, mats.goldKapton, g, 0.32, 1.1, -1.36);
  k.cyl(0.04, 0.04, 0.08, mats.glass, g, 0.32, 1.1, -1.54, Math.PI / 2, 0, 0, 14);
  // Low-gain helical antenna
  k.strut(V(0.52, fy, -1.38), V(0.52, 0.95, -1.38), 0.015, mats.alum, g);
  k.cyl(0.025, 0.025, 0.5, mats.whitePaint, g, 0.52, 1.2, -1.38, 0, 0, 0, 10);
  // High-gain umbrella antenna (0.92 m gold mesh) on its mast, aimed high toward Earth
  const mastTop = V(-0.3, 1.72, -1.2);
  k.strut(V(-0.3, fy, -1.2), mastTop, 0.022, mats.alum, g);
  const dish = new THREE.Group();
  dish.position.copy(mastTop);
  dish.rotation.set(-0.35, 0, 0.3);
  g.add(dish);
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 10; i++) {
    const r = (i / 10) * 0.46;
    prof.push(new THREE.Vector2(r, (r * r) / (4 * 0.32)));
  }
  k.mesh(new THREE.LatheGeometry(prof, 24), mats.goldMesh, dish);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const tip = V(Math.cos(a) * 0.46, (0.46 * 0.46) / (4 * 0.32), Math.sin(a) * 0.46);
    k.strut(V(0, 0, 0), tip, 0.006, mats.goldKapton, dish, 5);
  }
  k.strut(V(0, 0, 0), V(0, 0.3, 0), 0.008, mats.alum, dish, 6);
  k.cyl(0.03, 0.02, 0.06, mats.whitePaint, dish, 0, 0.32, 0, 0, 0, 0, 10);

  // Aft chassis: tool carrier / sample pallet with tongs, scoop and rake handles
  k.box(0.92, 0.32, 0.62, mats.console, g, 0, 0.62, 1.08);
  k.box(0.9, 0.04, 0.6, mats.console, g, 0, 0.8, 1.08);
  for (const x of [-0.32, -0.12, 0.1, 0.3]) k.strut(V(x, 0.8, 1.32), V(x + 0.02, 1.35, 1.38), 0.012, mats.alum, g, 6);
  return g;
}

// ---------------------------------------------------------------------------------------------
// Surveyor lander (Surveyor 1 configuration, no sampler arm), built at full size: ~3 m tall,
// footpads 4.3 m apart. Triangular aluminium spaceframe, mast with solar panel and planar
// antenna, two thermal compartments, survey TV camera with its mirror hood, three hinged legs
// with shock absorbers and crushable footpads, propellant spheres, vernier engines, omni booms.
// ---------------------------------------------------------------------------------------------
export function buildSurveyor(mats: CraftMaterials, disposables: Disposable[]): THREE.Group {
  const k = new Kit(disposables);
  const g = new THREE.Group();
  g.name = 'surveyor';
  const corner = (i: number, r: number, y: number, off = 0) => {
    const a = Math.PI / 2 + (i * Math.PI * 2) / 3 + off;
    return V(Math.cos(a) * r, y, Math.sin(a) * r);
  };
  const baseY = 0.58;
  const topY = 1.12;

  // Spaceframe: base triangle, upper triangle, zig-zag truss and mast braces
  for (let i = 0; i < 3; i++) {
    k.strut(corner(i, 0.95, baseY), corner((i + 1) % 3, 0.95, baseY), 0.022, mats.alum, g);
    k.strut(corner(i, 0.42, topY, Math.PI / 3), corner((i + 1) % 3, 0.42, topY, Math.PI / 3), 0.02, mats.alum, g);
    k.strut(corner(i, 0.95, baseY), corner(i, 0.42, topY, Math.PI / 3), 0.02, mats.alum, g);
    k.strut(corner(i, 0.95, baseY), corner((i + 2) % 3, 0.42, topY, Math.PI / 3), 0.02, mats.alum, g);
    k.strut(corner(i, 0.42, topY, Math.PI / 3), V(0, topY + 0.35, 0), 0.018, mats.alum, g);
  }

  // Mast with the solar panel and the planar array antenna at the top
  const mastTop = 2.72;
  k.cyl(0.035, 0.04, mastTop - 0.85, mats.alum, g, 0, (mastTop + 0.85) / 2, 0, 0, 0, 0, 14);
  k.box(0.14, 0.12, 0.14, mats.alum, g, 0, mastTop, 0);
  // Solar panel (0.86 m²) and planar array antenna hinged at the top of the mast, in a "V"
  const head = new THREE.Group();
  head.position.set(0, mastTop + 0.02, 0);
  head.rotation.set(0, 0.5, 0);
  g.add(head);
  const solar = new THREE.Group();
  solar.rotation.x = 0.55;
  head.add(solar);
  k.box(1.0, 0.025, 0.86, mats.cells, solar, 0, 0.015, -0.47);
  k.box(1.02, 0.02, 0.88, mats.alum, solar, 0, -0.008, -0.47);
  k.strut(V(0, 0, 0), V(0, 0, -0.08), 0.02, mats.alum, solar, 8);
  const planar = new THREE.Group();
  planar.rotation.x = 0.8;
  head.add(planar);
  k.box(0.62, 0.03, 0.62, mats.whitePaint, planar, 0, 0, 0.36);
  for (let i = -2; i <= 2; i++) k.box(0.6, 0.035, 0.012, mats.alum, planar, 0, -0.03, 0.36 + i * 0.12);
  k.strut(V(0, 0, 0), V(0, 0, 0.06), 0.02, mats.alum, planar, 8);

  // Thermal compartments A and B: white radiator tops over Mylar-blanketed boxes
  const comp = (i: number, w: number, h: number, d: number) => {
    const p = corner(i, 0.5, baseY + h / 2 + 0.12, Math.PI / 3);
    const a = Math.atan2(p.x, p.z);
    k.box(w, h, d, mats.whitePaint, g, p.x, p.y, p.z, 0, a, 0);
    k.box(w + 0.02, 0.03, d + 0.02, mats.whitePaint, g, p.x, p.y + h / 2 + 0.015, p.z, 0, a, 0);
    for (let r = -2; r <= 2; r++) {
      const off = new THREE.Vector3(r * (w / 5.5), 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
      k.box(0.012, 0.012, d - 0.04, mats.alum, g, p.x + off.x, p.y + h / 2 + 0.036, p.z + off.z, 0, a, 0);
    }
  };
  comp(1, 0.62, 0.3, 0.5);
  comp(2, 0.46, 0.28, 0.4);

  // Survey TV camera: tall cylinder with the mirror hood on top
  const cam = corner(0, 0.36, 0, Math.PI / 3);
  k.cyl(0.075, 0.075, 0.55, mats.whitePaint, g, cam.x, topY + 0.2, cam.z, 0, 0, 0, 16);
  k.box(0.17, 0.14, 0.13, mats.alum, g, cam.x, topY + 0.54, cam.z);
  k.box(0.14, 0.004, 0.12, mats.mylar, g, cam.x, topY + 0.6, cam.z + 0.03, 0.7, 0, 0);

  // Propellant spheres, vernier engines and the landing radar box under the frame
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.sphere(0.11, mats.alum, g, Math.cos(a) * 0.36, baseY + 0.14, Math.sin(a) * 0.36, 16);
  }
  for (let i = 0; i < 3; i++) {
    const p = corner(i, 0.66, baseY - 0.1);
    k.cyl(0.035, 0.075, 0.16, mats.black, g, p.x, p.y, p.z, 0, 0, 0, 14);
  }
  k.box(0.32, 0.12, 0.32, mats.whitePaint, g, 0, baseY - 0.02, 0);

  // Legs: A-frame struts to crushable footpads, shock absorbers, crushable blocks
  for (let i = 0; i < 3; i++) {
    const foot = corner(i, 2.05, 0.08);
    const c0 = corner(i, 0.95, baseY, -0.14);
    const c1 = corner(i, 0.95, baseY, 0.14);
    k.strut(c0, foot, 0.028, mats.alum, g);
    k.strut(c1, foot, 0.028, mats.alum, g);
    k.strut(corner(i, 0.42, topY, 0), corner(i, 1.45, 0.38), 0.03, mats.alum, g);
    k.cyl(0.16, 0.18, 0.08, mats.alum, g, foot.x, 0.04, foot.z, 0, 0, 0, 18);
    const blk = corner(i, 0.95, baseY - 0.08);
    k.box(0.16, 0.12, 0.16, mats.whitePaint, g, blk.x, blk.y, blk.z);
  }

  // Omnidirectional antennas on their booms
  for (const off of [-0.5, 0.5]) {
    const a = corner(1, 0.5, topY - 0.1, off);
    const b = corner(1, 1.25, topY + 0.65, off * 1.6);
    k.strut(a, b, 0.012, mats.alum, g);
    k.cyl(0.0, 0.035, 0.08, mats.whitePaint, g, b.x, b.y + 0.04, b.z, 0, 0, 0, 10);
  }
  return g;
}

// ---------------------------------------------------------------------------------------------
// ALSEP, Apollo 12 (Ocean of Storms, 19 Nov 1969), full size. Central Station with its raised
// sunshield, Mylar side curtains and helical antenna; SNAP-27 RTG; Passive Seismic Experiment on
// its crumpled Mylar thermal skirt; Lunar Surface Magnetometer (tripod and three sensor booms);
// Solar Wind Spectrometer; flat copper ribbon cables. Positions follow the scene layout.
// ---------------------------------------------------------------------------------------------
export function buildAlsep(mats: CraftMaterials, disposables: Disposable[]): THREE.Group {
  const k = new Kit(disposables);
  const g = new THREE.Group();
  g.name = 'alsep';

  // Central Station
  k.box(0.6, 0.28, 0.42, mats.alum, g, 0, 0.14, 0);
  k.box(0.08, 0.06, 0.06, mats.whitePaint, g, -0.22, 0.31, -0.14); // dust detector
  for (const [x, z] of [[-0.3, -0.22], [0.3, -0.22], [-0.3, 0.22], [0.3, 0.22]]) {
    k.cyl(0.01, 0.01, 0.62, mats.alum, g, x, 0.59, z, 0, 0, 0, 6);
  }
  k.box(0.68, 0.02, 0.5, mats.whitePaint, g, 0, 0.91, 0);
  for (const z of [-0.25, 0.25]) k.box(0.66, 0.6, 0.004, mats.mylar, g, 0, 0.6, z);
  // Modified axial-helix antenna on its aiming mechanism, pointed at Earth
  k.box(0.1, 0.08, 0.1, mats.alum, g, 0.18, 0.96, 0.05);
  k.cyl(0.03, 0.03, 0.58, mats.whitePaint, g, 0.18, 1.2, -0.05, -0.35, 0, 0.25, 12);

  // SNAP-27 radioisotope thermoelectric generator with its eight radiating fins
  const rtg = new THREE.Group();
  rtg.position.set(-2.6, 0, 0.6);
  g.add(rtg);
  k.box(0.36, 0.06, 0.36, mats.alum, rtg, 0, 0.03, 0);
  k.cyl(0.12, 0.12, 0.46, mats.bronze, rtg, 0, 0.29, 0, 0, 0, 0, 18);
  for (let f = 0; f < 8; f++) {
    const a = (f * Math.PI) / 4;
    k.box(0.15, 0.42, 0.012, mats.bronze, rtg, Math.cos(a) * 0.19, 0.29, Math.sin(a) * 0.19, 0, -a, 0);
  }
  k.cyl(0.13, 0.13, 0.03, mats.alum, rtg, 0, 0.535, 0, 0, 0, 0, 18);

  // Passive Seismic Experiment on its crumpled aluminised-Mylar skirt
  const pse = new THREE.Group();
  pse.position.set(1.9, 0, -1.3);
  g.add(pse);
  const skirt = new THREE.CircleGeometry(0.78, 40, 0, Math.PI * 2);
  const pos = skirt.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const r = Math.hypot(x, y);
    const a = Math.atan2(y, x);
    const wob = 1 + 0.12 * Math.sin(a * 5 + 1.3) + 0.06 * Math.sin(a * 11);
    pos.setXYZ(i, x * wob, y * wob, Math.max(0, (Math.sin(a * 7) * 0.025 + Math.sin(a * 13 + r * 9) * 0.015) * Math.min(1, r * 2)));
  }
  skirt.computeVertexNormals();
  k.mesh(skirt, mats.mylar, pse, 0, 0.012, 0, -Math.PI / 2, 0, 0);
  k.cyl(0.13, 0.15, 0.3, mats.mylar, pse, 0, 0.16, 0, 0, 0, 0, 18);
  k.cyl(0.12, 0.12, 0.02, mats.alum, pse, 0, 0.32, 0, 0, 0, 0, 18);

  // Lunar Surface Magnetometer: tripod, electronics box, three booms with sensor heads
  const lsm = new THREE.Group();
  lsm.position.set(-1.4, 0, -1.6);
  g.add(lsm);
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3 + 0.4;
    k.strut(V(0, 0.5, 0), V(Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32), 0.012, mats.alum, lsm, 6);
  }
  k.box(0.2, 0.16, 0.2, mats.goldKapton, lsm, 0, 0.55, 0);
  k.cyl(0.015, 0.015, 0.2, mats.alum, lsm, 0, 0.72, 0, 0, 0, 0, 8);
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const tip = V(Math.cos(a) * 0.62, 0.8, Math.sin(a) * 0.62);
    k.strut(V(0, 0.8, 0), tip, 0.014, mats.alum, lsm, 6);
    k.cyl(0.05, 0.05, 0.15, mats.whitePaint, lsm, tip.x, tip.y, tip.z, 0, -a, Math.PI / 2, 12);
  }

  // Solar Wind Spectrometer on its legs, Faraday cups on top
  const sws = new THREE.Group();
  sws.position.set(1.3, 0, 1.25);
  g.add(sws);
  k.box(0.3, 0.24, 0.3, mats.whitePaint, sws, 0, 0.42, 0);
  for (const [x, z] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) {
    k.cyl(0.01, 0.01, 0.32, mats.alum, sws, x, 0.16, z, 0, 0, 0, 6);
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 6) * Math.PI * 2;
    const r = i === 6 ? 0 : 0.09;
    k.cyl(0.03, 0.03, 0.02, mats.black, sws, Math.cos(a) * r, 0.55, Math.sin(a) * r, 0, 0, 0, 12);
  }

  // Flat copper ribbon cables from each instrument to the Central Station
  const ribbon = (to: THREE.Vector3) => {
    const from = V(0, 0.004, 0);
    const n = 6;
    let prev = from;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const p = V(from.x + (to.x - from.x) * t + Math.sin(t * 7 + to.x) * 0.08 * Math.sin(t * Math.PI), 0.004, from.z + (to.z - from.z) * t + Math.cos(t * 5 + to.z) * 0.08 * Math.sin(t * Math.PI));
      const d = new THREE.Vector3().subVectors(p, prev);
      const len = d.length();
      k.box(0.026, 0.004, len, mats.copperRibbon, g, (p.x + prev.x) / 2, 0.004, (p.z + prev.z) / 2, 0, Math.atan2(d.x, d.z), 0);
      prev = p;
    }
  };
  ribbon(V(-2.45, 0, 0.55));
  ribbon(V(1.75, 0, -1.2));
  ribbon(V(-1.3, 0, -1.5));
  ribbon(V(1.2, 0, 1.15));
  return g;
}

// ---------------------------------------------------------------------------------------------
// Phoenix (2008) from NASA's InSight model. InSight was built on the Phoenix design: same deck,
// legs, decagonal UltraFlex arrays and a modified copy of Phoenix's robotic arm. InSight-only
// hardware is hidden (SEIS and its wind/thermal shield, HP3 mole, tethers, TWINS, RISE, ICC) and
// Phoenix's own instruments are added on the deck: the Surface Stereo Imager on its mast (~2 m
// above the ground), the Canadian meteorological mast with its telltale, TEGA's ovens, MECA.
// ---------------------------------------------------------------------------------------------
export function adaptInsightToPhoenix(prepared: THREE.Object3D, mats: CraftMaterials, disposables: Disposable[]): void {
  const k = new Kit(disposables);
  const hide = new Set([
    'SEIS', 'WTS', 'WTS_boot', 'WTS_leg_front', 'WTS_leg_left', 'WTS_leg_right', 'HP3_v3d_baked',
    'cable_01', 'cable_02', 'TWINS', 'RISE_antennas', 'ICC', 'lens_cap_ICC', 'pressure_inlet',
  ]);
  prepared.updateMatrixWorld(true);
  let deckNode: THREE.Object3D | null = null;
  prepared.traverse((o) => {
    if (hide.has(o.name)) o.visible = false;
    if (!deckNode && o.name === 'deck') deckNode = o;
  });
  if (!deckNode) return;
  // GLTFLoader makes a multi-material mesh a Group of primitive meshes: measure only the deck's
  // own geometry (not its legs, arrays and arm children)
  const root = deckNode as THREE.Object3D;
  const deckMeshes: THREE.Mesh[] = (root as THREE.Mesh).isMesh
    ? [root as THREE.Mesh]
    : (root.children.filter((ch) => (ch as THREE.Mesh).isMesh && !ch.children.length) as THREE.Mesh[]);
  if (!deckMeshes.length) return;
  const inv = new THREE.Matrix4().copy(prepared.matrixWorld).invert();
  const box = new THREE.Box3();
  for (const m of deckMeshes) {
    m.geometry.computeBoundingBox();
    box.union(m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld).applyMatrix4(inv));
  }
  const c = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const top = box.max.y;
  // The real deck sits about 1 m above the ground: model units per metre
  const S = Math.max(0.2, box.min.y + size.y * 0.5);
  const R = Math.min(size.x, size.z) * 0.5;
  const parts = new THREE.Group();
  parts.name = 'phoenix_instruments';
  prepared.add(parts);

  // Surface Stereo Imager on its pop-up mast
  const ssi = V(c.x - R * 0.35, top, c.z - R * 0.45);
  k.cyl(0.02 * S, 0.025 * S, 0.95 * S, mats.whitePaint, parts, ssi.x, top + 0.475 * S, ssi.z, 0, 0, 0, 12);
  k.box(0.2 * S, 0.1 * S, 0.1 * S, mats.whitePaint, parts, ssi.x, top + 1.0 * S, ssi.z);
  for (const dx of [-0.06, 0.06]) k.cyl(0.022 * S, 0.022 * S, 0.03 * S, mats.glass, parts, ssi.x + dx * S, top + 1.0 * S, ssi.z - 0.055 * S, Math.PI / 2, 0, 0, 12);

  // Meteorological mast with temperature sensors and the telltale wind indicator
  const met = V(c.x + R * 0.55, top, c.z + R * 0.2);
  k.cyl(0.009 * S, 0.009 * S, 1.0 * S, mats.alum, parts, met.x, top + 0.5 * S, met.z, 0, 0, 0, 8);
  for (const h of [0.25, 0.5, 0.75]) k.cyl(0.004 * S, 0.004 * S, 0.12 * S, mats.alum, parts, met.x + 0.06 * S, top + h * S, met.z, 0, 0, Math.PI / 2, 6);
  k.cyl(0.004 * S, 0.004 * S, 0.1 * S, mats.alum, parts, met.x, top + 1.05 * S, met.z, 0, 0, 0, 6);
  k.cyl(0.006 * S, 0.006 * S, 0.06 * S, mats.whitePaint, parts, met.x + 0.02 * S, top + 1.06 * S, met.z, 0.2, 0, 0.3, 8);

  // TEGA (Thermal and Evolved-Gas Analyzer) with its eight oven doors, and MECA
  const tega = V(c.x + R * 0.1, top, c.z - R * 0.05);
  k.box(0.5 * S, 0.24 * S, 0.3 * S, mats.whitePaint, parts, tega.x, top + 0.12 * S, tega.z);
  for (let i = 0; i < 8; i++) {
    k.box(0.045 * S, 0.012 * S, 0.12 * S, mats.goldKapton, parts, tega.x + (i - 3.5) * 0.058 * S, top + 0.246 * S, tega.z);
  }
  k.box(0.3 * S, 0.2 * S, 0.25 * S, mats.goldKapton, parts, c.x - R * 0.2, top + 0.1 * S, c.z + R * 0.45);
}
