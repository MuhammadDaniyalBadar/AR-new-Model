import { EventEmitter } from '../core/EventEmitter.js';
import { detectARMode } from './ARCapabilities.js';
import { QuickLookLauncher } from './QuickLookLauncher.js';
import { launchSceneViewer } from './SceneViewerLauncher.js';
import { WebXRSession } from './WebXRSession.js';

/**
 * One entry point for "View in AR", whatever the device supports.
 * The 3D viewer stays the fallback (SOW §14).
 *
 * Events: 'exit' (WebXR session closed)
 */
export class ARManager extends EventEmitter {
  /**
   * @param {{viewer: import('../viewer/Viewer3D.js').Viewer3D, overlay: import('../ui/AROverlay.js').AROverlay}} deps
   */
  constructor({ viewer, overlay }) {
    super();
    this.viewer = viewer;
    this.overlay = overlay;
    this.capability = { mode: 'none', reason: 'pending' };
    this.quickLook = new QuickLookLauncher();
    this.webxr = null;
  }

  async detect() {
    this.capability = await detectARMode();
    return this.capability;
  }

  get mode() {
    return this.capability.mode;
  }

  /** Do slow work ahead of time (USDZ conversion on iOS). */
  prepare(productModel) {
    if (this.mode === 'quick-look') {
      this.quickLook.prepare(productModel).catch((err) => console.warn('[AR] Could not prepare USDZ', err));
    }
  }

  /**
   * Start AR. Call directly from a tap handler: browsers only allow AR to
   * open in response to a user gesture.
   * @returns {Promise<{status:'started'|'launched'|'preparing'|'unavailable'|'error', reason?:string, error?:Error}>}
   */
  enter(productModel) {
    switch (this.mode) {
      case 'webxr':
        return this.#enterWebXR(productModel);
      case 'quick-look':
        if (this.quickLook.launch(productModel.product)) return Promise.resolve({ status: 'launched' });
        this.prepare(productModel);
        return Promise.resolve({ status: 'preparing' });
      case 'scene-viewer':
        launchSceneViewer(productModel.product);
        return Promise.resolve({ status: 'launched' });
      default:
        return Promise.resolve({ status: 'unavailable', reason: this.capability.reason });
    }
  }

  #enterWebXR(productModel) {
    if (!this.webxr) {
      this.webxr = new WebXRSession({
        renderer: this.viewer.renderer,
        overlayRoot: this.overlay.root,
        environment: this.viewer.environment,
      });
      this.webxr.on('state', (s) => this.overlay.setState(s));
      this.webxr.on('frame', (camera) => this.overlay.update(camera));
      this.webxr.on('end', () => this.#restoreViewer());
      this.overlay.on('close', () => this.webxr.end());
      this.overlay.on('move', () => this.webxr.move());
      this.overlay.on('rotate', (radians) => this.webxr.rotateBy(radians));
    }

    // The overlay must be visible before the session starts (it becomes the DOM overlay).
    productModel.focus.reset();
    this.overlay.open(productModel);
    this.viewer.suspend();

    return this.webxr
      .start(productModel) // requestSession runs synchronously inside the tap
      .then(() => ({ status: 'started' }))
      .catch((error) => {
        console.warn('[AR] WebXR session failed', error);
        this.#restoreViewer();
        return { status: 'error', error };
      });
  }

  #restoreViewer() {
    this.overlay.close();
    this.viewer.reclaimModel();
    this.viewer.resume();
    this.emit('exit');
  }
}
