import {
  DirectionalLight,
  Group,
  HemisphereLight,
  MathUtils,
  NeutralToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  Raycaster,
  Scene,
  Spherical,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { APP_CONFIG } from '../config/app.config.js';
import { EventEmitter } from '../core/EventEmitter.js';
import { animator } from '../core/animator.js';
import { prefersReducedMotion } from '../utils/dom.js';
import { createContactShadow } from './contactShadow.js';

const cfg = APP_CONFIG.viewer;

export function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * The 3D stage: renderer, camera, orbit controls, lighting and render loop.
 * It knows nothing about burgers. It shows a ProductModel and exposes
 * camera framing, picking and a per-render hook for overlays (labels).
 *
 * Renders on demand (only while something moves) to save battery.
 *
 * Events: 'render', 'interaction'
 */
export class Viewer3D extends EventEmitter {
  #dirty = true;
  #running = false;
  #suspended = false;
  #lastInteraction = performance.now();
  #cameraTween = null;
  #shiftTween = null;
  #shift = { x: 0, y: 0 };
  #shiftTarget = { x: 0, y: 0 };
  #width = 1;
  #height = 1;
  #productModel = null;
  #shadow = null;

  constructor(container) {
    super();
    this.container = container;
    this.autoRotateAllowed = true;

    this.renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, cfg.maxPixelRatio));
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.classList.add('stage__canvas');
    container.appendChild(this.renderer.domElement);

    this.scene = new Scene();
    const pmrem = new PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.environment;
    pmrem.dispose();

    this.scene.add(new HemisphereLight(0xfff8ee, 0x3a4434, 0.6));
    const key = new DirectionalLight(0xffffff, 1.6);
    key.position.set(0.6, 1.2, 0.8);
    this.scene.add(key);

    this.stage = new Group();
    this.scene.add(this.stage);

    this.camera = new PerspectiveCamera(cfg.fov, 1, 0.005, 50);
    this.camera.position.set(0, 0.2, 0.5);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    Object.assign(this.controls, {
      enableDamping: true,
      dampingFactor: 0.09,
      enablePan: false,
      rotateSpeed: 0.85,
      zoomSpeed: 0.9,
      minPolarAngle: 0.12,
      maxPolarAngle: Math.PI * 0.6,
      autoRotateSpeed: cfg.autoRotateSpeed,
    });
    this.controls.addEventListener('start', () => this.#markInteraction());
    this.controls.addEventListener('change', () => (this.#dirty = true));

    this.raycaster = new Raycaster();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.onVisibility = () => (document.hidden ? this.stop() : this.start());
    document.addEventListener('visibilitychange', this.onVisibility);

    this.resize();
    this.start();
  }

  /* ------------------------------------------------------------- lifecycle */

  start() {
    if (this.#running || this.#suspended) return;
    this.#running = true;
    this.renderer.setAnimationLoop(this.#loop);
  }

  stop() {
    this.#running = false;
    this.renderer.setAnimationLoop(null);
  }

  /** Hand the renderer to someone else (the AR session) until resume(). */
  suspend() {
    this.#suspended = true;
    this.stop();
  }

  resume() {
    this.#suspended = false;
    this.resize();
    this.start();
  }

  requestRender() {
    this.#dirty = true;
  }

  #loop = (now) => {
    const animating = animator.update(now);
    const idle = now - this.#lastInteraction > cfg.idleAutoRotateAfter * 1000;
    this.controls.autoRotate = this.autoRotateAllowed && idle && !prefersReducedMotion();
    const moved = this.controls.update();

    if (animating || moved || this.#dirty || this.controls.autoRotate) {
      this.#dirty = false;
      this.renderer.render(this.scene, this.camera);
      this.emit('render');
    }
  };

  #markInteraction() {
    this.#lastInteraction = performance.now();
    this.#cameraTween?.cancel();
    this.emit('interaction');
  }

  /** Call when the user interacts outside the canvas (buttons, labels). */
  noteInteraction() {
    this.#lastInteraction = performance.now();
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.#width = w;
    this.#height = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.#applyShift();
    this.camera.updateProjectionMatrix();
    this.#dirty = true;
  }

  get size() {
    return { width: this.#width, height: this.#height };
  }

  /* ------------------------------------------------------------- content */

  /** Show a ProductModel (replacing any previous one) and frame it. */
  setProductModel(productModel) {
    this.clearModel();
    this.#productModel = productModel;
    this.stage.add(productModel.object);

    const size = productModel.assembledBox.getSize(new Vector3());
    this.#shadow = createContactShadow(size.x * 1.7, size.z * 1.7);
    this.stage.add(this.#shadow);

    this.frame(productModel.assembledBox, { animate: false, resetAngle: true });
    this.#lastInteraction = performance.now();
  }

  /** Re-attach the model after it was borrowed by the AR session. */
  reclaimModel() {
    const pm = this.#productModel;
    if (!pm) return;
    pm.object.position.set(0, 0, 0);
    pm.object.rotation.set(0, 0, 0);
    pm.object.scale.set(1, 1, 1);
    this.stage.add(pm.object);
    this.#dirty = true;
  }

  clearModel() {
    if (this.#shadow) {
      this.#shadow.removeFromParent();
      this.#shadow.geometry.dispose();
      this.#shadow.material.dispose();
      this.#shadow = null;
    }
    this.#productModel?.object.removeFromParent();
    this.#productModel = null;
    this.#dirty = true;
  }

  /* -------------------------------------------------------------- camera */

  /**
   * Fit a box (in stage space) into view.
   * @param {import('three').Box3} box
   * @param {{animate?:boolean, resetAngle?:boolean}} opts
   */
  frame(box, { animate = true, resetAngle = false } = {}) {
    const target = box.getCenter(new Vector3());

    // Fit into the part of the stage not covered by labels / the bottom sheet.
    const usableW = Math.max(0.35, 1 - Math.abs(this.#shiftTarget.x) * 2);
    const usableH = Math.max(0.35, 1 - Math.abs(this.#shiftTarget.y) * 2);
    const tanV = Math.tan(MathUtils.degToRad(this.camera.fov) / 2) * usableH;
    const tanH = Math.tan(MathUtils.degToRad(this.camera.fov) / 2) * this.camera.aspect * usableW;

    const current = new Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    const angle = resetAngle
      ? new Spherical(1, MathUtils.degToRad(90 - cfg.elevation), MathUtils.degToRad(cfg.azimuth))
      : new Spherical(1, current.phi, current.theta);

    // Exact fit: the closest distance at which all 8 box corners are inside
    // the usable frustum, seen from this angle. Much tighter than a bounding
    // sphere for tall, narrow dishes on a portrait screen.
    const back = new Vector3().setFromSpherical(angle).normalize(); // target → camera
    const right = new Vector3().crossVectors(new Vector3(0, 1, 0), back).normalize();
    const up = new Vector3().crossVectors(back, right);
    let distance = 0;
    const c = new Vector3();
    for (let i = 0; i < 8; i++) {
      c.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(target);
      const z = c.dot(back);
      distance = Math.max(distance, z + Math.abs(c.dot(right)) / tanH, z + Math.abs(c.dot(up)) / tanV);
    }
    distance = (distance || 0.3) * 1.08;

    this.fitDistance = distance;
    this.controls.minDistance = distance * cfg.minZoom;
    this.controls.maxDistance = distance * cfg.maxZoom;

    this.#moveCamera(target, new Spherical(distance, angle.phi, angle.theta), animate ? 650 : 0);
  }

  #moveCamera(target, toSpherical, duration) {
    this.#cameraTween?.cancel();
    const fromTarget = this.controls.target.clone();
    const from = new Spherical().setFromVector3(this.camera.position.clone().sub(fromTarget));
    // take the short way round
    let dTheta = toSpherical.theta - from.theta;
    dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta));

    const apply = (k) => {
      this.controls.target.lerpVectors(fromTarget, target, k);
      const s = new Spherical(
        MathUtils.lerp(from.radius, toSpherical.radius, k),
        MathUtils.lerp(from.phi, toSpherical.phi, k),
        from.theta + dTheta * k,
      );
      this.camera.position.setFromSpherical(s).add(this.controls.target);
      this.camera.lookAt(this.controls.target);
      this.#dirty = true;
    };

    if (!duration || prefersReducedMotion()) {
      apply(1);
      return;
    }
    this.#cameraTween = animator.tween({ duration, onUpdate: apply });
  }

  /** Return to the default angle and framing for a box. */
  resetView(box) {
    this.#lastInteraction = performance.now();
    this.frame(box, { animate: true, resetAngle: true });
  }

  /**
   * Shift the rendered image as a fraction of the stage size, e.g. to make
   * room for labels (x) or a bottom sheet (y), without moving the orbit pivot.
   */
  setShift(x, y, animate = true) {
    this.#shiftTween?.cancel();
    this.#shiftTarget = { x, y };
    const from = { ...this.#shift };
    const apply = (k) => {
      this.#shift.x = MathUtils.lerp(from.x, x, k);
      this.#shift.y = MathUtils.lerp(from.y, y, k);
      this.#applyShift();
      this.#dirty = true;
    };
    if (!animate || prefersReducedMotion()) apply(1);
    else this.#shiftTween = animator.tween({ duration: 450, onUpdate: apply });
  }

  get shift() {
    return { ...this.#shift };
  }

  #applyShift() {
    const w = this.#width;
    const h = this.#height;
    if (this.#shift.x === 0 && this.#shift.y === 0) this.camera.clearViewOffset();
    else this.camera.setViewOffset(w, h, this.#shift.x * w, this.#shift.y * h, w, h);
    this.camera.updateProjectionMatrix();
  }

  /* ------------------------------------------------------------- picking */

  /** Raycast from a client (screen) position. Returns the closest hit or null. */
  pick(clientX, clientY, root) {
    if (!root) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObject(root, true).filter((h) => h.object.visible);
    return hits[0] ?? null;
  }

  /* ------------------------------------------------------------- cleanup */

  dispose() {
    this.stop();
    this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.controls.dispose();
    this.clearModel();
    this.environment.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.removeAllListeners();
  }
}
