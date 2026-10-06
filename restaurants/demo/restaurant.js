/**
 * Demo restaurant: the neutral version to show any prospect.
 * SAMPLE DATA throughout (see each product file).
 */
import burger from './products/burger-01.js';
import doubleCrunch from './products/double-crunch-01.js';
import bigBang from './products/bigbang-01.js';
import animalFries from './products/animal-fries-01.js';

export default {
  id: 'demo',
  name: 'Our menu',
  intro: 'See a dish in 3D before you order. Take it apart to see every layer, or put it on your table in AR.',
  logo: null,
  favicon: '/favicon.svg',

  theme: {
    stageHi: '#f8f9f4',
    stageLo: '#dce2d5',
    ink: '#1f2a1e',
    ink2: '#4e5b4a',
    primary: '#c7361f',
    primaryPress: '#a52a16',
    accent: '#e9b12b',
    font: "'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    fontDisplay: null,
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap',
  },

  currency: { locale: 'en-PK', code: 'PKR', maximumFractionDigits: 0 },

  categories: null,
  products: [burger, doubleCrunch, bigBang, animalFries],
};
