/**
 * Android fallback when in-browser WebXR is unavailable: hands the GLB to
 * Google's Scene Viewer app. The model URL must be publicly reachable over
 * HTTPS, because the Scene Viewer app downloads it itself.
 */
export function launchSceneViewer(product) {
  const modelUrl = new URL(product.model.src, window.location.href).href;
  const fallback = window.location.href;
  const params = new URLSearchParams({
    file: modelUrl,
    mode: 'ar_preferred',
    title: product.name,
    resizable: 'false', // keep real-world size
  });
  const intent =
    `intent://arvr.google.com/scene-viewer/1.0?${params}` +
    '#Intent;scheme=https;package=com.google.android.googlequicksearchbox;' +
    `action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(fallback)};end;`;
  window.location.href = intent;
}
