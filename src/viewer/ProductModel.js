import { Box3, Group, Vector3 } from 'three';
import { APP_CONFIG } from '../config/app.config.js';
import { prefersReducedMotion } from '../utils/dom.js';
import { ComponentRegistry } from './ComponentRegistry.js';
import { ExplodeController } from './ExplodeController.js';
import { FocusController } from './FocusController.js';
import { disposeObject } from './ModelLoader.js';

/**
 * A loaded product, ready to show: the 3D object plus its component
 * registry, explode and focus controllers. The same instance moves between
 * the 3D viewer and the AR session, so state (e.g. exploded) carries over.
 */
export class ProductModel {
  /**
   * @param {object} product  product data
   * @param {import('three').Group} gltfScene
   */
  constructor(product, gltfScene) {
    this.product = product;
    this.scene = gltfScene;

    // Wrapper whose origin is the bottom centre of the dish.
    this.object = new Group();
    this.object.name = `product:${product.id}`;
    this.object.add(gltfScene);
    const raw = new Box3().setFromObject(gltfScene, true);
    const c = raw.getCenter(new Vector3());
    gltfScene.position.sub(new Vector3(c.x, raw.min.y, c.z));
    this.object.updateMatrixWorld(true);

    const explodeDefaults = APP_CONFIG.explode;
    this.registry = new ComponentRegistry(gltfScene, product, { autoGap: explodeDefaults.autoGap });
    this.explode = new ExplodeController(this.registry, {
      duration: product.explode?.duration ?? explodeDefaults.duration,
      stagger: product.explode?.stagger ?? explodeDefaults.stagger,
      reducedMotion: prefersReducedMotion(),
    });
    this.focus = new FocusController(this.registry);

    this.assembledBox = this.#boundsAt(0);
    this.explodedBox = this.#boundsAt(1);
    this.realWorldScale = this.#computeRealWorldScale();

    if (this.registry.missingNodes.length) {
      console.warn(
        `[${product.id}] These nodes are listed in the product file but missing from ${product.model.src}:`,
        this.registry.missingNodes.map((m) => `${m.componentId} → "${m.nodeName}"`),
      );
    }
  }

  /** Bounds in this.object's space with every component at progress p. */
  #boundsAt(p) {
    const box = this.registry.boundsAt(p);
    // registry bounds are in glTF-scene space; shift into wrapper space
    return box.translate(this.scene.position);
  }

  /**
   * Scale factor that makes the model match the restaurant-supplied size in
   * meters (SOW §7.6). Height is preferred because it is unambiguous; with
   * no dimensions we assume the GLB was authored in meters.
   */
  #computeRealWorldScale() {
    const d = this.product.dimensions ?? {};
    const size = this.assembledBox.getSize(new Vector3());
    if (Number.isFinite(d.heightCm) && size.y > 0) return d.heightCm / 100 / size.y;
    const footprint = Math.max(size.x, size.z);
    const supplied = Math.max(d.widthCm ?? 0, d.depthCm ?? 0);
    if (supplied > 0 && footprint > 0) return supplied / 100 / footprint;
    return 1;
  }

  dispose() {
    this.explode.removeAllListeners();
    this.object.removeFromParent();
    disposeObject(this.object);
  }
}
