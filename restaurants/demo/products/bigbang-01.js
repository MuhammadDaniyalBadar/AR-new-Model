/**
 * Big Bang Burger. SAMPLE DATA, replace with restaurant-approved information.
 */
export default {
  id: 'bigbang-01',
  name: 'Big Bang Burger',
  category: 'burgers',
  summary: 'Two patties, two cheeses, bacon and onion rings.',
  description:
    'Our tallest burger: two grilled beef patties, double cheddar, smoked bacon, crispy onion rings, lettuce and two sauces.',
  price: 990,

  model: { src: '/models/bigbang-burger.glb', iosSrc: null },
  dimensions: { widthCm: 12, heightCm: 13.5 },
  weightG: 480,

  explode: { duration: 900, stagger: 55 },

  components: [
    {
      id: 'top-bun',
      name: 'Top bun',
      nodes: ['Top_Bun'],
      explode: { direction: [0, 1, 0], distance: 1.98 },
      info: { description: 'Toasted sesame bun.', weightG: 50, allergens: ['Wheat', 'Sesame', 'Egg'] },
    },
    {
      id: 'sauce-top',
      name: 'House sauce',
      nodes: ['Sauce_Top'],
      explode: { direction: [0, 1, 0], distance: 1.71 },
      info: {
        description: 'Creamy, tangy and lightly smoky.',
        weightG: 15,
        mainIngredients: ['Mayonnaise', 'Pickle relish', 'Smoked paprika'],
        allergens: ['Egg'],
      },
    },
    {
      id: 'lettuce',
      name: 'Lettuce',
      nodes: ['Lettuce'],
      explode: { direction: [0, 1, 0], distance: 1.52 },
      info: { description: 'Crisp iceberg leaf.', weightG: 12 },
    },
    {
      id: 'onion-rings',
      name: 'Onion rings',
      nodes: ['Onion_Rings'],
      explode: { direction: [0, 1, 0], distance: 1.33 },
      info: { description: 'Three beer-battered onion rings.', weightG: 40, allergens: ['Wheat'] },
    },
    {
      id: 'cheese-top',
      name: 'Cheddar (top)',
      nodes: ['Cheese_Top'],
      explode: { direction: [0, 1, 0], distance: 1.14 },
      info: { description: 'Mild cheddar slice.', weightG: 20, allergens: ['Milk'] },
    },
    {
      id: 'patty-top',
      name: 'Beef patty (top)',
      nodes: ['Patty_Top'],
      explode: { direction: [0, 1, 0], distance: 0.95 },
      info: { description: '100% beef, grilled.', weightG: 120, notes: 'Weight is before cooking.' },
    },
    {
      id: 'bacon',
      name: 'Smoked bacon',
      nodes: ['Bacon'],
      explode: { direction: [0, 1, 0], distance: 0.76 },
      info: { description: 'Two rashers of crispy smoked beef bacon.', weightG: 25 },
    },
    {
      id: 'cheese-bottom',
      name: 'Cheddar (bottom)',
      nodes: ['Cheese_Bottom'],
      explode: { direction: [0, 1, 0], distance: 0.57 },
      info: { description: 'Mild cheddar slice.', weightG: 20, allergens: ['Milk'] },
    },
    {
      id: 'patty-bottom',
      name: 'Beef patty (bottom)',
      nodes: ['Patty_Bottom'],
      explode: { direction: [0, 1, 0], distance: 0.38 },
      info: { description: '100% beef, grilled.', weightG: 120, notes: 'Weight is before cooking.' },
    },
    {
      id: 'sauce-bottom',
      name: 'Smoky chilli sauce',
      nodes: ['Sauce_Bottom'],
      explode: { direction: [0, 1, 0], distance: 0.19 },
      info: {
        description: 'Medium heat with a smoky finish.',
        weightG: 15,
        mainIngredients: ['Tomato', 'Chipotle chilli', 'Garlic', 'Brown sugar'],
      },
    },
    {
      id: 'bottom-bun',
      name: 'Bottom bun',
      nodes: ['Bottom_Bun'],
      explode: { direction: [0, 1, 0], distance: 0.0 },
      info: { description: 'Toasted base of the same bun.', weightG: 40, allergens: ['Wheat', 'Egg'] },
    },
  ],
};
