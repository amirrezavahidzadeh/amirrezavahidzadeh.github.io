# Sifted: powder shade studio

Created by Fateme Mohsenzadeh and Amirreza Vahidzadeh.

A website for finding and trying on face powder. Pick your skin tone (or read it from a selfie), get your best-matching shade, then brush it onto a photoreal face, in 2D or 3D, or onto your own photo. English and Persian (فارسی).

Live: https://amirrezavahidzadeh.github.io/sifted/

## Run it on your computer

The page loads its 3D files with web requests, so it needs a small local server. Double-clicking `index.html` will not work.

From inside this folder, run one of these:

```
python3 -m http.server 8000
```

or, if you have Node.js:

```
npx serve .
```

Then open http://localhost:8000 in a browser.

## Put it online

Upload this whole folder as-is to any static host: GitHub Pages, Netlify or Cloudflare Pages. No build step is needed.

## What's in the folder

| File | What it is |
|---|---|
| `index.html` | The whole app: layout, styles, all code, English and Persian text |
| `head-model.js` | The 3D head, eyes, brows and lashes (compressed glTF, stored as text) |
| `face_albedo.jpg` | Skin colour of the scan |
| `face_normal.jpg` | Pores and fine surface detail |
| `face_rough.jpg` | Where the skin is shiny or matte |
| `micro_normal.jpg` | Tiling micro-pore detail |
| `face_masks.jpg` | Baked masks: lips (red), hair area (green), hair strand pattern (blue) |
| `eye_albedo.jpg`, `eye_height.jpg` | Eye colour and iris depth |
| `env_log.png` | The scan's studio lighting (HDR, log-encoded) |
| `portrait.webp`, `portrait_mask.webp` | The 2D portrait for Simple mode, and its skin/lip mask |

Libraries (three.js 0.170) and fonts (Google Fonts) load from public CDNs, so it needs an internet connection.

## Where things live in the code

- **Shades and colour matching:** search `colour science` in `index.html`. Skin and powder colours are modelled in CIELAB; matches are ranked by colour difference (ΔE).
- **The brush:** search `class PowderMask`. Each stroke keeps its own shade; going over it blends it out.
- **3D skin shader:** search `function headMaterial`.
- **Smile and blinking:** search `a small face rig`.
- **Hair:** search `function buildHair`. About 12,000 strands are grown when the page loads.
- **Translations:** search `const I18N`. Every English string has a Persian twin.
- **Camera controls (3D):** search `game-style stick`. Thumbstick, angle buttons, zoom, arrow keys/WASD, right-drag, and Space-drag.
- **About us:** search `class="about"`. It opens at `index.html#about`, so you can link to it directly.

## Licence note

The head scan is the free female head from 3D Scan Store (https://www.3dscanstore.com/blog/Free-3D-Head-Model) and is licensed for **personal use only**. Before using this commercially or publishing it as a product, license a head scan for commercial use. Everything else here (code, shader work, translations) is ours.
