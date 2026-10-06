/**
 * Demo restaurant: detailed stand-ins built from reference photos (neutral, no real brand).
 *
 *   npm run models demo
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  THREE, setSeed, node, topBun, bottomBun, patty, cheese, sauce, lettuceLeaf, shreddedLettuce,
  onionRing, jalapenos, meatSlices, redOnion, whiteCheese, exportModels,
} from '../lib/food-parts.mjs';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../restaurants/demo/public/models');


/** Classic: grilled bun, patty, white cheese, red onion. Reference: user photo 2. */
function classic() {
  setSeed(202);
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
  setSeed(303);
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


await exportModels(
  {
    'classic-burger.glb': classic,
    'double-crunch.glb': doubleCrunch,
  },
  OUT,
);
