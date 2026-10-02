/**
 * Quadra. Model built from the reference photo supplied by the client.
 *
 * SAMPLE DATA: descriptions, weights and ingredients are placeholders.
 * Replace with restaurant-approved information before launch (SOW §7.5).
 * Price taken from the reference poster.
 *
 * explode.distance is a multiple of the model's largest dimension (its
 * height here, about 19 cm), so 0.115 ≈ 2.2 cm between layers.
 */
const step = 0.115;
const patty = (n) => ({
  id: `patty-${n}`,
  name: `Patty ${n} & cheese`,
  nodes: [`Patty_${n}`, `Cheese_${n}`],
  explode: { direction: [0, 1, 0], distance: step * (n + 1) },
  info: {
    description: 'Hand-pressed beef patty, grilled, topped with a slice of melted cheddar.',
    weightG: 110,
    allergens: ['Milk'],
    notes: n === 1 ? 'Quadra has four of these, stacked.' : undefined,
  },
});

export default {
  id: 'quadra-01',
  name: 'Quadra',
  category: 'burgers',
  summary: 'Four beef patties, four cheeses, beef salami, onion rings and jalapeños.',
  description:
    'Four grilled beef patties with melted cheddar, beef salami, crispy onion rings, pickled jalapeños, lettuce, ketchup and mayo in a soft sesame bun.',
  price: 550,

  model: { src: '/models/quadra.glb', iosSrc: null },
  dimensions: { widthCm: 13, heightCm: 19 },
  weightG: 720,

  explode: { duration: 950, stagger: 50 },

  components: [
    {
      id: 'top-bun',
      name: 'Top bun',
      nodes: ['Top_Bun'],
      explode: { direction: [0, 1, 0], distance: step * 10 + 0.06 },
      info: { description: 'Soft white bun with a sprinkle of sesame.', weightG: 55, allergens: ['Wheat', 'Sesame'] },
    },
    {
      id: 'mayo',
      name: 'Mayo',
      nodes: ['Mayo'],
      explode: { direction: [0, 1, 0], distance: step * 9 },
      info: { description: 'Creamy garlic mayo.', weightG: 20, mainIngredients: ['Mayonnaise', 'Garlic', 'Lemon'], allergens: ['Egg'] },
    },
    {
      id: 'jalapenos',
      name: 'Jalapeños',
      nodes: ['Jalapenos'],
      explode: { direction: [0, 1, 0], distance: step * 8 },
      info: { description: 'Pickled jalapeño slices for a little heat.', weightG: 15 },
    },
    {
      id: 'onion-rings',
      name: 'Onion rings',
      nodes: ['Onion_Rings'],
      explode: { direction: [0, 1, 0], distance: step * 7 },
      info: { description: 'Two breaded, fried onion rings.', weightG: 45, allergens: ['Wheat'] },
    },
    {
      id: 'salami',
      name: 'Beef salami',
      nodes: ['Beef_Salami'],
      explode: { direction: [0, 1, 0], distance: step * 6 },
      info: { description: 'One slice of beef salami.', weightG: 15 },
    },
    patty(4),
    patty(3),
    patty(2),
    patty(1),
    {
      id: 'lettuce',
      name: 'Lettuce & ketchup',
      nodes: ['Lettuce', 'Ketchup'],
      explode: { direction: [0, 1, 0], distance: step },
      info: { description: 'Fresh lettuce leaf over a layer of ketchup.', weightG: 25 },
    },
    {
      id: 'bottom-bun',
      name: 'Bottom bun',
      nodes: ['Bottom_Bun'],
      explode: { direction: [0, 1, 0], distance: 0 },
      info: { description: 'Toasted base of the same bun.', weightG: 45, allergens: ['Wheat'] },
    },
  ],
};
