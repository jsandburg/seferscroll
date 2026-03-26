import { useState, useEffect, useRef, useCallback } from "react";

// Use Vercel proxy to avoid CORS issues in production.
// In local dev, Vite's proxy handles the rewrite (see vite.config.js).
const API = "/sefaria-api";

// Fallback texts for initial load / error states
const SAMPLE_CARDS = [
  { ref: "Genesis 1:1-5", heRef: "בראשית א׳:א׳-ה׳", text: "In the beginning God created the heaven and the earth. Now the earth was unformed and void, and darkness was upon the face of the deep; and the spirit of God hovered over the face of the waters. And God said: 'Let there be light.' And there was light. And God saw the light, that it was good; and God divided the light from the darkness. And God called the light Day, and the darkness He called Night. And there was evening and there was morning, one day.", heText: "בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃ וְהָאָ֗רֶץ הָיְתָ֥ה תֹ֙הוּ֙ וָבֹ֔הוּ וְחֹ֖שֶׁךְ עַל־פְּנֵ֣י תְה֑וֹם וְר֣וּחַ אֱלֹהִ֔ים מְרַחֶ֖פֶת עַל־פְּנֵ֥י הַמָּֽיִם׃ וַיֹּ֥אמֶר אֱלֹהִ֖ים יְהִ֣י א֑וֹר וַֽיְהִי־אֽוֹר׃", categories: ["Tanakh", "Torah", "Genesis"], sefariaUrl: "https://www.sefaria.org/Genesis.1.1-5" },
  { ref: "Psalms 23", heRef: "תהילים כ״ג", text: "A Psalm of David. The LORD is my shepherd; I shall not want. He maketh me to lie down in green pastures; He leadeth me beside the still waters. He restoreth my soul; He guideth me in straight paths for His name's sake. Yea, though I walk through the valley of the shadow of death, I will fear no evil, for Thou art with me; Thy rod and Thy staff, they comfort me.", heText: "מִזְמ֥וֹר לְדָוִ֑ד יְהֹוָ֥ה רֹ֝עִ֗י לֹ֣א אֶחְסָֽר׃ בִּנְא֣וֹת דֶּ֭שֶׁא יַרְבִּיצֵ֑נִי עַל־מֵ֖י מְנֻח֣וֹת יְנַהֲלֵֽנִי׃", categories: ["Tanakh", "Writings", "Psalms"], sefariaUrl: "https://www.sefaria.org/Psalms.23" },
  { ref: "Pirkei Avot 1:14", heRef: "פרקי אבות א׳:י״ד", text: "He [Hillel] used to say: If I am not for myself, who will be for me? And when I am only for myself, what am I? And if not now, when?", heText: "הוּא הָיָה אוֹמֵר, אִם אֵין אֲנִי לִי, מִי לִי. וּכְשֶׁאֲנִי לְעַצְמִי, מָה אֲנִי. וְאִם לֹא עַכְשָׁיו, אֵימָתָי.", categories: ["Mishnah", "Seder Nezikin", "Pirkei Avot"], sefariaUrl: "https://www.sefaria.org/Pirkei_Avot.1.14" },
];

const POPULAR_REFS = [
  "Genesis 1:1-5", "Psalms 23", "Deuteronomy 6:4-9", "Ecclesiastes 3:1-8",
  "Pirkei Avot 1:1", "Pirkei Avot 1:14", "Pirkei Avot 2:4",
  "Micah 6:8", "Proverbs 3:5-6", "Isaiah 2:4", "Isaiah 40:31",
  "Leviticus 19:18", "Psalms 27:1", "Psalms 1", "Psalms 90:12",
  "Psalms 119:105", "Psalms 121", "Psalms 139:1-6",
  "Proverbs 1:7", "Lamentations 3:22-23", "Song of Songs 8:6-7",
  "Genesis 12:1-3", "Exodus 20:1-14", "Daniel 12:3",
  "Shabbat 31a:6", "Berakhot 17a:6",
];

const MODES = [
  { id: "random", label: "Random", icon: "📖" },
  { id: "inorder", label: "Ordered", icon: "📜" },
  { id: "parasha", label: "Parasha", icon: "📅" },
  { id: "popular", label: "Popular", icon: "❤️" },
];

const CAT_COLORS = {
  Tanakh: "#1D9E75", Mishnah: "#D85A30", Talmud: "#378ADD",
  Midrash: "#D4537E", Halakhah: "#639922", Kabbalah: "#534AB7",
  Liturgy: "#BA7517", "Jewish Thought": "#854F0B", Tosefta: "#993556",
  Chasidut: "#7F77DD", Musar: "#5DCAA5", Responsa: "#888780",
  "Second Temple": "#185FA5",
};

function catColor(cats) {
  for (const c of (cats || [])) if (CAT_COLORS[c]) return CAT_COLORS[c];
  return "#888780";
}

function stripHtml(h) {
  if (!h) return "";
  // First pass: let the DOM parser handle nested tags properly
  const d = document.createElement("div");
  d.innerHTML = h;
  // Remove all footnote/annotation elements via DOM (handles nesting correctly)
  d.querySelectorAll([
    'sup',
    'i.footnote', 'span.footnote', 'a.footnote',
    '.footnote', '.footnote-marker', '.note', '.refLink',
    '.tooltip', '.itag', '.mfootnote', '.nfootnote',
    'sup.fn', '[class*="footnote"]', '[class*="note"]',
  ].join(', ')).forEach(el => el.remove());
  // Convert block elements and <br> to newlines
  d.querySelectorAll('br').forEach(el => el.replaceWith('\n'));
  d.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6').forEach(el => {
    el.insertAdjacentText('afterend', '\n');
  });
  return (d.textContent || "")
    .replace(/[ \t]+/g, " ")        // collapse horizontal whitespace
    .replace(/\n /g, "\n")          // trim space after newlines
    .replace(/ \n/g, "\n")          // trim space before newlines
    .replace(/\n{3,}/g, "\n\n")     // max two newlines in a row
    .trim();
}

function flatText(t) {
  if (!t) return "";
  if (typeof t === "string") return stripHtml(t);
  if (Array.isArray(t)) return t.map(flatText).filter(Boolean).join("\n");
  return "";
}

function trunc(t, m = 800) {
  return t.length <= m ? t : t.slice(0, m).replace(/\s+\S*$/, "") + "…";
}

function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

// Styles object — keeps JSX clean
const s = {
  page: { minHeight: "100vh", fontFamily: "var(--font-body)", display: "flex", flexDirection: "column" },
  header: {
    position: "sticky", top: 0, zIndex: 100,
    background: "var(--bg-primary)",
    borderBottom: "1px solid var(--border-light)",
    padding: "12px 16px",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    flexShrink: 0,
  },
  headerInner: { display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 620, margin: "0 auto" },
  logo: { display: "flex", alignItems: "center", gap: 10 },
  logoText: { fontSize: 20, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.03em" },
  badge: (bg, fg) => ({ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: bg, color: fg, fontWeight: 500 }),
  settingsBtn: (active) => ({
    background: active ? "var(--bg-secondary)" : "transparent",
    border: "1px solid var(--border-medium)",
    borderRadius: "var(--radius-md)", padding: "7px 14px",
    cursor: "pointer", fontSize: 13, color: "var(--text-secondary)",
    display: "flex", alignItems: "center", gap: 5,
    transition: "background 0.15s",
  }),
  panel: { maxWidth: 620, margin: "14px auto 6px", display: "flex", flexDirection: "column", gap: 14 },
  label: { fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 },
  modeRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  modeBtn: (active) => ({
    flex: "1 1 auto", minWidth: 70, padding: "10px 6px",
    border: active ? "2px solid var(--text-info)" : "1px solid var(--border-medium)",
    borderRadius: "var(--radius-md)",
    background: active ? "var(--bg-info)" : "var(--bg-secondary)",
    cursor: "pointer", fontSize: 12, fontWeight: active ? 600 : 400,
    color: active ? "var(--text-info)" : "var(--text-secondary)",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
    transition: "all 0.15s",
  }),
  select: {
    width: "100%", padding: "9px 12px",
    border: "1px solid var(--border-medium)",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-secondary)",
    color: "var(--text-primary)", fontSize: 14, cursor: "pointer",
    fontFamily: "var(--font-body)",
  },
  feed: { maxWidth: 620, margin: "0 auto", padding: "14px 14px 100px", display: "flex", flexDirection: "column", gap: 14 },
  card: (delay) => ({
    background: "var(--bg-primary)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border-light)",
    boxShadow: "var(--shadow-card)",
    overflow: "hidden",
    animation: `fadeSlideIn 0.45s ease-out both`,
    animationDelay: `${delay}s`,
    transition: "box-shadow 0.2s",
  }),
  cardBody: { padding: "18px 22px" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 12 },
  ref: { fontSize: 17, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 },
  heRef: { fontSize: 14, color: "var(--text-secondary)", direction: "rtl", marginTop: 3, fontFamily: "var(--font-hebrew)" },
  catPill: (color) => ({ fontSize: 11, color, background: `${color}18`, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap", fontWeight: 500 }),
  textBody: (dir) => ({
    fontSize: 16, lineHeight: 1.8, color: "var(--text-primary)",
    direction: dir, textAlign: dir === "rtl" ? "right" : "left",
    fontFamily: dir === "rtl" ? "var(--font-hebrew)" : "var(--font-body)",
    whiteSpace: "pre-wrap",
  }),
  footer: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginTop: 16, paddingTop: 14,
    borderTop: "1px solid var(--border-light)",
  },
  sefariaLink: { fontSize: 12, color: "var(--text-info)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 },
  shareBtn: {
    background: "transparent", border: "1px solid var(--border-medium)",
    borderRadius: "var(--radius-md)", padding: "6px 12px",
    cursor: "pointer", fontSize: 12, color: "var(--text-secondary)",
    transition: "background 0.15s",
  },
  spinner: {
    width: 30, height: 30,
    border: "3px solid var(--border-light)",
    borderTopColor: "var(--text-info)",
    borderRadius: "50%", animation: "spin 0.8s linear infinite",
    margin: "0 auto 10px",
  },
  loading: { textAlign: "center", padding: 28, color: "var(--text-tertiary)", fontSize: 14 },
  infoBox: {
    fontSize: 13, color: "var(--text-secondary)",
    background: "var(--bg-secondary)",
    borderRadius: "var(--radius-md)", padding: "12px 14px",
    lineHeight: 1.6,
  },
};

export default function SeferScroll() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("random");
  const [showSettings, setShowSettings] = useState(false);
  const [selectedBook, setSelectedBook] = useState("");
  const [popularIdx, setPopularIdx] = useState(0);
  const orderRefCurrent = useRef(null);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    return "light";
  });
  const [parashaData, setParashaData] = useState(null);
  const [parashaLoaded, setParashaLoaded] = useState(false);
  const [hebrewDate, setHebrewDate] = useState("");
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== "undefined") return window.innerWidth <= 1024 ? "mobile" : "desktop";
    return "mobile";
  });
  const [showAbout, setShowAbout] = useState(false);
  const busy = useRef(false);
  const obsRef = useRef(null);
  const sentRef = useRef(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Load Hebrew date from Hebcal RSS feed when in Parasha mode
  useEffect(() => {
    if (mode !== "parasha") return;
    fetch("/hebcal/etc/hdate-en.xml")
      .then(r => r.text())
      .then(xml => {
        const doc = new DOMParser().parseFromString(xml, "text/xml");
        const title = doc.querySelector("item > title")?.textContent || "";
        setHebrewDate(title.trim());
      })
      .catch(() => {});
  }, [mode]);

  // Fetch a single text from the API (v3)
  const fetchText = useCallback(async (ref) => {
    const url = `${API}/v3/texts/${encodeURIComponent(ref)}?version=english`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error ${res.status} for ${ref}`);
    const data = await res.json();
    let text = "";
    for (const v of (data.versions || [])) {
      const t = flatText(v.text);
      if (!text && t) text = t;
    }
    if (!text && data.versions?.[0]) text = flatText(data.versions[0].text);
    return {
      ref: data.ref || ref,
      heRef: data.heRef || "",
      text,
      categories: data.categories || [],
      sefariaUrl: `https://www.sefaria.org/${encodeURIComponent(ref)}`,
    };
  }, []);

  // We avoid Sefaria's /texts/random endpoint because it redirects through
  // a URL the Vercel proxy can't follow. Instead we pick from a large
  // curated list of refs that are all guaranteed to exist on Sefaria.
  const RANDOM_REFS = [
    // === TORAH (תורה) ===
    // Genesis (50 chapters)
    ...Array.from({length: 50}, (_, i) => `Genesis ${i + 1}`),
    // Exodus (40 chapters)
    ...Array.from({length: 40}, (_, i) => `Exodus ${i + 1}`),
    // Leviticus (27 chapters)
    ...Array.from({length: 27}, (_, i) => `Leviticus ${i + 1}`),
    // Numbers (36 chapters)
    ...Array.from({length: 36}, (_, i) => `Numbers ${i + 1}`),
    // Deuteronomy (34 chapters)
    ...Array.from({length: 34}, (_, i) => `Deuteronomy ${i + 1}`),

    // === PROPHETS (נביאים) ===
    // Joshua (24 chapters)
    ...Array.from({length: 24}, (_, i) => `Joshua ${i + 1}`),
    // Judges (21 chapters)
    ...Array.from({length: 21}, (_, i) => `Judges ${i + 1}`),
    // I Samuel (31 chapters)
    ...Array.from({length: 31}, (_, i) => `I Samuel ${i + 1}`),
    // II Samuel (24 chapters)
    ...Array.from({length: 24}, (_, i) => `II Samuel ${i + 1}`),
    // I Kings (22 chapters)
    ...Array.from({length: 22}, (_, i) => `I Kings ${i + 1}`),
    // II Kings (25 chapters)
    ...Array.from({length: 25}, (_, i) => `II Kings ${i + 1}`),
    // Isaiah (66 chapters)
    ...Array.from({length: 66}, (_, i) => `Isaiah ${i + 1}`),
    // Jeremiah (52 chapters)
    ...Array.from({length: 52}, (_, i) => `Jeremiah ${i + 1}`),
    // Ezekiel (48 chapters)
    ...Array.from({length: 48}, (_, i) => `Ezekiel ${i + 1}`),
    // Hosea (14 chapters)
    ...Array.from({length: 14}, (_, i) => `Hosea ${i + 1}`),
    // Joel (4 chapters)
    ...Array.from({length: 4}, (_, i) => `Joel ${i + 1}`),
    // Amos (9 chapters)
    ...Array.from({length: 9}, (_, i) => `Amos ${i + 1}`),
    // Obadiah (1 chapter)
    "Obadiah 1",
    // Jonah (4 chapters)
    ...Array.from({length: 4}, (_, i) => `Jonah ${i + 1}`),
    // Micah (7 chapters)
    ...Array.from({length: 7}, (_, i) => `Micah ${i + 1}`),
    // Nahum (3 chapters)
    ...Array.from({length: 3}, (_, i) => `Nahum ${i + 1}`),
    // Habakkuk (3 chapters)
    ...Array.from({length: 3}, (_, i) => `Habakkuk ${i + 1}`),
    // Zephaniah (3 chapters)
    ...Array.from({length: 3}, (_, i) => `Zephaniah ${i + 1}`),
    // Haggai (2 chapters)
    ...Array.from({length: 2}, (_, i) => `Haggai ${i + 1}`),
    // Zechariah (14 chapters)
    ...Array.from({length: 14}, (_, i) => `Zechariah ${i + 1}`),
    // Malachi (3 chapters)
    ...Array.from({length: 3}, (_, i) => `Malachi ${i + 1}`),

    // === WRITINGS (כתובים) ===
    // Psalms (150 chapters)
    ...Array.from({length: 150}, (_, i) => `Psalms ${i + 1}`),
    // Proverbs (31 chapters)
    ...Array.from({length: 31}, (_, i) => `Proverbs ${i + 1}`),
    // Job (42 chapters)
    ...Array.from({length: 42}, (_, i) => `Job ${i + 1}`),
    // Song of Songs (8 chapters)
    ...Array.from({length: 8}, (_, i) => `Song of Songs ${i + 1}`),
    // Ruth (4 chapters)
    ...Array.from({length: 4}, (_, i) => `Ruth ${i + 1}`),
    // Lamentations (5 chapters)
    ...Array.from({length: 5}, (_, i) => `Lamentations ${i + 1}`),
    // Ecclesiastes (12 chapters)
    ...Array.from({length: 12}, (_, i) => `Ecclesiastes ${i + 1}`),
    // Esther (10 chapters)
    ...Array.from({length: 10}, (_, i) => `Esther ${i + 1}`),
    // Daniel (12 chapters)
    ...Array.from({length: 12}, (_, i) => `Daniel ${i + 1}`),
    // Nehemiah (13 chapters)
    ...Array.from({length: 13}, (_, i) => `Nehemiah ${i + 1}`),
    // I Chronicles (29 chapters)
    ...Array.from({length: 29}, (_, i) => `I Chronicles ${i + 1}`),
    // II Chronicles (36 chapters)
    ...Array.from({length: 36}, (_, i) => `II Chronicles ${i + 1}`),
    // === NON-TANAKH REFS (commented out — uncomment to re-enable) ===
    // // Mishnah
    // "Pirkei Avot 1", "Pirkei Avot 2", "Pirkei Avot 3", "Pirkei Avot 4",
    // "Pirkei Avot 5", "Pirkei Avot 6",
    // "Mishnah Berakhot 1", "Mishnah Berakhot 9",
    // "Mishnah Shabbat 1", "Mishnah Sukkah 1",
    // "Mishnah Rosh Hashanah 1", "Mishnah Yoma 8",
    // "Mishnah Taanit 1", "Mishnah Megillah 1",
    // "Mishnah Bava Kamma 1", "Mishnah Bava Metzia 1",
    // "Mishnah Sanhedrin 1", "Mishnah Sanhedrin 4", "Mishnah Sanhedrin 10",
    // "Mishnah Makkot 3",
    // // Talmud
    // "Berakhot 2a", "Berakhot 6a", "Berakhot 17a", "Berakhot 26b", "Berakhot 33b", "Berakhot 55a",
    // "Shabbat 21b", "Shabbat 31a", "Shabbat 73a", "Shabbat 88a", "Shabbat 119b",
    // "Pesachim 10a", "Pesachim 50a", "Pesachim 68b",
    // "Yoma 9b", "Yoma 67b", "Yoma 85b", "Yoma 86a",
    // "Sukkah 28a", "Sukkah 49b",
    // "Rosh Hashanah 16a", "Rosh Hashanah 17b",
    // "Taanit 7a", "Taanit 23a", "Taanit 29a",
    // "Megillah 6b", "Megillah 14a",
    // "Chagigah 12a", "Chagigah 15a",
    // "Sotah 14a",
    // "Gittin 55b", "Gittin 56a", "Gittin 56b",
    // "Kiddushin 30b", "Kiddushin 40b",
    // "Bava Kamma 17a", "Bava Kamma 30a",
    // "Bava Metzia 38b", "Bava Metzia 59a", "Bava Metzia 59b", "Bava Metzia 83a",
    // "Bava Batra 12a", "Bava Batra 16b",
    // "Sanhedrin 37a", "Sanhedrin 38b", "Sanhedrin 56a", "Sanhedrin 97a", "Sanhedrin 98a",
    // "Makkot 23b", "Makkot 24a",
    // "Avodah Zarah 2b", "Avodah Zarah 17a", "Avodah Zarah 20b",
    // "Niddah 30b", "Niddah 31a",
    // // Halakhah
    // "Mishneh Torah, Foundations of the Torah 1", "Mishneh Torah, Foundations of the Torah 2",
    // "Mishneh Torah, Human Dispositions 1", "Mishneh Torah, Human Dispositions 2",
    // "Mishneh Torah, Repentance 1", "Mishneh Torah, Repentance 2",
    // "Mishneh Torah, Torah Study 1", "Mishneh Torah, Sabbath 1",
    // "Shulchan Arukh, Orach Chayyim 1",
    // // Kabbalah / Chasidut
    // "Zohar, Introduction.1", "Zohar, Introduction.5", "Zohar, Introduction.10",
    // "Zohar, Bereshit.1", "Zohar, Bereshit.3", "Zohar, Bereshit.6",
    // "Zohar, Noach.1", "Zohar, Noach.3",
    // "Zohar, Lech Lecha.1", "Zohar, Lech Lecha.4",
    // "Zohar, Vayera.1", "Zohar, Vayera.3",
    // "Zohar, Chayei Sara.1", "Zohar, Toldot.1",
    // "Zohar, Vayetzei.1", "Zohar, Vayishlach.1",
    // "Zohar, Vayeshev.1", "Zohar, Miketz.1",
    // "Zohar, Vayigash.1", "Zohar, Vayechi.1",
    // "Zohar, Shemot.1", "Zohar, Vaera.1",
    // "Zohar, Bo.1", "Zohar, Beshalach.1",
    // "Zohar, Yitro.1", "Zohar, Mishpatim.1",
    // "Zohar, Terumah.1", "Zohar, Vayakhel.1",
    // "Zohar, Pekudei.1",
    // // Tanya Part I — Likkutei Amarim (all 53 chapters)
    // "Tanya, Part I; Likkutei Amarim.1", "Tanya, Part I; Likkutei Amarim.2", "Tanya, Part I; Likkutei Amarim.3",
    // "Tanya, Part I; Likkutei Amarim.4", "Tanya, Part I; Likkutei Amarim.5", "Tanya, Part I; Likkutei Amarim.6",
    // "Tanya, Part I; Likkutei Amarim.7", "Tanya, Part I; Likkutei Amarim.8", "Tanya, Part I; Likkutei Amarim.9",
    // "Tanya, Part I; Likkutei Amarim.10", "Tanya, Part I; Likkutei Amarim.11", "Tanya, Part I; Likkutei Amarim.12",
    // "Tanya, Part I; Likkutei Amarim.13", "Tanya, Part I; Likkutei Amarim.14", "Tanya, Part I; Likkutei Amarim.15",
    // "Tanya, Part I; Likkutei Amarim.16", "Tanya, Part I; Likkutei Amarim.17", "Tanya, Part I; Likkutei Amarim.18",
    // "Tanya, Part I; Likkutei Amarim.19", "Tanya, Part I; Likkutei Amarim.20", "Tanya, Part I; Likkutei Amarim.21",
    // "Tanya, Part I; Likkutei Amarim.22", "Tanya, Part I; Likkutei Amarim.23", "Tanya, Part I; Likkutei Amarim.24",
    // "Tanya, Part I; Likkutei Amarim.25", "Tanya, Part I; Likkutei Amarim.26", "Tanya, Part I; Likkutei Amarim.27",
    // "Tanya, Part I; Likkutei Amarim.28", "Tanya, Part I; Likkutei Amarim.29", "Tanya, Part I; Likkutei Amarim.30",
    // "Tanya, Part I; Likkutei Amarim.31", "Tanya, Part I; Likkutei Amarim.32", "Tanya, Part I; Likkutei Amarim.33",
    // "Tanya, Part I; Likkutei Amarim.34", "Tanya, Part I; Likkutei Amarim.35", "Tanya, Part I; Likkutei Amarim.36",
    // "Tanya, Part I; Likkutei Amarim.37", "Tanya, Part I; Likkutei Amarim.38", "Tanya, Part I; Likkutei Amarim.39",
    // "Tanya, Part I; Likkutei Amarim.40", "Tanya, Part I; Likkutei Amarim.41", "Tanya, Part I; Likkutei Amarim.42",
    // "Tanya, Part I; Likkutei Amarim.43", "Tanya, Part I; Likkutei Amarim.44", "Tanya, Part I; Likkutei Amarim.45",
    // "Tanya, Part I; Likkutei Amarim.46", "Tanya, Part I; Likkutei Amarim.47", "Tanya, Part I; Likkutei Amarim.48",
    // "Tanya, Part I; Likkutei Amarim.49", "Tanya, Part I; Likkutei Amarim.50", "Tanya, Part I; Likkutei Amarim.51",
    // "Tanya, Part I; Likkutei Amarim.52", "Tanya, Part I; Likkutei Amarim.53",
    // // Tanya Part II — Shaar HaYichud VehaEmunah (12 chapters)
    // "Tanya, Part II; Shaar HaYichud VehaEmunah.1", "Tanya, Part II; Shaar HaYichud VehaEmunah.2",
    // "Tanya, Part II; Shaar HaYichud VehaEmunah.3", "Tanya, Part II; Shaar HaYichud VehaEmunah.4",
    // "Tanya, Part II; Shaar HaYichud VehaEmunah.5", "Tanya, Part II; Shaar HaYichud VehaEmunah.6",
    // "Tanya, Part II; Shaar HaYichud VehaEmunah.7", "Tanya, Part II; Shaar HaYichud VehaEmunah.8",
    // "Tanya, Part II; Shaar HaYichud VehaEmunah.9", "Tanya, Part II; Shaar HaYichud VehaEmunah.10",
    // "Tanya, Part II; Shaar HaYichud VehaEmunah.11", "Tanya, Part II; Shaar HaYichud VehaEmunah.12",
    // // Tanya Part III — Iggeret HaTeshuvah (12 chapters)
    // "Tanya, Part III; Iggeret HaTeshuvah.1", "Tanya, Part III; Iggeret HaTeshuvah.2",
    // "Tanya, Part III; Iggeret HaTeshuvah.3", "Tanya, Part III; Iggeret HaTeshuvah.4",
    // "Tanya, Part III; Iggeret HaTeshuvah.5", "Tanya, Part III; Iggeret HaTeshuvah.6",
    // "Tanya, Part III; Iggeret HaTeshuvah.7", "Tanya, Part III; Iggeret HaTeshuvah.8",
    // "Tanya, Part III; Iggeret HaTeshuvah.9", "Tanya, Part III; Iggeret HaTeshuvah.10",
    // "Tanya, Part III; Iggeret HaTeshuvah.11", "Tanya, Part III; Iggeret HaTeshuvah.12",
    // // Tanya Part IV — Iggeret HaKodesh (selections)
    // "Tanya, Part IV; Iggeret HaKodesh.1", "Tanya, Part IV; Iggeret HaKodesh.2",
    // "Tanya, Part IV; Iggeret HaKodesh.3", "Tanya, Part IV; Iggeret HaKodesh.4",
    // "Tanya, Part IV; Iggeret HaKodesh.5", "Tanya, Part IV; Iggeret HaKodesh.10",
    // "Tanya, Part IV; Iggeret HaKodesh.15", "Tanya, Part IV; Iggeret HaKodesh.20",
    // // Tanya Part V — Kuntres Acharon (selections)
    // "Tanya, Part V; Kuntres Acharon.1", "Tanya, Part V; Kuntres Acharon.2",
    // "Tanya, Part V; Kuntres Acharon.3", "Tanya, Part V; Kuntres Acharon.4",
    // // Derekh Hashem (Ramchal)
    // "Derekh Hashem, Introduction.1",
    // "Derekh Hashem, Part One, On the Creator.1",
    // "Derekh Hashem, Part One, On the Purpose of Creation.1",
    // "Derekh Hashem, Part One, On Mankind.1",
    // "Derekh Hashem, Part One, On Human Responsibility.1",
    // "Derekh Hashem, Part One, On the Spiritual Realm.1",
    // "Derekh Hashem, Part Two, On Divine Providence in General.1",
    // "Derekh Hashem, Part Two, On Mankind in This World.1",
    // "Derekh Hashem, Part Two, On Personal Providence.1",
    // "Derekh Hashem, Part Two, On Israel and the Nations.1",
    // "Derekh Hashem, Part Two, On How Providence Works.1",
    // "Derekh Hashem, Part Two, On the System of Providence.1",
    // "Derekh Hashem, Part Two, On the Influence of the Stars.1",
    // "Derekh Hashem, Part Two, On Specific Modes of Providence.1",
    // "Derekh Hashem, Part Three, On the Soul and Its Activities.1",
    // "Derekh Hashem, Part Three, On Divine Names and Witchcraft.1",
    // "Derekh Hashem, Part Three, On Divine Inspiration and Prophecy.1",
    // "Derekh Hashem, Part Three, On the Prophetic Experience.1",
    // "Derekh Hashem, Part Three, On Moshe's Unique Status.1",
    // "Derekh Hashem, Part Four, On Divine Service.1",
    // "Derekh Hashem, Part Four, On Torah Study.1",
    // "Derekh Hashem, Part Four, On Love and Fear of God.1",
    // "Derekh Hashem, Part Four, On the Sh'ma and Its Blessings.1",
    // "Derekh Hashem, Part Four, On Prayer.1",
    // "Derekh Hashem, Part Four, On the Daily Order of Prayer.1",
    // "Derekh Hashem, Part Four, On Divine Service and the Calendar.1",
    // "Derekh Hashem, Part Four, On Seasonal Commandments.1",
    // "Derekh Hashem, Part Four, On Blessings.1",
  ];

  const fetchRandom = useCallback(async () => {
    if (selectedBook) {
      // Filter curated refs to just the selected book
      const bookRefs = RANDOM_REFS.filter(r => r.startsWith(selectedBook));
      if (bookRefs.length > 0) {
        const ref = bookRefs[Math.floor(Math.random() * bookRefs.length)];
        return await fetchText(ref);
      }
      // Fallback: try chapter 1 (works for simple books)
      return await fetchText(`${selectedBook} 1`);
    }
    // No book selected — pick from curated Tanakh refs
    const ref = RANDOM_REFS[Math.floor(Math.random() * RANDOM_REFS.length)];
    return await fetchText(ref);
  }, [selectedBook, fetchText]);

  // Load next batch of cards
  const loadMore = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);

    const newCards = [];
    const count = 3;

    try {
      // ===== PARASHA MODE =====
      if (mode === "parasha") {
        if (parashaLoaded) {
          // Already loaded everything for this week
          setLoading(false);
          busy.current = false;
          return;
        }
        try {
          // Fetch calendar data
          const calData = await (await fetch(`${API}/calendars`)).json();
          const items = calData.calendar_items || [];
          setParashaData(calData);

          // Interesting calendar items to show
          const interesting = [
            "Parashat Hashavua", "Haftarah",
            "Daf Yomi", "929", "Daily Mishnah",
            "Daily Rambam", "Halakha Yomit",
            "Arukh HaShulchan Yomi", "Tanakh Yomi",
          ];

          for (const item of items) {
            const titleEn = item.title?.en || "";
            if (!interesting.includes(titleEn)) continue;

            try {
              // For Parashat Hashavua, load first aliyah specifically
              let ref = item.ref;
              const isParasha = titleEn === "Parashat Hashavua";
              const isHaftarah = titleEn === "Haftarah";

              // Get the text
              const card = await fetchText(ref);

              // Build enriched card
              const enriched = {
                ...card,
                id: Date.now() + Math.random(),
                calendarTitle: titleEn,
                displayName: item.displayValue?.en || "",
                displayNameHe: item.displayValue?.he || "",
                description: item.description?.en || "",
                descriptionHe: item.description?.he || "",
                aliyot: item.extraDetails?.aliyot || [],
                isParasha,
                isHaftarah,
                isCalendar: true,
              };

              newCards.push(enriched);
            } catch (e) {
              console.warn(`Skipping calendar item ${titleEn}:`, e.message);
            }
          }

          setParashaLoaded(true);
        } catch (e) {
          setError("Couldn't load this week's calendar from Sefaria.");
          console.warn("Calendar fetch failed:", e);
        }
      } else {
        // ===== OTHER MODES =====
        // Books that use daf (page) numbering instead of chapters
        const DAF_BOOKS = new Set([
          "Berakhot", "Shabbat", "Pesachim", "Yoma", "Sukkah", "Rosh Hashanah",
          "Taanit", "Megillah", "Chagigah", "Sotah", "Gittin", "Kiddushin",
          "Bava Kamma", "Bava Metzia", "Bava Batra", "Sanhedrin", "Makkot",
          "Avodah Zarah", "Niddah",
        ]);

        // Get the right starting ref for a book
        function getStartRef(book) {
          if (DAF_BOOKS.has(book)) return `${book} 2a`;
          if (book === "Zohar") return "Zohar, Introduction.1";
          if (book === "Derekh Hashem") return "Derekh Hashem, Introduction.1";
          if (book.startsWith("Tanya, ")) return `${book}.1`;
          return `${book} 1`;
        }

        // Advance a ref to the next section
        function advanceRef(ref, book) {
          // Talmud daf: 2a → 2b → 3a → 3b → ...
          const dafMatch = ref.match(/^(.+?)\s(\d+)(a|b)$/);
          if (dafMatch) {
            const [, name, num, side] = dafMatch;
            if (side === "a") return `${name} ${num}b`;
            return `${name} ${+num + 1}a`;
          }
          // Complex books with dot notation (Zohar, Tanya, etc.)
          // e.g. "Zohar, Bereshit.1" → ".2", "Tanya, Part I; Likkutei Amarim.5" → ".6"
          const dotMatch = ref.match(/^(.+?)\.(\d+)(?:\.(\d+))?$/);
          if (dotMatch && (ref.includes(",") || ref.includes(";"))) {
            const [, section, num, sub] = dotMatch;
            if (sub) return `${section}.${num}.${+sub + 1}`;
            return `${section}.${+num + 1}`;
          }
          // Standard chapters: Book 1 → Book 2, or Book 1:1 → Book 1:2
          const chMatch = ref.match(/^(.+?)[\s:](\d+)(?::(\d+))?$/);
          if (chMatch) {
            const [, name, ch, vs] = chMatch;
            return vs ? `${name} ${ch}:${+vs + 1}` : `${name} ${+ch + 1}`;
          }
          return `${book || "Genesis"} 2`;
        }

        let nextOrderRef = orderRefCurrent.current; // Use ref for immediate reads (no stale state)
        for (let i = 0; i < count; i++) {
          try {
            let card;
            let ref;
            if (mode === "random") {
              card = await fetchRandom();
            } else if (mode === "popular") {
              const idx = (popularIdx + newCards.length) % POPULAR_REFS.length;
              ref = POPULAR_REFS[idx];
              card = await fetchText(ref);
            } else if (mode === "inorder") {
              if (nextOrderRef) {
                ref = nextOrderRef;
              } else if (selectedBook) {
                ref = getStartRef(selectedBook);
              } else {
                ref = "Genesis 1";
              }
              card = await fetchText(ref);
            }

            if (card && card.text) {
              newCards.push({ ...card, id: Date.now() + Math.random() });
            }

            // Advance in-order pointer locally for the next iteration
            if (mode === "inorder" && ref) {
              nextOrderRef = advanceRef(ref, selectedBook);
            }
          } catch (e) {
            console.warn("Skipping card:", e.message);
            if (mode === "inorder" && nextOrderRef) {
              nextOrderRef = advanceRef(nextOrderRef, selectedBook);
            }
          }
        }
        // Save final position to React state for the next batch
        if (mode === "inorder") orderRefCurrent.current = nextOrderRef;

        if (mode === "popular") setPopularIdx(p => p + newCards.length);
      }

      // If nothing loaded, use samples
      if (newCards.length === 0 && mode !== "parasha") {
        const pool = shuffle(SAMPLE_CARDS);
        for (let i = 0; i < count; i++) {
          newCards.push({ ...pool[i % pool.length], id: Date.now() + Math.random() });
        }
        setError("Couldn't reach Sefaria — showing sample texts.");
      }

      setCards(prev => [...prev, ...newCards]);
    } finally {
      setLoading(false);
      busy.current = false;
    }
  }, [mode, selectedBook, popularIdx, parashaLoaded, fetchText, fetchRandom]);

  // Reset on settings change
  useEffect(() => {
    setCards([]);
    setPopularIdx(0);
    orderRefCurrent.current = null;
    setError(null);
    setParashaLoaded(false);
    setParashaData(null);
    busy.current = false;
    const t = setTimeout(loadMore, 80);
    return () => clearTimeout(t);
  }, [mode, selectedBook]);

  // Infinite scroll observer
  useEffect(() => {
    obsRef.current?.disconnect();
    obsRef.current = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) loadMore();
    }, { threshold: 0.1 });
    if (sentRef.current) obsRef.current.observe(sentRef.current);
    return () => obsRef.current?.disconnect();
  }, [loadMore]);

  // Books available in the dropdown with Hebrew names and transliterations
  const BOOK_MENU = [
    { cat: "Torah — תורה", books: [
      { en: "Genesis", tr: "Bereshit", he: "בראשית" },
      { en: "Exodus", tr: "Shemot", he: "שמות" },
      { en: "Leviticus", tr: "Vayikra", he: "ויקרא" },
      { en: "Numbers", tr: "Bamidbar", he: "במדבר" },
      { en: "Deuteronomy", tr: "Devarim", he: "דברים" },
    ]},
    { cat: "Prophets — Nevi'im — נביאים", books: [
      { en: "Joshua", tr: "Yehoshua", he: "יהושע" },
      { en: "Judges", tr: "Shoftim", he: "שופטים" },
      { en: "I Samuel", tr: "Shmuel Alef", he: "שמואל א" },
      { en: "II Samuel", tr: "Shmuel Bet", he: "שמואל ב" },
      { en: "I Kings", tr: "Melakhim Alef", he: "מלכים א" },
      { en: "II Kings", tr: "Melakhim Bet", he: "מלכים ב" },
      { en: "Isaiah", tr: "Yeshayahu", he: "ישעיהו" },
      { en: "Jeremiah", tr: "Yirmiyahu", he: "ירמיהו" },
      { en: "Ezekiel", tr: "Yechezkel", he: "יחזקאל" },
      { en: "Hosea", tr: "Hoshea", he: "הושע" },
      { en: "Joel", tr: "Yoel", he: "יואל" },
      { en: "Amos", tr: "Amos", he: "עמוס" },
      { en: "Obadiah", tr: "Ovadiah", he: "עובדיה" },
      { en: "Jonah", tr: "Yonah", he: "יונה" },
      { en: "Micah", tr: "Mikhah", he: "מיכה" },
      { en: "Nahum", tr: "Nachum", he: "נחום" },
      { en: "Habakkuk", tr: "Chavakuk", he: "חבקוק" },
      { en: "Zephaniah", tr: "Tzefaniah", he: "צפניה" },
      { en: "Haggai", tr: "Chaggai", he: "חגי" },
      { en: "Zechariah", tr: "Zekharyah", he: "זכריה" },
      { en: "Malachi", tr: "Malakhi", he: "מלאכי" },
    ]},
    { cat: "Writings — Ketuvim — כתובים", books: [
      { en: "Psalms", tr: "Tehillim", he: "תהילים" },
      { en: "Proverbs", tr: "Mishlei", he: "משלי" },
      { en: "Job", tr: "Iyyov", he: "איוב" },
      { en: "Song of Songs", tr: "Shir HaShirim", he: "שיר השירים" },
      { en: "Ruth", tr: "Rut", he: "רות" },
      { en: "Lamentations", tr: "Eikhah", he: "איכה" },
      { en: "Ecclesiastes", tr: "Kohelet", he: "קהלת" },
      { en: "Esther", tr: "Ester", he: "אסתר" },
      { en: "Daniel", tr: "Daniel", he: "דניאל" },
      { en: "Nehemiah", tr: "Nechemyah", he: "נחמיה" },
      { en: "I Chronicles", tr: "Divrei HaYamim Alef", he: "דברי הימים א" },
      { en: "II Chronicles", tr: "Divrei HaYamim Bet", he: "דברי הימים ב" },
    ]},
    // { cat: "Kabbalah — קבלה", books: [
    //   { en: "Zohar", tr: "Zohar", he: "זוהר" },
    //   { en: "Derekh Hashem", tr: "Derekh Hashem", he: "דרך ה׳" },
    // ]},
  ];

  return (
    <div style={{
      ...s.page,
      ...(viewMode === "mobile" ? { height: "100vh", overflow: "hidden" } : {}),
    }}>
      {/* ===== HEADER ===== */}
      <div style={s.header}>
        <div style={s.headerInner}>
          <div style={{ ...s.logo, cursor: "pointer" }} onClick={() => {
            setMode("random");
            setSelectedBook("");
            setCards([]);
            setShowSettings(false);
            setShowAbout(false);
            orderRefCurrent.current = null;
            setParashaLoaded(false);
            setParashaData(null);
            setError(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}>
            <span style={{ fontSize: 24 }}>🌀</span>
            <span style={s.logoText}>SeferScroll</span>
          </div>
          <button
            onClick={() => setShowSettings(v => !v)}
            style={s.settingsBtn(showSettings)}
          >
            ⚙ Settings
          </button>
        </div>

        {showSettings && (
          <div style={s.panel}>
            {/* Mode */}
            <div>
              <div style={s.label}>Browsing mode</div>
              <div style={s.modeRow}>
                {MODES.map(m => (
                  <button key={m.id} onClick={() => setMode(m.id)} style={s.modeBtn(mode === m.id)}>
                    <span style={{ fontSize: 18 }}>{m.icon}</span>{m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Book selector — hidden in parasha mode */}
            {mode !== "parasha" && (
            <div>
              <div style={s.label}>Text / Book</div>
              <select value={selectedBook} onChange={e => setSelectedBook(e.target.value)} style={s.select}>
                <option value="">— Select a text —</option>
                {BOOK_MENU.map(group => (
                  <optgroup key={group.cat} label={group.cat}>
                    {group.books.map(b => (
                      <option key={b.en} value={b.en}>{b.en}{b.tr !== b.en ? ` (${b.tr})` : ""} — {b.he}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            )}

            {mode === "parasha" && (
              <div style={s.infoBox}>
                Showing the weekly Torah portion, Haftarah, and daily study items{hebrewDate ? ` for ${hebrewDate}` : ""}.
              </div>
            )}

            {/* Dark/Light mode toggle */}
            <div>
              <div style={s.label}>Appearance</div>
              <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-medium)",
                  borderRadius: "var(--radius-md)",
                  padding: "7px 14px",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  transition: "background 0.15s",
                }}
              >
                <span style={{ fontSize: 16 }}>{theme === "dark" ? "🌙" : "☀️"}</span>
                {theme === "dark" ? "Dark" : "Light"}
              </button>
              <button
                onClick={() => setViewMode(v => v === "desktop" ? "mobile" : "desktop")}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-medium)",
                  borderRadius: "var(--radius-md)",
                  padding: "7px 14px",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  transition: "background 0.15s",
                }}
              >
                <span style={{ fontSize: 16 }}>{viewMode === "mobile" ? "📱" : "🖥️"}</span>
                {viewMode === "mobile" ? "Mobile" : "Desktop"}
              </button>
              </div>
            </div>

            {/* About link */}
            <div style={{ textAlign: "center", paddingTop: 4 }}>
              <button
                onClick={() => { setShowAbout(a => !a); setShowSettings(false); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 12, color: "var(--text-tertiary)", textDecoration: "none",
                  padding: 0,
                }}>
                About SeferScroll
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== ABOUT CARD ===== */}
      {showAbout && (
        <div style={{ maxWidth: 620, margin: "14px auto", padding: "0 14px", flexShrink: 0 }}>
          <div style={{
            background: "var(--bg-primary)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-light)",
            boxShadow: "var(--shadow-card)",
            padding: "22px 24px",
            animation: "fadeSlideIn 0.35s ease-out both",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>About SeferScroll</div>
              <button onClick={() => setShowAbout(false)} style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 18, color: "var(--text-tertiary)", padding: "2px 6px",
              }}>✕</button>
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text-primary)" }}>
              SeferScroll is an infinite-scroll browser for Jewish texts, powered by the{" "}
              <a href="https://developers.sefaria.org/" target="_blank" rel="noopener noreferrer">Sefaria API</a>.
              {" "}The Hebrew calendar is courtesy of{" "}
              <a href="https://www.hebcal.com/" target="_blank" rel="noopener noreferrer">Hebcal</a>.
              {" "}Learn more at{" "}
              <a href="https://github.com/jsandburg/seferscroll" target="_blank" rel="noopener noreferrer">GitHub</a>.
            </div>
          </div>
        </div>
      )}

      {/* ===== CARD FEED ===== */}
      <div className={`snap-feed${viewMode === "desktop" ? " view-desktop" : ""}${viewMode === "mobile" ? " view-mobile" : ""}`} style={s.feed}>
        {error && (
          <div style={s.infoBox}>{error}</div>
        )}

        {cards.map((card, idx) => {
          const cc = catColor(card.categories);
          const display = card.text || "";
          const dir = "ltr";
          const isCalCard = card.isCalendar;

          return (
            <div key={card.id} className="snap-card" style={s.card((idx % 3) * 0.08)}>
              {/* Color strip — thicker for parasha */}
              <div style={{ height: isCalCard && card.isParasha ? 5 : 3, background: isCalCard && card.isParasha ? "#BA7517" : cc, opacity: 0.85 }} />
              <div style={s.cardBody}>

                {/* Calendar badge (parasha mode) */}
                {isCalCard && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
                    fontSize: 12, fontWeight: 500,
                    color: card.isParasha ? "#BA7517" : card.isHaftarah ? "#534AB7" : "var(--text-tertiary)",
                  }}>
                    <span style={{
                      padding: "2px 10px", borderRadius: 10, fontSize: 11,
                      background: card.isParasha ? "#BA751718" : card.isHaftarah ? "#534AB718" : "var(--bg-secondary)",
                    }}>
                      {card.calendarTitle}
                    </span>
                    {card.displayName && (
                      <span style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 15 }}>
                        {card.displayName}
                      </span>
                    )}
                    {card.displayNameHe && (
                      <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-hebrew)", direction: "rtl", fontSize: 14 }}>
                        {card.displayNameHe}
                      </span>
                    )}
                  </div>
                )}

                {/* Parasha description */}
                {isCalCard && card.description && card.isParasha && (
                  <div style={{
                    fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6,
                    marginBottom: 14, padding: "10px 14px",
                    background: "var(--bg-secondary)", borderRadius: "var(--radius-md)",
                  }}>
                    {card.description}
                  </div>
                )}

                {/* Aliyot list for parasha */}
                {isCalCard && card.aliyot && card.aliyot.length > 0 && (
                  <details style={{ marginBottom: 12 }}>
                    <summary style={{ fontSize: 12, color: "var(--text-tertiary)", cursor: "pointer", userSelect: "none" }}>
                      ▸ Aliyot ({card.aliyot.length} readings)
                    </summary>
                    <div style={{
                      marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6,
                    }}>
                      {card.aliyot.map((a, i) => (
                        <a key={i}
                          href={`https://www.sefaria.org/${a.replace(/ /g, '.')}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{
                            fontSize: 12, padding: "4px 10px",
                            background: "var(--bg-secondary)",
                            border: "1px solid var(--border-light)",
                            borderRadius: 6, color: "var(--text-info)",
                            textDecoration: "none",
                          }}
                        >
                          {i < 7 ? `${i + 1}. ` : "Maftir: "}{a}
                        </a>
                      ))}
                    </div>
                  </details>
                )}

                {/* Card header */}
                {viewMode === "mobile" ? (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ ...s.catPill(cc), width: "fit-content" }}>{card.categories?.[0] || "Text"}</div>
                        <a href={card.sefariaUrl} target="_blank" rel="noopener noreferrer"
                          style={{ ...s.ref, textDecoration: "none", color: "var(--text-primary)", display: "block", marginTop: 6 }}>
                          {card.ref}
                        </a>
                        {card.heRef && card.heRef !== card.ref && (
                          <div style={s.heRef}>{card.heRef}</div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          const text = `${card.ref}\n\n${trunc(display, 200)}\n\n${card.sefariaUrl}`;
                          if (navigator.share) {
                            navigator.share({ title: card.ref, text, url: card.sefariaUrl });
                          } else {
                            navigator.clipboard?.writeText(text);
                          }
                        }}
                        style={s.shareBtn}
                      >
                        Share
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={s.cardHeader}>
                    <div>
                      <div style={s.ref}>{card.ref}</div>
                      {card.heRef && card.heRef !== card.ref && (
                        <div style={s.heRef}>{card.heRef}</div>
                      )}
                    </div>
                    <div style={s.catPill(cc)}>{card.categories?.[0] || "Text"}</div>
                  </div>
                )}

                {/* Text body */}
                <div className="card-text" style={s.textBody(dir)}>
                  {trunc(display || "Text not available.", 900)}
                </div>

                {/* Card footer — desktop only */}
                {viewMode === "desktop" && (
                <div style={s.footer}>
                  <a href={card.sefariaUrl} target="_blank" rel="noopener noreferrer" style={s.sefariaLink}>
                    Read with original Hebrew on Sefaria ↗
                  </a>
                  <button
                    onClick={() => {
                      const text = `${card.ref}\n\n${trunc(display, 200)}\n\n${card.sefariaUrl}`;
                      if (navigator.share) {
                        navigator.share({ title: card.ref, text, url: card.sefariaUrl });
                      } else {
                        navigator.clipboard?.writeText(text);
                      }
                    }}
                    style={s.shareBtn}
                  >
                    Share
                  </button>
                </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={s.loading}>
            <div style={s.spinner} />
            {mode === "parasha" ? "Loading this week's readings…" : "Loading texts…"}
          </div>
        )}

        {/* Parasha mode: end message */}
        {mode === "parasha" && parashaLoaded && !loading && cards.length > 0 && (
          <div style={{
            textAlign: "center", padding: "20px 16px",
            color: "var(--text-tertiary)", fontSize: 13,
            borderTop: "1px solid var(--border-light)",
          }}>
            These are all of the weekly and daily study portions.<br />Switch to a different browsing mode to read more texts.
          </div>
        )}

        {/* Scroll sentinel */}
        <div ref={sentRef} style={{ height: 1 }} />
      </div>
    </div>
  );
}
