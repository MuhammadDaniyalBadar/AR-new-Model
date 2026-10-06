import { stepper } from './_helpers.js';

/**
 * All American. Model built from Burger Lab's menu photo; ingredients from
 * Burger Lab's published description. PITCH DEMO: replace layer wording,
 * weights and allergens with Burger Lab's approved information.
 */
const layer = stepper(0.155); // ≈ 2.2 cm per layer (largest dimension ≈ 14.2 cm)

export default {
  id: 'all-american',
  name: 'All American',
  category: 'beef',
  summary: 'The one that started it all.',
  description:
    'Smashed beef with melted cheddar, sautéed onions, dill pickles, ketchup, mustard and Burger Lab’s signature sauce in a soft brioche bun.',
  price: null,
  model: { src: '/models/all-american.glb', iosSrc: null },
  dimensions: { widthCm: 13, heightCm: 11.9 },
  explode: { duration: 850, stagger: 55 },
  components: [
    { id: 'top-bun', name: 'Top bun', nodes: ['Top_Bun'], explode: layer(7, 0.05), info: { description: 'Soft brioche bun.' } },
    { id: 'signature-sauce', name: 'Signature sauce', nodes: ['Signature_Sauce'], explode: layer(6), info: { description: 'Burger Lab’s signature sauce.' } },
    { id: 'onions', name: 'Sautéed onions', nodes: ['Sauteed_Onions'], explode: layer(5), info: { description: 'Onions cooked low and slow until dark and jammy.' } },
    { id: 'pickles', name: 'Dill pickles', nodes: ['Pickles'], explode: layer(4), info: { description: 'Tangy dill pickle slices.' } },
    { id: 'patty-2', name: 'Patty 2 & cheese', nodes: ['Patty_2', 'Cheese_2'], explode: layer(3), info: { description: 'Smashed beef patty with melted cheddar.' } },
    { id: 'patty-1', name: 'Patty 1 & cheese', nodes: ['Patty_1', 'Cheese_1'], explode: layer(2), info: { description: 'Smashed beef patty with melted cheddar.' } },
    { id: 'ketchup-mustard', name: 'Ketchup & mustard', nodes: ['Ketchup_Mustard'], explode: layer(1), info: { description: 'Classic ketchup and mustard.' } },
    { id: 'bottom-bun', name: 'Bottom bun', nodes: ['Bottom_Bun'], explode: layer(0), info: { description: 'Toasted brioche base.' } },
  ],
};
