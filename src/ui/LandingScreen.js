import restaurant from '@restaurant';
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
    document.title = restaurant.name;
    const groups = restaurant.categories?.length
      ? restaurant.categories
          .map((c) => ({ ...c, items: products.filter((p) => p.category === c.id) }))
          .filter((g) => g.items.length)
      : [{ id: 'all', name: null, items: products }];

    this.root.innerHTML = `
      <div class="menu">
        <header class="menu__header">
          ${
            restaurant.logo
              ? `<img class="menu__logo" src="${esc(restaurant.logo)}" alt="${esc(restaurant.name)}" />`
              : `<h1 class="menu__title">${esc(restaurant.name)}</h1>`
          }
          ${restaurant.intro ? `<p class="menu__intro">${esc(restaurant.intro)}</p>` : ''}
        </header>
        ${groups
          .map(
            (g) => `
          <section class="menu__group">
            ${g.name ? `<h2 class="menu__group-title">${esc(g.name)}</h2>` : ''}
            <ul class="menu__list">${g.items.map(dish).join('')}</ul>
          </section>`,
          )
          .join('')}
      </div>`;
  }
}

function dish(p) {
  const price = formatPrice(p.price);
  return `
    <li class="dish">
      <div class="dish__text">
        <h3 class="dish__name">${esc(p.name)}</h3>
        ${p.summary ? `<p class="dish__summary">${esc(p.summary)}</p>` : ''}
      </div>
      ${price ? `<p class="dish__price">${esc(price)}</p>` : '<span></span>'}
      <button class="button button--outline dish__cta" type="button" data-product="${esc(p.id)}">
        ${icons.cube}<span>View in 3D</span>
      </button>
    </li>`;
}
