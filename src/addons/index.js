/**
 * Owner add-ons: usage tracking for the owner dashboard, plus badges,
 * "not available today" and the promo banner managed from it.
 *
 * Fully optional. Without VITE_OWNER_API (set per Netlify site, e.g.
 * https://yourname.pythonanywhere.com) nothing here runs and the menu
 * behaves exactly as before. Nothing in this folder changes the 3D viewer,
 * Take apart, labels or AR; it only listens and adds small elements.
 */
import restaurant from '@restaurant';
import { Promos } from './promos.js';
import { Tracker } from './tracker.js';
import './addons.css';

const API = String(import.meta.env.VITE_OWNER_API || '').replace(/\/+$/, '');

export function startAddons(app) {
  if (!API) return;
  try {
    const known = new Set(restaurant.products.map((p) => p.id));
    const tracker = new Tracker(API, restaurant);
    const promos = new Promos(API, restaurant, {
      screenMenu: document.querySelector('#screen-menu'),
      screenViewer: document.querySelector('#screen-viewer'),
      openProduct: (id) => app.router.openProduct(id),
    });

    tracker.sendCatalog();
    promos.load();

    let first = true;
    const onRoute = ({ productId }) => {
      const dish = productId && known.has(productId) ? productId : null;
      tracker.route(dish, { first });
      promos.route(dish);
      first = false;
    };
    onRoute(app.router.current());
    app.router.on('change', onRoute);

    // Listen to the existing toolbar buttons without touching them. Capture
    // phase, so "Take apart" is read before the viewer flips it to "Assemble".
    document.addEventListener(
      'click',
      (e) => {
        const btn = e.target.closest?.('#screen-viewer [data-action]');
        if (!btn || btn.disabled) return;
        const action = btn.dataset.action;
        if (action === 'explode' && btn.getAttribute('aria-pressed') !== 'true') tracker.action('explode');
        else if (action === 'details' || action === 'ar') tracker.action(action);
      },
      true,
    );
  } catch (err) {
    // An add-on must never break the menu.
    console.warn('[owner add-ons] disabled:', err);
  }
}
