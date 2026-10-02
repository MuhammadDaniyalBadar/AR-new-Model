import { Vector3 } from 'three';
import { esc } from '../utils/dom.js';
import { clamp01 } from '../utils/easing.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const GAP = 6;

/**
 * Component labels drawn as HTML (crisp, accessible, cheap) and connected to
 * the model with leader lines, like a menu-board diagram. Labels stack in a
 * column on the right and never overlap. Works with any camera, so the same
 * class serves the 3D viewer and the AR overlay.
 */
export class LabelLayer {
  #items = [];
  #selectedId = null;
  #labelHeight = 30;
  #tmp = new Vector3();

  /**
   * @param {HTMLElement} container  positioned element covering the canvas
   * @param {import('./ComponentRegistry.js').ComponentRegistry} registry
   * @param {{onSelect:(entry)=>void, margin?:number, top?:number, bottom?:number}} opts
   */
  constructor(container, registry, { onSelect, margin = 12, top = 12, bottom = 12 }) {
    this.container = container;
    this.margin = margin;
    this.top = top;
    this.bottom = bottom;

    this.root = document.createElement('div');
    this.root.className = 'labels';
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.setAttribute('class', 'labels__lines');
    this.svg.setAttribute('aria-hidden', 'true');
    this.root.appendChild(this.svg);

    for (const entry of registry.interactive) {
      if (!entry.anchor) continue;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'label';
      el.innerHTML = `<span class="label__text">${esc(entry.def.name)}</span>`;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelect(entry);
      });

      const line = document.createElementNS(SVG_NS, 'polyline');
      line.setAttribute('class', 'labels__line');
      const dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('class', 'labels__dot');
      dot.setAttribute('r', '3.5');
      this.svg.append(line, dot);
      this.root.appendChild(el);
      this.#items.push({ entry, el, line, dot, width: 0, x: 0, y: 0, visible: false });
    }
    container.appendChild(this.root);
    this.measure();
  }

  /** Re-measure label sizes (call after fonts load or on resize). */
  measure() {
    for (const item of this.#items) item.width = item.el.offsetWidth;
    this.#labelHeight = this.#items[0]?.el.offsetHeight || 30;
  }

  setSelected(entry) {
    this.#selectedId = entry?.def.id ?? null;
    for (const item of this.#items) item.el.classList.toggle('is-selected', item.entry.def.id === this.#selectedId);
  }

  /**
   * @param {import('three').Camera} camera
   * @param {number} width   container width in CSS px
   * @param {number} height  container height in CSS px
   */
  update(camera, width, height) {
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const placed = [];

    for (const item of this.#items) {
      const { entry } = item;
      // fade in during the last part of each component's own movement
      const opacity = clamp01((entry.progress - 0.55) / 0.4);
      const p = this.#tmp.copy(entry.anchor.local);
      entry.anchor.node.localToWorld(p).project(camera);
      const onScreen = p.z < 1 && Math.abs(p.x) <= 1.05 && Math.abs(p.y) <= 1.05;

      item.visible = opacity > 0.01 && onScreen;
      item.opacity = opacity;
      item.ax = ((p.x + 1) / 2) * width;
      item.ay = ((1 - p.y) / 2) * height;
      if (item.visible) placed.push(item);
      else this.#hide(item);
    }

    // Stack labels in a right-hand column ordered by anchor height.
    placed.sort((a, b) => a.ay - b.ay);
    const h = this.#labelHeight;
    // When space is tight (sheet open, short screens), tighten the gap first,
    // then give up the reserved top clearance before letting labels overlap.
    const n = placed.length;
    const maxY = height - this.bottom - h / 2;
    const fits = (top, gap) => n * h + Math.max(0, n - 1) * gap <= maxY - top + h / 2;
    let gap = GAP;
    let top = this.top;
    if (!fits(top, gap)) gap = 2;
    if (!fits(top, gap)) top = Math.min(this.top, 12);
    const minY = top + h / 2;
    placed.forEach((item, i) => {
      const prev = placed[i - 1];
      item.y = Math.max(item.ay, minY, prev ? prev.y + h + gap : -Infinity);
    });
    for (let i = placed.length - 1; i >= 0; i--) {
      const next = placed[i + 1];
      placed[i].y = Math.min(placed[i].y, maxY, next ? next.y - h - gap : Infinity);
    }

    for (const item of placed) {
      const right = width - this.margin;
      const left = right - item.width;
      item.el.style.transform = `translate(${left}px, ${item.y - h / 2}px)`;
      item.el.style.opacity = item.opacity;
      item.el.style.visibility = 'visible';
      item.el.tabIndex = 0;

      const elbow = Math.min(left - 14, Math.max(item.ax + 18, left - 40));
      item.line.setAttribute('points', `${item.ax},${item.ay} ${elbow},${item.y} ${left - 4},${item.y}`);
      item.line.style.opacity = item.opacity;
      item.dot.setAttribute('cx', item.ax);
      item.dot.setAttribute('cy', item.ay);
      item.dot.style.opacity = item.opacity;
      const selected = item.entry.def.id === this.#selectedId;
      item.line.classList.toggle('is-selected', selected);
      item.dot.classList.toggle('is-selected', selected);
    }
  }

  #hide(item) {
    item.el.style.visibility = 'hidden';
    item.el.tabIndex = -1;
    item.line.style.opacity = 0;
    item.dot.style.opacity = 0;
  }

  dispose() {
    this.root.remove();
    this.#items = [];
  }
}
