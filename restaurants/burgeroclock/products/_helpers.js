/**
 * Helpers for Burger O'Clock product files.
 *
 * `layers()` takes the dish's components from top to bottom and spaces them
 * evenly: the bottom one stays put, each one above moves a little further.
 * `distance` is a multiple of the model's largest dimension, so `gap` is
 * roughly (gap × largest dimension) between layers.
 */
export function layers(gap, list) {
  const n = list.length - 1;
  return list.map((c, i) => ({
    ...c,
    explode: { direction: [0, 1, 0], distance: (n - i) * gap + (i === 0 ? gap * 0.5 : 0) },
  }));
}

/** Shared wording, so the same ingredient reads the same way on every dish. */
export const parts = {
  topBun: { id: 'top-bun', name: 'Top bun', nodes: ['Top_Bun'], info: { description: 'Soft, glossy toasted bun.' } },
  bottomBun: { id: 'bottom-bun', name: 'Bottom bun', nodes: ['Bottom_Bun'], info: { description: 'Toasted base of the bun.' } },
  mustardBase: { id: 'sauce-base', name: 'Burger sauce', nodes: ['Sauce'], info: { description: 'Burger O’Clock’s sauce, spread on the base.' } },
  lettuce: { id: 'lettuce', name: 'Lettuce', nodes: ['Lettuce'], info: { description: 'Fresh crisp lettuce.' } },
  tomato: { id: 'tomato', name: 'Tomato', nodes: ['Tomato'], info: { description: 'Thick slices of fresh tomato.' } },
  redOnion: { id: 'red-onion', name: 'Red onion', nodes: ['Red_Onion'], info: { description: 'Rings of raw red onion.' } },
  pickles: { id: 'pickles', name: 'Pickles', nodes: ['Pickles'], info: { description: 'Tangy pickle slices.' } },
  jalapenos: { id: 'jalapenos', name: 'Jalapeños', nodes: ['Jalapenos'], info: { description: 'Pickled jalapeño slices.' } },
  cheeseSauce: { id: 'cheese-sauce', name: 'Cheese sauce', nodes: ['Cheese_Sauce'], info: { description: 'Warm, tangy cheese sauce.' } },
  smokySauce: { id: 'smoky-sauce', name: 'Smoky tang sauce', nodes: ['Smoky_Sauce'], info: { description: 'Sweet and smoky signature sauce.' } },
  pepperoni: { id: 'pepperoni', name: 'Chicken pepperoni', nodes: ['Chicken_Pepperoni'], info: { description: 'Slices of chicken pepperoni.' } },
  caramelOnion: { id: 'caramel-onion', name: 'Caramelised onion', nodes: ['Caramelised_Onion'], info: { description: 'Red onion cooked down until sweet and sticky.' } },
};

/** `pattyCheese(2)` → the second smashed patty with its cheese slice. */
export const pattyCheese = (n, name = `Patty ${n} & cheese`) => ({
  id: `patty-${n}`,
  name,
  nodes: [`Patty_${n}`, `Cheese_${n}`],
  info: { description: 'Beef patty, smashed on the grill, under a slice of melted cheese.' },
});
