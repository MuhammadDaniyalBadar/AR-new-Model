/**
 * Generates detailed, textured burger models from reference photos:
 *
 *   quadra.glb          Quadra: 4 patties, 4 cheeses, beef salami, onion rings, jalapeños, mayo
 *   classic-burger.glb  Grilled-bun burger with white cheese and red onion
 *   double-crunch.glb   Double smash patty, onion rings, jalapeños, pepperoni, shredded lettuce
 *
 *   npm run models:detailed
 *
 * Everything is procedural (geometry + painted textures), so no photo is
 * copied into the files. These are still stand-ins: for production, use
 * scanned or artist-made models (see docs/ADDING_A_PRODUCT.md).
 *
 * Conventions match the app: meters, origin at bottom centre, one named
 * node per component part.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Canvas, ImageData } from '@napi-rs/canvas';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/* ------------------------------------------------------------- Node shims */

globalThis.ImageData ??= ImageData;
globalThis.OffscreenCanvas = class OffscreenCanvas extends Canvas {
  constructor(w, h) {
    super(w, h);
    // @napi-rs/canvas puts data() and toBlob() on each instance. GLTFExporter
    // would mistake data for DataTexture pixels and prefer toBlob over
    // convertToBlob, so hide both and use our convertToBlob.
    Object.defineProperty(this, 'data', { value: undefined, configurable: true });
    Object.defineProperty(this, 'toBlob', { value: undefined, configurable: true });
    Object.defineProperty(this, 'convertToBlob', {
      configurable: true,
      value: ({ type = 'image/png', quality } = {}) => {
        const buf =
          type === 'image/jpeg' ? this.toBuffer('image/jpeg', Math.round((quality ?? 0.88) * 100)) : this.toBuffer('image/png');
        return Promise.resolve(new Blob([buf], { type }));
      },
    });
  }
};
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      this.onloadend?.();
    });
  }
};

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../public/models');
const TAU = Math.PI * 2;

/* ------------------------------------------------------------ randomness */

let seed = 4242;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const range = (a, b) => a + rand() * (b - a);

function hash3(x, y, z, s = 0) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177) ^ Math.imul(s, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const fade = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => fade(clamp01((v - a) / (b - a)));

/** 3D value noise in [0, 1]. */
function noise3(x, y, z, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const u = fade(x - xi), v = fade(y - yi), w = fade(z - zi);
  const h = (a, b, c) => hash3(xi + a, yi + b, zi + c, s);
  return lerp(
    lerp(lerp(h(0, 0, 0), h(1, 0, 0), u), lerp(h(0, 1, 0), h(1, 1, 0), u), v),
    lerp(lerp(h(0, 0, 1), h(1, 0, 1), u), lerp(h(0, 1, 1), h(1, 1, 1), u), v),
    w,
  );
}
function fbm(x, y, z, octaves = 4, s = 0) {
  let sum = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise3(x * f, y * f, z * f, s + i * 17) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}
/** Noise that wraps around an angle (seamless at 0 / 2π). */
const angNoise = (theta, freq, s = 0, oct = 3) => fbm(Math.cos(theta) * freq, Math.sin(theta) * freq, 0.5, oct, s);

/* ------------------------------------------------------------- colours */

const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

/* ------------------------------------------------------------ textures */

const TEX = { color: 1024, small: 512 };

function canvasFromPixels(w, h, fill) {
  const c = new OffscreenCanvas(w, h);
  const data = new Uint8ClampedArray(w * h * 4);
  for (let py = 0; py < h; py++) {
    const v = 1 - (py + 0.5) / h;
    for (let px = 0; px < w; px++) {
      const u = (px + 0.5) / w;
      const [r, g, b] = fill(u, v);
      const i = (py * w + px) * 4;
      data[i] = clamp01(r) * 255;
      data[i + 1] = clamp01(g) * 255;
      data[i + 2] = clamp01(b) * 255;
      data[i + 3] = 255;
    }
  }
  c.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0);
  return c;
}

function makeTexture(canvas, srgb) {
  const t = new THREE.Texture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.userData.mimeType = 'image/jpeg';
  t.needsUpdate = true;
  return t;
}

/** Paint colour + normal maps from functions of a surface point. */
function paintMaps({ w, h, point, color, height, strength = 1.5 }) {
  const map = makeTexture(canvasFromPixels(w, h, (u, v) => color(point(u, v), u, v)), true);
  if (!height) return { map };
  const H = new Float32Array(w * h);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const u = (px + 0.5) / w, v = 1 - (py + 0.5) / h;
      H[py * w + px] = height(point(u, v), u, v);
    }
  }
  const at = (x, y) => H[Math.min(h - 1, Math.max(0, y)) * w + ((x + w) % w)];
  const normalCanvas = canvasFromPixels(w, h, (u, v) => {
    const px = Math.floor(u * w), py = Math.floor((1 - v) * h);
    const dx = (at(px + 1, py) - at(px - 1, py)) * strength;
    const dy = (at(px, py - 1) - at(px, py + 1)) * strength;
    const len = Math.hypot(dx, dy, 1);
    return [(-dx / len) * 0.5 + 0.5, (-dy / len) * 0.5 + 0.5, (1 / len) * 0.5 + 0.5];
  });
  return { map, normalMap: makeTexture(normalCanvas, false) };
}

function material({ map, normalMap, color = '#ffffff', roughness = 0.7, clearcoat = 0, side, normalScale = 1 }) {
  const params = { color, roughness, metalness: 0, map: map ?? null, normalMap: normalMap ?? null };
  if (side) params.side = side;
  const m = clearcoat
    ? new THREE.MeshPhysicalMaterial({ ...params, clearcoat, clearcoatRoughness: 0.35 })
    : new THREE.MeshStandardMaterial(params);
  if (normalMap) m.normalScale.set(normalScale, normalScale);
  return m;
}

/* ------------------------------------------------------------ geometry */

/** Resample a 2D profile evenly by arc length so lathe UV v ≈ distance. */
function resample(points, n) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    segs.push(d);
    total += d;
  }
  const out = [];
  for (let k = 0; k < n; k++) {
    let target = (k / (n - 1)) * total, i = 0;
    while (i < segs.length - 1 && target > segs[i]) target -= segs[i++];
    const t = segs[i] ? target / segs[i] : 0;
    out.push([lerp(points[i][0], points[i + 1][0], t), lerp(points[i][1], points[i + 1][1], t)]);
  }
  return out;
}

/** Point on a lathe surface for (u, v) texture coordinates. */
function lathePoint(profile) {
  return (u, v) => {
    const f = v * (profile.length - 1);
    const i = Math.min(profile.length - 2, Math.floor(f));
    const t = f - i;
    const r = lerp(profile[i][0], profile[i + 1][0], t);
    const y = lerp(profile[i][1], profile[i + 1][1], t);
    const a = u * TAU;
    return [r * Math.sin(a), y, r * Math.cos(a)];
  };
}

/** Make normals continuous across UV seams and poles. */
function smoothSeams(geo) {
  geo.computeVertexNormals();
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const groups = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(5)},${pos.getY(i).toFixed(5)},${pos.getZ(i).toFixed(5)}`;
    (groups.get(key) ?? groups.set(key, []).get(key)).push(i);
  }
  const n = new THREE.Vector3();
  for (const idx of groups.values()) {
    if (idx.length < 2) continue;
    n.set(0, 0, 0);
    for (const i of idx) n.x += nor.getX(i), n.y += nor.getY(i), n.z += nor.getZ(i);
    n.normalize();
    for (const i of idx) nor.setXYZ(i, n.x, n.y, n.z);
  }
  return geo;
}

/**
 * Lathe a profile, then deform it. `deform(p, n)` receives a point and its
 * normal (both THREE.Vector3) and moves the point in place. Deformation is
 * a function of position only, so seam vertices stay welded.
 */
function lathe(profile, segments, deform) {
  const geo = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);
  if (deform) {
    geo.computeVertexNormals();
    const pos = geo.attributes.position, nor = geo.attributes.normal;
    const p = new THREE.Vector3(), n = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      n.fromBufferAttribute(nor, i);
      deform(p, n);
      pos.setXYZ(i, p.x, p.y, p.z);
    }
  }
  return smoothSeams(geo);
}

const place = (geo, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) =>
  geo.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(sx, sy, sz),
    ),
  );

function node(name, ...meshes) {
  const g = new THREE.Group();
  g.name = name;
  meshes.forEach((m) => g.add(m));
  return g;
}

/* ================================================================ parts */

/**
 * Top bun: dome from rim (v=0) to crown (v=1), plus a flat cut face.
 * style: 'soft' (pale, seeded), 'grilled' (scored, char lines), 'brioche' (glossy).
 */
function topBun({ name = 'Top_Bun', radius, height, style, seeds = 0 }) {
  const R = radius, H = height;
  const raw = [[R * 0.9, 0], [R * 0.99, H * 0.05], [R, H * 0.16]];
  for (let i = 1; i <= 24; i++) {
    const a = (i / 24) * (Math.PI / 2);
    raw.push([Math.max(Math.cos(a) * R, 1e-5), H * 0.16 + Math.sin(a) * H * 0.84]);
  }
  const profile = resample(raw, 64);

  const lobes = style === 'grilled' ? 4 : 0;
  const deform = (p) => {
    const r = Math.hypot(p.x, p.z), a = Math.atan2(p.x, p.z);
    const k = r / R;
    // Scored cross: four soft lobes near the top
    if (lobes) {
      const groove = Math.pow(Math.abs(Math.cos(a * 2)), 10) * smooth(0.15, 0.7, k) * (1 - smooth(0.85, 1, k));
      p.y -= groove * H * 0.07 * smooth(0.3, 1, p.y / H);
    }
    // Hand-made irregularity
    const wob = (angNoise(a, 1.6, 3) - 0.5) * 0.06 + (fbm(p.x * 40, p.y * 40, p.z * 40, 3, 5) - 0.5) * 0.025;
    p.x *= 1 + wob * k;
    p.z *= 1 + wob * k;
    p.y *= 1 + (angNoise(a, 1.3, 9) - 0.5) * 0.08;
  };
  const geo = lathe(profile, 96, deform);

  const palette = {
    soft: { base: hex('#efe3c9'), crown: hex('#d9ab6b'), deep: hex('#c48a45') },
    grilled: { base: hex('#ebc58a'), crown: hex('#cf8e45'), deep: hex('#9d5c26') },
    brioche: { base: hex('#ecc283'), crown: hex('#c2802f'), deep: hex('#8a5016') },
  }[style];

  const point = lathePoint(profile);
  const maps = paintMaps({
    w: TEX.color, h: 512, point,
    color: ([x, y, z], u, v) => {
      const n = fbm(x * 90, y * 90, z * 90, 4);
      const brown = smooth(0.12, style === 'brioche' ? 0.6 : 0.85, v) * (0.75 + n * 0.5);
      let c = mix(palette.base, palette.crown, clamp01(brown));
      c = mix(c, palette.deep, smooth(0.62, 0.95, v) * smooth(0.45, 0.8, n) * 0.7);
      if (style === 'grilled') {
        // Diagonal grill bars, only where the bun touched the grill (upper dome)
        // Parallel grill bars, slightly wavy and broken up like real char
        const t = (x * 0.94 + z * 0.34) / 0.026 + (fbm(x * 40, y * 40, z * 40, 2, 6) - 0.5) * 0.6;
        const d = ((t % 1) + 1) % 1;
        const bar = 1 - smooth(0.04, 0.2, Math.min(d, 1 - d));
        const broken = smooth(0.3, 0.6, fbm(x * 90, y * 90, z * 90, 3, 12));
        const top = smooth(0.4, 0.75, v);
        c = mix(c, hex('#3d2210'), bar * top * broken * (0.6 + fbm(x * 200, y * 200, z * 200, 2, 7) * 0.4));
        c = mix(c, hex('#5b3416'), smooth(0.75, 0.9, fbm(x * 30, y * 30, z * 30, 3, 8)) * 0.4 * top);
      }
      // Flour dust / speckle
      c = shade(c, 0.94 + hash3(Math.floor(x * 4000), Math.floor(y * 4000), Math.floor(z * 4000)) * 0.08);
      return c;
    },
    height: ([x, y, z]) => fbm(x * 260, y * 260, z * 260, 3, 11),
    strength: 2.2,
  });
  const crust = new THREE.Mesh(
    geo,
    material({ ...maps, roughness: style === 'brioche' ? 0.42 : 0.7, clearcoat: style === 'brioche' ? 0.55 : 0, normalScale: 0.6 }),
  );

  // Cut face (crumb)
  const cutProfile = resample([[0, 0.0006], [R * 0.9, 0.0006]], 16);
  const cutGeo = new THREE.LatheGeometry(cutProfile.map(([r, y]) => new THREE.Vector2(r, y)), 96);
  const cutMaps = paintMaps({
    w: TEX.small, h: 128, point: lathePoint(cutProfile),
    color: ([x, , z], u, v) => {
      const crumb = fbm(x * 300, 0, z * 300, 3, 21);
      let c = mix(hex('#f4e6c8'), hex('#e7cf9e'), crumb);
      if (style === 'grilled') c = mix(c, hex('#a86b33'), smooth(0.6, 1, v) * 0.7);
      return mix(c, hex('#d9b077'), smooth(0.85, 1, v));
    },
    height: ([x, , z]) => fbm(x * 500, 0, z * 500, 2, 22),
  });
  const cut = new THREE.Mesh(cutGeo, material({ ...cutMaps, roughness: 0.85, side: THREE.DoubleSide }));

  const meshes = [crust, cut];

  if (seeds) {
    const parts = [];
    const up = new THREE.Vector3(0, 1, 0);
    const pos = geo.attributes.position, nor = geo.attributes.normal;
    const candidates = [];
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) > H * 0.32) candidates.push(i);
    for (let i = 0; i < seeds; i++) {
      // Random vertex on the upper dome, nudged so seeds don't line up
      const vi = candidates[Math.floor(rand() * candidates.length)];
      const nrm = new THREE.Vector3().fromBufferAttribute(nor, vi);
      const at = new THREE.Vector3().fromBufferAttribute(pos, vi);
      at.x += range(-0.002, 0.002);
      at.z += range(-0.002, 0.002);
      const s = new THREE.SphereGeometry(1, 6, 4);
      s.scale(0.0021, 0.0007, 0.0012);
      s.rotateY(range(0, TAU));
      s.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, nrm));
      s.translate(at.x, at.y + 0.0004, at.z);
      parts.push(s);
    }
    meshes.push(new THREE.Mesh(mergeGeometries(parts), material({ color: '#f1d68c', roughness: 0.5 })));
  }
  return node(name, ...meshes);
}

/** Bottom bun: crust shell with a toasted cut face on top. */
function bottomBun({ name = 'Bottom_Bun', radius, height, style }) {
  const R = radius, H = height;
  const raw = [[0, 0], [R * 0.82, 0], [R * 0.96, H * 0.18], [R, H * 0.55], [R * 0.985, H * 0.85], [R * 0.95, H]];
  const profile = resample(raw, 40);
  const geo = lathe(profile, 96, (p) => {
    const a = Math.atan2(p.x, p.z), r = Math.hypot(p.x, p.z);
    const wob = 1 + (angNoise(a, 1.5, 31) - 0.5) * 0.05 + (fbm(p.x * 50, p.y * 50, p.z * 50, 3, 33) - 0.5) * 0.02;
    p.x *= wob;
    p.z *= wob;
    void r;
  });
  const pal = {
    soft: [hex('#e9cf9f'), hex('#d39c55')],
    grilled: [hex('#ecd3a0'), hex('#d2a05e')],
    brioche: [hex('#e7b77a'), hex('#c47a33')],
  }[style];
  const maps = paintMaps({
    w: TEX.color, h: 256, point: lathePoint(profile),
    color: ([x, y, z], u, v) => {
      const n = fbm(x * 80, y * 80, z * 80, 4, 34);
      let c = mix(pal[0], pal[1], smooth(0.25, 0.75, v) * (0.7 + n * 0.5));
      if (style === 'grilled') {
        // Poppy seeds and a charred rim
        if (hash3(Math.floor(x * 1400), Math.floor(y * 1400), Math.floor(z * 1400), 5) > 0.985) c = hex('#2a2320');
        c = mix(c, hex('#2d1a0f'), smooth(0.86, 1, v) * smooth(0.35, 0.75, fbm(x * 60, y * 60, z * 60, 3, 36)));
      }
      return shade(c, 0.95 + hash3(Math.floor(x * 3000), Math.floor(y * 3000), Math.floor(z * 3000)) * 0.07);
    },
    height: ([x, y, z]) => fbm(x * 260, y * 260, z * 260, 3, 37),
  });
  const crust = new THREE.Mesh(geo, material({ ...maps, roughness: style === 'brioche' ? 0.45 : 0.72, clearcoat: style === 'brioche' ? 0.4 : 0, normalScale: 0.6 }));

  const cutProfile = resample([[0, H], [R * 0.95, H]], 20);
  const cutGeo = new THREE.LatheGeometry(cutProfile.map(([r, y]) => new THREE.Vector2(r, y)), 96);
  const cutMaps = paintMaps({
    w: TEX.small, h: 128, point: lathePoint(cutProfile),
    color: ([x, , z], u, v) => {
      const n = fbm(x * 220, 0, z * 220, 4, 41);
      const toast = style === 'grilled' ? 0.9 : style === 'brioche' ? 0.55 : 0.35;
      let c = mix(hex('#f1dfb8'), hex('#c98a45'), clamp01(n * toast * 1.4 + smooth(0.7, 1, v) * 0.4));
      if (style === 'grilled') {
        c = mix(hex('#c58a4c'), hex('#6e3e1b'), smooth(0.35, 0.75, n));
        c = mix(c, hex('#2a170b'), smooth(0.62, 0.85, n) * 0.8);
      }
      return c;
    },
    height: ([x, , z]) => fbm(x * 450, 0, z * 450, 2, 42),
  });
  const cut = new THREE.Mesh(cutGeo, material({ ...cutMaps, roughness: 0.8, side: THREE.DoubleSide }));
  return node(name, crust, cut);
}

/** Beef patty. style: 'chunky' (thick, lumpy) or 'smash' (thin, lacy crust edge). */
function patty({ name, radius, height, style = 'chunky', pepper = false, s = 0 }) {
  const R = radius, H = height;
  const raw = [[0, 0], [R * 0.85, 0], [R * 0.98, H * 0.2], [R, H * 0.5], [R * 0.98, H * 0.8], [R * 0.85, H], [0, H]];
  const profile = resample(raw, 40);
  const smash = style === 'smash';
  const geo = lathe(profile, 96, (p, n) => {
    const a = Math.atan2(p.x, p.z), r = Math.hypot(p.x, p.z), k = r / R;
    // Ragged outline (lacy for smash patties)
    const edge = smash
      ? (angNoise(a, 3.2, 50 + s, 4) - 0.5) * 0.22 + (angNoise(a, 9, 51 + s, 2) - 0.5) * 0.08
      : (angNoise(a, 2.2, 52 + s, 3) - 0.5) * 0.12;
    const sc = 1 + edge * smooth(0.5, 1, k);
    p.x *= sc;
    p.z *= sc;
    // Lumps and crumbly ground-meat surface
    const lump = (fbm(p.x * 70, p.y * 70, p.z * 70, 3, 53 + s) - 0.5) * (smash ? 0.0024 : 0.0045);
    const crumb = (fbm(p.x * 320, p.y * 320, p.z * 320, 2, 54 + s) - 0.5) * 0.0016;
    p.addScaledVector(n, lump + crumb);
    if (smash) p.y *= 1 - smooth(0.75, 1.05, k) * 0.45; // thin crispy edge
  });
  const key = `${style}:${pepper}:${R}:${H}`;
  const maps = pattyMaps.get(key) ?? pattyMaps.set(key, paintPattyMaps(profile, smash, pepper)).get(key);
  return node(name, new THREE.Mesh(geo, maps.mat));
}

const pattyMaps = new Map();
function paintPattyMaps(profile, smash, pepper, s = 0) {
  const point = lathePoint(profile);
  const maps = paintMaps({
    w: TEX.color, h: 512, point,
    color: ([x, y, z]) => {
      const n1 = fbm(x * 120, y * 120, z * 120, 4, 60 + s);
      const n2 = fbm(x * 420, y * 420, z * 420, 2, 61 + s);
      let c = mix(hex('#6b4129'), hex('#3a2014'), smooth(0.35, 0.7, n1));
      c = mix(c, hex('#8a5838'), smooth(0.6, 0.85, n2) * 0.6); // juicy highlights
      c = mix(c, hex('#24120a'), smooth(0.62, 0.8, n1) * (smash ? 0.9 : 0.5)); // seared crust
      if (pepper && hash3(Math.floor(x * 1800), Math.floor(y * 1800), Math.floor(z * 1800), 9) > 0.975) c = hex('#1a1410');
      return c;
    },
    height: ([x, y, z]) => fbm(x * 300, y * 300, z * 300, 3, 62 + s),
    strength: 3,
  });
  maps.mat = material({ ...maps, roughness: 0.62, normalScale: 1.2 });
  return maps;
}

/** Square cheese slice draped over whatever is under it. */
function cheese({ name, size, dropFrom, rot = 0, color = '#f6b41c', s = 0 }) {
  const seg = 32;
  const geo = new THREE.BoxGeometry(size, 0.0018, size, seg, 1, seg);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x0 = pos.getX(i), z0 = pos.getZ(i);
    const hx0 = Math.abs(x0) / (size / 2), hz0 = Math.abs(z0) / (size / 2), m0 = Math.max(hx0, hz0);
    const k0 = m0 > 1e-6 ? 1 / Math.pow(Math.pow(hx0 / m0, 3.2) + Math.pow(hz0 / m0, 3.2), 1 / 3.2) : 1;
    const x = x0 * k0, z = z0 * k0;
    const r = Math.hypot(x, z), a = Math.atan2(x, z);
    const over = Math.max(0, r - dropFrom);
    // Melted droop past the patty edge, with a few longer drips
    const drip = smooth(0.62, 0.85, angNoise(a, 2.5, 70 + s)) * 0.6;
    const droop = over * over * (25 + drip * 60) + over * (0.35 + drip * 0.5);
    pos.setY(i, pos.getY(i) - droop + (fbm(x * 60, 0, z * 60, 2, 71 + s) - 0.5) * 0.0012);
    // Round the corners: map the square onto a superellipse (soft, melted corners)
    pos.setX(i, x);
    pos.setZ(i, z);
  }
  geo.rotateY(rot);
  geo.computeVertexNormals();
  return node(name, new THREE.Mesh(geo, material({ color, roughness: 0.32, clearcoat: 0.3 })));
}

/**
 * Thin irregular "sheet" built on a lathe disc: sauces, lettuce leaves.
 * radiusFn(a) → outline scale, dropFn(r, a) → vertical sag.
 */
function sheet({ radius, thickness, rings = 18, segments = 96, outline, sag, ruffle }) {
  const R = radius, T = thickness;
  const raw = [[0, 0], [R * 0.98, 0], [R, T * 0.5], [R * 0.98, T * 0.9], [0, T]];
  const profile = resample(raw, rings * 2);
  return lathe(profile, segments, (p) => {
    const a = Math.atan2(p.x, p.z), r = Math.hypot(p.x, p.z);
    const sc = outline ? outline(a) : 1;
    p.x *= sc;
    p.z *= sc;
    const rr = r * sc;
    if (sag) p.y -= sag(rr, a);
    if (ruffle) p.y += ruffle(rr, a, p);
  });
}

function sauce({ name, radius, color, rimFrom, drips = 0.6, roughness = 0.25, s = 0 }) {
  const geo = sheet({
    radius,
    thickness: 0.004,
    outline: (a) => 1 + (angNoise(a, 2.4, 80 + s) - 0.5) * 0.35,
    sag: (r, a) => {
      const over = Math.max(0, r - rimFrom);
      const drip = smooth(0.6, 0.85, angNoise(a, 3, 81 + s)) * drips;
      return over * over * (40 + drip * 60) + over * drip * 0.15;
    },
  });
  return node(name, new THREE.Mesh(geo, material({ color, roughness, clearcoat: 0.5 })));
}

function lettuceLeaf({ name, radius, rimFrom, s = 0 }) {
  const profileR = radius;
  const geo = sheet({
    radius: profileR,
    thickness: 0.0016,
    rings: 22,
    segments: 128,
    outline: (a) => 1 + (angNoise(a, 4, 90 + s, 4) - 0.5) * 0.35,
    sag: (r) => Math.max(0, r - rimFrom) ** 2 * 16,
    ruffle: (r, a) => (Math.sin(a * 13 + angNoise(a, 2, 91 + s) * 8) * 0.004 + (angNoise(a, 6, 92 + s) - 0.5) * 0.006) * smooth(0.4, 1, r / profileR),
  });
  const pos = geo.attributes.position;
  // Planar UVs for leaf colour (veins radiate from the centre)
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / (profileR * 2.8) + 0.5;
    uv[i * 2 + 1] = pos.getZ(i) / (profileR * 2.8) + 0.5;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const pt = (u, v) => [(u - 0.5) * profileR * 2.8, 0, (v - 0.5) * profileR * 2.8];
  const maps = paintMaps({
    w: TEX.small, h: TEX.small, point: pt,
    color: ([x, , z]) => {
      const r = Math.hypot(x, z) / profileR, a = Math.atan2(x, z);
      const f = ((((a / TAU) * 22 + fbm(x * 40, 0, z * 40, 2, 93) * 1.5) % 1) + 1) % 1;
      const vein = 1 - smooth(0, 0.06, Math.min(f, 1 - f));
      let c = mix(hex('#e3edb0'), hex('#86b545'), smooth(0.35, 1.05, r) * (0.7 + fbm(x * 90, 0, z * 90, 3, 94) * 0.5));
      c = mix(c, hex('#eef4cf'), vein * 0.5);
      return c;
    },
    height: ([x, , z]) => fbm(x * 160, 0, z * 160, 3, 95),
  });
  return node(name, new THREE.Mesh(geo, material({ ...maps, roughness: 0.5, side: THREE.DoubleSide })));
}

/** Shredded iceberg: hundreds of thin curled ribbons. */
function shreddedLettuce({ name, radius, height, count = 220 }) {
  const light = [], dark = [];
  for (let i = 0; i < count; i++) {
    const g = new THREE.PlaneGeometry(range(0.018, 0.04), range(0.003, 0.006), 8, 1);
    const p = g.attributes.position;
    const curl = range(-60, 60);
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k);
      p.setZ(k, x * x * curl * 0.5);
    }
    g.computeVertexNormals();
    const a = range(0, TAU), r = Math.sqrt(rand()) * radius;
    place(g, { x: Math.sin(a) * r, y: range(0, height) * (1 - (r / radius) * 0.5), z: Math.cos(a) * r, rx: range(-1.2, 1.2) - Math.PI / 2, ry: range(0, TAU), rz: range(-0.6, 0.6) });
    (rand() > 0.35 ? light : dark).push(g);
  }
  return node(
    name,
    new THREE.Mesh(mergeGeometries(light), material({ color: '#d7e8a4', roughness: 0.5, side: THREE.DoubleSide })),
    new THREE.Mesh(mergeGeometries(dark), material({ color: '#a9cf6a', roughness: 0.5, side: THREE.DoubleSide })),
  );
}

/** Breaded onion ring: displaced torus with crumb texture. */
let ringMaps = null;
function onionRing({ R, tube, s = 0 }) {
  const geo = new THREE.TorusGeometry(R, tube, 28, 96);
  geo.computeVertexNormals();
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    const a = Math.atan2(p.y, p.x);
    const swell = (angNoise(a, 2, 100 + s) - 0.5) * tube * 0.5;
    const crumb = (fbm(p.x * 350, p.y * 350, p.z * 350, 2, 101 + s) - 0.5) * 0.0018;
    p.addScaledVector(n, swell + crumb);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  smoothSeams(geo);
  geo.rotateX(Math.PI / 2); // lie flat
  if (!ringMaps) {
    const pt = (u, v) => {
      const t = u * TAU, ph = v * TAU;
      return [(R + tube * Math.cos(ph)) * Math.cos(t), tube * Math.sin(ph), (R + tube * Math.cos(ph)) * Math.sin(t)];
    };
    ringMaps = paintMaps({
      w: TEX.color, h: 256, point: pt,
      color: ([x, y, z]) => {
        const n1 = fbm(x * 240, y * 240, z * 240, 4, 102);
        const n2 = noise3(x * 900, y * 900, z * 900, 103);
        let c = mix(hex('#d98f3c'), hex('#9a4f1a'), smooth(0.35, 0.75, n1));
        c = mix(c, hex('#f0b867'), smooth(0.7, 0.95, n2) * 0.6);
        return mix(c, hex('#6e3410'), smooth(0.72, 0.9, n1) * 0.5);
      },
      height: ([x, y, z]) => fbm(x * 600, y * 600, z * 600, 2, 104),
      strength: 3.5,
    });
    ringMaps.mat = material({ ...ringMaps, roughness: 0.6, normalScale: 1.3 });
  }
  return new THREE.Mesh(geo, ringMaps.mat);
}

/** Jalapeño slices. long=true for diagonal cut pickled strips. */
function jalapenos({ name, count, area, y, long = false, skin = '#4f6a1c', flesh = ['#8fa83a', '#a9b955'], s = 0 }) {
  const capMaps = paintMaps({
    w: TEX.small, h: TEX.small, point: (u, v) => [u - 0.5, 0, v - 0.5],
    color: ([x, , z]) => {
      const r = Math.hypot(x, z) * 2;
      const n = fbm(x * 30, 0, z * 30, 3, 110 + s);
      let c = r > 0.86 ? hex(skin) : r > 0.6 ? mix(hex(flesh[0]), hex(flesh[1]), n) : mix(hex('#d8d48a'), hex('#c5c46c'), n);
      // Seeds around the core
      const a = Math.atan2(x, z);
      const seedRing = Math.abs(r - 0.35) < 0.09 && Math.abs(Math.sin(a * 5 + 0.4)) > 0.8;
      if (seedRing) c = hex('#efe7b8');
      if (r < 0.14) c = hex('#e6e2b0');
      return c;
    },
  });
  const sideMat = material({ color: skin, roughness: 0.25, clearcoat: 0.6 });
  const capMat = material({ ...capMaps, roughness: 0.3, clearcoat: 0.5 });
  const g = new THREE.Group();
  g.name = name;
  for (let i = 0; i < count; i++) {
    const r0 = range(0.009, 0.0125);
    const geo = new THREE.CylinderGeometry(r0, r0, 0.0028, 32, 1);
    if (long) geo.scale(2.4, 1, 1);
    const m = new THREE.Mesh(geo, [sideMat, capMat, capMat]);
    const a = range(0, TAU), rr = Math.sqrt(rand()) * area;
    m.position.set(Math.sin(a) * rr, y + range(-0.003, 0.004), Math.cos(a) * rr);
    m.rotation.set(range(-0.35, 0.35), range(0, TAU), range(-0.35, 0.35));
    g.add(m);
  }
  return g;
}

/** Cured meat slices (beef salami / pepperoni), optionally folded. */
function meatSlices({ name, count, radius, fold = 0, area = 0, color = '#c2433a', s = 0 }) {
  const profile = resample([[0, 0], [radius, 0], [radius * 1.01, 0.0012], [radius, 0.0024], [0, 0.0026]], 30);
  const maps = paintMaps({
    w: TEX.small, h: 128, point: lathePoint(profile),
    color: ([x, y, z]) => {
      const n = fbm(x * 160, y * 160, z * 160, 3, 120 + s);
      let c = mix(hex(color), shade(hex(color), 0.72), n);
      const fat = noise3(x * 700, y * 700, z * 700, 121 + s);
      if (fat > 0.78) c = mix(c, hex('#f2d6c8'), smooth(0.78, 0.86, fat));
      return c;
    },
  });
  const mat = material({ ...maps, roughness: 0.45, clearcoat: 0.35 });
  const g = new THREE.Group();
  g.name = name;
  for (let i = 0; i < count; i++) {
    const geo = lathe(profile, 64, (p) => {
      const a = Math.atan2(p.x, p.z);
      const sc = 1 + (angNoise(a, 2, 122 + s + i) - 0.5) * 0.08;
      p.x *= sc;
      p.z *= sc;
      p.y += p.x * p.x * fold + Math.abs(p.z) * fold * 0.02;
    });
    const m = new THREE.Mesh(geo, mat);
    const a = (i / count) * TAU + range(-0.4, 0.4);
    m.position.set(Math.sin(a) * area, i * 0.0012, Math.cos(a) * area);
    m.rotation.set(range(-0.12, 0.12), range(0, TAU), range(-0.12, 0.12));
    g.add(m);
  }
  return g;
}

/** Thin raw red-onion rings. */
function redOnion({ name, count, area }) {
  const pt = (u, v) => [u, v, 0];
  const maps = paintMaps({
    w: 256, h: 128, point: pt,
    color: ([, v]) => {
      // v runs around the tube: outer edge purple, cut faces white-pink
      const outer = Math.cos(v * TAU);
      return mix(hex('#f5ebf2'), hex('#8e2f6a'), smooth(0.55, 0.95, outer));
    },
  });
  const mat = material({ ...maps, roughness: 0.3, clearcoat: 0.6 });
  const g = new THREE.Group();
  g.name = name;
  for (let i = 0; i < count; i++) {
    const geo = new THREE.TorusGeometry(range(0.02, 0.034), 0.0026, 10, 72, TAU * range(0.7, 1));
    geo.scale(1, 1, 0.5);
    geo.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(geo, mat);
    const a = range(0, TAU), r = range(0, area);
    m.position.set(Math.sin(a) * r, i * 0.0012, Math.cos(a) * r);
    m.rotation.set(range(-0.15, 0.15), range(0, TAU), range(-0.15, 0.15));
    g.add(m);
  }
  return g;
}

/** Soft white cheese slab (goat/cream cheese), squashed and crumbly. */
function whiteCheese({ name, radius, height }) {
  const R = radius, H = height;
  const profile = resample([[0, 0], [R * 0.9, 0], [R, H * 0.5], [R * 0.9, H], [0, H]], 28);
  const geo = lathe(profile, 96, (p, n) => {
    const a = Math.atan2(p.x, p.z);
    const sc = 1 + (angNoise(a, 2.6, 130, 4) - 0.5) * 0.4;
    p.x *= sc;
    p.z *= sc;
    p.addScaledVector(n, (fbm(p.x * 120, p.y * 120, p.z * 120, 3, 131) - 0.5) * 0.003);
    const r = Math.hypot(p.x, p.z);
    p.y -= Math.max(0, r - R * 0.75) ** 2 * 8; // slumps over the patty edge
  });
  return node(name, new THREE.Mesh(geo, material({ color: '#f4f0e6', roughness: 0.78 })));
}

/* ============================================================== dishes */

/** Quadra: tall stack with four patties. Reference: user photo 1. */
function quadra() {
  seed = 101;
  const root = new THREE.Group();
  root.name = 'Quadra';
  let y = 0;
  const add = (obj, at) => {
    obj.position.y = at;
    root.add(obj);
  };

  add(bottomBun({ radius: 0.062, height: 0.024, style: 'soft' }), y);
  y += 0.024;
  const ket = sauce({ name: 'Ketchup', radius: 0.05, color: '#8f1b12', rimFrom: 0.06, s: 1 });
  add(ket, y - 0.001);
  add(lettuceLeaf({ name: 'Lettuce', radius: 0.064, rimFrom: 0.055, s: 2 }), y + 0.002);
  y += 0.008;
  for (let i = 1; i <= 4; i++) {
    const p = patty({ name: `Patty_${i}`, radius: 0.064, height: 0.017, style: 'chunky', s: i * 7 });
    p.rotation.y = i * 1.3;
    add(p, y);
    y += 0.017;
    add(cheese({ name: `Cheese_${i}`, size: 0.118, dropFrom: 0.06, rot: i * 0.5, s: i }), y + 0.0005);
    y += 0.0025;
  }
  add(meatSlices({ name: 'Beef_Salami', count: 1, radius: 0.057, color: '#c44a3c', s: 3 }), y);
  y += 0.003;

  const rings = node('Onion_Rings');
  const r1 = onionRing({ R: 0.03, tube: 0.0095 });
  r1.position.set(-0.03, 0.01, 0.006);
  r1.rotation.set(0.1, 0, 0.14);
  const r2 = onionRing({ R: 0.031, tube: 0.0095 });
  r2.position.set(0.029, 0.012, -0.008);
  r2.rotation.set(-0.06, 0, -0.16);
  rings.add(r1, r2);
  add(rings, y);

  add(jalapenos({ name: 'Jalapenos', count: 10, area: 0.05, y: 0.019, long: true, skin: '#3f4a14', flesh: ['#7d7f2c', '#9a9440'], s: 4 }), y);
  y += 0.024;
  add(sauce({ name: 'Mayo', radius: 0.045, color: '#f3efe3', rimFrom: 0.035, drips: 1.2, roughness: 0.3, s: 5 }), y);
  y += 0.002;
  add(topBun({ radius: 0.064, height: 0.052, style: 'soft', seeds: 160 }), y);
  return root;
}

/** Classic: grilled bun, patty, white cheese, red onion. Reference: user photo 2. */
function classic() {
  seed = 202;
  const root = new THREE.Group();
  root.name = 'Classic_Burger';
  let y = 0;
  const add = (obj, at) => {
    obj.position.y = at;
    root.add(obj);
  };
  add(bottomBun({ radius: 0.06, height: 0.026, style: 'grilled' }), y);
  y += 0.026;
  const p = patty({ name: 'Patty', radius: 0.053, height: 0.024, style: 'chunky', pepper: true, s: 3 });
  add(p, y);
  y += 0.024;
  add(whiteCheese({ name: 'White_Cheese', radius: 0.05, height: 0.006 }), y - 0.001);
  y += 0.005;
  add(redOnion({ name: 'Red_Onion', count: 7, area: 0.03 }), y);
  y += 0.006;
  add(topBun({ radius: 0.062, height: 0.046, style: 'grilled' }), y);
  return root;
}

/** Double Crunch: smash patties, onion rings, jalapeños. Reference: user photo 3. */
function doubleCrunch() {
  seed = 303;
  const root = new THREE.Group();
  root.name = 'Double_Crunch';
  let y = 0;
  const add = (obj, at) => {
    obj.position.y = at;
    root.add(obj);
  };
  add(bottomBun({ radius: 0.06, height: 0.026, style: 'brioche' }), y);
  y += 0.026;
  add(sauce({ name: 'Pink_Sauce', radius: 0.05, color: '#f0b9a2', rimFrom: 0.05, roughness: 0.35, s: 6 }), y - 0.001);
  add(shreddedLettuce({ name: 'Lettuce', radius: 0.06, height: 0.012, count: 320 }), y + 0.001);
  y += 0.012;
  for (let i = 1; i <= 2; i++) {
    const p = patty({ name: `Patty_${i}`, radius: 0.066, height: 0.012, style: 'smash', s: 20 + i * 5 });
    p.rotation.y = i * 2.1;
    add(p, y);
    y += 0.012;
    add(cheese({ name: `Cheese_${i}`, size: 0.108, dropFrom: 0.058, rot: 0.4 + i * 0.7, s: 10 + i }), y + 0.0004);
    y += 0.0024;
  }
  add(meatSlices({ name: 'Pepperoni', count: 4, radius: 0.03, fold: 14, area: 0.028, color: '#b0624f', s: 7 }), y + 0.002);
  y += 0.007;
  add(jalapenos({ name: 'Jalapenos', count: 9, area: 0.05, y: 0.001, skin: '#4a6119', flesh: ['#86973a', '#a3a64e'], s: 8 }), y);
  y += 0.004;
  const rings = node('Onion_Rings');
  const r1 = onionRing({ R: 0.03, tube: 0.011 });
  r1.position.set(-0.03, 0.011, 0);
  r1.rotation.set(0, 0, 0.18);
  const r2 = onionRing({ R: 0.03, tube: 0.011 });
  r2.position.set(0.03, 0.011, 0.002);
  r2.rotation.set(0, 0, -0.18);
  rings.add(r1, r2);
  add(rings, y);
  y += 0.024;
  add(sauce({ name: 'Garlic_Sauce', radius: 0.05, color: '#efe9de', rimFrom: 0.04, drips: 1.4, roughness: 0.3, s: 9 }), y);
  y += 0.002;
  add(topBun({ radius: 0.062, height: 0.06, style: 'brioche' }), y);
  return root;
}

/* ============================================================== export */

const exporter = new GLTFExporter();
mkdirSync(OUT_DIR, { recursive: true });

const models = {
  'quadra.glb': quadra,
  'classic-burger.glb': classic,
  'double-crunch.glb': doubleCrunch,
};

for (const [file, build] of Object.entries(models)) {
  ringMaps = null;
  pattyMaps.clear();
  const root = build();
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const glb = await exporter.parseAsync(root, { binary: true, maxTextureSize: 1024 });
  writeFileSync(resolve(OUT_DIR, file), Buffer.from(glb));
  console.log(
    `✔ ${file.padEnd(20)} ${(glb.byteLength / 1024).toFixed(0).padStart(5)} KB  ` +
      `${(size.x * 100).toFixed(1)} × ${(size.y * 100).toFixed(1)} cm  nodes: ${root.children.map((c) => c.name).join(', ')}`,
  );
}
