/**
 * Shows what the owner sets in the dashboard: badges on dishes, a
 * "Not available today" tag, and a promo banner. Everything is added next
 * to the existing screens; nothing existing is changed or hidden.
 */
import { esc } from '../utils/dom.js';

const CACHE_KEY = (rid) => `addons:config:${rid}`;

export class Promos {
  #config = null;
  #dish = null;
  #stageTop = null;

  constructor(api, restaurant, { screenMenu, screenViewer, openProduct }) {
    this.api = api;
    this.rid = restaurant.id;
    this.names = new Map(restaurant.products.map((p) => [p.id, p.name]));
    this.menu = screenMenu;
    this.viewer = screenViewer;
    this.openProduct = openProduct;

    // The menu list is re-rendered with innerHTML, which replaces the direct
    // child of #screen-menu. Watching only that level never sees our own additions.
    new MutationObserver(() => this.#decorateMenu()).observe(this.menu, { childList: true });

    this.viewer.addEventListener('click', (e) => this.#onClick(e));
    this.menu.addEventListener('click', (e) => this.#onClick(e));
  }

  async load() {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY(this.rid));
      if (cached) this.#apply(JSON.parse(cached));
    } catch {
      /* no cache */
    }
    try {
      const res = await fetch(`${this.api}/api/config/${encodeURIComponent(this.rid)}`);
      if (!res.ok) return;
      const config = await res.json();
      try {
        sessionStorage.setItem(CACHE_KEY(this.rid), JSON.stringify(config));
      } catch {
        /* fine */
      }
      this.#apply(config);
    } catch {
      /* dashboard unreachable: the menu simply shows no badges */
    }
  }

  route(dish) {
    this.#dish = dish;
    this.#decorateViewer();
  }

  #apply(config) {
    this.#config = config;
    this.#decorateMenu();
    this.#decorateViewer();
  }

  /* ------------------------------------------------------------- helpers */

  #info(dish) {
    return this.#config?.dishes?.[dish] ?? { badges: [], unavailable: false };
  }

  #badgesHtml(dish) {
    const { badges = [], unavailable } = this.#info(dish);
    const labels = this.#config?.badges ?? {};
    const chips = badges.filter((b) => labels[b]).map((b) => `<span class="addon-chip addon-chip--${esc(b)}">${esc(labels[b])}</span>`);
    if (unavailable) chips.push('<span class="addon-chip addon-chip--out">Not available today</span>');
    return chips.join('');
  }

  #banner(currentDish) {
    const b = this.#config?.banner;
    if (!b?.text) return '';
    try {
      if (sessionStorage.getItem(`addons:dismissed:${this.rid}`) === b.text) return '';
    } catch {
      /* fine */
    }
    const opens = b.dish && b.dish !== currentDish && this.names.has(b.dish);
    const inner = `<span class="addon-banner__text">${esc(b.text)}</span>${opens ? '<span class="addon-banner__go" aria-hidden="true">›</span>' : ''}`;
    return `
      <div class="addon-banner" role="note">
        ${
          opens
            ? `<button type="button" class="addon-banner__main" data-addon-open="${esc(b.dish)}" aria-label="${esc(b.text)}: see ${esc(this.names.get(b.dish))}">${inner}</button>`
            : `<div class="addon-banner__main">${inner}</div>`
        }
        <button type="button" class="addon-banner__close" data-addon-dismiss aria-label="Hide this message">×</button>
      </div>`;
  }

  #onClick(e) {
    const open = e.target.closest('[data-addon-open]');
    if (open) {
      this.openProduct(open.dataset.addonOpen);
      return;
    }
    if (e.target.closest('[data-addon-dismiss]')) {
      try {
        sessionStorage.setItem(`addons:dismissed:${this.rid}`, this.#config?.banner?.text ?? '');
      } catch {
        /* fine */
      }
      document.querySelectorAll('.addon-banner').forEach((el) => el.remove());
    }
  }

  /* ---------------------------------------------------------- menu list */

  #decorateMenu() {
    const menu = this.menu.querySelector('.menu');
    if (!menu || !this.#config) return;

    menu.querySelector('.addon-banner')?.remove();
    const banner = this.#banner(null);
    if (banner) menu.querySelector('.menu__header')?.insertAdjacentHTML('afterend', banner);

    for (const btn of menu.querySelectorAll('.dish [data-product]')) {
      const item = btn.closest('.dish');
      item.querySelector('.addon-chips')?.remove();
      const html = this.#badgesHtml(btn.dataset.product);
      item.classList.toggle('addon-unavailable', this.#info(btn.dataset.product).unavailable === true);
      if (html) item.querySelector('.dish__text')?.insertAdjacentHTML('afterbegin', `<div class="addon-chips">${html}</div>`);
    }
  }

  /* -------------------------------------------------------- dish screen */

  #decorateViewer() {
    const stage = this.viewer.querySelector('.stage');
    if (!stage) return;
    if (!this.#stageTop) {
      this.#stageTop = document.createElement('div');
      this.#stageTop.className = 'addon-stage-top';
      stage.appendChild(this.#stageTop);
    }
    const dish = this.#dish;
    const chips = dish && this.#config ? this.#badgesHtml(dish) : '';
    const banner = dish && this.#config ? this.#banner(dish) : '';
    this.#stageTop.innerHTML = `${chips ? `<div class="addon-chips">${chips}</div>` : ''}${banner}`;
    this.#stageTop.hidden = !chips && !banner;
  }
}
