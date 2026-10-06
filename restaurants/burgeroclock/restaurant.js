/**
 * Burger O'Clock: personalised pitch demo built from Burger O'Clock's own
 * menu photos and logo.
 *
 * Not affiliated with or approved by Burger O'Clock. Keep this build private
 * (share the link only with them) until they approve it.
 */
import { ogBeef, oklahomaBeef, oldSchool, beltBuster, mushroomMadness, messyMeat, crunchos } from './products/beef.js';
import { chickNCrisp, chickNCrispSmokyTang, fieryGigantic, grilledClassic, grilledSmokyTang } from './products/chicken.js';

export default {
  id: 'burgeroclock',
  name: "Burger O'Clock",
  intro: 'See every burger in 3D before you order. Take it apart layer by layer, or put it on your table in AR.',
  logo: '/brand/logo.png',
  favicon: '/favicon.png',

  // Black and yellow from the logo. The logo is white-on-dark, so it sits on
  // its own dark plaque; the page itself stays light so the food reads well.
  theme: {
    stageHi: '#faf6ee',
    stageLo: '#e8dfcc',
    ink: '#17150f',
    ink2: '#5a5447',
    primary: '#ffb400',
    primaryPress: '#dd9c00',
    onPrimary: '#17150f', // dark text: yellow is too light for white text
    accent: '#17150f',
    font: "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    fontDisplay: "'Archivo Black', 'Arial Black', sans-serif",
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400..800&display=swap',
  },

  currency: { locale: 'en-PK', code: 'PKR', maximumFractionDigits: 0 },

  categories: [
    { id: 'beef', name: 'Beef burgers' },
    { id: 'chicken', name: 'Chicken burgers' },
  ],
  products: [
    ogBeef,
    oklahomaBeef,
    oldSchool,
    beltBuster,
    mushroomMadness,
    messyMeat,
    crunchos,
    chickNCrisp,
    chickNCrispSmokyTang,
    fieryGigantic,
    grilledClassic,
    grilledSmokyTang,
  ],
};
