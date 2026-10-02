import { EventEmitter } from '../core/EventEmitter.js';
import { LabelLayer } from '../viewer/LabelLayer.js';
import { icons } from './icons.js';

const STATUS = {
  searching: () => 'Point your camera at the table and move your phone slowly.',
  ready: (name) => `Tap the table to put the ${name} there.`,
  placed: () => 'Shown at real size. Drag to turn it.',
  moving: () => 'Tap to put it down here.',
};

/**
 * The HTML layer shown on top of the camera during WebXR AR (the "DOM
 * overlay"). Holds the status line, controls and component labels.
 *
 * Events: 'close', 'move', 'rotate' (radians)
 */
export class AROverlay extends EventEmitter {
  #productModel = null;
  #labels = null;
  #unsubscribe = null;
  #state = 'idle';

  constructor(root) {
    super();
    this.root = root;
    root.innerHTML = `
      <div class="ar__gesture"></div>
      <div class="ar__labels"></div>
      <div class="ar__top">
        <button class="ar__close icon-button icon-button--glass" type="button" data-ar="close" aria-label="Close AR">${icons.close}</button>
        <p class="ar__status" aria-live="polite"></p>
      </div>
      <div class="ar__toolbar">
        <button class="button button--primary" type="button" data-ar="explode">${icons.layers}<span>Take apart</span></button>
        <button class="button button--glass" type="button" data-ar="move">${icons.move}<span>Move</span></button>
      </div>`;

    this.status = root.querySelector('.ar__status');
    this.explodeBtn = root.querySelector('[data-ar="explode"]');
    this.moveBtn = root.querySelector('[data-ar="move"]');
    this.labelsEl = root.querySelector('.ar__labels');

    // Taps on controls must not also place the dish (WebXR "select").
    for (const el of root.querySelectorAll('button')) {
      el.addEventListener('beforexrselect', (e) => e.preventDefault());
    }
    root.querySelector('[data-ar="close"]').addEventListener('click', () => this.emit('close'));
    this.moveBtn.addEventListener('click', () => this.emit('move'));
    this.explodeBtn.addEventListener('click', () => this.#productModel?.explode.toggle());

    this.#bindRotateGesture(root.querySelector('.ar__gesture'));
  }

  open(productModel) {
    this.#productModel = productModel;
    this.root.hidden = false;
    document.documentElement.classList.add('is-ar');
    this.#labels = new LabelLayer(this.labelsEl, productModel.registry, { onSelect: () => {}, top: 96, bottom: 120 });
    this.#syncExplode(productModel.explode.state);
    this.#unsubscribe = productModel.explode.on('state', (s) => this.#syncExplode(s));
    this.setState('searching');
  }

  close() {
    this.#unsubscribe?.();
    this.#labels?.dispose();
    this.#labels = null;
    this.#productModel = null;
    this.root.hidden = true;
    document.documentElement.classList.remove('is-ar');
  }

  setState(state) {
    this.#state = state;
    const name = this.#productModel?.product.name.toLowerCase() ?? 'dish';
    this.status.textContent = STATUS[state]?.(name) ?? '';
    this.root.dataset.state = state;
    const placed = state === 'placed';
    this.explodeBtn.disabled = !placed || !this.#productModel?.explode.canExplode;
    this.moveBtn.disabled = !placed;
  }

  update(camera) {
    if (this.#labels && this.#state === 'placed') {
      this.#labels.update(camera, this.root.clientWidth, this.root.clientHeight);
    }
  }

  #syncExplode(state) {
    const open = state === 'exploded' || state === 'exploding';
    this.explodeBtn.querySelector('span').textContent = open ? 'Assemble' : 'Take apart';
    this.explodeBtn.setAttribute('aria-pressed', String(open));
  }

  #bindRotateGesture(surface) {
    let lastX = null;
    surface.addEventListener('pointerdown', (e) => (lastX = e.clientX));
    surface.addEventListener('pointermove', (e) => {
      if (lastX === null) return;
      this.emit('rotate', (e.clientX - lastX) * 0.012);
      lastX = e.clientX;
    });
    const stop = () => (lastX = null);
    surface.addEventListener('pointerup', stop);
    surface.addEventListener('pointercancel', stop);
  }
}
