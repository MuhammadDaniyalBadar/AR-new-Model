/**
 * Lightweight runtime validation for product files. Catches typos early
 * (a misspelled field silently hides information from customers).
 *
 * Returns { errors, warnings }. Errors make a product unusable;
 * warnings are logged so content editors can fix them.
 */
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);

const KNOWN_INFO_FIELDS = new Set(['description', 'weightG', 'size', 'mainIngredients', 'notes', 'allergens']);

export function validateProduct(product) {
  const errors = [];
  const warnings = [];
  const where = product?.id ? `Product "${product.id}"` : 'A product';

  if (!isNonEmptyString(product?.id)) errors.push(`${where} is missing an "id".`);
  else if (!/^[a-z0-9-]+$/.test(product.id)) errors.push(`${where}: id may only contain a–z, 0–9 and "-" (it appears in QR URLs).`);
  if (!isNonEmptyString(product?.name)) errors.push(`${where} is missing a "name".`);
  if (!isNonEmptyString(product?.model?.src)) errors.push(`${where} is missing "model.src".`);

  if (product?.price !== undefined && product.price !== null && !Number.isFinite(product.price)) {
    warnings.push(`${where}: "price" should be a number (it is formatted for display automatically).`);
  }

  const dims = product?.dimensions;
  if (dims && !['widthCm', 'heightCm', 'depthCm'].some((k) => Number.isFinite(dims[k]))) {
    warnings.push(`${where}: "dimensions" has no widthCm, heightCm or depthCm, so AR will assume the GLB is in meters.`);
  }

  const components = product?.components ?? [];
  if (!Array.isArray(components)) errors.push(`${where}: "components" must be an array.`);

  const seen = new Set();
  components.forEach((c, i) => {
    const label = `${where} → component ${c?.id ?? `#${i}`}`;
    if (!isNonEmptyString(c?.id)) errors.push(`${label} is missing an "id".`);
    else if (seen.has(c.id)) errors.push(`${label}: duplicate id.`);
    seen.add(c?.id);
    if (!isNonEmptyString(c?.name)) errors.push(`${label} is missing a "name".`);
    if (!Array.isArray(c?.nodes) || c.nodes.length === 0) {
      warnings.push(`${label} has no "nodes", so it can be listed but not moved or labelled in 3D.`);
    }
    if (c?.explode) {
      if (c.explode.direction && !isVec3(c.explode.direction)) errors.push(`${label}: explode.direction must be [x, y, z].`);
      if (c.explode.distance !== undefined && !Number.isFinite(c.explode.distance)) {
        errors.push(`${label}: explode.distance must be a number.`);
      }
    }
    for (const key of Object.keys(c?.info ?? {})) {
      if (!KNOWN_INFO_FIELDS.has(key)) warnings.push(`${label}: unknown info field "${key}" will not be shown.`);
    }
  });

  return { errors, warnings };
}
