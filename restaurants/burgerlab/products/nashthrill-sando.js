import { stepper } from './_helpers.js';

/**
 * Delulu Nashthrill Sando. Model built from Burger Lab's menu photo.
 * PITCH DEMO: replace layer wording, weights and allergens with Burger Lab's
 * approved information.
 */
const layer = stepper(0.206); // ≈ 2.6 cm per layer (largest dimension ≈ 12.6 cm)

export default {
  id: 'nashthrill-sando',
  name: 'Delulu Nashthrill Sando',
  category: 'chicken',
  summary: 'Nashville hot fried chicken on thick griddled toast.',
  description:
    'A Nashville-style hot fried chicken fillet with pickles and spicy mayo, sandwiched between two slices of thick, buttery griddled toast.',
  price: null,
  model: { src: '/models/nashthrill-sando.glb', iosSrc: null },
  dimensions: { widthCm: 12.5, heightCm: 7.7 },
  explode: { duration: 800, stagger: 70 },
  components: [
    { id: 'top-toast', name: 'Top toast', nodes: ['Top_Toast'], explode: layer(4, 0.04), info: { description: 'Thick-cut toast, griddled until golden.' } },
    { id: 'pickles', name: 'Pickles', nodes: ['Pickles'], explode: layer(3), info: { description: 'Tangy pickle slices to cut through the heat.' } },
    { id: 'spicy-mayo', name: 'Spicy mayo', nodes: ['Spicy_Mayo'], explode: layer(2), info: { description: 'Creamy mayo with a kick.' } },
    { id: 'chicken', name: 'Hot chicken', nodes: ['Nashville_Chicken'], explode: layer(1), info: { description: 'Crispy fried chicken fillet coated in fiery Nashville-style spice.' } },
    { id: 'bottom-toast', name: 'Bottom toast', nodes: ['Bottom_Toast', 'Sauce_Bottom'], explode: layer(0), info: { description: 'Griddled toast spread with spicy mayo.' } },
  ],
};
