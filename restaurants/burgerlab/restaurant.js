/**
 * Burger Lab: personalised pitch demo built from Burger Lab's own menu
 * photos and logo.
 *
 * Not affiliated with or approved by Burger Lab. Keep this build private
 * (share the link only with Burger Lab) until they approve it.
 */
import quadra from './products/quadra.js';
import shroomSmash from './products/shroom-smash.js';
import allAmerican from './products/all-american.js';
import nashthrillSando from './products/nashthrill-sando.js';
import doopler from './products/doopler.js';
import { habibiDouble, habibiSingle } from './products/habibi-burgers.js';
import { nuggets5, nuggets8Fries } from './products/habibi-nuggets.js';

export default {
  id: 'burgerlab',
  name: 'Burger Lab',
  intro: 'See every burger in 3D before you order. Take it apart layer by layer, or put it on your table in AR.',
  logo: '/brand/logo.jpg',
  favicon: '/favicon.png',

  // Cream and black from the logo, with a flame-red accent.
  theme: {
    stageHi: '#f8f1e4',
    stageLo: '#e6d6bd',
    ink: '#141210',
    ink2: '#5c5249',
    primary: '#d6321a',
    primaryPress: '#ad2513',
    accent: '#f29a1d',
    font: "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    fontDisplay: "'Anton', 'Impact', 'Arial Narrow', sans-serif",
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400..800&display=swap',
  },

  currency: { locale: 'en-PK', code: 'PKR', maximumFractionDigits: 0 },

  categories: [
    { id: 'beef', name: 'Smash burgers' },
    { id: 'chicken', name: 'Chicken' },
    { id: 'habibi', name: 'Habibi Injected Series' },
  ],
  products: [quadra, shroomSmash, allAmerican, nashthrillSando, doopler, habibiDouble, habibiSingle, nuggets5, nuggets8Fries],
};
