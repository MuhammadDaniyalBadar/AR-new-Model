/**
 * Application-wide settings. Product-specific settings live in
 * src/data/products/*.js, never here.
 *
 * Keep this file free of browser globals: the Node scripts import it too.
 */
export const APP_CONFIG = Object.freeze({
  restaurantName: 'Our menu',

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
    /** Keep AR at real-world size (no pinch-to-scale), per SOW §7.6. */
    lockScale: true,
  },

  decoders: {
    /** Only used if a GLB is Draco-compressed. */
    dracoPath: 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/',
  },

  currency: { locale: 'en-PK', code: 'PKR', maximumFractionDigits: 0 },
});
