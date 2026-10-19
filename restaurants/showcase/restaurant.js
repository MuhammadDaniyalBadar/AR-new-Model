/**
 * Showcase: the one-burger site behind the Instagram page's QR code.
 *
 * singleDish locks the site to that dish: the QR code (or any link to this
 * site) opens it straight away, there is no back button and no menu list.
 * To feature a different burger later, add its product file, put it in
 * `products` and change `singleDish` to its id.
 *
 *   npm run dev showcase
 *   npm run build showcase          (Netlify/Vercel: RESTAURANT=showcase)
 *   npm run qr showcase https://your-showcase-site.vercel.app
 */
import monster from './products/monster.js';

export default {
  id: 'showcase',
  // The page name: used for the browser tab title. Change it to your Instagram page's name.
  name: 'Stacked 3D',
  intro: null,
  logo: null,
  favicon: '/favicon.svg',

  singleDish: 'monster',

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

  categories: null,
  products: [monster],
};
