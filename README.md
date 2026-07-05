# OSRS Companion PWA

Offline-first Old School RuneScape quest tracker and account planning companion.

## Local test
Open `index.html` directly for a quick test. For full PWA install/offline behavior, host it through GitHub Pages or another HTTPS web host.

## GitHub Pages setup
1. Upload the contents of this folder to the root of your GitHub repo.
2. In GitHub, go to **Settings → Pages**.
3. Set **Source** to **Deploy from a branch**.
4. Set **Branch** to `main` and folder to `/root`.
5. Save.
6. Open the GitHub Pages URL GitHub gives you.
7. In Chrome/Edge, use the install icon in the address bar or menu → **Install app**. On iPhone, use Share → **Add to Home Screen**.

## Important
- Progress is saved in browser storage per browser/device.
- Use the app's Save / Import page to export your progress and imported data.
- The Data Pack importer can cache wiki-derived quest info after you run it once while online.

## Files
- `index.html` — app entrypoint
- `manifest.webmanifest` — PWA install metadata
- `service-worker.js` — offline caching
- `css/style.css` — theme
- `js/data.js` — bundled local route/data pack
- `js/app.js` — app logic
- `icons/` — PWA icons
