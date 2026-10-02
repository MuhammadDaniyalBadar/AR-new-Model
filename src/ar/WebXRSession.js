import {
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  RingGeometry,
  CircleGeometry,
  Scene,
  Vector3,
  Box3,
} from 'three';
import { EventEmitter } from '../core/EventEmitter.js';
import { animator } from '../core/animator.js';
import { easeOutBack } from '../utils/easing.js';
import { createContactShadow } from '../viewer/contactShadow.js';

/**
 * In-browser AR using WebXR hit-testing (Android Chrome with ARCore).
 *
 * The dish is placed on a real surface at its real-world size, can be
 * turned, moved, and taken apart inside AR (same ProductModel as the
 * 3D viewer, so explode/labels behave identically).
 *
 * States: 'idle' → 'searching' (no surface yet) → 'ready' (tap to place)
 *         → 'placed' ⇄ 'moving' (anchor follows the surface until tapped)
 *
 * Events: 'state', 'frame' (xrCamera), 'end'
 */
export class WebXRSession extends EventEmitter {
  #session = null;
  #hitTestSource = null;
  #state = 'idle';
  #productModel = null;
  #shadow = null;
  #hasPlacedOnce = false;

  /**
   * @param {{renderer: import('three').WebGLRenderer, overlayRoot: HTMLElement, environment?: import('three').Texture}} opts
   */
  constructor({ renderer, overlayRoot, environment }) {
    super();
    this.renderer = renderer;
    this.overlayRoot = overlayRoot;

    this.scene = new Scene();
    this.scene.environment = environment ?? null;
    this.scene.add(new HemisphereLight(0xffffff, 0x445040, 1.0));
    const sun = new DirectionalLight(0xffffff, 1.4);
    sun.position.set(0.5, 1, 0.3);
    this.scene.add(sun);

    this.camera = new PerspectiveCamera(70, 1, 0.01, 20);

    this.reticle = createReticle();
    this.scene.add(this.reticle);

    this.anchor = new Group();
    this.scaler = new Group();
    this.anchor.add(this.scaler);
    this.scene.add(this.anchor);
  }

  get state() {
    return this.#state;
  }

  get active() {
    return !!this.#session;
  }

  /** Must be called from a user gesture (tap). */
  async start(productModel) {
    if (this.#session) return;
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: this.overlayRoot },
    });
    this.#session = session;
    this.#productModel = productModel;
    this.#hasPlacedOnce = false;

    // Borrow the model from the viewer and size it to the real world.
    const scale = productModel.realWorldScale;
    this.scaler.scale.setScalar(scale);
    this.scaler.add(productModel.object);
    const size = productModel.assembledBox.getSize(new Vector3());
    this.#shadow = createContactShadow(size.x * 1.6, size.z * 1.6, 0.9);
    this.scaler.add(this.#shadow);
    this.anchor.visible = false;
    this.anchor.rotation.set(0, 0, 0);

    session.addEventListener('select', this.#onSelect);
    session.addEventListener('end', this.#onEnd);

    try {
      this.renderer.xr.enabled = true;
      this.renderer.xr.setReferenceSpaceType('local');
      await this.renderer.xr.setSession(session);
      const viewerSpace = await session.requestReferenceSpace('viewer');
      this.#hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    } catch (err) {
      session.end().catch(() => {});
      throw err;
    }

    this.renderer.setAnimationLoop(this.#loop);
    this.#setState('searching');
  }

  end() {
    return this.#session?.end().catch(() => {});
  }

  /** Pick the dish up again; it follows the surface until the next tap. */
  move() {
    if (this.#state === 'placed') this.#setState('moving');
  }

  rotateBy(radians) {
    if (this.#state === 'placed') this.anchor.rotation.y += radians;
  }

  /** Bounds of the dish in AR, used to keep labels sensible. */
  get worldBox() {
    return new Box3().setFromObject(this.scaler);
  }

  #loop = (time, frame) => {
    animator.update();
    if (frame && this.#hitTestSource && this.#state !== 'placed') this.#updateHitTest(frame);
    this.renderer.render(this.scene, this.camera);
    const xrCamera = this.renderer.xr.getCamera();
    this.emit('frame', xrCamera.cameras?.[0] ?? xrCamera);
  };

  #updateHitTest(frame) {
    const refSpace = this.renderer.xr.getReferenceSpace();
    const hit = frame.getHitTestResults(this.#hitTestSource)[0];
    const pose = hit?.getPose(refSpace);

    if (pose) {
      this.reticle.visible = this.#state !== 'moving';
      this.reticle.matrix.fromArray(pose.transform.matrix);
      if (this.#state === 'moving') this.anchor.position.setFromMatrixPosition(this.reticle.matrix);
      if (this.#state === 'searching') this.#setState('ready');
    } else {
      this.reticle.visible = false;
      if (this.#state === 'ready') this.#setState('searching');
    }
  }

  #onSelect = () => {
    if (this.#state === 'ready' || this.#state === 'moving') this.#place();
  };

  #place() {
    const position = new Vector3().setFromMatrixPosition(this.reticle.matrix);
    this.anchor.position.copy(position);
    this.reticle.visible = false;

    if (!this.#hasPlacedOnce) {
      // Face the customer on first placement, with a short "set down" motion.
      const cam = new Vector3().setFromMatrixPosition(this.renderer.xr.getCamera().matrixWorld);
      this.anchor.rotation.y = Math.atan2(cam.x - position.x, cam.z - position.z);
      const s = this.#productModel.realWorldScale;
      animator.tween({
        duration: 420,
        easing: easeOutBack,
        onUpdate: (k) => this.scaler.scale.setScalar(s * (0.7 + 0.3 * k)),
      });
      this.#hasPlacedOnce = true;
    }
    this.anchor.visible = true;
    this.#setState('placed');
  }

  #onEnd = () => {
    const session = this.#session;
    session?.removeEventListener('select', this.#onSelect);
    session?.removeEventListener('end', this.#onEnd);
    this.#hitTestSource?.cancel?.();
    this.#hitTestSource = null;
    this.#session = null;

    this.renderer.setAnimationLoop(null);
    this.renderer.xr.enabled = false;

    if (this.#shadow) {
      this.#shadow.removeFromParent();
      this.#shadow.geometry.dispose();
      this.#shadow.material.dispose();
      this.#shadow = null;
    }
    this.scaler.scale.setScalar(1);
    this.#productModel = null;
    this.#setState('idle');
    this.emit('end');
  };

  #setState(state) {
    if (state === this.#state) return;
    this.#state = state;
    this.emit('state', state);
  }
}

function createReticle() {
  const group = new Group();
  const ring = new Mesh(
    new RingGeometry(0.05, 0.058, 48).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 }),
  );
  const fill = new Mesh(
    new CircleGeometry(0.05, 48).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false }),
  );
  group.add(fill, ring);
  group.matrixAutoUpdate = false;
  group.visible = false;
  return group;
}
