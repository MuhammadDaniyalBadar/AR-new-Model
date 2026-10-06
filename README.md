# Interactive 3D & AR Restaurant Menu

Customer-facing viewer from **SOW v1.0**: open a dish from a QR code, turn and zoom it in 3D, take it apart layer by layer, tap a layer to read restaurant-provided details, and place it on the table in AR at real-world size.

This build covers the customer experience and AR only. The admin panel is intentionally not included.

> **Placeholder content.** All 3D models are procedural stand-ins and all dish details are sample or pitch-demo data. Replace both with real models and restaurant-approved information before launch.

## Quick start

```bash
npm install
npm run dev                    # demo restaurant on http://localhost:5173 (and your LAN IP)
npm run dev burgerlab          # same, for Burger Lab
npm run dev:phone burgerlab    # HTTPS on your Wi-Fi (needed for AR on a phone)
npm run build burgerlab        # production build of one restaurant in dist/
npm run preview      # serve the production build
```

Node 18 or newer is required.

### URLs

| URL | Opens |
| --- | --- |
| `/` | Prototype menu list with a "View in 3D" button per dish (SOW: temporary stand-in for QR codes) |
| `/?product=burger-01` | The dish directly. This is the QR-code entry point |
| `/?product=burger-01&debug` | Same, plus a developer panel: node tree, matched and missing nodes, draw calls |

### Testing on a phone

AR needs a secure context, so `localhost` on your laptop is not enough for a phone.

1. Run `npm run dev:phone`. Vite starts with a self-signed HTTPS certificate and prints a `Network:` URL.
2. Put the phone on the same Wi-Fi and open that URL. Accept the certificate warning once.
3. Android Chrome launches **WebXR** directly. iPhone Safari launches **AR Quick Look**.

**If the page won't open on the phone:**

- Use the `Network:` address Vite prints (e.g. `https://192.168.1.23:5173`), never `localhost`. On a phone, `localhost` means the phone itself.
- Phone and computer must be on the same Wi-Fi. Guest networks and some office/café networks block devices from reaching each other ("client isolation"), and mobile data won't work at all.
- Type `https://` in full for `dev:phone`. The certificate warning is expected: tap *Advanced* → *Proceed* (Chrome) or *Show Details* → *visit this website* (Safari).
- On Windows, allow Node.js through the firewall on **Private** networks when prompted, and make sure your Wi-Fi is set to *Private*, not *Public*. On macOS, allow incoming connections for Node.
- A VPN on either device can block local addresses. Turn it off while testing.
- If none of that works, use a tunnel for a public HTTPS link instead: `npx cloudflared tunnel --url http://localhost:5173` (run alongside `npm run dev`).

Scene Viewer (the Android fallback) downloads the GLB on Google's side, so it only works once the app is hosted on a public HTTPS domain. For a quick public URL you can use any tunnel (e.g. `cloudflared tunnel --url https://localhost:5173`) or deploy `dist/` to any static host.

## Restaurants

One codebase serves any number of restaurants. Each one is a folder:

```
restaurants/
  demo/                 neutral demo, safe to show any prospect
  burgerlab/            Burger Lab pitch demo
    restaurant.js       name, logo, colours, fonts, currency, menu sections, dish list
    products/*.js       one file per dish (content, layers, explode settings)
    public/             served at the site root for this restaurant only
      models/*.glb      3D models
      brand/logo.jpg    logo
      favicon.png
```

Every command takes the restaurant as a plain word (no `--`, so it works the same in PowerShell): `npm run dev burgerlab`, `npm run build burgerlab`, `npm run qr burgerlab https://...`, `npm run models burgerlab`. Without one, `demo` is used.

A build contains **only** that restaurant's dishes, models and branding, so a prospect never sees another restaurant's menu. Deploy each restaurant as its own Netlify site from the same GitHub repository and set an environment variable **`RESTAURANT`** (e.g. `burgerlab`) in that site's settings (*Site configuration → Environment variables*). The build command stays `npm run build`.

To add a restaurant, see [docs/ADDING_A_RESTAURANT.md](docs/ADDING_A_RESTAURANT.md).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run inspect restaurants/demo/public/models/classic-burger.glb` | Prints a GLB's node tree with the names three.js will see. Use it to fill in `nodes` in a product file |
| `npm run qr burgerlab https://your-menu.netlify.app` | Writes the QR codes for the printed menu to `qr-codes/burgerlab/` (see below) |
| `npm run models burgerlab` | Regenerates a restaurant's procedural stand-in models (`scripts/models/<restaurant>.mjs`, parts library in `scripts/lib/food-parts.mjs`) |

## QR codes for the printed menu

Each QR code opens one dish directly, e.g. `https://your-menu.netlify.app/?product=quadra-01`. The customer lands straight in the 3D view of that dish, with take apart, labels, details and AR exactly as in the app.

1. Deploy the site and note its live **https** address.
2. Run `npm run qr burgerlab https://your-menu.netlify.app` (the restaurant and its live address). It warns you if the address isn't https or is a local one.
3. Open `qr-codes/<restaurant>/print.html` in a browser for ready-to-cut cards (four per A4 page, with the restaurant's logo, dish name, price and "Scan to see it in 3D"). Print it, or *Save as PDF* and send it to the printer. Give a designer the `.svg` files if the codes go into the menu layout itself.
4. Test-scan one code with an iPhone and an Android phone before printing in bulk.

Rules that keep printed codes working:

- **Never rename a product `id`** once its code is printed. The code contains the id; a renamed dish opens "Dish not found" (with a link to the menu) instead.
- **Keep the same domain.** Moving to a new address means reprinting, so if you plan to use the restaurant's own domain, connect it before printing.
- Everything else (models, names, prices, descriptions) can change freely; the printed codes pick up the changes automatically.
- Print each code at least 2.5 cm wide. The codes use the highest error correction, so small smudges and glare on a laminated menu still scan.

`qr-codes/` is regenerated on demand and is not committed to Git.

## Deploying

`netlify.toml` contains the build settings (`npm run build`, publish `dist`), so connecting the GitHub repository in Netlify needs no extra configuration. It also caches the app and models sensibly and makes any unknown path load the app instead of a 404.

## AR support

| Device / browser | Mode | Take apart & labels in AR | Real-world scale |
| --- | --- | --- | --- |
| Android, Chrome with Google Play Services for AR | WebXR (`immersive-ar` + hit-test + DOM overlay) | Yes | Yes, locked |
| iPhone / iPad, Safari or Chrome | AR Quick Look (USDZ built in the browser, or `model.iosSrc` if provided) | No, shows the assembled dish | Yes, scaling disabled |
| Android without WebXR | Scene Viewer intent | No | Yes, resizing disabled |
| Desktop, insecure origin, unsupported browser | None | — | — |

When AR isn't available the button still works: it opens a short sheet explaining why (not on HTTPS, unsupported browser, or no AR on this device), and the 3D viewer remains fully usable. That is the SOW's non-AR fallback.

**WebXR flow:** the camera opens, a reticle appears when a surface is found, tap to place. While placed you can drag to turn the dish, use **Take apart** and tap layers just like in 3D, or **Move** to place it again.

**Real-world scale** comes from `dimensions` in the product file (restaurant-supplied height, or width/depth), not from the GLB's units. If a product has no dimensions the model is assumed to be authored in meters.

## Project structure

```
index.html                 App shell: menu screen, viewer screen, AR overlay
vite.config.js             HTTPS in --mode phone, three.js in its own chunk
restaurants/<id>/          one folder per restaurant (see Restaurants above)
scripts/                   Node tools: inspect GLB, generate QR codes, placeholder models
docs/ADDING_A_PRODUCT.md   How to add a dish and prepare a model in Blender
src/
  main.js                  Entry point
  app/                     App bootstrap and URL router (URL is the source of truth)
  config/app.config.js     App-wide settings (viewer, explode defaults, AR flags, currency)
  data/
    products/*.js          One file per dish: content and explode rules, separate from assets
    productSchema.js       Validation (errors stop a product; warnings go to the console)
    ProductRepository.js   Async access layer, so a future admin panel/API can replace it
  core/                    Event emitter, tween engine
  viewer/                  three.js: loader, 3D viewer, explode, focus/dimming, labels, picking
  ar/                      Capability detection, AR manager, WebXR session, Quick Look, Scene Viewer
  ui/                      Screens, bottom sheet, sheets content, AR overlay, toast, debug panel
  styles/                  Design tokens and per-area CSS
```

### How the pieces fit

- **`ProductRepository`** returns plain product objects from the current restaurant (imported as `@restaurant`, which Vite points at `restaurants/<id>/restaurant.js`). Nothing else reads those files, so swapping in an API later is a one-file change.
- **`ProductModel`** wraps a loaded GLB together with its product definition. It owns a **`ComponentRegistry`** (maps each component to its GLB nodes), an **`ExplodeController`** (one reversible, staggered timeline) and a **`FocusController`** (dims the other layers when one is selected).
- **`Viewer3D`** renders on demand, handles orbit, zoom, reset and framing, and shifts the dish aside with a view offset when labels or the sheet need room. It suspends while AR runs.
- **`ARManager`** picks the best available AR mode once, at load. **`WebXRSession`** reuses the same `ProductModel`, so explode and labels behave identically in AR.
- **`ViewerScreen`** orchestrates UI: toolbar, labels, sheets, hints and error states.

## The stand-in models

`scripts/generate-detailed-models.mjs` builds three dishes from the reference photos: shapes, layer order, proportions and colours follow the photos, and all textures (bun crust, grill marks, meat, breading, cheese, jalapeño cross-sections) are painted procedurally, so no photo is embedded. They are good enough to demo the experience but are not photoreal. Big Bang Burger and Animal Fries still use the simpler placeholders.

## Replacing the placeholder models

1. Export the real model from Blender as GLB (see `docs/ADDING_A_PRODUCT.md` for naming, units and origin).
2. Drop it into `restaurants/<id>/public/models/`, e.g. replacing `classic-burger.glb`.
3. Run `npm run inspect restaurants/demo/public/models/classic-burger.glb` and make sure each component's `nodes` in `restaurants/demo/products/burger-01.js` matches.
4. Open `/?product=burger-01&debug`. The panel lists any component whose nodes weren't found.
5. Tune `explode.distance` values until the layers separate cleanly.

## Out of scope (per SOW)

Admin dashboard, authentication, payments, POS, ordering and analytics.
