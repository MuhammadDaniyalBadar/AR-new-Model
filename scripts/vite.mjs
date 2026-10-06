/**
 * Runs Vite for one restaurant. Works the same in PowerShell, cmd and bash
 * (no environment-variable syntax or "--" needed).
 *
 *   npm run dev                  demo restaurant on http://localhost:5173
 *   npm run dev burgerlab        Burger Lab
 *   npm run dev:phone burgerlab  HTTPS on your Wi-Fi, for AR on a phone
 *   npm run build burgerlab      production build in dist/
 *   npm run preview              serve the last build
 *
 * The restaurant can also come from the RESTAURANT environment variable
 * (that's how a Netlify site picks its restaurant).
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [command = 'dev', ...rest] = process.argv.slice(2);
const phone = rest.includes('--phone');
const restaurant = rest.find((a) => !a.startsWith('-')) ?? process.env.RESTAURANT ?? 'demo';

if (!existsSync(resolve(root, 'restaurants', restaurant, 'restaurant.js'))) {
  const known = readdirSync(resolve(root, 'restaurants')).filter((d) => existsSync(resolve(root, 'restaurants', d, 'restaurant.js')));
  console.error(`Unknown restaurant "${restaurant}". Available: ${known.join(', ')}`);
  process.exit(1);
}

const viteBin = resolve(dirname(createRequire(import.meta.url).resolve('vite/package.json')), 'bin/vite.js');
const args = command === 'dev' ? [] : [command];
console.log(`▶ ${restaurant}${phone ? ' (HTTPS for phones)' : ''}`);

const child = spawn(process.execPath, [viteBin, ...args], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, RESTAURANT: restaurant, HTTPS: phone ? '1' : '' },
});
child.on('exit', (code) => process.exit(code ?? 0));
