import { clamp01, easeInOutCubic } from '../utils/easing.js';

/**
 * Tiny tween engine driven by whichever render loop is active (3D viewer or
 * WebXR session). Deterministic and physics-free, as the SOW requires.
 */
class Animator {
  #tweens = new Set();

  /**
   * @param {object} opts
   * @param {number} opts.duration  ms
   * @param {(t:number)=>void} opts.onUpdate  receives eased progress 0..1
   * @param {(t:number)=>number} [opts.easing]
   * @param {number} [opts.delay]  ms
   * @returns {{cancel:()=>void, finished:Promise<boolean>}}
   */
  tween({ duration, onUpdate, easing = easeInOutCubic, delay = 0 }) {
    let resolve;
    const finished = new Promise((r) => (resolve = r));
    const tween = { start: performance.now() + delay, duration: Math.max(1, duration), onUpdate, easing, resolve };
    this.#tweens.add(tween);
    return {
      finished,
      cancel: () => {
        if (this.#tweens.delete(tween)) resolve(false);
      },
    };
  }

  /** Advances all tweens. Returns true while anything is animating. */
  update(now = performance.now()) {
    for (const tw of this.#tweens) {
      if (now < tw.start) continue;
      const t = clamp01((now - tw.start) / tw.duration);
      tw.onUpdate(tw.easing(t));
      if (t >= 1) {
        this.#tweens.delete(tw);
        tw.resolve(true);
      }
    }
    return this.#tweens.size > 0;
  }

  get active() {
    return this.#tweens.size > 0;
  }
}

export const animator = new Animator();
