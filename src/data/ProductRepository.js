import { PRODUCTS } from './products/index.js';
import { validateProduct } from './productSchema.js';

/**
 * Single access point for product data. Today it reads the bundled files;
 * later it can fetch from an API/CMS without the rest of the app changing,
 * because every method is already async.
 */
export class ProductRepository {
  constructor(source = PRODUCTS) {
    this.products = new Map();
    for (const product of source) {
      const { errors, warnings } = validateProduct(product);
      warnings.forEach((w) => console.warn(`[products] ${w}`));
      if (errors.length) {
        errors.forEach((e) => console.error(`[products] ${e}`));
        continue;
      }
      this.products.set(product.id, Object.freeze(product));
    }
  }

  async list() {
    return [...this.products.values()];
  }

  async get(id) {
    return this.products.get(id) ?? null;
  }
}
