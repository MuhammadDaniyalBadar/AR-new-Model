/**
 * Animal Fries. SAMPLE DATA, replace with restaurant-approved information.
 */
export default {
  id: 'animal-fries-01',
  name: 'Animal Fries',
  category: 'sides',
  summary: 'Fries under melted cheese, grilled onions and spread.',
  description: 'Crispy fries topped with melted cheese, slow-grilled onions and our pink house spread.',
  price: 390,

  model: { src: '/models/animal-fries.glb', iosSrc: null },
  dimensions: { widthCm: 13, depthCm: 9, heightCm: 6 },
  weightG: 320,

  explode: { duration: 800, stagger: 90 },

  components: [
    {
      id: 'spread',
      name: 'House spread',
      nodes: ['Spread'],
      explode: { direction: [0, 1, 0], distance: 1.36 },
      info: {
        description: 'Creamy, sweet and tangy.',
        weightG: 25,
        mainIngredients: ['Mayonnaise', 'Ketchup', 'Sweet relish', 'Vinegar'],
        allergens: ['Egg'],
      },
    },
    {
      id: 'onions',
      name: 'Grilled onions',
      nodes: ['Grilled_Onions'],
      explode: { direction: [0, 1, 0], distance: 1.02 },
      info: { description: 'Onions cooked slowly on the grill until sweet and golden.', weightG: 40 },
    },
    {
      id: 'cheese',
      name: 'Melted cheese',
      nodes: ['Melted_Cheese'],
      explode: { direction: [0, 1, 0], distance: 0.68 },
      info: { description: 'Two slices of cheddar melted over the top.', weightG: 40, allergens: ['Milk'] },
    },
    {
      id: 'fries',
      name: 'Fries',
      nodes: ['Fries'],
      explode: { direction: [0, 1, 0], distance: 0.34 },
      info: {
        description: 'Skin-on potatoes, cut fresh and fried twice.',
        weightG: 210,
        notes: 'Cooked in vegetable oil.',
      },
    },
    {
      id: 'tray',
      name: 'Serving tray',
      nodes: ['Tray'],
      explode: { direction: [0, 1, 0], distance: 0.0 },
      info: { description: 'Recyclable paper tray.', size: '13 × 9 cm' },
    },
  ],
};
