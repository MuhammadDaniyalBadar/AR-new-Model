/**
 * Prints the node tree of a GLB file so you can map node names to
 * product components in restaurants/<id>/products/*.js.
 *
 *   npm run inspect -- restaurants/demo/public/models/classic-burger.glb
 *
 * Works on any GLB, with no dependencies, by reading the JSON chunk directly.
 */
import { readFileSync, statSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: npm run inspect -- <path/to/model.glb>');
  process.exit(1);
}

const buf = readFileSync(file);
if (buf.readUInt32LE(0) !== 0x46546c67) {
  console.error(`${file} is not a binary glTF (.glb) file.`);
  process.exit(1);
}

const jsonLength = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLength).toString('utf8'));
const nodes = gltf.nodes ?? [];
const meshes = gltf.meshes ?? [];

// three.js renames nodes on load (spaces → underscores, some symbols removed).
const sanitize = (name) => name.replace(/\s/g, '_').replace(/[[\].:/]/g, '');

function triangles(meshIndex) {
  let total = 0;
  for (const prim of meshes[meshIndex].primitives) {
    const acc = gltf.accessors[prim.indices ?? prim.attributes.POSITION];
    total += prim.indices !== undefined ? acc.count / 3 : acc.count / 3;
  }
  return Math.round(total);
}

function print(index, depth) {
  const node = nodes[index];
  const raw = node.name ?? `(unnamed #${index})`;
  const loaded = node.name ? sanitize(node.name) : raw;
  const renamed = loaded !== raw ? `   → loads as "${loaded}"` : '';
  const mesh = node.mesh !== undefined ? `  [mesh, ${triangles(node.mesh).toLocaleString()} tris]` : '';
  console.log(`${'  '.repeat(depth)}• ${raw}${mesh}${renamed}`);
  for (const child of node.children ?? []) print(child, depth + 1);
}

const sceneIndex = gltf.scene ?? 0;
const scene = gltf.scenes?.[sceneIndex];
console.log(`\n${file}  (${(statSync(file).size / 1024).toFixed(0)} KB)`);
console.log(`Extensions used: ${(gltf.extensionsUsed ?? []).join(', ') || 'none'}`);
console.log(`Materials: ${gltf.materials?.length ?? 0}   Textures: ${gltf.textures?.length ?? 0}\n`);
for (const root of scene?.nodes ?? []) print(root, 0);
console.log('\nUse these names in the "nodes" array of each component in your product file.\n');
