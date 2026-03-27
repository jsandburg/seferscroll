# 🌀 SeferScroll

An infinite-scroll browser for Jewish texts, powered by the [Sefaria API](https://developers.sefaria.org/).

Inspired by [WikiTok](https://github.com/IsaacGemal/wikitok).

In memory of the lovely Mahla Shaebanyan-Bady (1980–2023), who was neither Jewish nor did she own a cellphone, but appreciated irony and loved to learn online.

(Thanks, Claude.)

## Browsing Modes

- **Random** — Draws from all 929 chapters across the complete Tanakh. Select a specific book to randomize within it. Suitable for goral.
- **Ordered** — Reads through a text sequentially from beginning to end, chapter by chapter. Detects end of book and notifies you when there are no more chapters.
- **Parasha** — Shows this week's Torah portion, Haftarah, and daily study portions via the Sefaria Calendars API. Displays the current Hebrew date from Hebcal.
- **Popular** — Curated collection of well-known passages from across Jewish literature, including Psalms 23, the Shema, Pirkei Avot, Hillel's golden rule, Ecclesiastes 3, and others.

## Text Selection

The book dropdown includes every book of the Tanakh, each shown with English name, transliteration, and Hebrew:

- **Torah — תורה** — Genesis (Bereshit) through Deuteronomy (Devarim)
- **Prophets — Nevi'im — נביאים** — Joshua through Malachi (21 books)
- **Writings — Ketuvim — כתובים** — Psalms through II Chronicles (13 books, including Ezra)

## Features

- Mobile snap scroll — full-screen swipeable cards on screens 1024px or narrower
- Desktop scroll — traditional card feed on wider screens
- Mobile/Desktop toggle in settings to override auto-detection
- Light and dark mode (auto-detects system preference, manual toggle available)
- Color-coded category indicators on each text card
- Footnotes and reference markers automatically stripped for clean reading
- "Read with original Hebrew on Sefaria" link (mobile: linked from the book name; desktop: in card footer)
- Share button with clipboard feedback ("Copied!" confirmation on desktop)
- About page with links to Sefaria, Hebcal, and GitHub
- Built-in sample texts as fallback when the API can't be reached
- Mobile-friendly responsive design

## Tech Stack

- React 18
- Vite
- Sefaria API (no key required)
- Hebcal API (Hebrew date conversion)
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

The Vite dev server includes proxies that forward `/sefaria-api/` and `/hebcal/` requests to their respective APIs, so everything works locally without CORS issues.

## Deploy to Vercel

See the DEPLOY_GUIDE.md file for detailed step-by-step instructions. The `vercel.json` file includes rewrite rules that proxy API requests through your Vercel domain to avoid browser CORS restrictions.

## Disclaimer

SeferScroll is an independent, open-source project and is **not affiliated with, endorsed by, or sponsored by [Sefaria](https://www.sefaria.org/)** or the Sefaria organization in any way. This project uses Sefaria's publicly available API in accordance with their [terms of use](https://www.sefaria.org/terms). All textual content displayed in SeferScroll is retrieved from and belongs to Sefaria and its respective sources and licensors. "Sefaria" is a trademark of Sefaria. If you enjoy the texts, please consider [supporting Sefaria directly](https://donate.sefaria.org/).

## License

MIT
