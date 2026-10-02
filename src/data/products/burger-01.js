/**
 * Classic Beef Burger. Model built from the reference photo supplied by the client.
 *
 * SAMPLE DATA: every description, weight, ingredient and price below is a
 * placeholder. Replace it with restaurant-approved information before
 * launch (SOW §7.5: information must not be inferred from the model).
 *
 * explode.distance is a multiple of the model's largest dimension (its
 * width here, about 12 cm), so 0.21 ≈ 2.6 cm between layers.
 */
const step = 0.21;

export default {
  id: 'burger-01',
  name: 'Classic Beef Burger',
  category: 'burgers',
  summary: 'Grilled beef, white cheese and red onion in a grilled bun.',
  description:
    'A thick, pepper-crusted beef patty with soft white cheese and sliced red onion in a bun grilled on both sides.',
  price: 650,

  model: { src: '/models/classic-burger.glb', iosSrc: null },
  dimensions: { widthCm: 12, heightCm: 10.5 },
  weightG: 300,

  explode: { duration: 750, stagger: 70 },

  components: [
    {
      id: 'top-bun',
      name: 'Top bun',
      nodes: ['Top_Bun'],
      explode: { direction: [0, 1, 0], distance: step * 4 + 0.04 },
      info: { description: 'Soft bun, scored on top and grilled.', weightG: 50, size: '12 cm across', allergens: ['Wheat'] },
    },
    {
      id: 'red-onion',
      name: 'Red onion',
      nodes: ['Red_Onion'],
      explode: { direction: [0, 1, 0], distance: step * 3 },
      info: { description: 'Thin rings of raw red onion.', weightG: 15 },
    },
    {
      id: 'white-cheese',
      name: 'White cheese',
      nodes: ['White_Cheese'],
      explode: { direction: [0, 1, 0], distance: step * 2 },
      info: { description: 'Soft, tangy white cheese, spread while the patty is hot.', weightG: 30, allergens: ['Milk'] },
    },
    {
      id: 'patty',
      name: 'Beef patty',
      nodes: ['Patty'],
      explode: { direction: [0, 1, 0], distance: step },
      info: {
        description: '100% beef, seasoned with salt and cracked black pepper, grilled.',
        weightG: 150,
        size: '10.5 cm across, 2.4 cm thick',
        notes: 'Weight is before cooking.',
      },
    },
    {
      id: 'bottom-bun',
      name: 'Bottom bun',
      nodes: ['Bottom_Bun'],
      explode: { direction: [0, 1, 0], distance: 0 },
      info: { description: 'Grilled base with poppy seeds.', weightG: 45, allergens: ['Wheat'] },
    },
  ],
};
