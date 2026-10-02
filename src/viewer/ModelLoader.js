import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { APP_CONFIG } from '../config/app.config.js';

/**
 * Loads GLB/glTF files. Supports Draco and Meshopt compression so optimised
 * assets (recommended for mobile networks) work without code changes.
 */
export class ModelLoader {
  constructor() {
    const draco = new DRACOLoader();
    draco.setDecoderPath(APP_CONFIG.decoders.dracoPath);
    this.loader = new GLTFLoader();
    this.loader.setDRACOLoader(draco);
    this.loader.setMeshoptDecoder(MeshoptDecoder);
  }

  /**
   * @param {string} url
   * @param {(fraction:number|null)=>void} [onProgress] null when size is unknown
   * @returns {Promise<import('three').Group>} the glTF scene
   */
  load(url, onProgress) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => resolve(gltf.scene),
        (e) => onProgress?.(e.lengthComputable && e.total ? e.loaded / e.total : null),
        (err) => reject(new ModelLoadError(url, err)),
      );
    });
  }
}

export class ModelLoadError extends Error {
  constructor(url, cause) {
    super(`Could not load model at ${url}`);
    this.name = 'ModelLoadError';
    this.url = url;
    this.cause = cause;
  }
}

/** Free GPU memory for a model that is no longer shown. */
export function disposeObject(root) {
  root?.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.geometry?.dispose();
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m) continue;
      for (const key of Object.keys(m)) if (m[key]?.isTexture) m[key].dispose();
      m.dispose();
    }
  });
}
