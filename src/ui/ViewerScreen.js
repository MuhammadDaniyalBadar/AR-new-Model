import { ARManager } from '../ar/ARManager.js';
import { esc, html } from '../utils/dom.js';
import { formatPrice } from '../utils/format.js';
import { LabelLayer } from '../viewer/LabelLayer.js';
import { ModelLoadError } from '../viewer/ModelLoader.js';
import { ProductModel } from '../viewer/ProductModel.js';
import { TapPicker } from '../viewer/TapPicker.js';
import { Viewer3D, isWebGLAvailable } from '../viewer/Viewer3D.js';
import { AROverlay } from './AROverlay.js';
import { BottomSheet } from './BottomSheet.js';
import { icons } from './icons.js';
import { arHelpSheet, componentSheet, productSheet } from './sheets.js';

const isTouch = () => window.matchMedia('(pointer: coarse)').matches;

/**
 * The product page: 3D stage, labels, toolbar, details sheet and AR entry.
 * One instance is reused for every product; open(product) swaps content.
 */
export class ViewerScreen {
  #product = null;
  #pm = null;
  #labels = null;
  #selectedIndex = -1;
  #loadToken = 0;
  #unsubscribers = [];
  #hintStage = 0; // 0 = how to interact, 1 = tap a part, 2 = done

  /**
   * @param {HTMLElement} root
   * @param {{loader, toast, arOverlayRoot: HTMLElement, onBack: ()=>void, debugPanel?}} deps
   */
  constructor(root, { loader, toast, arOverlayRoot, onBack, debugPanel }) {
    this.debug = !!debugPanel;
    this.root = root;
    this.loader = loader;
    this.toast = toast;
    this.debugPanel = debugPanel;

    root.innerHTML = `
      <header class="topbar">
        <button class="icon-button" type="button" data-action="back" aria-label="Back to the menu">${icons.back}</button>
        <div class="topbar__title">
          <h1 class="topbar__name"></h1>
          <p class="topbar__price"></p>
        </div>
      </header>
      <main class="stage" aria-label="3D view of the dish">
        <div class="stage__canvas-host"></div>
        <div class="stage__labels"></div>
        <button class="icon-button icon-button--plate stage__reset" type="button" data-action="reset" aria-label="Reset view">${icons.reset}</button>
        <p class="stage__hint" aria-live="polite"></p>
        <div class="stage__status" hidden></div>
      </main>
      <nav class="toolbar" aria-label="Dish actions">
        <button class="button button--primary" type="button" data-action="explode" aria-pressed="false">${icons.layers}<span>Take apart</span></button>
        <button class="button button--ghost" type="button" data-action="details">${icons.info}<span>Details</span></button>
        <button class="button button--ink" type="button" data-action="ar">${icons.ar}<span>View in AR</span></button>
      </nav>
      <aside class="viewer__sheet"></aside>`;

    this.el = {
      name: root.querySelector('.topbar__name'),
      price: root.querySelector('.topbar__price'),
      stage: root.querySelector('.stage'),
      host: root.querySelector('.stage__canvas-host'),
      labels: root.querySelector('.stage__labels'),
      hint: root.querySelector('.stage__hint'),
      status: root.querySelector('.stage__status'),
      explode: root.querySelector('[data-action="explode"]'),
      details: root.querySelector('[data-action="details"]'),
      ar: root.querySelector('[data-action="ar"]'),
      reset: root.querySelector('[data-action="reset"]'),
    };

    this.sheet = new BottomSheet(root.querySelector('.viewer__sheet'));
    this.sheet.on('open', () => this.#onSheetChange());
    this.sheet.on('resize', () => this.#onSheetChange());
    this.sheet.on('close', () => {
      this.#clearSelection();
      this.#onSheetChange();
    });

    root.querySelector('[data-action="back"]').addEventListener('click', onBack);
    this.el.explode.addEventListener('click', () => this.#toggleExplode());
    this.el.details.addEventListener('click', () => this.#showProductDetails());
    this.el.ar.addEventListener('click', () => this.#enterAR());
    this.el.reset.addEventListener('click', () => this.#resetView());

    this.webgl = isWebGLAvailable();
    if (this.webgl) this.#initViewer(arOverlayRoot);
  }

  #initViewer(arOverlayRoot) {
    this.viewer = new Viewer3D(this.el.host);
    this.viewer.on('render', () => this.#updateLabels());
    this.viewer.on('interaction', () => this.#advanceHint(0));
    this.picker = new TapPicker(this.viewer.renderer.domElement, (x, y) => this.#onTap(x, y));

    this.arOverlay = new AROverlay(arOverlayRoot);
    this.ar = new ARManager({ viewer: this.viewer, overlay: this.arOverlay });
    this.ar.detect().then(() => this.debugPanel?.setARMode(this.ar.capability));
    this.ar.on('exit', () => {
      this.#labels?.measure();
      this.#frameCurrent(false);
    });

    window.addEventListener('resize', () => {
      this.#labels?.measure();
      this.#applyShift(false);
    });
  }

  /* ---------------------------------------------------------------- open */

  async open(product) {
    this.close();
    const token = ++this.#loadToken;
    this.#product = product;
    this.el.name.textContent = product.name;
    this.el.price.textContent = formatPrice(product.price);
    document.title = product.name;
    this.#setControlsEnabled(false);
    this.el.details.disabled = false;

    if (!this.webgl) {
      this.#showStatus('error', {
        title: 'This browser can’t show 3D',
        text: 'Open this page in an up-to-date Chrome or Safari. You can still read about the dish under Details.',
      });
      return;
    }

    this.#showStatus('loading', { text: `Loading the ${product.name.toLowerCase()}`, progress: null });
    let scene;
    try {
      scene = await this.loader.load(product.model.src, (f) => {
        if (token === this.#loadToken) this.#setProgress(f);
      });
    } catch (err) {
      if (token !== this.#loadToken) return;
      console.error(err);
      const missing = err instanceof ModelLoadError && /404/.test(String(err.cause?.message ?? err.cause));
      this.#showStatus('error', {
        title: 'The 3D model didn’t load',
        text: missing
          ? 'The model file for this dish is missing. Please let the staff know.'
          : 'Check your connection, then try again.',
        retry: () => this.open(product),
      });
      return;
    }
    if (token !== this.#loadToken) return; // user moved on while loading

    this.#attach(new ProductModel(product, scene));
  }

  #attach(pm) {
    this.#pm = pm;
    if (this.debug) this.productModel = pm;
    this.viewer.setProductModel(pm);
    this.viewer.autoRotateAllowed = true;
    this.#labels = new LabelLayer(this.el.labels, pm.registry, { onSelect: (e) => this.#select(e.index), top: 64 });
    document.fonts?.ready.then(() => this.#labels?.measure());

    this.#unsubscribers.push(pm.explode.on('state', (s) => this.#onExplodeState(s)));
    this.#hideStatus();
    this.#setControlsEnabled(true);
    this.el.explode.disabled = !pm.explode.canExplode;
    this.#syncExplodeButton('assembled');
    this.#hintStage = 0;
    this.#showHint();
    this.ar.prepare(pm);
    this.debugPanel?.setModel(pm, this.viewer);
  }

  close() {
    this.#loadToken++;
    this.sheet.close();
    this.#unsubscribers.forEach((off) => off());
    this.#unsubscribers = [];
    this.#labels?.dispose();
    this.#labels = null;
    if (this.#pm) {
      this.viewer?.clearModel();
      this.#pm.dispose();
      this.#pm = null;
    }
    if (this.viewer) {
      this.viewer.autoRotateAllowed = false;
      this.viewer.setShift(0, 0, false);
    }
    this.#selectedIndex = -1;
    this.el.hint.classList.remove('is-visible');
  }

  /* ------------------------------------------------------------ explode */

  #toggleExplode() {
    if (!this.#pm) return;
    this.viewer.noteInteraction();
    this.#pm.explode.toggle();
  }

  #onExplodeState(state) {
    this.#syncExplodeButton(state);
    if (state === 'exploding') {
      this.viewer.autoRotateAllowed = false;
      this.#applyShift();
      this.#frameCurrent();
      this.#advanceHint(0);
    } else if (state === 'collapsing') {
      if (this.sheet.kind === 'component') this.sheet.close();
      this.#applyShift();
      this.#frameCurrent();
    } else if (state === 'assembled') {
      this.viewer.autoRotateAllowed = !this.sheet.isOpen;
    }
  }

  #syncExplodeButton(state) {
    const open = state === 'exploded' || state === 'exploding';
    this.el.explode.querySelector('span').textContent = open ? 'Assemble' : 'Take apart';
    this.el.explode.setAttribute('aria-pressed', String(open));
  }

  /* ---------------------------------------------------------- selection */

  #onTap(x, y) {
    const pm = this.#pm;
    if (!pm) return;
    this.viewer.noteInteraction();
    const hit = this.viewer.pick(x, y, pm.object);
    if (!hit) {
      if (this.sheet.kind === 'component') this.sheet.close();
      return;
    }
    if (!pm.explode.isOpen && pm.explode.canExplode) {
      pm.explode.explode();
      return;
    }
    const entry = pm.registry.entryForObject(hit.object);
    if (entry) this.#select(entry.index);
  }

  /** Show one component (by its index in product.components). */
  #select(index) {
    const components = this.#product?.components ?? [];
    const def = components[index];
    if (!def) return;
    this.#selectedIndex = index;

    const entry = this.#pm?.registry.entries[index] ?? null;
    if (entry && this.#pm) {
      if (!this.#pm.explode.isOpen && this.#pm.explode.canExplode) this.#pm.explode.explode();
      this.#pm.focus.focus(entry.nodes.length ? entry : null);
      this.#labels?.setSelected(entry);
      this.viewer.autoRotateAllowed = false;
      this.viewer.noteInteraction();
    }
    this.#advanceHint(1);

    this.sheet.open(
      componentSheet(def, {
        index,
        total: components.length,
        onPrev: () => this.#select(index - 1),
        onNext: () => this.#select(index + 1),
      }),
      { kind: 'component', label: def.name },
    );
  }

  #clearSelection() {
    this.#selectedIndex = -1;
    this.#pm?.focus.focus(null);
    this.#labels?.setSelected(null);
    if (this.#pm && !this.#pm.explode.isOpen && this.viewer) this.viewer.autoRotateAllowed = true;
  }

  #showProductDetails() {
    if (!this.#product) return;
    this.#clearSelection();
    this.sheet.open(productSheet(this.#product, (i) => this.#select(i)), {
      kind: 'product',
      label: `About the ${this.#product.name}`,
    });
  }

  /* --------------------------------------------------------- AR + view */

  #enterAR() {
    if (!this.#pm) return;
    this.viewer.noteInteraction();
    if (this.ar.mode === 'none') {
      this.sheet.open(arHelpSheet(this.ar.capability.reason), { kind: 'ar-help', label: 'About AR' });
      return;
    }
    this.sheet.close();
    // ar.enter() must run synchronously in this tap handler.
    this.ar.enter(this.#pm).then((result) => {
      if (result.status === 'preparing') this.toast.show('Getting AR ready. Tap View in AR again in a moment.');
      if (result.status === 'error') this.toast.show('AR couldn’t start on this phone. You can still explore the dish here.');
    });
  }

  #resetView() {
    this.viewer?.noteInteraction();
    if (!this.#pm) return;
    const box = this.#pm.explode.isOpen ? this.#pm.explodedBox : this.#pm.assembledBox;
    this.viewer.resetView(box);
  }

  #frameCurrent(animate = true) {
    if (!this.#pm) return;
    const box = this.#pm.explode.isOpen ? this.#pm.explodedBox : this.#pm.assembledBox;
    this.viewer.frame(box, { animate });
  }

  /** Move the model aside for labels (right) and the sheet (bottom). */
  #applyShift(animate = true) {
    if (!this.viewer) return;
    const { width, height } = this.viewer.size;
    const labelsShown = this.#pm?.explode.isOpen && this.#labels;
    const labelShift = labelsShown ? (width < 600 ? 0.17 : 0.12) : 0;

    const stageRect = this.el.stage.getBoundingClientRect();
    const sheetTop = this.sheet.isOpen ? window.innerHeight - this.sheet.height : Infinity;
    const covered = Math.max(0, stageRect.bottom - sheetTop);
    const sheetShift = height ? Math.min(0.3, covered / 2 / height) : 0;

    if (this.#labels) this.#labels.bottom = 12 + covered;
    this.viewer.setShift(labelShift, sheetShift, animate);
  }

  #onSheetChange() {
    this.#applyShift();
    this.#frameCurrent();
    if (this.sheet.isOpen && this.viewer) this.viewer.autoRotateAllowed = false;
  }

  #updateLabels() {
    if (!this.#labels || !this.viewer) return;
    const { width, height } = this.viewer.size;
    this.#labels.update(this.viewer.camera, width, height);
  }

  /* ------------------------------------------------------------- status */

  #setControlsEnabled(enabled) {
    for (const key of ['explode', 'ar', 'reset']) this.el[key].disabled = !enabled;
  }

  #showStatus(kind, { title, text, progress, retry }) {
    const s = this.el.status;
    s.hidden = false;
    s.className = `stage__status status status--${kind}`;
    if (kind === 'loading') {
      s.innerHTML = `
        <div class="status__bar${progress == null ? ' is-indeterminate' : ''}" role="progressbar" aria-label="Loading 3D model">
          <span></span>
        </div>
        <p class="status__text">${esc(text)}</p>`;
    } else {
      s.replaceChildren(
        html(`<div class="status__box">
          <h2 class="status__title">${esc(title)}</h2>
          <p class="status__text">${esc(text)}</p>
          ${retry ? '<button class="button button--ink" type="button" data-retry>Try again</button>' : ''}
        </div>`),
      );
      s.querySelector('[data-retry]')?.addEventListener('click', retry);
    }
  }

  #setProgress(fraction) {
    const bar = this.el.status.querySelector('.status__bar');
    if (!bar) return;
    if (fraction == null) return;
    bar.classList.remove('is-indeterminate');
    bar.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
    bar.querySelector('span').style.transform = `scaleX(${fraction})`;
  }

  #hideStatus() {
    this.el.status.hidden = true;
    this.el.status.replaceChildren();
  }

  /** Product not in the data at all (e.g. an old QR code). */
  showNotFound(onShowMenu) {
    this.close();
    this.#product = null;
    this.el.name.textContent = 'Dish not found';
    this.el.price.textContent = '';
    this.#setControlsEnabled(false);
    this.el.details.disabled = true;
    this.#showStatus('error', {
      title: 'This dish isn’t on the 3D menu',
      text: 'The link may be out of date. You can pick a dish from the menu instead.',
    });
    const btn = html('<button class="button button--ink" type="button">See the menu</button>');
    btn.addEventListener('click', onShowMenu);
    this.el.status.querySelector('.status__box').appendChild(btn);
  }

  /* --------------------------------------------------------------- hints */

  #showHint() {
    const hints = [
      isTouch() ? 'Drag to turn it. Pinch to zoom. Tap the dish to take it apart.' : 'Drag to turn it. Scroll to zoom. Click the dish to take it apart.',
      isTouch() ? 'Tap any part to see what’s in it.' : 'Click any part to see what’s in it.',
    ];
    const text = hints[this.#hintStage];
    this.el.hint.classList.toggle('is-visible', !!text);
    if (text) this.el.hint.textContent = text;
  }

  /** Move past hint `stage` once the user has done what it described. */
  #advanceHint(stage) {
    if (this.#hintStage !== stage) return;
    if (stage === 0 && !this.#pm?.explode.isOpen) {
      // They have turned it; keep the hint until they take it apart, but quieter.
      this.el.hint.classList.add('is-quiet');
      return;
    }
    this.#hintStage = stage + 1;
    this.el.hint.classList.remove('is-quiet');
    this.#showHint();
  }
}
