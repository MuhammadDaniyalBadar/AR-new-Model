/**
 * Double Crunch Burger (working name). Model built from the reference photo
 * supplied by the client.
 *
 * SAMPLE DATA: name, descriptions, weights, ingredients and price are
 * placeholders. Replace with restaurant-approved information before launch.
 *
 * explode.distance is a multiple of the model's largest dimension (its
 * height here, about 16.5 cm), so 0.133 ≈ 2.2 cm between layers.
 */
const step = 0.133;

export default {
  id: 'double-crunch-01',
  name: 'Double Crunch Burger',
  category: 'burgers',
  summary: 'Two smashed patties, onion rings, jalapeños and beef pepperoni.',
  description:
    'Two crispy-edged smashed beef patties with cheddar, beef pepperoni, jalapeños and onion rings, garlic sauce on top and pink sauce with shredded lettuce underneath, in a glossy brioche bun.',
  price: 890,

  model: { src: '/models/double-crunch.glb', iosSrc: null },
  dimensions: { widthCm: 13, heightCm: 16.5 },
  weightG: 520,

  explode: { duration: 900, stagger: 55 },

  components: [
    {
      id: 'top-bun',
      name: 'Top bun',
      nodes: ['Top_Bun'],
      explode: { direction: [0, 1, 0], distance: step * 8 + 0.05 },
      info: { description: 'Glossy brioche bun.', weightG: 60, allergens: ['Wheat', 'Egg', 'Milk'] },
    },
    {
      id: 'garlic-sauce',
      name: 'Garlic sauce',
      nodes: ['Garlic_Sauce'],
      explode: { direction: [0, 1, 0], distance: step * 7 },
      info: { description: 'Thick, creamy garlic sauce.', weightG: 20, mainIngredients: ['Mayonnaise', 'Garlic', 'Herbs'], allergens: ['Egg'] },
    },
    {
      id: 'onion-rings',
      name: 'Onion rings',
      nodes: ['Onion_Rings'],
      explode: { direction: [0, 1, 0], distance: step * 6 },
      info: { description: 'Two large breaded onion rings.', weightG: 55, allergens: ['Wheat'] },
    },
    {
      id: 'jalapenos',
      name: 'Jalapeños',
      nodes: ['Jalapenos'],
      explode: { direction: [0, 1, 0], distance: step * 5 },
      info: { description: 'Sliced pickled jalapeños.', weightG: 15 },
    },
    {
      id: 'pepperoni',
      name: 'Beef pepperoni',
      nodes: ['Pepperoni'],
      explode: { direction: [0, 1, 0], distance: step * 4 },
      info: { description: 'Folded slices of beef pepperoni, lightly grilled.', weightG: 25 },
    },
    {
      id: 'patty-2',
      name: 'Patty 2 & cheese',
      nodes: ['Patty_2', 'Cheese_2'],
      explode: { direction: [0, 1, 0], distance: step * 3 },
      info: { description: 'Smashed beef patty with crispy edges and melted cheddar.', weightG: 95, allergens: ['Milk'] },
    },
    {
      id: 'patty-1',
      name: 'Patty 1 & cheese',
      nodes: ['Patty_1', 'Cheese_1'],
      explode: { direction: [0, 1, 0], distance: step * 2 },
      info: { description: 'Smashed beef patty with crispy edges and melted cheddar.', weightG: 95, allergens: ['Milk'] },
    },
    {
      id: 'lettuce',
      name: 'Lettuce & sauce',
      nodes: ['Lettuce', 'Pink_Sauce'],
      explode: { direction: [0, 1, 0], distance: step },
      info: { description: 'Shredded iceberg on a layer of pink sauce.', weightG: 35, mainIngredients: ['Mayonnaise', 'Ketchup', 'Mustard'], allergens: ['Egg', 'Mustard'] },
    },
    {
      id: 'bottom-bun',
      name: 'Bottom bun',
      nodes: ['Bottom_Bun'],
      explode: { direction: [0, 1, 0], distance: 0 },
      info: { description: 'Toasted brioche base.', weightG: 45, allergens: ['Wheat', 'Egg', 'Milk'] },
    },
  ],
};
