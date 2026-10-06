# Adding a restaurant

Each restaurant is one folder in `restaurants/`. Nothing in `src/` changes.

## 1. Create the folder

Copy `restaurants/demo` to `restaurants/<id>`, where `<id>` is short, lowercase, no spaces (e.g. `kfcpk`, `cafe-aylanto`). Then:

- Delete the copied product files you don't need from `products/` and models from `public/models/`.
- Put the logo in `public/brand/` (PNG or JPG, square works best) and a 64 × 64 `public/favicon.png`.

## 2. Edit `restaurant.js`

```js
export default {
  id: 'cafe-aylanto',                 // same as the folder name
  name: 'Café Aylanto',               // browser tab, QR cards, alt text
  intro: 'See every dish in 3D…',     // line under the logo on the menu
  logo: '/brand/logo.png',            // or null to show the name as a heading
  favicon: '/favicon.png',
  theme: {
    stageHi: '#f8f1e4', stageLo: '#e6d6bd',   // background gradient behind the dish
    ink: '#141210', ink2: '#5c5249',          // main and secondary text
    primary: '#d6321a', primaryPress: '#ad2513', // "Take apart" button, highlights
    accent: '#f29a1d',                        // label dots
    font: "'Inter', system-ui, sans-serif",
    fontDisplay: "'Anton', sans-serif",       // headings; null = same as font
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400..800&display=swap',
  },
  currency: { locale: 'en-PK', code: 'PKR', maximumFractionDigits: 0 },
  categories: [{ id: 'beef', name: 'Beef' }, { id: 'chicken', name: 'Chicken' }], // or null for one list
  products: [/* imported product files, in menu order */],
};
```

Keep the background light and the text dark: buttons, labels and sheets are designed for that contrast.

## 3. Add dishes

Follow [ADDING_A_PRODUCT.md](ADDING_A_PRODUCT.md) for each dish. For a pitch, stand-in models can be built from photos in `scripts/models/<id>.mjs` with the parts in `scripts/lib/food-parts.mjs` (see `scripts/models/burgerlab.mjs`), then `npm run models <id>`.

## 4. Run, deploy, print

```
npm run dev <id>                 # check it locally
npm run build <id>               # or let Netlify build it
npm run qr <id> https://<their-site>.netlify.app
```

On Netlify: *Add new site → Import from GitHub* (same repository), then set the environment variable `RESTAURANT` = `<id>`. Each restaurant gets its own site and address, and its build contains only its own menu.
