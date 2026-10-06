/**
 * Burger Lab: stand-in models built from Burger Lab's own menu photos
 * (for a pitch demo; replace with scanned models for production).
 *
 *   npm run models burgerlab
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadImage } from '@napi-rs/canvas';
import { APP_CONFIG } from '../../src/config/app.config.js';
import {
  THREE, setSeed, range, node, material, makeTexture, topBun, bottomBun, patty, cheese, sauce,
  shreddedLettuce, pickles, friedFillet, toastSlab, mushroomSauce, onionStrands, nuggets, fries,
  paperTray, insideOf, lettuceLeaf, onionRing, jalapenos, meatSlices, exportModels,
} from '../lib/food-parts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../../restaurants/burgerlab/public/models');
const VIEW_AZIMUTH = APP_CONFIG.viewer.azimuth;
const LOGO = await loadImage(resolve(HERE, '../../restaurants/burgerlab/public/brand/logo.jpg'));

/** Build a dish bottom-up: add(part, thickness) places it and moves the cursor up. */
function stacker(name) {
  const root = new THREE.Group();
  root.name = name;
  let y = 0;
  return {
    root,
    get y() {
      return y;
    },
    add(obj, thickness = 0, offset = 0) {
      obj.position.y = y + offset;
      root.add(obj);
      y += thickness;
      return obj;
    },
  };
}

/* ---------------------------------------------------------------- beef */

function shroomSmash() {
  setSeed(501);
  const d = stacker('Shroom_Smash');
  d.add(bottomBun({ radius: 0.058, height: 0.026, style: 'potato' }), 0.026);
  d.add(sauce({ name: 'Mayo', radius: 0.05, color: '#f1ece0', rimFrom: 0.05, drips: 0.3, s: 1 }), 0, -0.001);
  d.add(onionStrands({ name: 'Red_Onion', count: 40, radius: 0.05, height: 0.004, colors: ['#b0739a', '#efe2ea'], tube: 0.0013 }), 0.004);
  for (let i = 1; i <= 2; i++) {
    const p = d.add(patty({ name: `Patty_${i}`, radius: 0.064, height: 0.011, style: 'smash', s: 30 + i * 4 }), 0.011);
    p.rotation.y = i * 1.9;
    d.add(cheese({ name: `Cheese_${i}`, size: 0.098, dropFrom: 0.058, rot: 0.5 + i, color: '#f7b52a', s: 40 + i }), 0.0024, 0.0004);
    if (i === 1) d.add(onionStrands({ name: 'Sauteed_Onions', count: 45, radius: 0.052, height: 0.004, colors: ['#d9b27f', '#c28d55'], tube: 0.0013 }), 0.004);
  }
  d.add(mushroomSauce({ name: 'Mushroom_Sauce', radius: 0.052, rimFrom: 0.045, s: 2 }), 0.012);
  d.add(topBun({ radius: 0.06, height: 0.05, style: 'potato' }));
  return d.root;
}

function allAmerican() {
  setSeed(502);
  const d = stacker('All_American');
  d.add(bottomBun({ radius: 0.058, height: 0.024, style: 'potato' }), 0.024);
  d.add(sauce({ name: 'Ketchup_Mustard', radius: 0.052, color: '#efa36b', rimFrom: 0.052, drips: 0.4, s: 3 }), 0.002, -0.001);
  for (let i = 1; i <= 2; i++) {
    const p = d.add(patty({ name: `Patty_${i}`, radius: 0.066, height: 0.012, style: 'smash', s: 50 + i * 4 }), 0.012);
    p.rotation.y = i * 2.3;
    d.add(cheese({ name: `Cheese_${i}`, size: 0.1, dropFrom: 0.058, rot: 0.3 + i * 0.8, color: '#f7b52a', s: 60 + i }), 0.0024, 0.0004);
  }
  d.add(pickles({ name: 'Pickles', count: 4, area: 0.032, y: 0.002, s: 4 }), 0.005);
  d.add(onionStrands({ name: 'Sauteed_Onions', count: 70, radius: 0.05, height: 0.006, colors: ['#5c2a12', '#7a3a18'], tube: 0.0018 }), 0.007);
  d.add(sauce({ name: 'Signature_Sauce', radius: 0.05, color: '#f2ad72', rimFrom: 0.05, drips: 0.5, s: 5 }), 0.002);
  d.add(topBun({ radius: 0.06, height: 0.05, style: 'potato' }));
  return d.root;
}

/* Quadra: 4 patties, beef salami, onion rings, jalapeños (from the Quadra poster). */
function quadra() {
  setSeed(101);
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

/* ------------------------------------------------------------- chicken */

function nashthrillSando() {
  setSeed(503);
  const d = stacker('Nashthrill_Sando');
  const bottom = toastSlab({ name: 'Bottom_Toast', width: 0.105, depth: 0.098, height: 0.019, s: 1 });
  bottom.rotation.y = 0.12;
  d.add(bottom, 0.019);
  d.add(sauce({ name: 'Sauce_Bottom', radius: 0.05, color: '#eba47a', rimFrom: 0.05, drips: 0.5, s: 6 }), 0.002, -0.0005);
  const chicken = friedFillet({ name: 'Nashville_Chicken', width: 0.14, depth: 0.108, height: 0.022, style: 'nashville', s: 2 });
  chicken.rotation.y = 0.05;
  d.add(chicken, 0.023);
  d.add(sauce({ name: 'Spicy_Mayo', radius: 0.048, color: '#eba47a', rimFrom: 0.046, drips: 0.8, s: 7 }), 0.002);
  d.add(pickles({ name: 'Pickles', count: 4, area: 0.03, y: 0.001, s: 5 }), 0.004);
  const top = toastSlab({ name: 'Top_Toast', width: 0.105, depth: 0.098, height: 0.02, s: 2 });
  top.rotation.y = 0.1;
  d.add(top);
  return d.root;
}

function doopler() {
  setSeed(504);
  const d = stacker('Doopler');
  d.add(bottomBun({ radius: 0.058, height: 0.025, style: 'potato' }), 0.025);
  d.add(sauce({ name: 'Mayo', radius: 0.054, color: '#f2ede2', rimFrom: 0.054, drips: 0.3, s: 8 }), 0.003, -0.001);
  const f1 = d.add(friedFillet({ name: 'Chicken_1', width: 0.13, depth: 0.105, height: 0.022, style: 'crispy', s: 3 }), 0.021);
  f1.rotation.y = 0.4;
  d.add(cheese({ name: 'Cheese', size: 0.085, dropFrom: 0.05, rot: 0.3, color: '#f7b52a', s: 9 }), 0.002, 0.0005);
  const f2 = d.add(friedFillet({ name: 'Chicken_2', width: 0.125, depth: 0.1, height: 0.021, style: 'crispy', s: 4 }), 0.02);
  f2.rotation.y = -0.3;
  d.add(sauce({ name: 'Chilli_Garlic', radius: 0.045, color: '#c9481f', rimFrom: 0.045, drips: 0.6, s: 10 }), 0.0015);
  d.add(shreddedLettuce({ name: 'Lettuce', radius: 0.05, height: 0.008, count: 160 }), 0.008);
  d.add(topBun({ radius: 0.06, height: 0.05, style: 'potato' }));
  return d.root;
}

function habibi(double) {
  setSeed(double ? 505 : 506);
  const d = stacker(double ? 'Habibi_Double' : 'Habibi_Single');
  d.add(bottomBun({ radius: 0.058, height: 0.026, style: 'dusted' }), 0.026);
  d.add(sauce({ name: 'Signature_Sauce', radius: 0.054, color: '#f2a66d', rimFrom: 0.054, drips: 0.5, s: 11 }), 0.002, -0.001);
  const count = double ? 2 : 1;
  for (let i = 1; i <= count; i++) {
    const f = d.add(friedFillet({ name: `Fillet_${i}`, width: 0.114, depth: 0.108, height: 0.016, style: 'smooth', s: 5 + i }), 0.016);
    f.rotation.y = i;
  }
  d.add(pickles({ name: 'Pickles', count: 4, area: 0.034, y: 0.001, s: 6 }), 0.004);
  d.add(sauce({ name: 'Mayo', radius: 0.05, color: '#f3eee4', rimFrom: 0.048, drips: 0.7, s: 12 }), 0.002);
  d.add(topBun({ radius: 0.06, height: 0.047, style: 'dusted' }));
  return d.root;
}

/* --------------------------------------------------------------- sides */

/** Black paper bucket with the Burger Lab logo printed on it. */
function brandedBucket({ rTop, rBottom, height }) {
  const W = 1024, H = 512;
  const c = new OffscreenCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0c0b0b';
  ctx.fillRect(0, 0, W, H);
  const size = H * 0.7;
  for (const cx of [W * 0.25, W * 0.75]) ctx.drawImage(LOGO, cx - size / 2, (H - size) / 2, size, size);
  const tex = makeTexture(c, true);
  const geo = new THREE.CylinderGeometry(rTop, rBottom, height, 72, 1, true);
  geo.translate(0, height / 2, 0);
  const outer = new THREE.Mesh(geo, material({ map: tex, roughness: 0.55 }));
  const inner = new THREE.Mesh(insideOf(geo), material({ color: '#f1eee8', roughness: 0.8 }));
  const base = new THREE.Mesh(new THREE.CircleGeometry(rBottom, 48).rotateX(-Math.PI / 2).translate(0, 0.002, 0), material({ color: '#f1eee8', roughness: 0.8 }));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(rTop, 0.0016, 8, 96).rotateX(Math.PI / 2).translate(0, height, 0), material({ color: '#f4f1ea', roughness: 0.6 }));
  return node('Bucket', outer, inner, base, rim);
}

function nuggetsBucket() {
  setSeed(507);
  const root = new THREE.Group();
  root.name = 'Habibi_Nuggets_5';
  const bucket = brandedBucket({ rTop: 0.056, rBottom: 0.045, height: 0.068 });
  // Logos sit at u = 0.25 / 0.75 (facing +x / −x); turn one towards the viewer's default camera angle.
  bucket.rotation.y = THREE.MathUtils.degToRad(VIEW_AZIMUTH) - Math.PI / 2;
  root.add(bucket);
  const n = nuggets({ name: 'Nuggets', count: 5, area: 0.03, y: 0.055, heap: 0.012, s: 1 });
  root.add(n);
  return root;
}

function nuggetsWithFries() {
  setSeed(508);
  const root = new THREE.Group();
  root.name = 'Habibi_Nuggets_8_Fries';
  root.add(paperTray({ bottom: [0.13, 0.07], top: [0.175, 0.105], height: 0.042, color: '#d42a1f' }));
  const f = fries({ name: 'Fries', count: 40, w: 0.04, d: 0.055, y: 0.006, height: 0.022 });
  f.position.x = 0.042;
  root.add(f);
  const n = nuggets({ name: 'Nuggets', count: 8, area: 0.022, y: 0.004, heap: 0.02, s: 2 });
  n.position.x = -0.026;
  root.add(n);
  return root;
}

await exportModels(
  {
    'quadra.glb': quadra,
    'shroom-smash.glb': shroomSmash,
    'all-american.glb': allAmerican,
    'nashthrill-sando.glb': nashthrillSando,
    'doopler.glb': doopler,
    'habibi-double.glb': () => habibi(true),
    'habibi-single.glb': () => habibi(false),
    'habibi-nuggets-5.glb': nuggetsBucket,
    'habibi-nuggets-8-fries.glb': nuggetsWithFries,
  },
  OUT,
);
