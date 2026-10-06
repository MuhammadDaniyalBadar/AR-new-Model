/**
 * Generates the QR codes customers scan from the printed menu. Each code
 * opens one dish directly (e.g. https://menu.example.com/?product=quadra-01).
 *
 *   npm run qr burgerlab https://burgerlab-menu.netlify.app
 *   npm run qr https://your-menu.netlify.app            (demo restaurant)
 *   npm run qr -- --base https://... --restaurant burgerlab   (same thing)
 *
 * Output in qr-codes/<restaurant>/:
 *   <product-id>.svg   vector, for the designer laying out the printed menu
 *   <product-id>.png   1024 px, for anything that needs a bitmap
 *   print.html         ready-to-print cards (open → Print → Save as PDF)
 *
 * IMPORTANT: a printed QR code contains the product id. Never rename an id
 * once its code is printed, or that code will open "Dish not found".
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import QRCode from 'qrcode';
import { APP_CONFIG } from '../src/config/app.config.js';

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};

// Accept the address as --base <url> or on its own. PowerShell strips the
// "--" in `npm run qr -- --base <url>`, which leaves only the bare URL.
const args = process.argv.slice(2);
const positional = args.find((a) => /^https?:\/\//i.test(a));
const base = arg('--base') ?? positional ?? process.env.MENU_URL;
const restaurantId =
  arg('--restaurant') ?? args.find((a) => !a.startsWith('-') && !/^https?:/i.test(a) && a !== arg('--base')) ?? 'demo';
if (!base) {
  console.error('Usage: npm run qr <restaurant> https://your-menu.netlify.app');
  process.exit(1);
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const restaurantDir = resolve(ROOT, 'restaurants', restaurantId);
if (!existsSync(resolve(restaurantDir, 'restaurant.js'))) {
  console.error(`Unknown restaurant "${restaurantId}" (no restaurants/${restaurantId}/restaurant.js)`);
  process.exit(1);
}
const restaurant = (await import(pathToFileURL(resolve(restaurantDir, 'restaurant.js')).href)).default;
const PRODUCTS = restaurant.products;

let baseUrl;
try {
  baseUrl = new URL(base);
} catch {
  console.error(`"${base}" is not a valid URL. Include https://, e.g. https://your-menu.netlify.app`);
  process.exit(1);
}
if (baseUrl.protocol !== 'https:') {
  console.warn('⚠  The base URL is not https. AR will not work from these codes; use your live https address.');
}
if (/^(localhost|127\.|192\.168\.|10\.)/.test(baseUrl.hostname)) {
  console.warn('⚠  This is a local address. Customers can only open it on your Wi-Fi while your laptop runs the dev server.');
}

const OUT = `qr-codes/${restaurantId}`;
mkdirSync(OUT, { recursive: true });

// Error correction H survives smudges, folds and glare on a printed menu.
const qrOptions = { errorCorrectionLevel: 'H', margin: 1, color: { dark: '#000000', light: '#FFFFFF' } };
const money = new Intl.NumberFormat(restaurant.currency.locale, {
  style: 'currency',
  currency: restaurant.currency.code,
  maximumFractionDigits: restaurant.currency.maximumFractionDigits ?? 2,
});
// The logo goes on every card, embedded so print.html works offline.
let logoTag = '';
if (restaurant.logo) {
  const file = resolve(restaurantDir, 'public', restaurant.logo.replace(/^\//, ''));
  if (existsSync(file)) {
    const mime = { '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' }[extname(file).toLowerCase()] ?? 'image/jpeg';
    logoTag = `<img class="logo" src="data:${mime};base64,${readFileSync(file).toString('base64')}" alt="" />`;
  }
}
const t = restaurant.theme;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const cards = [];
for (const product of PRODUCTS) {
  const url = new URL(baseUrl);
  url.searchParams.set(APP_CONFIG.routing.productParam, product.id);

  const svg = await QRCode.toString(url.href, { ...qrOptions, type: 'svg' });
  writeFileSync(`${OUT}/${product.id}.svg`, svg);
  await QRCode.toFile(`${OUT}/${product.id}.png`, url.href, { ...qrOptions, width: 1024 });

  cards.push(`
    <article class="card">
      <header>
        ${logoTag}
        <h2>${esc(product.name)}</h2>
        ${Number.isFinite(product.price) ? `<p class="price">${esc(money.format(product.price))}</p>` : ''}
      </header>
      <div class="qr">${svg}</div>
      <p class="cta">Scan to see it in 3D</p>
      <p class="sub">Take it apart layer by layer, or put it on your table in AR.</p>
      <p class="url">${esc(url.host + url.pathname.replace(/\/$/, '') + url.search)}</p>
    </article>`);
  console.log(`✔ ${product.id.padEnd(20)} ${url.href}`);
}

writeFileSync(
  `${OUT}/print.html`,
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(restaurant.name)} QR codes</title>
<link rel="stylesheet" href="${t.fontsUrl}" />
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: ${t.font};
    color: ${t.ink};
    background: #e9ece5;
  }
  .help {
    max-width: 190mm; margin: 12mm auto 0; padding: 4mm 6mm; border-radius: 3mm;
    background: #fff; font-size: 11pt; line-height: 1.45;
  }
  .help b { color: ${t.primary}; }
  .sheet {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 0;
    max-width: 190mm; margin: 8mm auto 12mm; background: #fff;
  }
  .card {
    /* Two columns × two rows per A4 page; dashed lines are cut guides */
    height: 138mm; padding: 9mm 10mm; border: 0.3mm dashed #b9c0b2;
    display: flex; flex-direction: column; align-items: center; text-align: center;
    break-inside: avoid; page-break-inside: avoid;
  }
  .card header { width: 100%; min-height: 14mm; display: flex; justify-content: space-between; align-items: flex-start; gap: 4mm; }
  .logo { width: 13mm; height: 13mm; object-fit: contain; border-radius: 2mm; flex: none; }
  h2 { flex: 1; font-family: ${t.fontDisplay || t.font}; margin: 0; font-size: 16pt; line-height: 1.1; text-align: left; letter-spacing: -0.01em; }
  .price { margin: 0; font-weight: 700; font-size: 13pt; white-space: nowrap; }
  .qr { width: 62mm; height: 62mm; margin: 8mm 0 5mm; }
  .qr svg { width: 100%; height: 100%; display: block; }
  .cta { margin: 0; font-size: 15pt; font-weight: 750; color: ${t.primary}; }
  .sub { margin: 1.5mm 0 0; font-size: 10pt; color: ${t.ink2}; max-width: 62mm; }
  .url { margin: auto 0 0; font-size: 7pt; color: #8a9485; word-break: break-all; }
  @media print {
    body { background: #fff; }
    .help { display: none; }
    .sheet { margin: 0 auto; max-width: none; }
  }
</style>
</head>
<body>
  <div class="help">
    <b>To print:</b> press Ctrl+P (⌘P on Mac), choose A4, set margins to <i>Default</i> and scale to 100%,
    then print or <i>Save as PDF</i>. This note is not printed. Test-scan one card with a phone before printing them all.
    Keep each code at least 2.5 cm wide on the final menu.
  </div>
  <main class="sheet">${cards.join('')}
  </main>
</body>
</html>
`,
);
console.log(`\nPrintable cards: ${OUT}/print.html`);
