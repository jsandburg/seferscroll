# 🌀 SeferScroll

A random infinite-scroll browser for Tehillim/Psalms, powered by the [Sefaria API](https://developers.sefaria.org/).

Inspired by [WikiTok](https://github.com/IsaacGemal/wikitok).

In memory of the lovely Mahla Shaebanyan-Bady (1980–2023), who was neither Jewish nor did she own a cellphone, but appreciated irony and loved to learn online.

(Thanks, Claude.)

## How It Works

SeferScroll presents individual verses from Tehillim (Psalms) in random order. There is no algorithm, no curation, no sequence. Each scroll is a draw from the 150 psalms of the Hebrew Bible. This is a modern form of *goral*, the ancient practice of seeking meaning through the opening of a text at random.

## Features

- Full-screen snap scroll on both mobile and desktop, one verse per screen
- Follows system light/dark mode automatically
- Footnotes and reference markers stripped for clean reading
- Links to the verse on Sefaria for the full Hebrew and commentary
- Share button with clipboard fallback
- Sample verses shown when the API can't be reached
- Verses fetched in parallel for faster load

## Tech Stack

- React 18
- Vite
- Sefaria API (no key required)
- Vercel (hosting + API proxy to handle CORS)

## Quick Start (Local Development)

1. Make sure you have [Node.js](https://nodejs.org/) installed (version 18 or higher)

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open http://localhost:5173 in your browser

The Vite dev server includes a proxy that forwards `/sefaria-api/` requests to the Sefaria API, so everything works locally without CORS issues.

## Deploy to Vercel

See the DEPLOY_GUIDE.md file for detailed step-by-step instructions. The `vercel.json` file includes a rewrite rule that proxies API requests through your Vercel domain to avoid browser CORS restrictions.

## Disclaimer

SeferScroll is an independent, open-source project and is **not affiliated with, endorsed by, or sponsored by [Sefaria](https://www.sefaria.org/)** or the Sefaria organization in any way. This project uses Sefaria's publicly available API in accordance with their [terms of use](https://www.sefaria.org/terms). All textual content displayed in SeferScroll is retrieved from and belongs to Sefaria and its respective sources and licensors. "Sefaria" is a trademark of Sefaria. If you enjoy the texts, please consider [supporting Sefaria directly](https://donate.sefaria.org/).

## License

MIT
