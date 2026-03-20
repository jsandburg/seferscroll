# 🌀 SeferScroll

An infinite-scroll browser for Jewish texts, powered by the [Sefaria API](https://developers.sefaria.org/).

Inspired by [WikiTok](https://github.com/IsaacGemal/wikitok).

In memory of the lovely Mahla Shaebanyan-Bady (1980–2023), who was neither Jewish nor did she own a cellphone, but appreciated irony and loved to learn online.

(Thanks, Claude.)

## Browsing Modes

- **Random** — Pulls from a curated collection of ~480 passages spanning Tanakh, Talmud, Mishnah, Halakhah, Kabbalah, and Chasidut. Select a specific book to randomize within it.
- **Ordered** — Reads through a text sequentially from beginning to end. Supports standard chapter numbering, Talmud daf pagination (2a → 2b → 3a → 3b), Zohar parasha sections, and Tanya's multi-part structure.
- **Parasha** — Shows this week's Torah portion, Haftarah, and daily study portions (Daf Yomi, Daily Mishnah, Daily Rambam, and more) via the Sefaria Calendars API. Includes a description of the parasha and expandable aliyot links.
- **Popular** — Cycles through well-known passages: Psalms 23, the Shema, Pirkei Avot, Hillel's golden rule, Ecclesiastes 3, and others.

## Text Selection

The book dropdown includes texts from seven categories, each shown with English name, transliteration, and Hebrew:

- **Torah — תורה** (Genesis through Deuteronomy)
- **Prophets — Nevi'im — נביאים** (Joshua through Malachi)
- **Writings — Ketuvim — כתובים** (Psalms through II Chronicles)
- **Mishnah — משנה** (Pirkei Avot, Berakhot, Sanhedrin, and others)
- **Talmud — תלמוד** (19 tractates including Berakhot, Shabbat, Sanhedrin)
- **Halakhah — הלכה** (Mishneh Torah, Shulchan Arukh)
- **Kabbalah / Chasidut — קבלה / חסידות** (Zohar organized by parasha; all five parts of Tanya: Likkutei Amarim, Sha'ar HaYichud VehaEmunah, Iggeret HaTeshuvah, Iggeret HaKodesh, Kuntres Acharon)

## Other Features

- "Read with original Hebrew on Sefaria" link on every text for full bilingual study
- Light and dark mode toggle (auto-detects system preference)
- Color-coded category indicators on each text
- Footnotes and reference markers automatically stripped for clean reading
- Share button (uses native share on mobile, copies to clipboard on desktop)
- Built-in sample texts as fallback when the API can't be reached
- Mobile-friendly responsive design

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

The Vite dev server includes a proxy that forwards `/sefaria-api/` requests to `sefaria.org`, so the API works locally without CORS issues.

## Deploy to Vercel

See the DEPLOY_GUIDE.md file for detailed step-by-step instructions. The `vercel.json` file includes a rewrite rule that proxies API requests through your Vercel domain to avoid browser CORS restrictions.

## Disclaimer

SeferScroll is an independent, open-source project and is **not affiliated with, endorsed by, or sponsored by [Sefaria](https://www.sefaria.org/)** or the Sefaria organization in any way. This project uses Sefaria's publicly available API in accordance with their [terms of use](https://www.sefaria.org/terms). All textual content displayed in SeferScroll is retrieved from and belongs to Sefaria and its respective sources and licensors. "Sefaria" is a trademark of Sefaria. If you enjoy the texts, please consider [supporting Sefaria directly](https://donate.sefaria.org/).

## License

MIT
