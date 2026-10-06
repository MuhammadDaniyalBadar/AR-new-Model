import { stepper } from './_helpers.js';

/**
 * Doopler. Model built from Burger Lab's menu photo; ingredients from Burger
 * Lab's published description. PITCH DEMO: replace layer wording, weights
 * and allergens with Burger Lab's approved information.
 */
const layer = stepper(0.168); // ≈ 2.2 cm per layer (largest dimension ≈ 13.1 cm)

export default {
  id: 'doopler',
  name: 'Doopler',
  category: 'chicken',
  summary: 'Double crispy chicken, cheese, mayo, chilli garlic sauce and lettuce.',
  description:
    'Two crispy fried chicken fillets with melted cheese, mayo, chilli garlic sauce and fresh lettuce in a soft bun.',
  price: null,
  model: { src: '/models/doopler.glb', iosSrc: null },
  dimensions: { widthCm: 12.5, heightCm: 13.1 },
  explode: { duration: 850, stagger: 55 },
  components: [
    { id: 'top-bun', name: 'Top bun', nodes: ['Top_Bun'], explode: layer(7, 0.05), info: { description: 'Soft, golden bun.' } },
    { id: 'lettuce', name: 'Lettuce', nodes: ['Lettuce'], explode: layer(6), info: { description: 'Fresh shredded lettuce.' } },
    { id: 'chilli-garlic', name: 'Chilli garlic sauce', nodes: ['Chilli_Garlic'], explode: layer(5), info: { description: 'Sweet, garlicky chilli sauce.' } },
    { id: 'chicken-2', name: 'Crispy chicken 2', nodes: ['Chicken_2'], explode: layer(4), info: { description: 'Crispy fried chicken fillet with a craggy golden coating.' } },
    { id: 'cheese', name: 'Cheese', nodes: ['Cheese'], explode: layer(3), info: { description: 'A slice of melted cheese.' } },
    { id: 'chicken-1', name: 'Crispy chicken 1', nodes: ['Chicken_1'], explode: layer(2), info: { description: 'Crispy fried chicken fillet with a craggy golden coating.' } },
    { id: 'mayo', name: 'Mayo', nodes: ['Mayo'], explode: layer(1), info: { description: 'Creamy mayo.' } },
    { id: 'bottom-bun', name: 'Bottom bun', nodes: ['Bottom_Bun'], explode: layer(0), info: { description: 'Toasted base of the bun.' } },
  ],
};
