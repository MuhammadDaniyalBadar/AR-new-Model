import { EventEmitter } from '../core/EventEmitter.js';
import { animator } from '../core/animator.js';
import { clamp01, easeInOutCubic } from '../utils/easing.js';

/**
 * Animates components between assembled and exploded positions.
 *
 * One master timeline drives every component, each with a staggered start.
 * Playing it backwards reverses the order automatically (last out, first in),
 * and it can be reversed mid-way without jumps. No physics involved.
 *
 * Events: 'state' ('assembled' | 'exploding' | 'exploded' | 'collapsing'), 'progress'
 */
export class ExplodeController extends EventEmitter {
  #t = 0;
  #tween = null;
  #state = 'assembled';

  constructor(registry, { duration, stagger, reducedMotion = false }) {
    super();
    this.registry = registry;
    this.moving = registry.interactive.filter((e) => e.offsets.some((o) => o.lengthSq() > 0));
    // Components that stay put (e.g. the bottom bun) still "open" so their labels appear.
    this.static = registry.interactive.filter((e) => !this.moving.includes(e));
    this.duration = reducedMotion ? 1 : duration;
    this.stagger = reducedMotion ? 0 : stagger;
    this.total = this.duration + this.stagger * Math.max(0, this.moving.length - 1);
  }

  get state() {
    return this.#state;
  }

  /** True when exploded or heading there. */
  get isOpen() {
    return this.#state === 'exploded' || this.#state === 'exploding';
  }

  get canExplode() {
    return this.moving.length > 0;
  }

  explode() {
    return this.#animateTo(1);
  }

  collapse() {
    return this.#animateTo(0);
  }

  toggle() {
    return this.isOpen ? this.collapse() : this.explode();
  }

  /** Jump without animation (used when restoring state). */
  set(progress) {
    this.#tween?.cancel();
    this.#apply(progress);
    this.#setState(progress >= 1 ? 'exploded' : 'assembled');
  }

  #animateTo(target) {
    if (!this.canExplode) return Promise.resolve(false);
    this.#tween?.cancel();
    const from = this.#t;
    if (from === target) return Promise.resolve(true);

    this.#setState(target === 1 ? 'exploding' : 'collapsing');
    this.#tween = animator.tween({
      duration: Math.abs(target - from) * this.total,
      easing: (k) => k,
      onUpdate: (k) => this.#apply(from + (target - from) * k),
    });
    return this.#tween.finished.then((done) => {
      if (done) this.#setState(target === 1 ? 'exploded' : 'assembled');
      return done;
    });
  }

  #apply(t) {
    this.#t = t;
    const elapsed = t * this.total;
    this.moving.forEach((entry, i) => {
      const local = clamp01((elapsed - i * this.stagger) / this.duration);
      this.registry.applyProgress(entry, easeInOutCubic(local));
    });
    for (const entry of this.static) entry.progress = t;
    this.emit('progress', t);
  }

  #setState(state) {
    if (state === this.#state) return;
    this.#state = state;
    this.emit('state', state);
  }
}
