# Get to know my frens

A small pixel-art style questionnaire for friends. Pure HTML, CSS, and JavaScript — no build step.

## Run locally

- **Option 1:** Open `index.html` in your browser.
- **Option 2:** From this folder run a static server:
  - `npx serve .` then open the URL shown (e.g. http://localhost:3000)
  - or `python3 -m http.server 8000` then open http://localhost:8000

## Deploy

The site is static. Deploy the project folder as-is.

- **Vercel:** Drag the folder into [vercel.com](https://vercel.com) or connect a Git repo; no build command.
- **Netlify:** Drag the folder into [netlify.com](https://netlify.com) or connect a Git repo; publish directory = root.
- **GitHub Pages:** Push to a repo, go to Settings → Pages → Source = main branch, root (or put files in `/docs` and choose that folder).

## Where is data stored?

- **In the browser (localStorage):** name, character, answers, mute — until you clear site data or submit.
- **To you (optional):** If you set `SUBMIT_ENDPOINT` in `script.js`, when a friend finishes the questionnaire the app sends their name, character, and answers to that endpoint (e.g. Formspree emails them to you). See below.

## Receiving results (e.g. on Vercel)

When you publish the site (Vercel, Netlify, etc.), you can receive each friend’s answers by wiring it to a form service.

1. **Create a form** at [Formspree](https://formspree.io) (free tier is enough).
2. Get your **form endpoint**, e.g. `https://formspree.io/f/xxxxx`.
3. In **`script.js`**, set:
   ```js
   const SUBMIT_ENDPOINT = "https://formspree.io/f/xxxxx";
   ```
4. When someone completes the questionnaire and reaches the Done screen, the app will POST their **name**, **character**, and **answers** to that endpoint. Formspree will email you each submission.

No backend code needed on Vercel — the site stays static; Formspree receives the POST. If you prefer your own API (e.g. Vercel serverless function that saves to a sheet or DB), set `SUBMIT_ENDPOINT` to your API URL instead.

## Adding your own character options

You can draw character images and add them as selectable options next to Dog, Cat, and Star.

1. **Draw** a 24×24 or 32×32 pixel PNG (transparent background) in [Piskel](https://www.piskelapp.com), [Aseprite](https://www.aseprite.org), or any pixel/editor.
2. **Save** the file in the **`characters/`** folder, e.g. `characters/dino.png`.
3. **In `script.js`**, add an entry to the `CHARACTERS` array:
   ```js
   const CHARACTERS = [
     { id: "dog", label: "Dog" },
     { id: "cat", label: "Cat" },
     { id: "star", label: "Star" },
     { id: "dino", label: "Dino", src: "characters/dino.png" }
   ];
   ```
4. The new option appears on the start screen and on the progress bar. Add as many as you like; each entry needs a unique `id`, a `label`, and a `src` path to the image.
