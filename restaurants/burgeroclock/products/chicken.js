/**
 * Burger O'Clock chicken burgers. Models built from Burger O'Clock's menu photos.
 *
 * PITCH DEMO: layer wording is written from the photos. Prices, weights and
 * allergens are deliberately left out; fill them in with Burger O'Clock's
 * approved information before launch.
 */
import { layers, parts } from './_helpers.js';

const crispyChicken = (nodes, name = 'Crispy chicken') => ({
  id: 'crispy-chicken',
  name,
  nodes,
  info: { description: 'Chicken fillet in a craggy, shaggy fried coating.' },
});
const grilledChicken = {
  id: 'grilled-chicken',
  name: 'Grilled chicken',
  nodes: ['Grilled_Chicken'],
  info: { description: 'Chicken fillet, seasoned and grilled.' },
};

export const chickNCrisp = {
  id: 'chick-n-crisp',
  name: "Chick n' Crisp",
  category: 'chicken',
  summary: 'Crispy fried chicken, lettuce and mayo.',
  description: 'A big crispy fried chicken fillet with shredded lettuce and mayo in a toasted bun. Simple and loud.',
  price: null,
  model: { src: '/models/chick-n-crisp.glb', iosSrc: null },
  dimensions: { widthCm: 13.7, heightCm: 11.5 },
  explode: { duration: 800, stagger: 65 },
  components: layers(0.17, [
    parts.topBun,
    { id: 'mayo', name: 'Mayo', nodes: ['Mayo'], info: { description: 'Creamy mayo under the bun.' } },
    crispyChicken(['Crispy_Chicken']),
    parts.lettuce,
    parts.mustardBase,
    parts.bottomBun,
  ]),
};

export const chickNCrispSmokyTang = {
  id: 'chick-n-crisp-smoky-tang',
  name: "Chick n' Crisp Smoky Tang",
  category: 'chicken',
  summary: 'Crispy chicken with pepperoni, caramelised onion and smoky sauce.',
  description:
    'Crispy fried chicken topped with chicken pepperoni, sticky caramelised onion and a sweet smoky sauce.',
  price: null,
  model: { src: '/models/chick-n-crisp-smoky-tang.glb', iosSrc: null },
  dimensions: { widthCm: 12.9, heightCm: 12.8 },
  explode: { duration: 880, stagger: 60 },
  components: layers(0.135, [
    parts.topBun,
    parts.smokySauce,
    parts.caramelOnion,
    parts.pepperoni,
    crispyChicken(['Crispy_Chicken']),
    parts.lettuce,
    parts.mustardBase,
    parts.bottomBun,
  ]),
};

export const fieryGigantic = {
  id: 'fiery-gigantic',
  name: 'Fiery Gigantic',
  category: 'chicken',
  summary: 'Two crispy chicken fillets, cheese, pickles and fiery sauce.',
  description:
    'Two big crispy chicken fillets with melted cheese, pickles, lettuce and a fiery sauce. The one you order to prove a point.',
  price: null,
  model: { src: '/models/fiery-gigantic.glb', iosSrc: null },
  dimensions: { widthCm: 12.8, heightCm: 14 },
  explode: { duration: 900, stagger: 55 },
  components: layers(0.115, [
    parts.topBun,
    { id: 'fiery-sauce', name: 'Fiery sauce', nodes: ['Fiery_Sauce'], info: { description: 'Hot, tangy signature sauce.' } },
    parts.pickles,
    { id: 'chicken-2', name: 'Crispy chicken 2', nodes: ['Crispy_Chicken_2'], info: { description: 'Chicken fillet in a craggy fried coating.' } },
    { id: 'cheese', name: 'Cheese', nodes: ['Cheese'], info: { description: 'A slice of melted cheese.' } },
    { id: 'chicken-1', name: 'Crispy chicken 1', nodes: ['Crispy_Chicken_1'], info: { description: 'Chicken fillet in a craggy fried coating.' } },
    parts.lettuce,
    parts.mustardBase,
    parts.bottomBun,
  ]),
};

export const grilledClassic = {
  id: 'grilled-classic',
  name: 'Grilled Chicken Classic',
  category: 'chicken',
  summary: 'Grilled chicken with cheese, tomato, onion and pickles.',
  description:
    'A grilled chicken fillet with melted cheese, fresh tomato, red onion, pickles and lettuce. The lighter one.',
  price: null,
  model: { src: '/models/grilled-classic.glb', iosSrc: null },
  dimensions: { widthCm: 12.7, heightCm: 11.7 },
  explode: { duration: 900, stagger: 55 },
  components: layers(0.13, [
    parts.topBun,
    parts.cheeseSauce,
    parts.pickles,
    parts.redOnion,
    parts.tomato,
    { id: 'chicken', name: 'Grilled chicken & cheese', nodes: ['Grilled_Chicken', 'Cheese'], info: { description: 'Grilled chicken fillet under a slice of melted cheese.' } },
    parts.lettuce,
    parts.mustardBase,
    parts.bottomBun,
  ]),
};

export const grilledSmokyTang = {
  id: 'grilled-smoky-tang',
  name: 'Grilled Chicken Smoky Tang',
  category: 'chicken',
  summary: 'Grilled chicken with pepperoni, caramelised onion and smoky sauce.',
  description:
    'Grilled chicken fillet with melted cheese, chicken pepperoni, caramelised onion and sweet smoky sauce.',
  price: null,
  model: { src: '/models/grilled-smoky-tang.glb', iosSrc: null },
  dimensions: { widthCm: 13, heightCm: 11.4 },
  explode: { duration: 900, stagger: 55 },
  components: layers(0.13, [
    parts.topBun,
    parts.smokySauce,
    parts.caramelOnion,
    parts.pepperoni,
    { ...grilledChicken, id: 'chicken', name: 'Grilled chicken & cheese', nodes: ['Grilled_Chicken', 'Cheese'] },
    parts.lettuce,
    parts.mustardBase,
    parts.bottomBun,
  ]),
};
