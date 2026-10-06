/**
 * Burger O'Clock beef burgers. Models built from Burger O'Clock's menu photos.
 *
 * PITCH DEMO: layer wording is written from the photos. Prices, weights and
 * allergens are deliberately left out; fill them in with Burger O'Clock's
 * approved information before launch.
 */
import { layers, parts, pattyCheese } from './_helpers.js';

export const ogBeef = {
  id: 'og-beef',
  name: 'The OG Beef',
  category: 'beef',
  summary: 'Two smashed beef patties, cheese, onion relish, ketchup and mayo.',
  description:
    'Two smashed beef patties with melted cheese, chopped onion relish, ketchup, mustard and mayo in a toasted bun.',
  price: null,
  model: { src: '/models/og-beef.glb', iosSrc: null },
  dimensions: { widthCm: 13, heightCm: 11.5 },
  explode: { duration: 850, stagger: 55 },
  components: layers(0.15, [
    parts.topBun,
    { id: 'mayo', name: 'Mayo', nodes: ['Mayo'], info: { description: 'Creamy mayo under the bun.' } },
    { id: 'ketchup', name: 'Ketchup & mustard', nodes: ['Ketchup_Mustard'], info: { description: 'Ketchup and mustard.' } },
    { id: 'onion-relish', name: 'Onion relish', nodes: ['Onion_Relish'], info: { description: 'Finely chopped onion and pickle relish.' } },
    pattyCheese(2),
    pattyCheese(1),
    parts.mustardBase,
    parts.bottomBun,
  ]),
};

export const oklahomaBeef = {
  id: 'oklahoma-beef',
  name: 'Oklahoma Beef',
  category: 'beef',
  summary: 'Smashed beef with onions pressed into the patty, cheese and mayo.',
  description:
    'Two beef patties smashed onto a bed of thinly sliced onions so they fry into the crust, with melted cheese and mayo.',
  price: null,
  model: { src: '/models/oklahoma-beef.glb', iosSrc: null },
  dimensions: { widthCm: 13, heightCm: 11.8 },
  explode: { duration: 850, stagger: 60 },
  components: layers(0.14, [
    parts.topBun,
    { id: 'mayo', name: 'Mayo', nodes: ['Mayo'], info: { description: 'Creamy mayo under the bun.' } },
    { id: 'patty-2', name: 'Patty 2, cheese & onions', nodes: ['Patty_2', 'Cheese_2', 'Onions_2'], info: { description: 'Beef patty smashed into sliced onions, under melted cheese.' } },
    { id: 'patty-1', name: 'Patty 1, cheese & onions', nodes: ['Patty_1', 'Cheese_1', 'Onions_1'], info: { description: 'Beef patty smashed into sliced onions, under melted cheese.' } },
    parts.bottomBun,
  ]),
};

export const oldSchool = {
  id: 'old-school',
  name: 'Beef Old School',
  category: 'beef',
  summary: 'A single thick patty with cheese, tomato, onion, pickles and lettuce.',
  description:
    'One thick beef patty with melted cheddar, fresh tomato, red onion, pickles, lettuce and cheese sauce. The classic, done properly.',
  price: null,
  model: { src: '/models/old-school.glb', iosSrc: null },
  dimensions: { widthCm: 12.3, heightCm: 12.1 },
  explode: { duration: 900, stagger: 55 },
  components: layers(0.125, [
    parts.topBun,
    parts.cheeseSauce,
    parts.pickles,
    parts.redOnion,
    parts.tomato,
    { id: 'patty', name: 'Beef patty & cheese', nodes: ['Patty', 'Cheese'], info: { description: 'Thick beef patty under a slice of melted cheddar.' } },
    parts.lettuce,
    parts.mustardBase,
    parts.bottomBun,
  ]),
};

export const beltBuster = {
  id: 'belt-buster',
  name: 'Belt Buster (Four Patty)',
  category: 'beef',
  summary: 'Four beef patties, four slices of cheese.',
  description: 'Four beef patties, each with its own slice of melted cheese, stacked in a toasted bun. Exactly what it sounds like.',
  price: null,
  model: { src: '/models/belt-buster.glb', iosSrc: null },
  dimensions: { widthCm: 12.5, heightCm: 15.4 },
  explode: { duration: 950, stagger: 50 },
  components: layers(0.105, [
    parts.topBun,
    { id: 'burger-sauce', name: 'Burger sauce', nodes: ['Burger_Sauce'], info: { description: 'Signature burger sauce.' } },
    pattyCheese(4),
    pattyCheese(3),
    pattyCheese(2),
    pattyCheese(1),
    parts.mustardBase,
    parts.bottomBun,
  ]),
};

export const mushroomMadness = {
  id: 'mushroom-madness',
  name: 'Beef Mushroom Madness',
  category: 'beef',
  summary: 'Beef patty piled with sautéed mushrooms, red onion and white cheese.',
  description:
    'A thick beef patty with soft white cheese, a heap of sautéed mushrooms, red onion and garlic mayo.',
  price: null,
  model: { src: '/models/mushroom-madness.glb', iosSrc: null },
  dimensions: { widthCm: 12.7, heightCm: 12.9 },
  explode: { duration: 900, stagger: 60 },
  components: layers(0.135, [
    parts.topBun,
    { id: 'garlic-mayo', name: 'Garlic mayo', nodes: ['Garlic_Mayo'], info: { description: 'Creamy garlic mayo.' } },
    { id: 'onion', name: 'Red onion', nodes: ['Red_Onion'], info: { description: 'Sautéed red onion.' } },
    { id: 'mushrooms', name: 'Sautéed mushrooms', nodes: ['Mushrooms'], info: { description: 'Button mushrooms, sliced and cooked in butter until golden.' } },
    { id: 'white-cheese', name: 'White cheese', nodes: ['White_Cheese'], info: { description: 'Soft white cheese, melted over the patty.' } },
    { id: 'patty', name: 'Beef patty', nodes: ['Patty'], info: { description: 'Thick, juicy beef patty.' } },
    { id: 'mayo-base', name: 'Mayo', nodes: ['Mayo_Bottom'], info: { description: 'Mayo on the base.' } },
    parts.bottomBun,
  ]),
};

export const messyMeat = {
  id: 'messy-meat',
  name: 'Messy Meat Burger',
  category: 'beef',
  summary: 'Beef patty, chilli meat sauce, cheese bites and jalapeños.',
  description:
    'A beef patty under melted cheese, chunky chilli meat sauce, crispy cheese bites, jalapeños and cheese sauce. As messy as it looks.',
  price: null,
  model: { src: '/models/messy-meat.glb', iosSrc: null },
  dimensions: { widthCm: 12.5, heightCm: 14.3 },
  explode: { duration: 950, stagger: 55 },
  components: layers(0.11, [
    parts.topBun,
    parts.cheeseSauce,
    parts.jalapenos,
    { id: 'cheese-bites', name: 'Crispy cheese bites', nodes: ['Cheese_Bites'], info: { description: 'Breaded cheese bites, fried until crisp.' } },
    { id: 'chilli-meat', name: 'Chilli meat sauce', nodes: ['Chilli_Meat'], info: { description: 'Chunky spiced minced-beef sauce.' } },
    { id: 'patty', name: 'Beef patty & cheese', nodes: ['Patty', 'Cheese'], info: { description: 'Beef patty under a slice of melted cheese.' } },
    parts.lettuce,
    parts.mustardBase,
    parts.bottomBun,
  ]),
};

export const crunchos = {
  id: 'crunchos',
  name: 'Beef Crunchos',
  category: 'beef',
  summary: 'Two beef patties, a crispy patty, jalapeños and nacho chips.',
  description:
    'Two smashed beef patties with a crispy fried patty on top, garlic mayo, jalapeños, nacho chips and signature sauce. The crunch is the point.',
  price: null,
  model: { src: '/models/crunchos.glb', iosSrc: null },
  dimensions: { widthCm: 12.9, heightCm: 15.2 },
  explode: { duration: 950, stagger: 55 },
  components: layers(0.105, [
    parts.topBun,
    { id: 'signature-sauce', name: 'Signature sauce', nodes: ['Signature_Sauce'], info: { description: 'Burger O’Clock’s signature sauce.' } },
    { id: 'nachos', name: 'Nacho chips', nodes: ['Nacho_Chips'], info: { description: 'Seasoned nacho chips, added at the end so they stay crunchy.' } },
    parts.jalapenos,
    { id: 'crispy-patty', name: 'Crispy patty', nodes: ['Crispy_Patty'], info: { description: 'Breaded patty, fried until golden.' } },
    { id: 'garlic-mayo', name: 'Garlic mayo', nodes: ['Garlic_Mayo'], info: { description: 'Creamy garlic mayo.' } },
    { id: 'patty-2', name: 'Patty 2', nodes: ['Patty_2'], info: { description: 'Beef patty, smashed on the grill.' } },
    { id: 'patty-1', name: 'Patty 1', nodes: ['Patty_1'], info: { description: 'Beef patty, smashed on the grill.' } },
    parts.lettuce,
    parts.mustardBase,
    parts.bottomBun,
  ]),
};
