/**
 * Product registry. To add a dish: create a file in this folder, import it
 * here, and drop its GLB into /public/models. No new pages or code needed.
 * Menu order follows this array.
 */
import quadra from './quadra-01.js';
import burger from './burger-01.js';
import doubleCrunch from './double-crunch-01.js';
import bigBang from './bigbang-01.js';
import animalFries from './animal-fries-01.js';

export const PRODUCTS = [quadra, burger, doubleCrunch, bigBang, animalFries];
