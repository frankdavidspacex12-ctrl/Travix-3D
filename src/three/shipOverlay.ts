import * as THREE from 'three';
import { createGlowTexture, createShipRig, loadShipTemplate, ShipRig } from './shipModel';

/**
 * "Modo nave": the Travix starship always on screen (third-person, from behind), drawn as its own
 * layer over the 3D view so it never clips into planets. It is lit from the real direction of the
 * Sun; its lights are divided by the auto-exposure so it looks the same at Mercury or Neptune.
 */
export class ShipOverlay {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  private rig: ShipRig | null = null;
  private readonly glowTex = createGlowTexture();
  private readonly key = new THREE.DirectionalLight(0xffffff, 2.4);
  private readonly fill = new THREE.HemisphereLight(0xbfd2ff, 0x1a1f2b, 0.35);
  private readonly sunDirView = new THREE.Vector3(0, 1, 0);
  private readonly invQuat = new THREE.Quaternion();
  private time = 0;
  private visible = 0;
  private wantVisible = false;
  private disposed = false;
  private viewport = { w: 1, h: 1, top: 0, bottom: 0 };
  /** Current (damped) on-screen placement in CSS px: centre and ship width */
  private place = { x: -1, y: -1, width: 0 };

  constructor(environment: THREE.Texture | null) {
    this.scene.environment = environment;
    this.scene.environmentIntensity = 0.35;
    this.scene.add(this.key, this.key.target, this.fill);
    this.camera.position.set(0, 0, 0);
    loadShipTemplate()
      .then((template) => {
        if (this.disposed) return;
        this.rig = createShipRig(template, this.glowTex);
        this.rig.group.visible = this.visible > 0.001;
        this.scene.add(this.rig.group);
      })
      .catch(() => {
        // Model unavailable (offline before first cache): ship mode still works without the model
      });
  }

  /** Fade the ship in / out (ship mode toggled). */
  setVisible(on: boolean): void {
    this.wantVisible = on;
  }

  /** True while there is anything to draw (lets the engine skip the extra pass). */
  get isActive(): boolean {
    return this.visible > 0.001 && this.rig !== null;
  }

  setViewport(w: number, h: number, insetTop: number, insetBottom: number): void {
    this.viewport = { w: Math.max(1, w), h: Math.max(1, h), top: insetTop, bottom: insetBottom };
    this.camera.aspect = this.viewport.w / this.viewport.h;
    this.camera.updateProjectionMatrix();
  }

  /**
   * @param mainCamera the 3D view camera (to express the Sun direction in screen space)
   * @param sunDirWorld unit vector from the viewer toward the Sun
   * @param exposureInv 1 / auto-exposure when the composer applies it, else 1
   * @param thrust 0..1 (higher while flying to a target)
   * @param avoid screen circle (CSS px) of the object being looked at: the ship never covers it
   */
  update(
    dt: number,
    mainCamera: THREE.Camera,
    sunDirWorld: THREE.Vector3,
    exposureInv: number,
    thrust: number,
    avoid: { x: number; y: number; r: number } | null,
  ): void {
    this.time += dt;
    this.visible = THREE.MathUtils.damp(this.visible, this.wantVisible ? 1 : 0, 6, dt);
    const rig = this.rig;
    if (!rig) return;
    rig.group.visible = this.visible > 0.001;
    if (!rig.group.visible) return;

    // Placement: beside the target (right), else bottom-right corner, else below, else smaller —
    // never over the object being looked at
    const target = this.choosePlacement(avoid);
    const p = this.place;
    if (p.x < 0) {
      p.x = target.x;
      p.y = target.y;
      p.width = target.width;
    } else {
      p.x = THREE.MathUtils.damp(p.x, target.x, 4, dt);
      p.y = THREE.MathUtils.damp(p.y, target.y, 4, dt);
      p.width = THREE.MathUtils.damp(p.width, target.width, 4, dt);
    }
    const { w, h } = this.viewport;
    const dist = 8;
    const halfH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * dist;
    const pxPerUnit = h / (2 * halfH);
    const scale = p.width / (0.84 * pxPerUnit);
    const ndcX = (2 * p.x) / w - 1;
    const ndcY = 1 - (2 * p.y) / h;
    // Slide up from below while fading in
    const enter = 1 - Math.pow(1 - this.visible, 3);
    const x = ndcX * halfH * (w / h);
    const y = ndcY * halfH - (1 - enter) * halfH * 0.8;
    const t = this.time;
    rig.group.scale.setScalar(scale);
    rig.group.position.set(x + Math.sin(t * 0.6) * 0.04 * scale, y + Math.sin(t * 1.2) * 0.025 * scale, -dist);
    rig.group.rotation.set(
      -0.34 + Math.sin(t * 0.9) * 0.012,
      Math.sin(t * 0.45) * 0.035,
      Math.sin(t * 0.7) * 0.05,
    );

    // Sunlight from its real direction, in this layer's camera space
    this.invQuat.copy(mainCamera.quaternion).invert();
    this.sunDirView.copy(sunDirWorld).applyQuaternion(this.invQuat).normalize();
    this.key.position.copy(this.sunDirView).multiplyScalar(10).add(rig.group.position);
    this.key.target.position.copy(rig.group.position);

    const gain = exposureInv;
    this.key.intensity = 2.6 * gain;
    // Enough fill that the hull reads even with the Sun behind it
    this.fill.intensity = 0.9 * gain;
    this.scene.environmentIntensity = 0.5 * gain;
    rig.update(t, thrust, gain * this.visible, 0.45);
  }

  /** First placement (CSS px centre + width) whose box stays clear of the avoided circle. */
  private choosePlacement(avoid: { x: number; y: number; r: number } | null): {
    x: number;
    y: number;
    width: number;
  } {
    const { w, h, top, bottom } = this.viewport;
    const phone = w < 640;
    const margin = phone ? 16 : 44;
    const freeTop = top + (phone ? 64 : 72);
    const freeBottom = h - Math.max(bottom, phone ? 92 : 104);
    const freeH = Math.max(h * 0.25, freeBottom - freeTop);
    const baseW = Math.min(w * (phone ? 0.4 : 0.19), freeH * 0.6, 320);
    const aspect = 0.45; // on-screen height / width of the ship seen from behind
    const clear = (cx: number, cy: number, sw: number) => {
      if (!avoid) return true;
      const hw = sw / 2 + 8;
      const hh = (sw * aspect) / 2 + 8;
      const dx = Math.max(Math.abs(avoid.x - cx) - hw, 0);
      const dy = Math.max(Math.abs(avoid.y - cy) - hh, 0);
      return dx * dx + dy * dy > avoid.r * avoid.r;
    };
    for (const k of [1, 0.78, 0.6, 0.45]) {
      const sw = baseW * k;
      const sh = sw * aspect;
      const rightX = w - margin - sw / 2;
      const candidates: Array<[number, number]> = [
        [rightX, freeTop + freeH * 0.62], // beside, a little below the middle
        [rightX, freeBottom - sh / 2], // bottom-right corner
        [w / 2, freeBottom - sh / 2], // below
      ];
      for (const [cx, cy] of candidates) {
        if (clear(cx, cy, sw)) return { x: cx, y: cy, width: sw };
      }
    }
    // Target fills the screen: smallest ship in the bottom-right corner
    const sw = baseW * 0.4;
    return { x: w - margin - sw / 2, y: freeBottom - (sw * aspect) / 2, width: sw };
  }

  dispose(): void {
    this.disposed = true;
    this.rig?.dispose();
    this.glowTex.dispose();
  }
}
