import { stepper } from './_helpers.js';

/**
 * Shroom Smash. Model built from Burger Lab's menu photo.
 * PITCH DEMO: layer descriptions are written from the photo; replace with
 * Burger Lab's approved wording, weights and allergens.
 */
const layer = stepper(0.164); // ≈ 2.4 cm per layer (largest dimension ≈ 14.6 cm)

export default {
  id: 'shroom-smash',
  name: 'Shroom Smash',
  category: 'beef',
  summary: 'Double smashed beef, cheddar and a creamy mushroom sauce.',
  description:
    'Two smashed beef patties with melted cheddar and sautéed onions, finished with a rich, peppery mushroom sauce. Mayo and sliced onion underneath, in a soft potato bun.',
  price: null,
  model: { src: '/models/shroom-smash.glb', iosSrc: null },
  dimensions: { widthCm: 13, heightCm: 12.3 },
  explode: { duration: 850, stagger: 60 },
  components: [
    { id: 'top-bun', name: 'Top bun', nodes: ['Top_Bun'], explode: layer(6, 0.05), info: { description: 'Soft, golden potato bun.' } },
    { id: 'mushroom-sauce', name: 'Mushroom sauce', nodes: ['Mushroom_Sauce'], explode: layer(5), info: { description: 'Creamy, peppery sauce loaded with sliced mushrooms.' } },
    { id: 'patty-2', name: 'Patty 2 & cheese', nodes: ['Patty_2', 'Cheese_2'], explode: layer(4), info: { description: 'Smashed beef patty with a crispy seared edge, under melted cheddar.' } },
    { id: 'sauteed-onions', name: 'Sautéed onions', nodes: ['Sauteed_Onions'], explode: layer(3), info: { description: 'Onions cooked down until soft and sweet.' } },
    { id: 'patty-1', name: 'Patty 1 & cheese', nodes: ['Patty_1', 'Cheese_1'], explode: layer(2), info: { description: 'Smashed beef patty with melted cheddar.' } },
    { id: 'onion-mayo', name: 'Onion & mayo', nodes: ['Red_Onion', 'Mayo'], explode: layer(1), info: { description: 'Thinly sliced onion on a layer of mayo.' } },
    { id: 'bottom-bun', name: 'Bottom bun', nodes: ['Bottom_Bun'], explode: layer(0), info: { description: 'Toasted base of the potato bun.' } },
  ],
};
