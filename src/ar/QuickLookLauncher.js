import { APP_CONFIG } from '../config/app.config.js';
import { Group } from 'three';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';

/**
 * iOS AR Quick Look. Uses the product's own USDZ if supplied (model.iosSrc),
 * otherwise converts the loaded GLB to USDZ in the browser, at real-world
 * size, so no extra asset work is needed.
 *
 * Safari only opens Quick Look from a direct tap, so the USDZ is prepared
 * in the background as soon as a product loads, and launch() is synchronous.
 */
export class QuickLookLauncher {
  #urls = new Map(); // productId -> url
  #pending = new Map(); // productId -> Promise<url>

  /** Start preparing the USDZ. Safe to call repeatedly. */
  prepare(productModel) {
    const { product } = productModel;
    if (product.model.iosSrc) {
      this.#urls.set(product.id, product.model.iosSrc);
      return Promise.resolve(product.model.iosSrc);
    }
    if (this.#urls.has(product.id)) return Promise.resolve(this.#urls.get(product.id));
    if (this.#pending.has(product.id)) return this.#pending.get(product.id);

    // Snapshot the assembled model now; the user may take it apart before export finishes.
    const wrapper = new Group();
    wrapper.scale.setScalar(productModel.realWorldScale);
    const clone = productModel.object.clone(true);
    clone.traverse((o) => {
      if (o.name === '__contact_shadow') o.visible = false;
    });
    productModel.registry.entries.forEach((entry) => {
      entry.nodes.forEach((node, i) => {
        const twin = findTwin(clone, productModel.object, node);
        twin?.position.copy(entry.basePositions[i]);
      });
    });
    wrapper.add(clone);
    wrapper.updateMatrixWorld(true);

    const job = new USDZExporter()
      .parseAsync(wrapper, { quickLookCompatible: true })
      .then((data) => {
        const url = URL.createObjectURL(new Blob([data], { type: 'model/vnd.usdz+zip' }));
        this.#urls.set(product.id, url);
        this.#pending.delete(product.id);
        return url;
      })
      .catch((err) => {
        this.#pending.delete(product.id);
        throw err;
      });
    this.#pending.set(product.id, job);
    return job;
  }

  isReady(productId) {
    return this.#urls.has(productId);
  }

  /** Must be called directly inside a tap handler. */
  launch(product) {
    const url = this.#urls.get(product.id);
    if (!url) return false;
    const a = document.createElement('a');
    a.rel = 'ar';
    // Quick Look always opens at real size; this decides whether pinching can
    // resize it (Quick Look shows the % and snaps back to 100% on its own).
    a.href = `${url}#allowsContentScaling=${APP_CONFIG.ar.resizable ? 1 : 0}`;
    a.appendChild(document.createElement('img'));
    a.click();
    return true;
  }
}

/** Clones get new ids, so find the same node by walking the identical tree path. */
function findTwin(cloneRoot, originalRoot, node) {
  const path = [];
  let o = node;
  while (o && o !== originalRoot) {
    path.unshift(o.parent.children.indexOf(o));
    o = o.parent;
  }
  let twin = cloneRoot;
  for (const i of path) twin = twin?.children[i];
  return twin;
}
