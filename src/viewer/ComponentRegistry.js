import { Box3, Matrix3, Matrix4, PropertyBinding, Vector3 } from 'three';

/** three.js renames nodes on load; normalise both sides so names always match. */
const normalise = (name) => PropertyBinding.sanitizeNodeName(String(name)).toLowerCase();

/**
 * Connects a product's `components` (data) to the nodes inside its GLB
 * (geometry). Everything else — explode, labels, focus, picking — works
 * through this registry, so no product-specific code exists anywhere.
 *
 * @typedef {object} ComponentEntry
 * @property {object} def            the component object from the product file
 * @property {number} index          position in product.components
 * @property {import('three').Object3D[]} nodes
 * @property {import('three').Mesh[]} meshes
 * @property {Vector3[]} basePositions  assembled local positions
 * @property {Vector3[]} offsets        local-space explode offsets (full distance)
 * @property {{node: import('three').Object3D, local: Vector3}|null} anchor  label anchor
 */
export class ComponentRegistry {
  /**
   * @param {import('three').Object3D} root  the loaded glTF scene
   * @param {object} product
   * @param {{autoGap:number}} options
   */
  constructor(root, product, { autoGap }) {
    this.root = root;
    /** @type {ComponentEntry[]} */
    this.entries = [];
    /** Node names listed in product data but not found in the GLB. */
    this.missingNodes = [];
    /** Meshes in the GLB that belong to no component (still rendered, not interactive). */
    this.unassignedMeshes = [];
    this.meshToEntry = new Map();

    root.updateWorldMatrix(true, true);
    const rootInverse = root.matrixWorld.clone().invert();

    const byName = new Map();
    root.traverse((obj) => {
      if (!obj.name) return;
      const key = normalise(obj.name);
      if (!byName.has(key)) byName.set(key, obj);
    });

    this.bounds = new Box3().setFromObject(root).applyMatrix4(rootInverse);
    const size = this.bounds.getSize(new Vector3());
    this.modelSize = Math.max(size.x, size.y, size.z) || 1;

    (product.components ?? []).forEach((def, index) => {
      const nodes = [];
      for (const name of def.nodes ?? []) {
        const node = byName.get(normalise(name));
        if (node) nodes.push(node);
        else this.missingNodes.push({ componentId: def.id, nodeName: name });
      }

      const meshes = [];
      for (const node of nodes) {
        node.traverse((obj) => {
          if (obj.isMesh && !this.meshToEntry.has(obj)) meshes.push(obj);
        });
      }

      const entry = {
        def,
        index,
        nodes,
        meshes,
        basePositions: nodes.map((n) => n.position.clone()),
        offsets: nodes.map(() => new Vector3()),
        anchor: null,
        progress: 0,
      };
      meshes.forEach((m) => this.meshToEntry.set(m, entry));
      entry.anchor = this.#computeAnchor(nodes);
      this.entries.push(entry);
    });

    root.traverse((obj) => {
      if (obj.isMesh && !this.meshToEntry.has(obj)) this.unassignedMeshes.push(obj);
    });

    this.#computeOffsets(rootInverse, autoGap);
  }

  /** Entries that actually exist in the model. */
  get interactive() {
    return this.entries.filter((e) => e.nodes.length > 0);
  }

  entryForObject(object) {
    let obj = object;
    while (obj) {
      const entry = this.meshToEntry.get(obj);
      if (entry) return entry;
      obj = obj.parent;
    }
    return null;
  }

  entryById(id) {
    return this.entries.find((e) => e.def.id === id) ?? null;
  }

  /** Move one component to a point between assembled (0) and exploded (1). */
  applyProgress(entry, p) {
    entry.progress = p;
    entry.nodes.forEach((node, i) => {
      node.position.copy(entry.basePositions[i]).addScaledVector(entry.offsets[i], p);
    });
  }

  /** Bounds (in root space) with every component at progress p, without disturbing current state. */
  boundsAt(p) {
    const saved = this.entries.map((e) => e.progress);
    this.entries.forEach((e) => this.applyProgress(e, p));
    this.root.updateWorldMatrix(true, true);
    const rootInverse = this.root.matrixWorld.clone().invert();
    const box = new Box3().setFromObject(this.root, true).applyMatrix4(rootInverse);
    this.entries.forEach((e, i) => this.applyProgress(e, saved[i]));
    return box;
  }

  #computeAnchor(nodes) {
    if (!nodes.length) return null;
    const box = new Box3();
    nodes.forEach((n) => box.expandByObject(n));
    if (box.isEmpty()) return null;
    const center = box.getCenter(new Vector3());
    return { node: nodes[0], local: nodes[0].worldToLocal(center) };
  }

  /**
   * Explode offsets come from product data: a direction and a distance
   * expressed as a multiple of the model's largest dimension. Components
   * without a rule are stacked upwards automatically, bottom to top.
   */
  #computeOffsets(rootInverse, autoGap) {
    const auto = this.interactive
      .filter((e) => !e.def.explode)
      .map((e) => ({ e, y: this.#centerY(e, rootInverse) }))
      .sort((a, b) => a.y - b.y);
    const autoDistance = new Map(auto.map(({ e }, rank) => [e, rank * autoGap]));

    for (const entry of this.interactive) {
      const rule = entry.def.explode ?? {};
      const dir = new Vector3(...(rule.direction ?? [0, 1, 0]));
      if (dir.lengthSq() === 0) dir.set(0, 1, 0);
      dir.normalize();
      const distance = rule.distance ?? autoDistance.get(entry) ?? 0;
      const rootOffset = dir.multiplyScalar(distance * this.modelSize);

      entry.nodes.forEach((node, i) => {
        // Express the root-space offset in the node's parent space.
        const parentToRoot = new Matrix4().multiplyMatrices(rootInverse, node.parent.matrixWorld);
        const rootToParent = new Matrix3().setFromMatrix4(parentToRoot.invert());
        entry.offsets[i].copy(rootOffset).applyMatrix3(rootToParent);
      });
    }
  }

  #centerY(entry, rootInverse) {
    const box = new Box3();
    entry.nodes.forEach((n) => box.expandByObject(n));
    return box.applyMatrix4(rootInverse).getCenter(new Vector3()).y;
  }
}
