# Adding a product

A dish is two things: a **GLB model** in `restaurants/<id>/public/models/` and a **product file** in `restaurants/<id>/products/`. No new pages or code are needed (SOW: product configuration is kept separate from assets).

## 1. Prepare the model in Blender

**Units and origin**

- Scene units: metric, unit scale 1.0, so 1 Blender unit = 1 meter. Model the dish at its real size (a burger is about 0.11 m wide).
- Put the object origin at the **bottom center** of the dish, sitting on the ground plane (Z = 0 in Blender). AR places that point on the table.
- Apply all transforms (Ctrl+A → All Transforms) before export.

If the size is off, AR still comes out right as long as `dimensions` is filled in (see below), but correct units make the 3D view and debugging easier.

**One object per component**

Every part that should move when the dish is taken apart needs to be its own object with a clear, stable name:

```
Top_Bun   Lettuce   Tomato   Cheese   Patty   Sauce   Bottom_Bun
```

- Use letters, digits and underscores only. three.js removes spaces and dots from names (`Top Bun.001` becomes `Top_Bun001`), which is easy to miss. `npm run inspect` shows the final names.
- A component may be several objects (e.g. two tomato slices); list them all in `nodes`, or parent them to an empty and list the empty.
- Model each layer in its **assembled** position. The app moves it outwards.

**Materials and size budget**

- Principled BSDF with Base Color, Roughness, Normal maps exports cleanly to glTF.
- Aim for under ~5 MB per GLB and textures of 2048 px or less for fast loading on mobile data. Draco or Meshopt compression is supported by the loader.

**Export:** File → Export → glTF 2.0, format **glTF Binary (.glb)**, include *Selected Objects* or *Visible Objects*, +Y Up checked, Apply Modifiers checked.

## 2. Check the node names

```bash
npm run inspect restaurants/<id>/public/models/my-dish.glb
```

This prints the node tree with the names the app will match against.

## 3. Create the product file

Copy an existing product, e.g. `restaurants/demo/products/burger-01.js`, to a new file such as `restaurants/<id>/products/chicken-01.js`, and edit it:

```js
export default {
  id: 'chicken-01',             // a–z, 0–9 and "-" only; appears in QR URLs (?product=chicken-01)
  name: 'Crispy Chicken Burger',
  category: 'burgers',          // matches an id in restaurant.js categories (menu sections)
  summary: 'One line for the menu list.',
  description: 'Longer text for the Details sheet.',
  price: 10.5,                  // number; formatted with the currency in app.config.js

  model: {
    src: '/models/chicken.glb',
    iosSrc: null,               // optional hand-made .usdz; otherwise generated in the browser
  },

  dimensions: { widthCm: 12, heightCm: 10 },   // real size, used for AR scale
  weightG: 300,

  explode: { duration: 750, stagger: 70 },     // optional; overrides app defaults

  components: [
    {
      id: 'top-bun',
      name: 'Top bun',                         // label text
      nodes: ['Top_Bun'],                      // GLB node names (from npm run inspect)
      explode: { direction: [0, 1, 0], distance: 1.4 },
      info: {
        description: 'Shown when the customer taps this layer.',
        weightG: 45,
        size: '12 cm across',
        mainIngredients: ['Flour', 'Butter'],  // e.g. for sauces
        allergens: ['Wheat', 'Milk'],
        notes: 'Any extra note from the kitchen.',
      },
    },
    // ...list components top to bottom; this is the order in the Details sheet
  ],
};
```

Then add it to the `products` list in `restaurants/<id>/restaurant.js` (the list order is the menu order):

```js
import chicken from './products/chicken-01.js';
// ...
products: [burger, bigBang, animalFries, chicken],
```

**Component info must come from the restaurant.** The app never derives weights, sizes or ingredients from the model (SOW). Any field left out is simply not shown. Supported `info` fields: `description`, `weightG`, `size`, `mainIngredients`, `allergens`, `notes`. Unknown fields trigger a console warning.

## 4. Tune the explode

- `direction` is a vector in model space (`[0, 1, 0]` is straight up). It doesn't need to be normalized.
- `distance` is a **multiple of the model's largest dimension**, so the numbers don't depend on export units. `1.0` moves a layer by one full dish-size.
- `distance: 0` keeps a layer in place (usually the bottom bun or tray). It still gets a label.
- A component with no `explode` rule is stacked automatically by height using `explode.autoGap` from `app.config.js`. Useful for a first pass.
- For a vertical stack, give each layer a distance that grows from bottom to top with an even step (the sample burger uses steps of 0.24).

## 5. Verify

1. `npm run dev <id>` and open `/?product=chicken-01&debug`.
2. The debug panel shows each node, which component it matched, and any component whose nodes were not found.
3. Tap **Take apart** and check that every layer separates and every label appears.
4. On a phone (`npm run dev:phone <id>`), check AR placement and that the size looks right on the table.
5. Generate its QR code: `npm run qr <id> https://your-domain.com`.
