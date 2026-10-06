/**
 * Burger O'Clock: stand-in models built from Burger O'Clock's own menu photos
 * (for a pitch demo; replace with scanned models for production).
 *
 *   npm run models burgeroclock
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  THREE, setSeed, node, topBun, bottomBun, patty, cheese, sauce, lettuceLeaf, shreddedLettuce,
  pickles, jalapenos, meatSlices, friedFillet, grilledFillet, roundSlice, mushroomSlices,
  nachoChips, meatSauce, onionStrands, whiteCheese, exportModels,
} from '../lib/food-parts.mjs';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../restaurants/burgeroclock/public/models');

/** Build a dish bottom-up: add(part, thickness) places it and moves the cursor up. */
function stacker(name) {
  const root = new THREE.Group();
  root.name = name;
  let y = 0;
  return {
    root,
    add(obj, thickness = 0, offset = 0) {
      obj.position.y = y + offset;
      root.add(obj);
      y += thickness;
      return obj;
    },
  };
}

const BUN_R = 0.058;
const MUSTARD = '#edb53f';
const PINK = '#f0a981';

/** Every dish starts the same way: toasted bun base with a sauce on it. */
function base(d, { sauceName = 'Sauce', color = MUSTARD, height = 0.024, style = 'brioche' } = {}) {
  d.add(bottomBun({ radius: BUN_R, height, style }), height);
  if (sauceName) d.add(sauce({ name: sauceName, radius: 0.052, color, rimFrom: 0.052, drips: 0.4, s: 1 }), 0.002, -0.001);
  return d;
}

/* ---------------------------------------------------------------- beef */

function ogBeef() {
  setSeed(601);
  const d = stacker('OG_Beef');
  base(d);
  for (let i = 1; i <= 2; i++) {
    const p = d.add(patty({ name: `Patty_${i}`, radius: 0.064, height: 0.013, style: 'smash', s: 10 + i * 3 }), 0.013);
    p.rotation.y = i * 2.1;
    d.add(cheese({ name: `Cheese_${i}`, size: 0.102, dropFrom: 0.056, rot: 0.4 + i, color: '#f2a81d', s: i }), 0.0024, 0.0004);
  }
  d.add(roundSlice({ name: 'Onion_Relish', count: 5, radius: 0.009, thickness: 0.003, kind: 'onion', area: 0.032, s: 1 }), 0.004);
  d.add(sauce({ name: 'Ketchup_Mustard', radius: 0.046, color: '#c23a1b', rimFrom: 0.042, drips: 0.8, s: 2 }), 0.003);
  d.add(sauce({ name: 'Mayo', radius: 0.05, color: '#f6f2e8', rimFrom: 0.048, drips: 0.6, s: 3 }), 0.003);
  d.add(topBun({ radius: 0.06, height: 0.048, style: 'brioche' }));
  return d.root;
}

function oklahomaBeef() {
  setSeed(602);
  const d = stacker('Oklahoma_Beef');
  base(d, { sauceName: null });
  for (let i = 1; i <= 2; i++) {
    const p = d.add(patty({ name: `Patty_${i}`, radius: 0.064, height: 0.013, style: 'smash', s: 20 + i * 3 }), 0.013);
    p.rotation.y = i * 1.7;
    d.add(cheese({ name: `Cheese_${i}`, size: 0.104, dropFrom: 0.056, rot: 0.2 + i * 1.2, color: '#f2a81d', s: 5 + i }), 0.0024, 0.0004);
    d.add(
      onionStrands({ name: `Onions_${i}`, count: 90, radius: 0.05, height: 0.004, colors: ['#5a2b12', '#7d4420', '#a8703a'], tube: 0.0013, len: [0.008, 0.016] }),
      0.005,
    );
  }
  d.add(sauce({ name: 'Mayo', radius: 0.05, color: '#f7f3ea', rimFrom: 0.048, drips: 0.7, s: 4 }), 0.003);
  d.add(topBun({ radius: 0.06, height: 0.048, style: 'brioche' }));
  return d.root;
}

function oldSchool() {
  setSeed(603);
  const d = stacker('Old_School');
  base(d);
  d.add(lettuceLeaf({ name: 'Lettuce', radius: 0.062, rimFrom: 0.05, s: 1 }), 0.005);
  d.add(patty({ name: 'Patty', radius: 0.06, height: 0.018, style: 'chunky', s: 30 }), 0.018);
  d.add(cheese({ name: 'Cheese', size: 0.104, dropFrom: 0.054, rot: 0.6, color: '#f09c25', s: 8 }), 0.0026, 0.0004);
  d.add(roundSlice({ name: 'Tomato', count: 2, radius: 0.05, thickness: 0.006, kind: 'tomato', area: 0.004, s: 2 }), 0.007);
  d.add(roundSlice({ name: 'Red_Onion', count: 2, radius: 0.046, thickness: 0.004, kind: 'onion', area: 0.004, s: 3 }), 0.005);
  d.add(pickles({ name: 'Pickles', count: 4, area: 0.03, s: 4 }), 0.004);
  d.add(sauce({ name: 'Cheese_Sauce', radius: 0.048, color: '#edb135', rimFrom: 0.046, drips: 0.7, s: 5 }), 0.003);
  d.add(topBun({ radius: 0.06, height: 0.05, style: 'brioche' }));
  return d.root;
}

function beltBuster() {
  setSeed(604);
  const d = stacker('Belt_Buster');
  base(d);
  for (let i = 1; i <= 4; i++) {
    const p = d.add(patty({ name: `Patty_${i}`, radius: 0.062, height: 0.016, style: 'chunky', s: 40 + i * 3 }), 0.016);
    p.rotation.y = i * 1.4;
    d.add(cheese({ name: `Cheese_${i}`, size: 0.1, dropFrom: 0.054, rot: i * 0.9, color: '#f2a81d', s: 12 + i }), 0.0026, 0.0004);
  }
  d.add(sauce({ name: 'Burger_Sauce', radius: 0.048, color: PINK, rimFrom: 0.046, drips: 0.8, s: 6 }), 0.003);
  d.add(topBun({ radius: 0.06, height: 0.05, style: 'brioche' }));
  return d.root;
}

function mushroomMadness() {
  setSeed(605);
  const d = stacker('Mushroom_Madness');
  base(d, { sauceName: 'Mayo_Bottom', color: '#f7f3e8' });
  d.add(patty({ name: 'Patty', radius: 0.062, height: 0.019, style: 'chunky', s: 50 }), 0.019);
  d.add(whiteCheese({ name: 'White_Cheese', radius: 0.05, height: 0.005 }), 0.005, -0.001);
  d.add(mushroomSlices({ name: 'Mushrooms', count: 34, radius: 0.046, height: 0.013, scale: 1.3 }), 0.017);
  d.add(
    onionStrands({ name: 'Red_Onion', count: 26, radius: 0.044, height: 0.007, colors: ['#7c3454', '#9d4a6d', '#e9d7e2'], tube: 0.0024, len: [0.014, 0.026] }),
    0.009,
  );
  d.add(sauce({ name: 'Garlic_Mayo', radius: 0.05, color: '#f8f5ec', rimFrom: 0.046, drips: 1, s: 7 }), 0.003);
  d.add(topBun({ radius: 0.06, height: 0.05, style: 'brioche' }));
  return d.root;
}

function messyMeat() {
  setSeed(606);
  const d = stacker('Messy_Meat');
  base(d);
  d.add(shreddedLettuce({ name: 'Lettuce', radius: 0.054, height: 0.008, count: 160 }), 0.008);
  d.add(patty({ name: 'Patty', radius: 0.062, height: 0.018, style: 'chunky', s: 60 }), 0.018);
  d.add(cheese({ name: 'Cheese', size: 0.106, dropFrom: 0.054, rot: 0.5, color: '#f2a81d', s: 16 }), 0.0026, 0.0004);
  d.add(meatSauce({ name: 'Chilli_Meat', radius: 0.05, rimFrom: 0.046, s: 8 }), 0.011);
  const sticks = node('Cheese_Bites');
  for (let i = 0; i < 2; i++) {
    const b = friedFillet({ name: `Bite_${i}`, width: 0.034, depth: 0.03, height: 0.019, style: 'smooth', s: 20 + i });
    b.position.set(i ? 0.021 : -0.023, 0, i ? -0.004 : 0.005);
    b.rotation.y = i * 1.2;
    sticks.add(b);
  }
  d.add(sticks, 0.02);
  d.add(jalapenos({ name: 'Jalapenos', count: 8, area: 0.038, y: -0.008, skin: '#4a6119', flesh: ['#86973a', '#a3a64e'], s: 9 }), 0.004);
  d.add(sauce({ name: 'Cheese_Sauce', radius: 0.048, color: '#edaa2c', rimFrom: 0.044, drips: 0.9, s: 10 }), 0.003);
  d.add(topBun({ radius: 0.06, height: 0.05, style: 'brioche' }));
  return d.root;
}

function crunchos() {
  setSeed(607);
  const d = stacker('Crunchos');
  base(d);
  d.add(shreddedLettuce({ name: 'Lettuce', radius: 0.054, height: 0.007, count: 150 }), 0.007);
  for (let i = 1; i <= 2; i++) {
    const p = d.add(patty({ name: `Patty_${i}`, radius: 0.064, height: 0.013, style: 'smash', s: 70 + i * 3 }), 0.013);
    p.rotation.y = i * 2.4;
  }
  d.add(sauce({ name: 'Garlic_Mayo', radius: 0.05, color: '#f7f4ea', rimFrom: 0.05, drips: 0.8, s: 11 }), 0.003);
  d.add(friedFillet({ name: 'Crispy_Patty', width: 0.118, depth: 0.106, height: 0.018, style: 'smooth', s: 22 }), 0.018);
  d.add(jalapenos({ name: 'Jalapenos', count: 8, area: 0.04, y: 0.001, skin: '#3f5416', flesh: ['#7d8f33', '#9aa645'], s: 12 }), 0.006);
  d.add(nachoChips({ name: 'Nacho_Chips', count: 12, area: 0.046, s: 1 }), 0.012);
  d.add(sauce({ name: 'Signature_Sauce', radius: 0.048, color: PINK, rimFrom: 0.044, drips: 0.9, s: 13 }), 0.003);
  d.add(topBun({ radius: 0.06, height: 0.05, style: 'brioche' }));
  return d.root;
}

/* ------------------------------------------------------------- chicken */

function chickNCrisp() {
  setSeed(608);
  const d = stacker('Chick_n_Crisp');
  base(d);
  d.add(shreddedLettuce({ name: 'Lettuce', radius: 0.054, height: 0.008, count: 170 }), 0.008);
  d.add(friedFillet({ name: 'Crispy_Chicken', width: 0.118, depth: 0.106, height: 0.024, style: 'shredded', s: 24 }), 0.023);
  d.add(sauce({ name: 'Mayo', radius: 0.05, color: '#f9f6ee', rimFrom: 0.046, drips: 1, s: 14 }), 0.003);
  d.add(topBun({ radius: 0.06, height: 0.05, style: 'brioche' }));
  return d.root;
}

function chickNCrispSmokyTang() {
  setSeed(609);
  const d = stacker('Chick_n_Crisp_Smoky_Tang');
  base(d);
  d.add(lettuceLeaf({ name: 'Lettuce', radius: 0.062, rimFrom: 0.05, s: 5 }), 0.005);
  d.add(friedFillet({ name: 'Crispy_Chicken', width: 0.118, depth: 0.106, height: 0.025, style: 'shredded', s: 26 }), 0.024);
  d.add(meatSlices({ name: 'Chicken_Pepperoni', count: 3, radius: 0.04, fold: 10, area: 0.018, color: '#c07a54', s: 15 }), 0.005);
  d.add(
    onionStrands({ name: 'Caramelised_Onion', count: 26, radius: 0.042, height: 0.007, colors: ['#7a2f4a', '#9c4463', '#5a1f33'], tube: 0.0028, len: [0.016, 0.028] }),
    0.009,
  );
  d.add(sauce({ name: 'Smoky_Sauce', radius: 0.048, color: '#c2895e', rimFrom: 0.044, drips: 0.9, s: 16 }), 0.003);
  d.add(topBun({ radius: 0.06, height: 0.05, style: 'brioche' }));
  return d.root;
}

function fieryGigantic() {
  setSeed(610);
  const d = stacker('Fiery_Gigantic');
  base(d, { color: PINK });
  d.add(shreddedLettuce({ name: 'Lettuce', radius: 0.054, height: 0.007, count: 150 }), 0.007);
  for (let i = 1; i <= 2; i++) {
    const f = d.add(friedFillet({ name: `Crispy_Chicken_${i}`, width: 0.118, depth: 0.106, height: 0.021, style: 'shredded', s: 28 + i * 2 }), 0.02);
    f.rotation.y = i * 1.6;
    if (i === 1) d.add(cheese({ name: 'Cheese', size: 0.098, dropFrom: 0.05, rot: 0.4, color: '#f2a81d', s: 18 }), 0.0026, 0.0004);
  }
  d.add(pickles({ name: 'Pickles', count: 4, area: 0.032, s: 6 }), 0.005);
  d.add(sauce({ name: 'Fiery_Sauce', radius: 0.048, color: '#e07a4a', rimFrom: 0.044, drips: 0.9, s: 17 }), 0.003);
  d.add(topBun({ radius: 0.06, height: 0.05, style: 'brioche' }));
  return d.root;
}

function grilledClassic() {
  setSeed(611);
  const d = stacker('Grilled_Classic');
  base(d);
  d.add(lettuceLeaf({ name: 'Lettuce', radius: 0.062, rimFrom: 0.05, s: 7 }), 0.005);
  d.add(grilledFillet({ name: 'Grilled_Chicken', width: 0.118, depth: 0.104, height: 0.014, s: 1 }), 0.014);
  d.add(cheese({ name: 'Cheese', size: 0.1, dropFrom: 0.052, rot: 0.3, color: '#f2a81d', s: 19 }), 0.0026, 0.0004);
  d.add(roundSlice({ name: 'Tomato', count: 2, radius: 0.05, thickness: 0.006, kind: 'tomato', area: 0.004, s: 4 }), 0.007);
  d.add(roundSlice({ name: 'Red_Onion', count: 2, radius: 0.046, thickness: 0.004, kind: 'onion', area: 0.004, s: 5 }), 0.005);
  d.add(pickles({ name: 'Pickles', count: 4, area: 0.03, s: 8 }), 0.004);
  d.add(sauce({ name: 'Cheese_Sauce', radius: 0.048, color: '#edb135', rimFrom: 0.046, drips: 0.7, s: 18 }), 0.003);
  d.add(topBun({ radius: 0.06, height: 0.05, style: 'brioche' }));
  return d.root;
}

function grilledSmokyTang() {
  setSeed(612);
  const d = stacker('Grilled_Smoky_Tang');
  base(d);
  d.add(lettuceLeaf({ name: 'Lettuce', radius: 0.062, rimFrom: 0.05, s: 9 }), 0.005);
  d.add(grilledFillet({ name: 'Grilled_Chicken', width: 0.12, depth: 0.106, height: 0.015, s: 2 }), 0.015);
  d.add(cheese({ name: 'Cheese', size: 0.1, dropFrom: 0.052, rot: 0.8, color: '#f2a81d', s: 20 }), 0.0026, 0.0004);
  d.add(meatSlices({ name: 'Chicken_Pepperoni', count: 3, radius: 0.042, fold: 8, area: 0.016, color: '#c07a54', s: 21 }), 0.005);
  d.add(
    onionStrands({ name: 'Caramelised_Onion', count: 26, radius: 0.042, height: 0.007, colors: ['#7a2f4a', '#9c4463', '#5a1f33'], tube: 0.0028, len: [0.016, 0.028] }),
    0.009,
  );
  d.add(sauce({ name: 'Smoky_Sauce', radius: 0.048, color: '#c2895e', rimFrom: 0.044, drips: 0.9, s: 19 }), 0.003);
  d.add(topBun({ radius: 0.06, height: 0.048, style: 'brioche' }));
  return d.root;
}

await exportModels(
  {
    'og-beef.glb': ogBeef,
    'oklahoma-beef.glb': oklahomaBeef,
    'old-school.glb': oldSchool,
    'belt-buster.glb': beltBuster,
    'mushroom-madness.glb': mushroomMadness,
    'messy-meat.glb': messyMeat,
    'crunchos.glb': crunchos,
    'chick-n-crisp.glb': chickNCrisp,
    'chick-n-crisp-smoky-tang.glb': chickNCrispSmokyTang,
    'fiery-gigantic.glb': fieryGigantic,
    'grilled-classic.glb': grilledClassic,
    'grilled-smoky-tang.glb': grilledSmokyTang,
  },
  OUT,
);
