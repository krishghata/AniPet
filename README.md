# AniPet 🐾

A child-friendly PWA for watching animated animal characters.

## How to Run

You need a local web server (opening `index.html` directly won't work due to ES module security restrictions).

**Option 1 — Python (no install needed on most systems):**
```bash
cd d:\Krish\AniPet
python -m http.server 8080
```
Then open: http://localhost:8080

**Option 2 — Node.js (npx serve):**
```bash
cd d:\Krish\AniPet
npx serve .
```
Then open the URL shown in the terminal (usually http://localhost:3000)

**Option 3 — VS Code Live Server extension:**
Right-click `index.html` → **Open with Live Server**

---

## Adding a New Character

1. Add an entry to `js/characters.js` following the existing pattern.
2. Create a folder `assets/sprites/{characterId}/` and add sprite sheet PNGs named `{characterId}_{animId}.png`.
3. Add the sprite paths to the `PRECACHE_URLS` list in `sw.js`.

### Sprite Sheet Format

- PNG file with frames arranged in a grid (left→right, top→bottom)
- All frames must be the same size
- Transparent background recommended
- Set `cols`, `rows`, and `frameCount` in `characters.js` to match your sheet

### Standard Animation IDs

| ID | Description |
|----|-------------|
| `idle` | Default looping animation |
| `happy` | Excited / celebrating |
| `sad` | Unhappy |
| `confused` | Puzzled / dizzy |
| `walking` | Walk cycle (loops) |
| `jumping` | Jump |
| `sleepy` | Tired / sleeping |
| `playing` | Playing |
| `walkin` | Entrance animation — plays once then switches to `idle` (set `loop: false`) |

---

## Project Structure

```
AniPet/
├── index.html          # App shell
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (cache-first)
├── css/
│   └── styles.css
├── js/
│   ├── app.js          # Entry point, routing, SW registration
│   ├── characters.js   # Character & animation data
│   ├── animEngine.js   # Sprite sheet animation engine
│   ├── router.js       # Hash-based SPA router
│   ├── gridView.js     # Character selection grid
│   └── detailView.js   # Full-screen animation viewer
├── assets/sprites/
│   ├── dog/            # dog_idle.png, dog_happy.png, ...
│   ├── cat/            # cat_idle.png, cat_happy.png, ...
│   └── duck/           # duck_idle.png, duck_happy.png, ...
└── icons/
    └── anipet_icon.png
```

## PWA Install

In Chrome or Edge, open the app from a local server and click the **Install** button in the address bar to install it as a standalone app.
