/**
 * Generates placeholder GLB models with correctly named, separately
 * addressable component nodes, so the app runs before the real
 * Blender assets are dropped in.
 *
 *   npm run models
 *
 * Every model is authored in METERS with its origin at the bottom centre,
 * which is the convention the app (and AR placement) expects. Replace the
 * files in /public/models with your own GLBs at any time; just keep the
 * node names in sync with the product data files (see docs/ADDING_A_PRODUCT.md).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Node polyfill: GLTFExporter uses FileReader for binary output.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      this.onloadend?.();
    });
  }
};

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../public/models');

// Deterministic random so the models are identical on every run.
let seed = 1337;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const range = (a, b) => a + rand() * (b - a);

const mat = (color, roughness = 0.7, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });

const M = {
  bun: mat('#c98a3f', 0.65),
  bunBase: mat('#e2b06a', 0.75),
  seed: mat('#f3e3bf', 0.6),
  patty: mat('#5a3322', 0.92),
  cheese: mat('#f2b525', 0.45),
  lettuce: mat('#5ea53a', 0.6, { side: THREE.DoubleSide }),
  tomato: mat('#d2382b', 0.4),
  sauce: mat('#e8a46a', 0.35),
  sauceRed: mat('#c9442c', 0.35),
  bacon: mat('#9c3b2a', 0.6),
  onion: mat('#e9d9a8', 0.55),
  grilledOnion: mat('#9a5a25', 0.6),
  fries: mat('#f0c255', 0.7),
  tray: mat('#c0302a', 0.8, { side: THREE.DoubleSide }),
  spread: mat('#f1a27e', 0.35),
};

/* ------------------------------------------------------------------ shapes */

/** Lathe from a 2D profile [[radius, y], ...] for rounded food shapes. */
function lathe(points, segments = 48) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}

function domeProfile(radius, height, steps = 14) {
  const pts = [[0, 0], [radius * 0.97, 0], [radius, height * 0.08]];
  for (let i = 1; i <= steps; i++) {
    const a = (i / steps) * (Math.PI / 2);
    pts.push([Math.max(Math.cos(a) * radius, 0.0001), height * 0.08 + Math.sin(a) * height * 0.92]);
  }
  return pts;
}

function topBun(radius, height, baseY) {
  const group = new THREE.Group();
  group.name = 'Top_Bun';
  group.add(new THREE.Mesh(lathe(domeProfile(radius, height)), M.bun));

  const seeds = [];
  for (let i = 0; i < 38; i++) {
    const a = range(0.15, 0.85) * (Math.PI / 2);
    const theta = range(0, Math.PI * 2);
    const r = Math.cos(a) * radius;
    const y = height * 0.08 + Math.sin(a) * height * 0.92;
    const g = new THREE.SphereGeometry(0.0022, 6, 4);
    g.scale(1, 0.45, 0.6);
    g.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(Math.cos(theta) * r, y + 0.0004, Math.sin(theta) * r),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -theta, -(Math.PI / 2 - a))),
        new THREE.Vector3(1, 1, 1),
      ),
    );
    seeds.push(g);
  }
  group.add(new THREE.Mesh(mergeGeometries(seeds), M.seed));
  group.position.y = baseY;
  return group;
}

function bottomBun(radius, height) {
  const mesh = new THREE.Mesh(
    lathe([[0, 0], [radius * 0.92, 0], [radius, height * 0.3], [radius, height * 0.85], [radius * 0.96, height], [0, height]]),
    M.bunBase,
  );
  mesh.name = 'Bottom_Bun';
  return mesh;
}

function patty(name, radius, height, baseY) {
  const g = lathe(
    [[0, 0], [radius * 0.9, 0], [radius, height * 0.35], [radius, height * 0.65], [radius * 0.9, height], [0, height]],
    40,
  );
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    if (Math.hypot(x, z) > radius * 0.5) {
      const k = 1 + Math.sin(Math.atan2(z, x) * 11) * 0.02 + range(-0.015, 0.015);
      p.setX(i, x * k);
      p.setZ(i, z * k);
    }
  }
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, M.patty);
  mesh.name = name;
  mesh.position.y = baseY;
  return mesh;
}

function cheese(name, size, baseY) {
  const g = new THREE.BoxGeometry(size, 0.0025, size, 16, 1, 16);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const droop = Math.max(0, Math.hypot(p.getX(i), p.getZ(i)) - size * 0.4);
    p.setY(i, p.getY(i) - droop * droop * 9);
  }
  g.computeVertexNormals();
  g.rotateY(Math.PI / 4);
  const mesh = new THREE.Mesh(g, M.cheese);
  mesh.name = name;
  mesh.position.y = baseY;
  return mesh;
}

function wavyDisc(name, radius, baseY, material, waves = 9, amp = 0.004) {
  const g = new THREE.CircleGeometry(radius, 96);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const r = Math.hypot(x, z) / radius;
    const a = Math.atan2(z, x);
    p.setY(i, Math.sin(a * waves) * amp * r * r + Math.sin(a * 23) * amp * 0.3 * r);
    const edge = 1 + Math.sin(a * waves * 2) * 0.05 * r;
    p.setX(i, x * edge);
    p.setZ(i, z * edge);
  }
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, material);
  mesh.name = name;
  mesh.position.y = baseY;
  return mesh;
}

function sauceLayer(name, radius, baseY, material) {
  const g = lathe([[0, 0], [radius * 0.9, 0], [radius, 0.0012], [radius * 0.95, 0.0028], [0, 0.003]], 48);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 1 + Math.sin(Math.atan2(p.getZ(i), p.getX(i)) * 7) * 0.06;
    p.setX(i, p.getX(i) * k);
    p.setZ(i, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, material);
  mesh.name = name;
  mesh.position.y = baseY;
  return mesh;
}

function tomatoSlices(baseY) {
  const parts = [[-0.02, 0.012], [0.022, -0.008], [0.0, -0.028]].map(([x, z]) => {
    const g = new THREE.CylinderGeometry(0.028, 0.028, 0.006, 32);
    g.translate(x, 0.003, z);
    return g;
  });
  const mesh = new THREE.Mesh(mergeGeometries(parts), M.tomato);
  mesh.name = 'Tomato';
  mesh.position.y = baseY;
  return mesh;
}

function bacon(baseY) {
  const parts = [[-0.018, 0.2], [0.016, -0.35]].map(([offset, angle]) => {
    const g = new THREE.BoxGeometry(0.12, 0.003, 0.022, 40, 1, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + Math.sin(p.getX(i) * 110) * 0.003);
    g.computeVertexNormals();
    g.rotateY(angle);
    g.translate(0, 0.003, offset);
    return g;
  });
  const mesh = new THREE.Mesh(mergeGeometries(parts), M.bacon);
  mesh.name = 'Bacon';
  mesh.position.y = baseY;
  return mesh;
}

function onionRings(baseY) {
  const parts = [[-0.018, 0.01, 0.017], [0.02, 0.012, 0.014], [0.0, -0.022, 0.016]].map(([x, z, r]) => {
    const g = new THREE.TorusGeometry(r, 0.004, 10, 32);
    g.rotateX(Math.PI / 2);
    g.translate(x, 0.004, z);
    return g;
  });
  const mesh = new THREE.Mesh(mergeGeometries(parts), M.onion);
  mesh.name = 'Onion_Rings';
  mesh.position.y = baseY;
  return mesh;
}

/* ---------------------------------------------------------------- products */

function bigBangBurger() {
  const root = new THREE.Group();
  root.name = 'BigBang_Burger';
  const R = 0.058;
  root.add(bottomBun(R, 0.022));
  root.add(sauceLayer('Sauce_Bottom', R * 0.95, 0.022, M.sauceRed));
  root.add(patty('Patty_Bottom', R * 1.04, 0.017, 0.025));
  root.add(cheese('Cheese_Bottom', 0.096, 0.0435));
  root.add(bacon(0.046));
  root.add(patty('Patty_Top', R * 1.04, 0.017, 0.054));
  root.add(cheese('Cheese_Top', 0.096, 0.0725));
  root.add(onionRings(0.075));
  root.add(wavyDisc('Lettuce', R * 1.08, 0.084, M.lettuce));
  root.add(sauceLayer('Sauce_Top', R * 0.9, 0.088, M.sauce));
  root.add(topBun(R, 0.04, 0.091));
  return root;
}

function animalFries() {
  const root = new THREE.Group();
  root.name = 'Animal_Fries';
  const W = 0.13;
  const D = 0.09;
  const H = 0.045;

  // Open paper tray: tapered walls + floor
  const walls = new THREE.CylinderGeometry(Math.SQRT1_2 * 1.08, Math.SQRT1_2, 1, 4, 1, true);
  walls.rotateY(Math.PI / 4);
  walls.scale(W, H, D);
  walls.translate(0, H / 2, 0);
  const floor = new THREE.PlaneGeometry(W, D);
  floor.rotateX(-Math.PI / 2);
  floor.translate(0, 0.0005, 0);
  const tray = new THREE.Mesh(mergeGeometries([walls.toNonIndexed(), floor.toNonIndexed()]), M.tray);
  tray.name = 'Tray';
  root.add(tray);

  // Fries: a deterministic pile of thin sticks
  const sticks = [];
  for (let i = 0; i < 70; i++) {
    const g = new THREE.BoxGeometry(0.008, 0.008, range(0.06, 0.1));
    g.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(range(-W * 0.38, W * 0.38), range(0.006, 0.04), range(-D * 0.33, D * 0.33)),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(range(-0.35, 0.35), range(0, Math.PI), range(-0.2, 0.2))),
        new THREE.Vector3(1, 1, 1),
      ),
    );
    sticks.push(g);
  }
  const fries = new THREE.Mesh(mergeGeometries(sticks), M.fries);
  fries.name = 'Fries';
  root.add(fries);

  // Melted cheese blanket
  const cheeseGeo = new THREE.SphereGeometry(1, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  cheeseGeo.scale(W * 0.38, 0.012, D * 0.38);
  const cp = cheeseGeo.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    const k = 1 + Math.sin(Math.atan2(cp.getZ(i), cp.getX(i)) * 6) * 0.12;
    cp.setX(i, cp.getX(i) * k);
    cp.setZ(i, cp.getZ(i) * k);
  }
  cheeseGeo.computeVertexNormals();
  const cheeseMesh = new THREE.Mesh(cheeseGeo, M.cheese);
  cheeseMesh.name = 'Melted_Cheese';
  cheeseMesh.position.y = 0.042;
  root.add(cheeseMesh);

  // Grilled onions: small curled pieces
  const bits = [];
  for (let i = 0; i < 26; i++) {
    const g = new THREE.TorusGeometry(range(0.004, 0.007), 0.0016, 6, 12, range(1.5, 3.5));
    g.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(range(-0.035, 0.035), range(0, 0.004), range(-0.025, 0.025)),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 + range(-0.4, 0.4), range(0, 6.28), 0)),
        new THREE.Vector3(1, 1, 1),
      ),
    );
    bits.push(g);
  }
  const onions = new THREE.Mesh(mergeGeometries(bits), M.grilledOnion);
  onions.name = 'Grilled_Onions';
  onions.position.y = 0.054;
  root.add(onions);

  // Spread drizzle: a zig-zag tube
  const pts = [];
  for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector3(-0.045 + i * 0.011, 0, (i % 2 ? 1 : -1) * 0.024));
  const spread = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.0028, 8), M.spread);
  spread.name = 'Spread';
  spread.position.y = 0.059;
  root.add(spread);

  return root;
}

/* ------------------------------------------------------------------ export */

const exporter = new GLTFExporter();
mkdirSync(OUT_DIR, { recursive: true });

const models = {
  'bigbang-burger.glb': bigBangBurger(),
  'animal-fries.glb': animalFries(),
};

for (const [file, root] of Object.entries(models)) {
  const glb = await exporter.parseAsync(root, { binary: true });
  writeFileSync(resolve(OUT_DIR, file), Buffer.from(glb));
  const names = root.children.map((c) => c.name).join(', ');
  console.log(`✔ ${file.padEnd(20)} ${(glb.byteLength / 1024).toFixed(0).padStart(4)} KB  nodes: ${names}`);
}
