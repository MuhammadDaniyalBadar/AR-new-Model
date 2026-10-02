import { ProductRepository } from '../data/ProductRepository.js';
import { ModelLoader } from '../viewer/ModelLoader.js';
import { DebugPanel } from '../ui/DebugPanel.js';
import { LandingScreen } from '../ui/LandingScreen.js';
import { Toast } from '../ui/Toast.js';
import { ViewerScreen } from '../ui/ViewerScreen.js';
import { Router } from './Router.js';

/**
 * Wires data, routing and screens together. Holds no product logic itself.
 */
export class App {
  constructor(root) {
    this.repo = new ProductRepository();
    this.router = new Router();
    this.toast = new Toast(root.querySelector('#toast'));
    this.debugPanel = this.router.debug ? new DebugPanel() : null;

    this.landingEl = root.querySelector('#screen-menu');
    this.viewerEl = root.querySelector('#screen-viewer');

    this.landing = new LandingScreen(this.landingEl, {
      onOpenProduct: (id) => this.router.openProduct(id),
    });
    this.viewer = new ViewerScreen(this.viewerEl, {
      loader: new ModelLoader(),
      toast: this.toast,
      arOverlayRoot: root.querySelector('#ar-overlay'),
      onBack: () => this.router.showMenu(),
      debugPanel: this.debugPanel,
    });

    this.router.on('change', (route) => this.#route(route));
  }

  start() {
    return this.#route(this.router.current());
  }

  async #route({ productId }) {
    if (!productId) {
      this.viewer.close();
      this.landing.render(await this.repo.list());
      this.#show(this.landingEl);
      return;
    }
    this.#show(this.viewerEl);
    const product = await this.repo.get(productId);
    if (product) this.viewer.open(product);
    else this.viewer.showNotFound(() => this.router.showMenu());
  }

  #show(screen) {
    for (const el of [this.landingEl, this.viewerEl]) el.hidden = el !== screen;
    window.scrollTo(0, 0);
  }
}
