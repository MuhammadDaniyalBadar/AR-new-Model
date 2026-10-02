/**
 * Generates one QR code per product, pointing at the product's direct URL
 * (e.g. https://menu.example.com/?product=burger-01).
 *
 *   npm run qr -- --base https://menu.example.com
 *
 * Output: qr-codes/<product-id>.svg and .png, ready for the print menu.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import QRCode from 'qrcode';
import { PRODUCTS } from '../src/data/products/index.js';
import { APP_CONFIG } from '../src/config/app.config.js';

const baseArg = process.argv.indexOf('--base');
const base = baseArg > -1 ? process.argv[baseArg + 1] : null;

if (!base) {
  console.error('Usage: npm run qr -- --base https://your-domain.com');
  process.exit(1);
}

mkdirSync('qr-codes', { recursive: true });

for (const product of PRODUCTS) {
  const url = new URL(base);
  url.searchParams.set(APP_CONFIG.routing.productParam, product.id);
  const options = { errorCorrectionLevel: 'M', margin: 2, color: { dark: '#1F2A1E', light: '#FFFFFF' } };

  writeFileSync(`qr-codes/${product.id}.svg`, await QRCode.toString(url.href, { ...options, type: 'svg' }));
  await QRCode.toFile(`qr-codes/${product.id}.png`, url.href, { ...options, width: 1024 });
  console.log(`✔ ${product.id.padEnd(20)} ${url.href}`);
}
