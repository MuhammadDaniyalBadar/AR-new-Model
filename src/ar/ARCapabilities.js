import { APP_CONFIG } from '../config/app.config.js';

/**
 * Works out the best AR route for this device, in order of preference:
 *
 *   webxr        In-browser AR (Chrome on ARCore Android). Supports
 *                take-apart and labels inside AR.
 *   quick-look   iOS/iPadOS AR Quick Look (Safari and other iOS browsers).
 *   scene-viewer Google Scene Viewer app on Android without WebXR.
 *   none         3D viewer only. `reason` explains why, for the UI.
 *
 * @returns {Promise<{mode:'webxr'|'quick-look'|'scene-viewer'|'none', reason?:string}>}
 */
export async function detectARMode() {
  const ua = navigator.userAgent;
  const isAndroid = /android/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (APP_CONFIG.ar.webxr && window.isSecureContext && navigator.xr) {
    try {
      if (await navigator.xr.isSessionSupported('immersive-ar')) return { mode: 'webxr' };
    } catch {
      /* fall through */
    }
  }

  if (APP_CONFIG.ar.quickLook) {
    const a = document.createElement('a');
    if (a.relList?.supports?.('ar')) return { mode: 'quick-look' };
  }

  if (APP_CONFIG.ar.sceneViewer && isAndroid) return { mode: 'scene-viewer' };

  if (!window.isSecureContext) return { mode: 'none', reason: 'insecure' };
  if (isIOS) return { mode: 'none', reason: 'ios-browser' };
  return { mode: 'none', reason: 'device' };
}
