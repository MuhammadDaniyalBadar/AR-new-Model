/**
 * Distinguishes a tap from a drag/pinch on the canvas, so rotating the
 * model never accidentally triggers "take apart" or selection.
 */
export class TapPicker {
  constructor(element, onTap, { maxMove = 8, maxTime = 350 } = {}) {
    this.element = element;
    this.onTap = onTap;
    this.maxMove = maxMove;
    this.maxTime = maxTime;
    this.pointers = new Map();
    this.cancelled = false;

    this.down = (e) => {
      if (this.pointers.size === 0) this.cancelled = false;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
      if (this.pointers.size > 1) this.cancelled = true; // pinch
    };
    this.move = (e) => {
      const p = this.pointers.get(e.pointerId);
      if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > this.maxMove) this.cancelled = true;
    };
    this.up = (e) => {
      const p = this.pointers.get(e.pointerId);
      this.pointers.delete(e.pointerId);
      if (!p || this.cancelled || this.pointers.size > 0) return;
      if (e.button !== undefined && e.button > 0) return;
      if (performance.now() - p.t <= this.maxTime) this.onTap(e.clientX, e.clientY);
    };
    this.cancel = (e) => this.pointers.delete(e.pointerId);

    element.addEventListener('pointerdown', this.down);
    element.addEventListener('pointermove', this.move);
    element.addEventListener('pointerup', this.up);
    element.addEventListener('pointercancel', this.cancel);
  }

  dispose() {
    this.element.removeEventListener('pointerdown', this.down);
    this.element.removeEventListener('pointermove', this.move);
    this.element.removeEventListener('pointerup', this.up);
    this.element.removeEventListener('pointercancel', this.cancel);
  }
}
