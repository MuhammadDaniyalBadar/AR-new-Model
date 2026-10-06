import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

/**
 * One codebase, one folder per restaurant (restaurants/<id>/). Each build
 * contains only that restaurant's dishes, models, logo and colours.
 * Run through scripts/vite.mjs: `npm run dev burgerlab`, `npm run build burgerlab`.
 */
export default defineConfig(async () => {
  const id = process.env.RESTAURANT || 'demo';
  const dir = resolve(__dirname, 'restaurants', id);
  const entry = resolve(dir, 'restaurant.js');
  if (!existsSync(entry)) throw new Error(`Unknown restaurant "${id}" (no ${entry})`);
  const restaurant = (await import(`${pathToFileURL(entry).href}?t=${Date.now()}`)).default;
  const https = process.env.HTTPS === '1';

  return {
    plugins: [...(https ? [basicSsl()] : []), restaurantHtml(restaurant)],
    publicDir: resolve(dir, 'public'),
    resolve: { alias: { '@restaurant': entry } },
    server: {
      host: true, // listen on all interfaces so phones on the same Wi-Fi can connect
      port: 5173,
      strictPort: true,
      // Let public HTTPS tunnels reach the dev server (Vite blocks unknown hosts by default).
      allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok.app', '.loca.lt'],
    },
    preview: { host: true, port: 4173 },
    build: {
      target: 'es2022',
      sourcemap: true,
      chunkSizeWarningLimit: 900,
      rollupOptions: { output: { manualChunks: { three: ['three'] } } },
    },
  };
});

/** Brands index.html at build time: title, colours, fonts, favicon (no flash of the wrong theme). */
function restaurantHtml(r) {
  const t = r.theme;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const vars = {
    '--plate-hi': t.stageHi,
    '--plate-lo': t.stageLo,
    '--ink': t.ink,
    '--ink-2': t.ink2,
    '--ketchup': t.primary,
    '--ketchup-press': t.primaryPress,
    '--mustard': t.accent,
    '--on-primary': t.onPrimary,
    '--font': t.font,
    '--font-display': t.fontDisplay || t.font,
  };
  // html:root outranks the default tokens in :root, whatever order the styles load in.
  const css = `html:root{${Object.entries(vars)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')}}`;
  return {
    name: 'restaurant-html',
    transformIndexHtml(html) {
      return html
        .replace(/<title>.*?<\/title>/, `<title>${esc(r.name)}</title>`)
        .replace(/(<meta name="theme-color" content=")[^"]*/, `$1${t.stageHi}`)
        .replace(/(<link rel="icon" href=")[^"]*(" type=")[^"]*/, `$1${r.favicon}$2${r.favicon.endsWith('.svg') ? 'image/svg+xml' : 'image/png'}`)
        .replace(/(<link\s+rel="stylesheet"\s+href=")https:\/\/fonts\.googleapis\.com[^"]*/, `$1${t.fontsUrl}`)
        .replace('</head>', `  <style>${css}</style>\n  </head>`);
    },
  };
}
