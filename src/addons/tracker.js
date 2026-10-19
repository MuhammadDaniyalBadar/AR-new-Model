/**
 * Sends anonymous usage events to the owner dashboard: which dish was
 * opened (from a QR code or from the menu list), how long it was looked at,
 * and whether Take apart, Details or AR were used.
 *
 * No personal data: the session id is random, per browser tab, and is
 * forgotten when the tab closes.
 */
const FLUSH_AFTER_MS = 4000;
const MAX_QUEUE = 20;

const storage = {
  get(key) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* private mode: fine, we just can't remember */
    }
  },
};

function randomId() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 20);
}

export class Tracker {
  #queue = [];
  #timer = null;
  #dwell = null; // { dish, ms, since }
  #dish = null;

  constructor(api, restaurant) {
    this.api = api;
    this.rid = restaurant.id;
    this.restaurant = restaurant;
    this.session = storage.get('addons:session') || randomId();
    storage.set('addons:session', this.session);

    document.addEventListener('visibilitychange', () => {
      // Phones often never fire pagehide, so report the time so far whenever
      // the page is hidden, and keep counting if the customer comes back.
      // The dashboard adds these pieces up per customer and dish.
      if (document.visibilityState === 'hidden') {
        const dish = this.#dwell?.dish;
        this.#endDwell();
        if (dish) this.#startDwell(dish);
        this.flush(true);
      } else {
        this.#resumeDwell();
      }
    });
    window.addEventListener('pagehide', () => {
      this.#endDwell();
      this.flush(true);
    });
  }

  /** Called on every navigation. first = the page was just opened (QR scan, link or refresh). */
  route(dish, { first }) {
    this.#endDwell();
    this.#dish = dish;
    if (!dish) {
      this.#push('menu', null);
      return;
    }
    // A refresh of the same page is not a new scan.
    const here = `${location.pathname}${location.search}`;
    const reload = first && storage.get('addons:last-url') === here;
    storage.set('addons:last-url', here);
    if (!reload) this.#push('view', dish, { source: first ? 'qr' : 'menu' });
    this.#startDwell(dish);
  }

  action(type) {
    if (this.#dish) this.#push(type, this.#dish);
  }

  /** Tell the dashboard the dish names, once per tab, so they always match the menu. */
  sendCatalog() {
    if (storage.get('addons:catalog') === '1') return;
    storage.set('addons:catalog', '1');
    const dishes = this.restaurant.products.map((p) => ({ id: p.id, name: p.name, category: p.category ?? null }));
    this.#post('/api/catalog', { restaurant: this.rid, dishes });
  }

  flush(leaving = false) {
    clearTimeout(this.#timer);
    this.#timer = null;
    if (!this.#queue.length) return;
    const events = this.#queue.splice(0, this.#queue.length);
    this.#post('/api/events', { restaurant: this.rid, session: this.session, events }, leaving);
  }

  #push(type, dish, extra = {}) {
    this.#queue.push({ type, dish, ts: Math.round(Date.now() / 1000), ...extra });
    if (this.#queue.length >= MAX_QUEUE) this.flush();
    else if (!this.#timer) this.#timer = setTimeout(() => this.flush(), FLUSH_AFTER_MS);
  }

  #post(path, body, leaving = false) {
    // text/plain keeps this a "simple" request: no CORS preflight, and sendBeacon allows it.
    const payload = JSON.stringify(body);
    const url = this.api + path;
    try {
      if (leaving && navigator.sendBeacon?.(url, new Blob([payload], { type: 'text/plain' }))) return;
      fetch(url, { method: 'POST', body: payload, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
    } catch {
      /* offline or blocked: the menu keeps working */
    }
  }

  /* ---- time spent on a dish, counting only while the page is visible */

  #startDwell(dish) {
    this.#dwell = { dish, ms: 0, since: document.visibilityState === 'visible' ? performance.now() : null };
  }

  #pauseDwell() {
    const d = this.#dwell;
    if (d?.since != null) {
      d.ms += performance.now() - d.since;
      d.since = null;
    }
  }

  #resumeDwell() {
    if (this.#dwell && this.#dwell.since == null) this.#dwell.since = performance.now();
  }

  #endDwell() {
    if (!this.#dwell) return;
    this.#pauseDwell();
    const seconds = Math.round(this.#dwell.ms / 100) / 10;
    if (seconds >= 1) this.#push('time', this.#dwell.dish, { value: seconds });
    this.#dwell = null;
  }
}
