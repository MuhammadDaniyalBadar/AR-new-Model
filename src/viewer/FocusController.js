import { animator } from '../core/animator.js';

const DIM_OPACITY = 0.16;

/**
 * Highlights one component by fading the others. Materials are cloned per
 * mesh on creation so fading one component never affects another that
 * happened to share a material in the GLB.
 */
export class FocusController {
  #tween = null;
  #level = 0; // 0 = nothing dimmed, 1 = fully dimmed
  #focused = null;

  constructor(registry) {
    this.registry = registry;
    this.records = []; // { entry, material, original }
    registry.root.traverse((obj) => {
      if (!obj.isMesh) return;
      const entry = registry.entryForObject(obj);
      const cloneOne = (m) => {
        const material = m.clone();
        this.records.push({
          entry,
          material,
          original: { opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite },
        });
        return material;
      };
      obj.material = Array.isArray(obj.material) ? obj.material.map(cloneOne) : cloneOne(obj.material);
    });
  }

  get focused() {
    return this.#focused;
  }

  /** @param {object|null} entry  ComponentEntry to highlight, or null to clear. */
  focus(entry) {
    const previous = this.#focused;
    this.#focused = entry;
    this.#tween?.cancel();

    if (entry && previous && previous !== entry) {
      // Switching focus: swap instantly while staying dimmed.
      this.#apply(this.#level);
      return;
    }
    const from = this.#level;
    const to = entry ? 1 : 0;
    this.#tween = animator.tween({ duration: 260, onUpdate: (k) => this.#apply(from + (to - from) * k) });
  }

  #apply(level) {
    this.#level = level;
    for (const { entry, material, original } of this.records) {
      const dim = this.#focused && entry !== this.#focused;
      const opacity = dim ? original.opacity * (1 - (1 - DIM_OPACITY) * level) : original.opacity;
      const transparent = opacity < 0.999 || original.transparent;
      if (material.transparent !== transparent) {
        material.transparent = transparent;
        material.depthWrite = transparent ? false : original.depthWrite;
        material.needsUpdate = true;
      }
      material.opacity = opacity;
    }
  }

  reset() {
    this.#tween?.cancel();
    this.#focused = null;
    this.#apply(0);
  }
}
