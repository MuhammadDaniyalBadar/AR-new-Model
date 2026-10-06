import { stepper } from './_helpers.js';

/**
 * Habibi Injected Burger (Single and Double). Models built from Burger Lab's
 * menu photos; description from Burger Lab's published copy.
 * PITCH DEMO: replace weights, allergens and layer wording with Burger Lab's
 * approved information.
 */
const description =
  'Burger Lab’s injected chicken fillet, packed with bold Arabic-inspired flavour, with tangy pickles and signature sauce in a soft, toasted bun.';
const layer = stepper(0.2); // ≈ 2.4 cm per layer (largest dimension ≈ 12 cm)

const fillet = (n, label) => ({
  id: `fillet-${n}`,
  name: label,
  nodes: [`Fillet_${n}`],
  info: { description: 'Chicken fillet injected with Arabic-inspired marinade, then crumbed and fried.', notes: 'Sirf coated nahi, injected hai.' },
});

const top = (n) => [
  { id: 'top-bun', name: 'Top bun', nodes: ['Top_Bun'], explode: layer(n, 0.05), info: { description: 'Soft, toasted bun with a crumb topping.' } },
  { id: 'mayo', name: 'Mayo', nodes: ['Mayo'], explode: layer(n - 1), info: { description: 'Creamy mayo.' } },
  { id: 'pickles', name: 'Pickles', nodes: ['Pickles'], explode: layer(n - 2), info: { description: 'Tangy pickle slices.' } },
];
const bottom = [
  { id: 'signature-sauce', name: 'Signature sauce', nodes: ['Signature_Sauce'], explode: layer(1), info: { description: 'Burger Lab’s signature sauce.' } },
  { id: 'bottom-bun', name: 'Bottom bun', nodes: ['Bottom_Bun'], explode: layer(0), info: { description: 'Toasted base of the bun.' } },
];

export const habibiDouble = {
  id: 'habibi-double',
  name: 'Habibi Injected Burger Double',
  category: 'habibi',
  summary: 'Two injected chicken fillets, pickles and signature sauce.',
  description,
  price: null,
  model: { src: '/models/habibi-double.glb', iosSrc: null },
  dimensions: { widthCm: 12, heightCm: 11.4 },
  explode: { duration: 800, stagger: 60 },
  components: [...top(6), { ...fillet(2, 'Fillet 2'), explode: layer(3) }, { ...fillet(1, 'Fillet 1'), explode: layer(2) }, ...bottom],
};

export const habibiSingle = {
  id: 'habibi-single',
  name: 'Habibi Injected Burger Single',
  category: 'habibi',
  summary: 'Injected chicken fillet, pickles and signature sauce.',
  description,
  price: null,
  model: { src: '/models/habibi-single.glb', iosSrc: null },
  dimensions: { widthCm: 12, heightCm: 9.8 },
  explode: { duration: 750, stagger: 65 },
  components: [...top(5), { ...fillet(1, 'Injected fillet'), explode: layer(2) }, ...bottom],
};
