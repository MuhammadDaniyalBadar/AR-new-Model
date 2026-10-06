/**
 * Shared library for building food models procedurally: noise, painted
 * textures, and parts (buns, patties, cheese, sauces, fried coatings,
 * packaging...). Each restaurant's dishes live in scripts/models/<id>.mjs.
 *
 * Conventions: meters, origin at the bottom centre of the dish, one named
 * node per component part.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Canvas, ImageData } from '@napi-rs/canvas';
import * as THREE from 'three';
export { THREE };
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
export { mergeGeometries };

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

export const TAU = Math.PI * 2;

/* ------------------------------------------------------------ randomness */

export let seed = 4242;
export const setSeed = (s) => (seed = s);
export const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
export const range = (a, b) => a + rand() * (b - a);

export function hash3(x, y, z, s = 0) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177) ^ Math.imul(s, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
export const fade = (t) => t * t * (3 - 2 * t);
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const smooth = (a, b, v) => fade(clamp01((v - a) / (b - a)));

/** 3D value noise in [0, 1]. */
export function noise3(x, y, z, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const u = fade(x - xi), v = fade(y - yi), w = fade(z - zi);
  const h = (a, b, c) => hash3(xi + a, yi + b, zi + c, s);
  return lerp(
    lerp(lerp(h(0, 0, 0), h(1, 0, 0), u), lerp(h(0, 1, 0), h(1, 1, 0), u), v),
    lerp(lerp(h(0, 0, 1), h(1, 0, 1), u), lerp(h(0, 1, 1), h(1, 1, 1), u), v),
    w,
  );
}
export function fbm(x, y, z, octaves = 4, s = 0) {
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
export const angNoise = (theta, freq, s = 0, oct = 3) => fbm(Math.cos(theta) * freq, Math.sin(theta) * freq, 0.5, oct, s);

/* ------------------------------------------------------------- colours */

export const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
export const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

/* ------------------------------------------------------------ textures */

export const TEX = { color: 1024, small: 512 };

export function canvasFromPixels(w, h, fill) {
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

export function makeTexture(canvas, srgb) {
  const t = new THREE.Texture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.userData.mimeType = 'image/jpeg';
  t.needsUpdate = true;
  return t;
}

/** Paint colour + normal maps from functions of a surface point. */
export function paintMaps({ w, h, point, color, height, strength = 1.5 }) {
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

export function material({ map, normalMap, color = '#ffffff', roughness = 0.7, clearcoat = 0, side, normalScale = 1 }) {
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
export function resample(points, n) {
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
export function lathePoint(profile) {
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
export function smoothSeams(geo) {
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
export function lathe(profile, segments, deform) {
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

export const place = (geo, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) =>
  geo.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(sx, sy, sz),
    ),
  );

export function node(name, ...meshes) {
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
export function topBun({ name = 'Top_Bun', radius, height, style, seeds = 0 }) {
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
    potato: { base: hex('#f3cf92'), crown: hex('#df9343'), deep: hex('#c8752f') },
    dusted: { base: hex('#f1cf96'), crown: hex('#de9a4a'), deep: hex('#c27531') },
  }[style];

  const point = lathePoint(profile);
  const maps = paintMaps({
    w: TEX.color, h: 512, point,
    color: ([x, y, z], u, v) => {
      const n = fbm(x * 90, y * 90, z * 90, 4);
      const brown = smooth(0.12, style === 'brioche' || style === 'potato' ? 0.6 : 0.85, v) * (0.75 + n * 0.5);
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
      if (style === 'dusted') {
        // Toasted crumb dusting on the crown (orange and pale flecks)
        const fleck = hash3(Math.floor(x * 2600), Math.floor(y * 2600), Math.floor(z * 2600), 77);
        const on = smooth(0.25, 0.55, v);
        if (fleck > 0.86) c = mix(c, hex('#e07b25'), on * 0.85);
        else if (fleck < 0.08) c = mix(c, hex('#f8e6b8'), on * 0.8);
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
    material({
      ...maps,
      roughness: { brioche: 0.42, potato: 0.55 }[style] ?? 0.7,
      clearcoat: { brioche: 0.55, potato: 0.2 }[style] ?? 0,
      normalScale: 0.6,
    }),
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
export function bottomBun({ name = 'Bottom_Bun', radius, height, style }) {
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
    potato: [hex('#f0c886'), hex('#d88c3c')],
    dusted: [hex('#f2d39c'), hex('#dca55a')],
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
      const toast = style === 'grilled' ? 0.9 : style === 'brioche' || style === 'potato' ? 0.55 : 0.35;
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
export function patty({ name, radius, height, style = 'chunky', pepper = false, s = 0 }) {
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
export function paintPattyMaps(profile, smash, pepper, s = 0) {
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
export function cheese({ name, size, dropFrom, rot = 0, color = '#f6b41c', s = 0 }) {
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
export function sheet({ radius, thickness, rings = 18, segments = 96, outline, sag, ruffle }) {
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

export function sauce({ name, radius, color, rimFrom, drips = 0.6, roughness = 0.25, s = 0 }) {
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

export function lettuceLeaf({ name, radius, rimFrom, s = 0 }) {
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
export function shreddedLettuce({ name, radius, height, count = 220 }) {
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
export function resetCaches() {
  ringMaps = null;
  pattyMaps.clear();
  filletMaps?.clear();
  nuggetMat = null;
}
export function onionRing({ R, tube, s = 0 }) {
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
export function jalapenos({ name, count, area, y, long = false, skin = '#4f6a1c', flesh = ['#8fa83a', '#a9b955'], radius = [0.009, 0.0125], thickness = 0.0028, spread = 0.35, s = 0 }) {
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
    const r0 = range(radius[0], radius[1]);
    const geo = new THREE.CylinderGeometry(r0, r0, thickness, 32, 1);
    if (long) geo.scale(2.4, 1, 1);
    const m = new THREE.Mesh(geo, [sideMat, capMat, capMat]);
    const a = range(0, TAU), rr = Math.sqrt(rand()) * area;
    m.position.set(Math.sin(a) * rr, y + range(-0.003, 0.004), Math.cos(a) * rr);
    m.rotation.set(range(-spread, spread), range(0, TAU), range(-spread, spread));
    g.add(m);
  }
  return g;
}

/** Dill pickle chips (same construction as jalapeño slices, bigger and paler). */
export function pickles({ name = 'Pickles', count, area, y = 0, s = 0, radius = [0.014, 0.017] }) {
  return jalapenos({ name, count, area, y, skin: '#4f5d1d', flesh: ['#a8a947', '#bdb95c'], radius, thickness: 0.003, spread: 0.18, s });
}

/** Cured meat slices (beef salami / pepperoni), optionally folded. */
export function meatSlices({ name, count, radius, fold = 0, area = 0, color = '#c2433a', s = 0 }) {
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
export function redOnion({ name, count, area }) {
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
export function whiteCheese({ name, radius, height }) {
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

/* ============================================================== export */

/** Build and write each model: { 'file.glb': () => THREE.Group } into outDir. */
export async function exportModels(models, outDir) {
  const exporter = new GLTFExporter();
  mkdirSync(outDir, { recursive: true });
  for (const [file, build] of Object.entries(models)) {
    resetCaches();
    const root = build();
    const box = new THREE.Box3().setFromObject(root, true);
    const size = box.getSize(new THREE.Vector3());
    const glb = await exporter.parseAsync(root, { binary: true, maxTextureSize: 1024 });
    writeFileSync(resolve(outDir, file), Buffer.from(glb));
    console.log(
      `✔ ${file.padEnd(28)} ${(glb.byteLength / 1024).toFixed(0).padStart(5)} KB  ` +
        `${(size.x * 100).toFixed(1)} × ${(size.y * 100).toFixed(1)} × ${(size.z * 100).toFixed(1)} cm  ` +
        `nodes: ${root.children.map((c) => c.name).join(', ')}`,
    );
  }
}

/* ======================================================== more parts */

/**
 * Fried / breaded chicken fillet.
 *   crispy:    flaky, craggy golden coating (classic fried chicken)
 *   nashville: tight craggy coating, deep red-brown with spice
 *   shredded:  very craggy, shaggy strands of fried batter
 *   smooth:    fine-crumb breaded patty (nugget-style coating)
 */
const filletMaps = new Map();
export function friedFillet({ name, width, depth, height, style = 'crispy', s = 0 }) {
  const H = height;
  // Domed, not cylindrical: a fillet is widest near the middle and tapers on top.
  const raw = [[0, 0], [0.88, 0], [1, H * 0.3], [0.97, H * 0.6], [0.8, H * 0.85], [0.42, H], [0, H]];
  const profile = resample(raw, 40);
  const P = {
    crispy: { blob: 0.16, blobF: 26, crag: 0.0055, cragF: 55, crumb: 0.0016 },
    shredded: { blob: 0.24, blobF: 20, crag: 0.0095, cragF: 42, crumb: 0.0022 },
    nashville: { blob: 0.14, blobF: 24, crag: 0.005, cragF: 70, crumb: 0.0018 },
    smooth: { blob: 0.04, blobF: 16, crag: 0.0006, cragF: 60, crumb: 0.0005 },
  }[style];
  const geo = lathe(profile, 112, (p, n) => {
    p.x *= width / 2;
    p.z *= depth / 2;
    n.set(n.x * (2 / width), n.y, n.z * (2 / depth)).normalize();
    // 3D lumps so the outline is ragged at every height (not vertical ribs)
    const blob = (fbm(p.x * P.blobF, p.y * P.blobF * 0.7, p.z * P.blobF, 3, 200 + s) - 0.5) * P.blob * (width / 2);
    // Ridged noise = sharp craggy peaks of fried batter
    const rn = 1 - Math.abs(fbm(p.x * P.cragF, p.y * P.cragF, p.z * P.cragF, 3, 201 + s) * 2 - 1);
    const crumb = (fbm(p.x * 380, p.y * 380, p.z * 380, 2, 202 + s) - 0.5) * P.crumb;
    p.addScaledVector(n, blob + rn * rn * P.crag + crumb);
  });
  const pal = {
    crispy: ['#dfa863', '#a86529', '#f2cb8a'],
    shredded: ['#d9a059', '#9a5820', '#f4d096'],
    nashville: ['#9b3414', '#5a1a0b', '#c4581f'],
    smooth: ['#ec8f3c', '#c4601d', '#f6b464'],
  }[style];
  const key = `${style}:${width}:${depth}:${H}`;
  if (!filletMaps.has(key)) {
    const point = (u, v) => {
      const [x, y, z] = lathePoint(profile)(u, v);
      return [x * (width / 2), y, z * (depth / 2)];
    };
    const maps = paintMaps({
      w: TEX.color, h: 512, point,
      color: ([x, y, z]) => {
        const n1 = fbm(x * 160, y * 160, z * 160, 4, 210 + s);
        const n2 = noise3(x * 900, y * 900, z * 900, 211 + s);
        let c = mix(hex(pal[0]), hex(pal[1]), smooth(0.4, 0.78, n1));
        c = mix(c, hex(pal[2]), smooth(0.68, 0.92, n2) * 0.55);
        if (style === 'nashville' && hash3(Math.floor(x * 1600), Math.floor(y * 1600), Math.floor(z * 1600), 212) > 0.97) c = hex('#2b0b05');
        return c;
      },
      height: ([x, y, z]) => fbm(x * 520, y * 520, z * 520, 2, 213 + s),
      strength: style === 'smooth' ? 2.5 : 3.5,
    });
    maps.mat = material({ ...maps, roughness: style === 'nashville' ? 0.45 : 0.6, clearcoat: style === 'nashville' ? 0.35 : 0, normalScale: 1.2 });
    filletMaps.set(key, maps);
  }
  return node(name, new THREE.Mesh(geo, filletMaps.get(key).mat));
}

/** Thick griddled toast slice (Texas toast), as a rounded slab. */
export function toastSlab({ name, width, depth, height, s = 0 }) {
  const r = Math.min(height * 0.45, 0.008);
  const geo = new THREE.BoxGeometry(width, height, depth, 28, 6, 28);
  const pos = geo.attributes.position;
  const hx = width / 2 - r, hy = height / 2 - r, hz = depth / 2 - r;
  const p = new THREE.Vector3(), inner = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    inner.set(Math.max(-hx, Math.min(hx, p.x)), Math.max(-hy, Math.min(hy, p.y)), Math.max(-hz, Math.min(hz, p.z)));
    const d = p.clone().sub(inner);
    if (d.lengthSq() > 0) p.copy(inner).add(d.normalize().multiplyScalar(r));
    // Bread isn't perfectly flat
    p.y += (fbm(p.x * 30, 0, p.z * 30, 2, 220 + s) - 0.5) * 0.002 + (p.y > 0 ? 0.0015 * (1 - (p.x / width) ** 2 * 4) : 0);
    p.y += height / 2;
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  geo.computeVertexNormals();
  const face = paintMaps({
    w: TEX.small, h: TEX.small, point: (u, v) => [u * width, 0, v * depth],
    color: ([x, , z], u, v) => {
      const n = fbm(x * 70, 0, z * 70, 4, 221 + s);
      const edge = Math.min(u, 1 - u, v, 1 - v);
      let c = mix(hex('#e3a65c'), hex('#b8682b'), smooth(0.25, 0.7, n) * smooth(0.01, 0.12, edge));
      c = mix(c, hex('#7c3d15'), smooth(0.6, 0.82, fbm(x * 160, 0, z * 160, 3, 222 + s)) * 0.7);
      c = mix(c, hex('#f0c27e'), (1 - smooth(0.0, 0.05, edge)) * 0.6); // paler crust rim
      return shade(c, 0.95 + hash3(Math.floor(x * 3000), 0, Math.floor(z * 3000)) * 0.08);
    },
    height: ([x, , z]) => fbm(x * 400, 0, z * 400, 3, 223 + s),
    strength: 2,
  });
  const faceMat = material({ ...face, roughness: 0.5, clearcoat: 0.25, normalScale: 0.7 });
  const sideMat = material({ color: '#e7b979', roughness: 0.75 });
  // BoxGeometry groups: +x, -x, +y, -y, +z, -z
  return node(name, new THREE.Mesh(geo, [sideMat, sideMat, faceMat, faceMat, sideMat, sideMat]));
}

/** Creamy mushroom sauce: a thick sauce layer with sliced mushrooms in it. */
export function mushroomSauce({ name, radius, rimFrom, s = 0 }) {
  const base = sauce({ name, radius, color: '#cdb197', rimFrom, drips: 0.9, roughness: 0.35, s });
  base.children[0].geometry.scale(1, 1.8, 1);
  const shape = new THREE.Shape();
  // Mushroom slice silhouette: domed cap with a short stem
  shape.moveTo(-0.0035, -0.008);
  shape.lineTo(-0.003, -0.001);
  shape.absellipse(0, 0, 0.011, 0.007, Math.PI, 0, true);
  shape.lineTo(0.003, -0.001);
  shape.lineTo(0.0035, -0.008);
  shape.lineTo(-0.0035, -0.008);
  const parts = [];
  for (let i = 0; i < 16; i++) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.0022, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0006, bevelSegments: 2, curveSegments: 10 });
    const k = range(0.75, 1.15);
    g.scale(k, k, 1);
    const a = range(0, TAU), r = Math.sqrt(rand()) * radius * 0.85;
    place(g, { x: Math.sin(a) * r, y: range(0.002, 0.008), z: Math.cos(a) * r, rx: -Math.PI / 2 + range(-0.5, 0.5), ry: range(0, TAU), rz: range(-0.3, 0.3) });
    parts.push(g);
  }
  base.add(new THREE.Mesh(mergeGeometries(parts), material({ color: '#b8987a', roughness: 0.4, clearcoat: 0.5 })));
  return base;
}

/** Sautéed / caramelised onion strands, or raw onion slivers. */
export function onionStrands({ name, count, radius, height, colors, tube = 0.0014, len: lenRange = [0.012, 0.024], roughness = 0.35, clearcoat = 0.5 }) {
  const buckets = colors.map(() => []);
  for (let i = 0; i < count; i++) {
    const a0 = range(0, TAU), r0 = Math.sqrt(rand()) * radius * 0.8;
    const start = new THREE.Vector3(Math.sin(a0) * r0, range(0, height), Math.cos(a0) * r0);
    const dir = range(0, TAU), len = range(lenRange[0], lenRange[1]);
    const pts = [start];
    for (let k = 1; k <= 3; k++) {
      const t = dir + range(-0.9, 0.9) * k * 0.4;
      const next = pts[k - 1].clone().add(new THREE.Vector3(Math.sin(t) * len / 3, range(-0.0012, 0.0012), Math.cos(t) * len / 3));
      // Keep strands on the burger instead of trailing off the edge
      const rr = Math.hypot(next.x, next.z);
      if (rr > radius) {
        next.x *= radius / rr;
        next.z *= radius / rr;
      }
      pts.push(next);
    }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, tube * range(0.8, 1.3), 5);
    buckets[i % colors.length].push(g);
  }
  return node(name, ...buckets.map((b, i) => new THREE.Mesh(mergeGeometries(b), material({ color: colors[i], roughness, clearcoat }))));
}

/** Breaded nuggets (irregular, flattened blobs with a fine crumb). */
let nuggetMat = null;
export function nuggets({ name, count, area, y = 0, heap = 0, s = 0 }) {
  if (!nuggetMat) {
    const point = (u, v) => {
      const t = u * TAU, ph = v * Math.PI;
      return [Math.sin(ph) * Math.sin(t) * 0.02, Math.cos(ph) * 0.02, Math.sin(ph) * Math.cos(t) * 0.02];
    };
    const maps = paintMaps({
      w: TEX.small, h: 256, point,
      color: ([x, y2, z]) => {
        const n1 = fbm(x * 260, y2 * 260, z * 260, 3, 240);
        const n2 = noise3(x * 1200, y2 * 1200, z * 1200, 241);
        let c = mix(hex('#ee913d'), hex('#c8641d'), smooth(0.4, 0.75, n1));
        return mix(c, hex('#f8bd6c'), smooth(0.7, 0.92, n2) * 0.6);
      },
      height: ([x, y2, z]) => fbm(x * 900, y2 * 900, z * 900, 2, 242),
      strength: 3,
    });
    nuggetMat = material({ ...maps, roughness: 0.6, normalScale: 1.3 });
  }
  const g = new THREE.Group();
  g.name = name;
  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(1, 36, 20);
    const sx = range(0.021, 0.027), sy = range(0.009, 0.012), sz = range(0.015, 0.019);
    geo.scale(sx, sy, sz);
    geo.computeVertexNormals();
    const pos = geo.attributes.position, nor = geo.attributes.normal;
    const p = new THREE.Vector3(), n = new THREE.Vector3();
    for (let k = 0; k < pos.count; k++) {
      p.fromBufferAttribute(pos, k);
      n.fromBufferAttribute(nor, k);
      const lump = (fbm(p.x * 90 + i, p.y * 90, p.z * 90, 3, 243 + s) - 0.5) * 0.004;
      const crumb = (fbm(p.x * 500, p.y * 500, p.z * 500, 2, 244 + s) - 0.5) * 0.0012;
      p.addScaledVector(n, lump + crumb);
      if (p.y < -sy * 0.6) p.y = -sy * 0.6 + (p.y + sy * 0.6) * 0.3; // flat-ish fried underside
      pos.setXYZ(k, p.x, p.y, p.z);
    }
    smoothSeams(geo);
    const m = new THREE.Mesh(geo, nuggetMat);
    const a = range(0, TAU), r = Math.sqrt(rand()) * area;
    m.position.set(Math.sin(a) * r, y + sy * 0.6 + (heap ? (1 - r / area) * heap * rand() : 0), Math.cos(a) * r);
    m.rotation.set(range(-0.5, 0.5), range(0, TAU), range(-0.5, 0.5));
    g.add(m);
  }
  return g;
}

/** French fries: pile of square-cut sticks within a box area. */
export function fries({ name, count, w, d, y = 0, height = 0.03 }) {
  const a = [], b = [];
  for (let i = 0; i < count; i++) {
    const L = range(0.04, 0.065), t = range(0.0068, 0.0085);
    const geo = new THREE.BoxGeometry(t, t, L, 1, 1, 4);
    const pos = geo.attributes.position;
    const bend = range(-0.004, 0.004);
    for (let k = 0; k < pos.count; k++) {
      const z = pos.getZ(k) / L;
      pos.setY(k, pos.getY(k) + bend * (1 - 4 * z * z));
    }
    geo.computeVertexNormals();
    place(geo, {
      x: range(-w / 2, w / 2), y: y + range(0.003, height), z: range(-d / 2, d / 2),
      rx: range(-0.35, 0.25), ry: Math.PI / 2 + range(-0.7, 0.7), rz: range(-0.2, 0.2),
    });
    (rand() > 0.4 ? a : b).push(geo);
  }
  return node(
    name,
    new THREE.Mesh(mergeGeometries(a), material({ color: '#f1cc6e', roughness: 0.6 })),
    new THREE.Mesh(mergeGeometries(b), material({ color: '#e2ac4c', roughness: 0.6 })),
  );
}

/**
 * Inside surface for open containers. glTF has no "back side only"
 * material, so the inside is a copy with reversed faces, nudged inwards.
 */
export function insideOf(geo, inset = 0.0006) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i += 3) {
    for (let k = 0; k < 3; k++) {
      // swap vertices 1 and 2 of every triangle (and their other attributes)
      for (const name of Object.keys(g.attributes)) {
        const a = g.attributes[name];
        if (k !== 1) continue;
        for (let c = 0; c < a.itemSize; c++) {
          const t = a.array[(i + 1) * a.itemSize + c];
          a.array[(i + 1) * a.itemSize + c] = a.array[(i + 2) * a.itemSize + c];
          a.array[(i + 2) * a.itemSize + c] = t;
        }
      }
    }
  }
  g.computeVertexNormals();
  const nor = g.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, pos.getX(i) + nor.getX(i) * inset, pos.getY(i) + nor.getY(i) * inset, pos.getZ(i) + nor.getZ(i) * inset);
  }
  return g;
}

/** Paper food boat: tapered open tray, coloured outside, white inside. */
export function paperTray({ name = 'Tray', bottom, top, height, color }) {
  const [bw, bd] = bottom, [tw, td] = top;
  const B = [[-bw / 2, -bd / 2], [bw / 2, -bd / 2], [bw / 2, bd / 2], [-bw / 2, bd / 2]];
  const T = [[-tw / 2, -td / 2], [tw / 2, -td / 2], [tw / 2, td / 2], [-tw / 2, td / 2]];
  const v = [];
  const quad = (a, b, c, d) => v.push(...a, ...b, ...c, ...a, ...c, ...d);
  const b3 = B.map(([x, z]) => [x, 0.001, z]);
  const t3 = T.map(([x, z]) => [x, height, z]);
  quad(b3[0], b3[1], b3[2], b3[3]); // floor (faces down after winding below)
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    quad(b3[i], t3[i], t3[j], b3[j]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.computeVertexNormals();
  return node(
    name,
    new THREE.Mesh(geo, material({ color, roughness: 0.75 })),
    new THREE.Mesh(insideOf(geo), material({ color: '#f4f1ea', roughness: 0.85 })),
  );
}

/* ===================================================== salad & toppings */

/** Round cut slice: 'tomato' (seedy flesh) or 'onion' (concentric rings). */
export function roundSlice({ name, count = 1, radius, thickness = 0.004, kind = 'tomato', area = 0, y = 0, s = 0 }) {
  const profile = resample([[0, 0], [radius * 0.97, 0], [radius, thickness * 0.5], [radius * 0.97, thickness], [0, thickness]], 24);
  const maps = paintMaps({
    w: TEX.small, h: TEX.small, point: (u, v) => [(u - 0.5) * radius * 2.2, 0, (v - 0.5) * radius * 2.2],
    color: ([x, , z]) => {
      const r = Math.hypot(x, z) / radius, a = Math.atan2(x, z);
      const n = fbm(x * 90, 0, z * 90, 3, 300 + s);
      if (kind === 'onion') {
        // Concentric rings, pale inside with purple edges
        const ring = ((r * 5 + n * 0.3) % 1 + 1) % 1;
        const edge = 1 - smooth(0.0, 0.12, Math.min(ring, 1 - ring));
        let c = mix(hex('#f7eef4'), hex('#e6cfe0'), n);
        c = mix(c, hex('#9c3c77'), edge * 0.85);
        return mix(c, hex('#8d2f6c'), smooth(0.9, 1, r));
      }
      // Tomato: pale core, seed pockets, red flesh, skin at the rim
      const lobe = Math.abs(Math.sin(a * 2.5 + n * 2));
      let c = mix(hex('#e4472f'), hex('#c62d19'), smooth(0.3, 0.9, n));
      c = mix(c, hex('#f4c9a8'), smooth(0.25, 0.0, r) * 0.8); // core
      const pocket = smooth(0.3, 0.55, r) * (1 - smooth(0.72, 0.82, r)) * lobe;
      c = mix(c, hex('#f0dfa6'), pocket * 0.5);
      if (pocket > 0.35 && hash3(Math.floor(x * 1200), 0, Math.floor(z * 1200), 301) > 0.9) c = hex('#f6efc6');
      return mix(c, hex('#c9220f'), smooth(0.93, 1, r));
    },
    height: ([x, , z]) => fbm(x * 260, 0, z * 260, 2, 302 + s),
  });
  const mat = material({ ...maps, roughness: 0.35, clearcoat: 0.5 });
  const g = new THREE.Group();
  g.name = name;
  for (let i = 0; i < count; i++) {
    const geo = lathe(profile, 72, (p) => {
      const a = Math.atan2(p.x, p.z);
      const sc = 1 + (angNoise(a, 2, 303 + s + i) - 0.5) * 0.06;
      p.x *= sc;
      p.z *= sc;
    });
    // Planar UVs so the slice pattern reads from above
    const pos = geo.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let k = 0; k < pos.count; k++) {
      uv[k * 2] = pos.getX(k) / (radius * 2.2) + 0.5;
      uv[k * 2 + 1] = pos.getZ(k) / (radius * 2.2) + 0.5;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const m = new THREE.Mesh(geo, mat);
    const a = range(0, TAU), r = count > 1 ? Math.sqrt(rand()) * area : 0;
    m.position.set(Math.sin(a) * r, y + i * thickness * 0.3, Math.cos(a) * r);
    m.rotation.y = range(0, TAU);
    g.add(m);
  }
  return g;
}

/** Sautéed mushroom slices (cap-and-stem silhouette, golden brown). */
export function mushroomSlices({ name, count, radius, y = 0, height = 0.008, scale = 1 }) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.0035, -0.008);
  shape.lineTo(-0.003, -0.001);
  shape.absellipse(0, 0, 0.011, 0.007, Math.PI, 0, true);
  shape.lineTo(0.003, -0.001);
  shape.lineTo(0.0035, -0.008);
  shape.lineTo(-0.0035, -0.008);
  const light = [], dark = [];
  for (let i = 0; i < count; i++) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.0024, bevelEnabled: true, bevelThickness: 0.0007, bevelSize: 0.0007, bevelSegments: 2, curveSegments: 12 });
    const k = range(0.8, 1.25) * scale;
    g.scale(k, k, 1);
    const a = range(0, TAU), r = Math.sqrt(rand()) * radius;
    place(g, { x: Math.sin(a) * r, y: y + range(0, height), z: Math.cos(a) * r, rx: -Math.PI / 2 + range(-0.55, 0.55), ry: range(0, TAU), rz: range(-0.35, 0.35) });
    (rand() > 0.45 ? light : dark).push(g);
  }
  return node(
    name,
    new THREE.Mesh(mergeGeometries(light), material({ color: '#d8ab6a', roughness: 0.4, clearcoat: 0.45 })),
    new THREE.Mesh(mergeGeometries(dark), material({ color: '#a97b43', roughness: 0.42, clearcoat: 0.45 })),
  );
}

/** Triangular corn chips, lightly curved, dusted with seasoning. */
export function nachoChips({ name, count, area, y = 0, s = 0 }) {
  const maps = paintMaps({
    w: TEX.small, h: TEX.small, point: (u, v) => [u * 0.05, 0, v * 0.05],
    color: ([x, , z]) => {
      const n = fbm(x * 180, 0, z * 180, 3, 310 + s);
      let c = mix(hex('#e8873a'), hex('#c25a1c'), smooth(0.35, 0.75, n));
      const sp = hash3(Math.floor(x * 2200), 0, Math.floor(z * 2200), 311);
      if (sp > 0.93) c = hex('#8e3312');
      else if (sp < 0.06) c = hex('#f3b96b');
      return c;
    },
    height: ([x, , z]) => fbm(x * 500, 0, z * 500, 2, 312 + s),
    strength: 2.5,
  });
  const mat = material({ ...maps, roughness: 0.55, side: THREE.DoubleSide, normalScale: 1.1 });
  const g = new THREE.Group();
  g.name = name;
  for (let i = 0; i < count; i++) {
    const w = range(0.026, 0.038);
    const geo = new THREE.PlaneGeometry(w, w * 0.88, 10, 10);
    const pos = geo.attributes.position;
    const curl = range(-9, 9), tilt = range(-6, 6);
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), yy = pos.getY(k);
      // Taper the top into a triangle, then bow the chip
      const t = (yy / (w * 0.88) + 0.5);
      pos.setX(k, x * (1 - t * 0.92));
      pos.setZ(k, x * x * curl + yy * yy * tilt);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    const a = range(0, TAU), r = Math.sqrt(rand()) * area;
    m.position.set(Math.sin(a) * r, y + range(0, 0.008), Math.cos(a) * r);
    m.rotation.set(-Math.PI / 2 + range(-0.8, 0.8), range(0, TAU), range(-0.5, 0.5));
    g.add(m);
  }
  return g;
}

/** Grilled chicken fillet: pale, slightly domed, with charred bar marks. */
export function grilledFillet({ name, width, depth, height, s = 0 }) {
  const raw = [[0, 0], [0.86, 0], [0.99, height * 0.3], [1, height * 0.55], [0.94, height * 0.85], [0.6, height], [0, height]];
  const profile = resample(raw, 36);
  const geo = lathe(profile, 96, (p, n) => {
    const a = Math.atan2(p.x, p.z), r = Math.hypot(p.x, p.z);
    const sc = 1 + (angNoise(a, 2.6, 320 + s, 3) - 0.5) * 0.2 * smooth(0.4, 1, r);
    p.x *= sc * (width / 2);
    p.z *= sc * (depth / 2);
    p.addScaledVector(n, (fbm(p.x * 60, p.y * 60, p.z * 60, 3, 321 + s) - 0.5) * 0.0035);
  });
  const point = (u, v) => {
    const [x, y, z] = lathePoint(profile)(u, v);
    return [x * (width / 2), y, z * (depth / 2)];
  };
  const maps = paintMaps({
    w: TEX.color, h: 384, point,
    color: ([x, y, z]) => {
      const n = fbm(x * 110, y * 110, z * 110, 4, 322 + s);
      let c = mix(hex('#efd8ad'), hex('#cfa468'), smooth(0.35, 0.8, n));
      c = mix(c, hex('#a9712f'), smooth(0.7, 0.95, n) * 0.6);
      // Charred grill bars across the top
      const bar = 1 - smooth(0.05, 0.22, Math.min(((x * 0.9 + z * 0.4) / 0.02 % 1 + 1) % 1, 1 - (((x * 0.9 + z * 0.4) / 0.02 % 1 + 1) % 1)));
      c = mix(c, hex('#5b3315'), bar * smooth(0.45, 0.8, y / height) * smooth(0.35, 0.65, n));
      if (hash3(Math.floor(x * 1500), Math.floor(y * 1500), Math.floor(z * 1500), 323) > 0.985) c = hex('#2b2320'); // pepper
      return c;
    },
    height: ([x, y, z]) => fbm(x * 320, y * 320, z * 320, 3, 324 + s),
    strength: 2.2,
  });
  return node(name, new THREE.Mesh(geo, material({ ...maps, roughness: 0.5, clearcoat: 0.3, normalScale: 1 })));
}

/** Chunky chilli / keema meat sauce: a sauce layer studded with mince. */
export function meatSauce({ name, radius, rimFrom, color = '#9e2f12', s = 0 }) {
  const base = sauce({ name, radius, color, rimFrom, drips: 0.7, roughness: 0.5, s });
  base.children[0].geometry.scale(1, 2.2, 1);
  const parts = [];
  for (let i = 0; i < 90; i++) {
    const g = new THREE.SphereGeometry(range(0.0016, 0.0032), 6, 4);
    const a = range(0, TAU), r = Math.sqrt(rand()) * radius * 0.92;
    place(g, { x: Math.sin(a) * r, y: range(0.002, 0.009), z: Math.cos(a) * r, sy: 0.7 });
    parts.push(g);
  }
  base.add(new THREE.Mesh(mergeGeometries(parts), material({ color: '#7d2a10', roughness: 0.55 })));
  return base;
}
