/** One-line status messages ("Preparing AR…"). Announced to screen readers. */
export class Toast {
  #timer = null;

  constructor(root) {
    this.root = root;
  }

  show(message, { duration = 3200 } = {}) {
    clearTimeout(this.#timer);
    this.root.textContent = message;
    this.root.classList.add('is-visible');
    this.#timer = setTimeout(() => this.hide(), duration);
  }

  hide() {
    this.root.classList.remove('is-visible');
  }
}
