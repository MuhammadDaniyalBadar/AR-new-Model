/**
 * Regenerates a restaurant's procedural stand-in models.
 *
 *   npm run models demo
 *   npm run models burgerlab
 *
 * Runs scripts/models/<restaurant>.mjs and any scripts/models/<restaurant>-*.mjs.
 * Real scanned / artist-made GLBs never need this: drop them straight into
 * restaurants/<restaurant>/public/models/.
 */
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), 'models');
const id = process.argv[2];
const files = readdirSync(dir).filter((f) => id && (f === `${id}.mjs` || f.startsWith(`${id}-`)));

if (!files.length) {
  const known = [...new Set(readdirSync(dir).map((f) => f.replace(/(-.*)?\.mjs$/, '')))];
  console.error(`Usage: npm run models <restaurant>   (available: ${known.join(', ')})`);
  process.exit(1);
}
for (const f of files) {
  console.log(`\n${f}`);
  await import(pathToFileURL(resolve(dir, f)).href);
}
