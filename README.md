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

Data is only stored in the browser (localStorage). To collect responses elsewhere, add a form backend (e.g. [Formspree](https://formspree.io)) and point the form `action` to it.
