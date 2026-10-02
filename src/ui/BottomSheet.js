import { EventEmitter } from '../core/EventEmitter.js';
import { icons } from './icons.js';

/**
 * Non-modal bottom sheet: the 3D stage stays usable above it.
 * Swipe the handle down (or press Escape) to close.
 *
 * Events: 'open', 'close', 'resize'
 */
export class BottomSheet extends EventEmitter {
  #open = false;
  #kind = null;
  #returnFocus = null;

  constructor(root) {
    super();
    this.root = root;
    root.classList.add('sheet');
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Details');
    root.innerHTML = `
      <div class="sheet__grip" aria-hidden="true"><span></span></div>
      <button class="sheet__close icon-button" type="button" aria-label="Close">${icons.close}</button>
      <div class="sheet__body"></div>`;
    root.inert = true;
    this.body = root.querySelector('.sheet__body');
    root.querySelector('.sheet__close').addEventListener('click', () => this.close());
    this.#bindSwipe(root.querySelector('.sheet__grip'));

    this.resizeObserver = new ResizeObserver(() => this.#open && this.emit('resize'));
    this.resizeObserver.observe(root);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.#open) this.close();
    });
  }

  get isOpen() {
    return this.#open;
  }

  /** What the sheet currently shows, e.g. 'component' or 'product'. */
  get kind() {
    return this.#open ? this.#kind : null;
  }

  /**
   * @param {HTMLElement} content
   * @param {{kind:string, label:string}} opts
   */
  open(content, { kind, label }) {
    const wasOpen = this.#open;
    if (!wasOpen) this.#returnFocus = document.activeElement;
    this.#kind = kind;
    this.body.replaceChildren(content);
    this.body.scrollTop = 0;
    this.root.setAttribute('aria-label', label);
    this.root.inert = false;
    this.root.classList.add('is-open');
    this.#open = true;
    content.querySelector('h2')?.focus({ preventScroll: true });
    this.emit(wasOpen ? 'resize' : 'open');
  }

  close() {
    if (!this.#open) return;
    this.#open = false;
    this.root.classList.remove('is-open');
    this.root.inert = true;
    this.root.style.transform = '';
    if (this.#returnFocus?.isConnected) this.#returnFocus.focus({ preventScroll: true });
    this.emit('close');
  }

  /** Height of the sheet when fully open (CSS px). */
  get height() {
    return this.#open ? this.root.offsetHeight : 0;
  }

  #bindSwipe(grip) {
    let startY = null;
    grip.addEventListener('pointerdown', (e) => {
      startY = e.clientY;
      grip.setPointerCapture(e.pointerId);
      this.root.classList.add('is-dragging');
    });
    grip.addEventListener('pointermove', (e) => {
      if (startY === null) return;
      this.root.style.transform = `translateY(${Math.max(0, e.clientY - startY)}px)`;
    });
    const end = (e) => {
      if (startY === null) return;
      const dy = e.clientY - startY;
      startY = null;
      this.root.classList.remove('is-dragging');
      this.root.style.transform = '';
      if (dy > 70) this.close();
    };
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  }
}
