import restaurant from '@restaurant';

const { currency } = restaurant;
const money = new Intl.NumberFormat(currency.locale, {
  style: 'currency',
  currency: currency.code,
  maximumFractionDigits: currency.maximumFractionDigits ?? 2,
});

export const formatPrice = (amount) => (Number.isFinite(amount) ? money.format(amount) : '');
export const formatWeight = (g) => (Number.isFinite(g) ? `${g} g` : '');

/** "11 × 9.5 cm" from { widthCm, depthCm, heightCm } (only the values supplied). */
export function formatDimensions(d) {
  if (!d) return '';
  const parts = [d.widthCm, d.depthCm, d.heightCm].filter(Number.isFinite);
  return parts.length ? `${parts.join(' × ')} cm` : '';
}

export function describeDimensions(d) {
  if (!d) return '';
  const out = [];
  if (Number.isFinite(d.widthCm)) out.push(`${d.widthCm} cm wide`);
  if (Number.isFinite(d.depthCm)) out.push(`${d.depthCm} cm deep`);
  if (Number.isFinite(d.heightCm)) out.push(`${d.heightCm} cm tall`);
  return out.join(', ');
}
