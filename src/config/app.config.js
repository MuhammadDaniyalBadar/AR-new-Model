/**
 * Application-wide settings, the same for every restaurant. Restaurant
 * settings (name, colours, currency, dishes) live in
 * restaurants/<id>/restaurant.js, never here.
 *
 * Keep this file free of browser globals: the Node scripts import it too.
 */
export const APP_CONFIG = Object.freeze({
  routing: {
    /** ?product=burger-01 opens a dish directly (the QR-code entry point). */
    productParam: 'product',
    /** ?debug opens the developer panel (node names, draw calls). */
    debugParam: 'debug',
  },

  viewer: {
    maxPixelRatio: 2,
    fov: 32,
    /** Seconds without interaction before the dish slowly turns by itself. */
    idleAutoRotateAfter: 6,
    autoRotateSpeed: 0.8,
    /** How far the camera may zoom, as multiples of the fitted distance. */
    minZoom: 0.55,
    maxZoom: 2.2,
    /** Default viewing angle, in degrees above the horizon. */
    elevation: 24,
    azimuth: -28,
  },

  explode: {
    /** Defaults used when a product does not override them. */
    duration: 750,
    stagger: 70,
    /** Gap between layers for components without an explicit explode rule. */
    autoGap: 0.14,
  },

  ar: {
    webxr: true,
    quickLook: true,
    sceneViewer: true,
    /**
     * AR always opens at real-world size (SOW §7.6). With resizable on,
     * customers can pinch to enlarge it (e.g. when viewing from a distance)
     * and tap "Real size" to snap back. Set to false to lock real size.
     */
    resizable: true,
    /** Pinch limits, as multiples of real size (WebXR only; iOS/Android viewers use their own). */
    minScale: 0.5,
    maxScale: 5,
  },

  decoders: {
    /** Only used if a GLB is Draco-compressed. */
    dracoPath: 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/',
  },
});
