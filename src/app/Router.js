import { APP_CONFIG } from '../config/app.config.js';
import { EventEmitter } from '../core/EventEmitter.js';

/**
 * URL-driven navigation. The URL is the source of truth, so a QR code
 * (?product=burger-01), a shared link, a refresh and the browser back
 * button all land in the same place.
 *
 * Events: 'change' ({productId})
 */
export class Router extends EventEmitter {
  constructor() {
    super();
    window.addEventListener('popstate', () => this.emit('change', this.current()));
  }

  current() {
    const params = new URLSearchParams(window.location.search);
    return { productId: params.get(APP_CONFIG.routing.productParam) };
  }

  get debug() {
    return new URLSearchParams(window.location.search).has(APP_CONFIG.routing.debugParam);
  }

  openProduct(productId) {
    const url = new URL(window.location.href);
    url.searchParams.set(APP_CONFIG.routing.productParam, productId);
    history.pushState({ fromMenu: true }, '', url);
    this.emit('change', this.current());
  }

  showMenu() {
    // If we came from the menu, go back so the history stays tidy.
    if (history.state?.fromMenu) {
      history.back();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete(APP_CONFIG.routing.productParam);
    history.replaceState(null, '', url);
    this.emit('change', this.current());
  }
}
