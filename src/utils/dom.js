/** Escape text before putting it in an HTML template. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** Create an element from an HTML string (single root). */
export function html(markup) {
  const tpl = document.createElement('template');
  tpl.innerHTML = markup.trim();
  return tpl.content.firstElementChild;
}

export const $ = (sel, root = document) => root.querySelector(sel);

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
