# 🌀 SeferScroll

A infinite-scroll browser for Jewish texts, powered by the [Sefaria API](https://developers.sefaria.org/).

Inspired by [WikiTok](https://github.com/IsaacGemal/wikitok).

In memory of the lovely Mahla Shaebanyan-Bady (1980–2023), who was neither Jewish nor did she own a cellphone, but appreciated irony and loved to learn online.

## Features

- Infinite scrolling feed of Jewish texts from the entire Sefaria library
- Four browse modes: **Random**, **Most Popular**, **In Order**, and **Parasha** (this week's Torah portion and daily study schedule)
- **Parasha mode** uses the Sefaria Calendars API to show the weekly Torah portion with aliyot, Haftarah, Daf Yomi, and other daily readings
- **Book selector** populated from Sefaria's Table of Contents (Tanakh, Talmud, Mishnah, Midrash, Halakhah, Kabbalah, and more)
- **Language selector** with 12 languages (Hebrew, English, Arabic, French, German, Russian, Spanish, Portuguese, Italian, Polish, Finnish, Yiddish)
- Toggle to show the Hebrew original alongside any translation
- Color-coded category indicators
- Share button and direct links to Sefaria
- Light/dark mode (follows system preference)
- Mobile-friendly responsive design

## Tech Stack

- React 18
- Vite
- Sefaria API (no key required)
- Vercel (hosting + API proxy)

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

## Deploy to Vercel

See the DEPLOY_GUIDE.md file for detailed step-by-step instructions.

## Disclaimer

SeferScroll is an independent, open-source project and is **not affiliated with, endorsed by, or sponsored by [Sefaria](https://www.sefaria.org/)** or the Sefaria organization in any way. This project uses Sefaria's publicly available API in accordance with their [terms of use](https://www.sefaria.org/terms). All textual content displayed in SeferScroll is retrieved from and belongs to Sefaria and its respective sources and licensors. "Sefaria" is a trademark of Sefaria. If you enjoy the texts, please consider [supporting Sefaria directly](https://donate.sefaria.org/).

## License

MIT
