import * as THREE from 'three';
import { createGlowTexture, createShipRig, loadShipTemplate, ShipRig } from './shipModel';

/**
 * "Modo nave": the Travix starship always on screen (third-person, from behind), drawn as its own
 * layer over the 3D view so it never clips into planets. It is lit from the real direction of the
 * Sun; its lights are divided by the auto-exposure so it looks the same at Mercury or Neptune.
 */
/** Duration of the ship's fade in and out (ship mode toggled). */
const SHIP_FADE_SECONDS = 0.9;

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
  /** Hand inspection (drag to turn the ship around, wheel to bring it closer) */
  private inspect = { yaw: 0, pitch: 0, zoom: 1, returning: false };
  private readonly baseQuat = new THREE.Quaternion();
  private readonly inspQuat = new THREE.Quaternion();
  private readonly tmpQuat = new THREE.Quaternion();
  private readonly baseEuler = new THREE.Euler();
  private static readonly AXIS_X = new THREE.Vector3(1, 0, 0);
  private static readonly AXIS_Y = new THREE.Vector3(0, 1, 0);

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
        this.rig.setOpacity(0);
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

  /** True when the CSS-px point (relative to the 3D view) is on the ship. */
  hitTest(x: number, y: number): boolean {
    if (!this.isActive || this.visible < 0.5) return false;
    const p = this.place;
    const sw = p.width * this.inspect.zoom;
    return Math.abs(x - p.x) < sw * 0.55 && Math.abs(y - p.y) < sw * 0.4;
  }

  /** Turn the ship by a drag of (dx, dy) CSS px. */
  rotateBy(dx: number, dy: number): void {
    const i = this.inspect;
    i.returning = false;
    i.yaw += dx * 0.012;
    i.pitch = THREE.MathUtils.clamp(i.pitch + dy * 0.012, -1.45, 1.45);
  }

  /** Bring the ship closer / farther (wheel or pinch). */
  zoomBy(factor: number): void {
    const i = this.inspect;
    i.returning = false;
    i.zoom = THREE.MathUtils.clamp(i.zoom * factor, 1, 2.2);
  }

  /** Ease back to its course (new trip, or double click on the ship). */
  resetInspection(): void {
    const i = this.inspect;
    // Shortest way back
    i.yaw = Math.atan2(Math.sin(i.yaw), Math.cos(i.yaw));
    i.returning = true;
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
   * @param turn turn rate of the view (rad/s, + = left): the ship banks and noses into the turn
   */
  update(
    dt: number,
    mainCamera: THREE.Camera,
    sunDirWorld: THREE.Vector3,
    exposureInv: number,
    thrust: number,
    avoid: { x: number; y: number; r: number } | null,
    turn = 0,
  ): void {
    this.time += dt;
    const rig = this.rig;
    // The fade only runs once the model is loaded, so the first appearance is gentle too
    if (!rig) return;
    // Same gentle ~0.9 s transition both ways (linear progress, eased below)
    const step = dt / SHIP_FADE_SECONDS;
    this.visible = THREE.MathUtils.clamp(this.visible + (this.wantVisible ? step : -step), 0, 1);
    rig.group.visible = this.visible > 0.001;
    if (!rig.group.visible) return;

    const insp = this.inspect;
    if (insp.returning) {
      insp.yaw = THREE.MathUtils.damp(insp.yaw, 0, 3.5, dt);
      insp.pitch = THREE.MathUtils.damp(insp.pitch, 0, 3.5, dt);
      insp.zoom = THREE.MathUtils.damp(insp.zoom, 1, 3.5, dt);
      if (Math.abs(insp.yaw) + Math.abs(insp.pitch) + Math.abs(insp.zoom - 1) < 1e-3) {
        insp.yaw = 0;
        insp.pitch = 0;
        insp.zoom = 1;
        insp.returning = false;
      }
    }

    // Placement: always on the right side, beside the target, shrinking rather than ever
    // covering the object being looked at
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
    const scale = (p.width * insp.zoom) / (0.84 * pxPerUnit);
    const ndcX = (2 * p.x) / w - 1;
    const ndcY = 1 - (2 * p.y) / h;
    // Fade in / out: opacity, a short rise and a slight growth, all on the same smooth curve
    const v = this.visible;
    const enter = v * v * (3 - 2 * v);
    const x = ndcX * halfH * (w / h);
    const y = ndcY * halfH - (1 - enter) * halfH * 0.12;
    const t = this.time;
    rig.setOpacity(enter);
    rig.group.scale.setScalar(scale * (0.9 + 0.1 * enter));
    rig.group.position.set(x + Math.sin(t * 0.6) * 0.04 * scale, y + Math.sin(t * 1.2) * 0.025 * scale, -dist);
    // Course attitude with a gentle sway, turned by the hand inspection (screen-space yaw / pitch)
    const bank = THREE.MathUtils.clamp(turn * 0.35, -0.5, 0.5);
    const noseIn = THREE.MathUtils.clamp(turn * 0.15, -0.25, 0.25);
    this.baseEuler.set(
      -0.34 + Math.sin(t * 0.9) * 0.012,
      Math.sin(t * 0.45) * 0.035 + noseIn,
      Math.sin(t * 0.7) * 0.05 + bank,
    );
    this.baseQuat.setFromEuler(this.baseEuler);
    this.inspQuat.setFromAxisAngle(ShipOverlay.AXIS_X, insp.pitch);
    this.tmpQuat.setFromAxisAngle(ShipOverlay.AXIS_Y, insp.yaw);
    this.inspQuat.multiply(this.tmpQuat);
    rig.group.quaternion.copy(this.inspQuat).multiply(this.baseQuat);

    // Sunlight from its real direction, in this layer's camera space
    this.invQuat.copy(mainCamera.quaternion).invert();
    this.sunDirView.copy(sunDirWorld).applyQuaternion(this.invQuat).normalize();
    this.key.position.copy(this.sunDirView).multiplyScalar(10).add(rig.group.position);
    this.key.target.position.copy(rig.group.position);

    const gain = exposureInv;
    // Not higher: turned face-on to the Sun by hand, the white hull would saturate
    this.key.intensity = 2.0 * gain;
    // Enough fill that the hull reads even with the Sun behind it
    this.fill.intensity = 0.9 * gain;
    this.scene.environmentIntensity = 0.5 * gain;
    rig.update(t, thrust, gain * enter, 0.45);
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
    // Always on the right: beside the target, then lower on the right, then smaller
    for (const k of [1, 0.85, 0.7, 0.58, 0.47]) {
      const sw = baseW * k;
      const sh = sw * aspect;
      const rightX = w - margin - sw / 2;
      const candidates: Array<[number, number]> = [
        [rightX, freeTop + freeH * 0.55], // beside, around the middle
        [rightX, freeTop + freeH * 0.78],
        [rightX, freeBottom - sh / 2], // bottom-right
      ];
      for (const [cx, cy] of candidates) {
        if (clear(cx, cy, sw)) return { x: cx, y: cy, width: sw };
      }
    }
    // Target fills the screen: smallest ship, still on the right (bottom corner)
    const sw = baseW * 0.4;
    return { x: w - margin - sw / 2, y: freeBottom - (sw * aspect) / 2, width: sw };
  }

  dispose(): void {
    this.disposed = true;
    this.rig?.dispose();
    this.glowTex.dispose();
  }
}
