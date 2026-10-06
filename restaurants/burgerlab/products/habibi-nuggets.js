/**
 * Habibi Injected Nuggets. Models built from Burger Lab's menu photos.
 * PITCH DEMO: replace weights and allergens with Burger Lab's approved information.
 */
const nuggetInfo = {
  description: 'Bite-size chicken, injected with the same Arabic-inspired marinade as the Habibi burger, then crumbed and fried.',
};

export const nuggets5 = {
  id: 'habibi-nuggets-5',
  name: 'Habibi Injected Nuggets (5 Pcs)',
  category: 'habibi',
  summary: 'Five injected chicken nuggets.',
  description: 'Five Habibi injected chicken nuggets, crispy outside and juicy inside.',
  price: null,
  model: { src: '/models/habibi-nuggets-5.glb', iosSrc: null },
  dimensions: { widthCm: 11.5, heightCm: 7.8 },
  explode: { duration: 750, stagger: 0 },
  components: [
    { id: 'nuggets', name: 'Nuggets × 5', nodes: ['Nuggets'], explode: { direction: [0, 1, 0], distance: 0.55 }, info: nuggetInfo },
    { id: 'bucket', name: 'Bucket', nodes: ['Bucket'], explode: { direction: [0, 1, 0], distance: 0 }, info: { description: 'Served in a Burger Lab bucket.' } },
  ],
};

export const nuggets8Fries = {
  id: 'habibi-nuggets-8-fries',
  name: 'Habibi Injected Nuggets (8 Pcs) With Fries',
  category: 'habibi',
  summary: 'Eight injected chicken nuggets with fries.',
  description: 'Eight Habibi injected chicken nuggets with a side of golden fries.',
  price: null,
  model: { src: '/models/habibi-nuggets-8-fries.glb', iosSrc: null },
  dimensions: { widthCm: 19, heightCm: 5.6 },
  explode: { duration: 750, stagger: 80 },
  components: [
    { id: 'nuggets', name: 'Nuggets × 8', nodes: ['Nuggets'], explode: { direction: [-0.35, 1, 0], distance: 0.32 }, info: nuggetInfo },
    { id: 'fries', name: 'Fries', nodes: ['Fries'], explode: { direction: [0.35, 1, 0], distance: 0.26 }, info: { description: 'Golden, crispy fries.' } },
    { id: 'tray', name: 'Tray', nodes: ['Tray'], explode: { direction: [0, 1, 0], distance: 0 }, info: { description: 'Served in a Burger Lab tray.' } },
  ],
};
