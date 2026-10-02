import { APP_CONFIG } from '../config/app.config.js';
import { esc } from '../utils/dom.js';
import { formatPrice } from '../utils/format.js';
import { icons } from './icons.js';

/**
 * Temporary entry point for the prototype (SOW §9): stands in for the QR
 * codes on the printed menu. In production, each QR code opens
 * ?product=<id> directly and customers never see this list.
 */
export class LandingScreen {
  constructor(root, { onOpenProduct }) {
    this.root = root;
    this.onOpenProduct = onOpenProduct;
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-product]');
      if (btn) this.onOpenProduct(btn.dataset.product);
    });
  }

  render(products) {
    document.title = APP_CONFIG.restaurantName;
    this.root.innerHTML = `
      <div class="menu">
        <header class="menu__header">
          <h1 class="menu__title">${esc(APP_CONFIG.restaurantName)}</h1>
          <p class="menu__intro">See a dish in 3D before you order. Take it apart to see every layer, or put it on your table in AR.</p>
        </header>
        <ul class="menu__list">
          ${products
            .map(
              (p) => `
            <li class="dish">
              <div class="dish__text">
                <h2 class="dish__name">${esc(p.name)}</h2>
                ${p.summary ? `<p class="dish__summary">${esc(p.summary)}</p>` : ''}
              </div>
              <p class="dish__price">${esc(formatPrice(p.price))}</p>
              <button class="button button--outline dish__cta" type="button" data-product="${esc(p.id)}">
                ${icons.cube}<span>View in 3D</span>
              </button>
            </li>`,
            )
            .join('')}
        </ul>
      </div>`;
  }
}
