import { esc } from '../utils/dom.js';

/**
 * Developer panel, shown with ?debug in the URL. Lists every node in the
 * loaded GLB and which components matched, which makes mapping a new
 * Blender export to its product file quick. Also shows render stats.
 */
export class DebugPanel {
  #timer = null;

  constructor() {
    this.root = document.createElement('details');
    this.root.className = 'debug';
    this.root.open = true;
    this.root.innerHTML = '<summary>Debug</summary><div class="debug__body"></div>';
    this.body = this.root.querySelector('.debug__body');
    document.body.appendChild(this.root);
    this.ar = 'detecting…';
  }

  setARMode(capability) {
    this.ar = capability.mode + (capability.reason ? ` (${capability.reason})` : '');
    this.#render();
  }

  setModel(pm, viewer) {
    this.pm = pm;
    this.viewer = viewer;
    this.#render();
    clearInterval(this.#timer);
    this.#timer = setInterval(() => this.#renderStats(), 1000);
  }

  #render() {
    const pm = this.pm;
    if (!pm) {
      this.body.innerHTML = `<p>AR mode: <b>${esc(this.ar)}</b></p>`;
      return;
    }
    const tree = [];
    const walk = (obj, depth) => {
      const entry = pm.registry.entryForObject(obj);
      const tag = obj.isMesh ? ' ▣' : '';
      const owner = entry && entry.nodes.includes(obj) ? ` ← ${entry.def.id}` : '';
      tree.push(`${'  '.repeat(depth)}${esc(obj.name || '(unnamed)')}${tag}${esc(owner)}`);
      obj.children.forEach((c) => walk(c, depth + 1));
    };
    walk(pm.scene, 0);

    const missing = pm.registry.missingNodes.map((m) => `${m.componentId} → "${m.nodeName}"`);
    this.body.innerHTML = `
      <p>Product: <b>${esc(pm.product.id)}</b> · AR mode: <b>${esc(this.ar)}</b></p>
      <p>Real-world scale ×${pm.realWorldScale.toFixed(3)} · Components: ${pm.registry.interactive.length}/${pm.registry.entries.length} matched</p>
      ${missing.length ? `<p class="debug__warn">Missing nodes: ${esc(missing.join(', '))}</p>` : ''}
      ${pm.registry.unassignedMeshes.length ? `<p class="debug__warn">Meshes not in any component: ${pm.registry.unassignedMeshes.length}</p>` : ''}
      <p class="debug__stats"></p>
      <pre>${tree.join('\n')}</pre>`;
    this.#renderStats();
  }

  #renderStats() {
    const info = this.viewer?.renderer.info.render;
    const el = this.body.querySelector('.debug__stats');
    if (info && el) el.textContent = `Draw calls ${info.calls} · Triangles ${info.triangles.toLocaleString()}`;
  }
}
