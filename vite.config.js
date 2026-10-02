import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

/**
 * `npm run dev`        → http on localhost AND your LAN IP. The 3D viewer
 *                        works on a phone, but AR does not (it needs HTTPS).
 * `npm run dev:phone`  → https on localhost and your LAN IP, for full AR
 *                        testing on a real phone. Accept the self-signed
 *                        certificate warning once on the phone.
 *
 * On a phone, always use the "Network:" URL Vite prints, never "localhost".
 */
export default defineConfig(({ mode }) => ({
  plugins: mode === 'phone' ? [basicSsl()] : [],
  server: {
    host: true, // listen on all interfaces so phones on the same Wi-Fi can connect
    port: 5173,
    strictPort: true, // fail loudly instead of silently moving to another port
    // Let public HTTPS tunnels reach the dev server (Vite blocks unknown hosts by default).
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok.app', '.loca.lt'],
  },
  preview: { host: true, port: 4173 },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'] },
      },
    },
  },
}));
