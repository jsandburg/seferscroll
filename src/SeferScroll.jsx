import { useState, useEffect, useRef, useCallback } from "react";

// Use Vercel proxy to avoid CORS issues in production.
// In local dev, Vite's proxy handles the rewrite (see vite.config.js).
const API = "/sefaria-api";

// Fallback texts for initial load / error states
const SAMPLE_CARDS = [
  { ref: "Genesis 1:1-5", heRef: "בראשית א׳:א׳-ה׳", text: "In the beginning God created the heaven and the earth. Now the earth was unformed and void, and darkness was upon the face of the deep; and the spirit of God hovered over the face of the waters. And God said: 'Let there be light.' And there was light. And God saw the light, that it was good; and God divided the light from the darkness. And God called the light Day, and the darkness He called Night. And there was evening and there was morning, one day.", categories: ["Tanakh", "Torah", "Genesis"], sefariaUrl: "https://www.sefaria.org/Genesis.1.1-5" },
  { ref: "Psalms 23", heRef: "תהילים כ״ג", text: "A Psalm of David. The LORD is my shepherd; I shall not want. He maketh me to lie down in green pastures; He leadeth me beside the still waters. He restoreth my soul; He guideth me in straight paths for His name's sake. Yea, though I walk through the valley of the shadow of death, I will fear no evil, for Thou art with me; Thy rod and Thy staff, they comfort me.", categories: ["Tanakh", "Writings", "Psalms"], sefariaUrl: "https://www.sefaria.org/Psalms.23" },
  { ref: "Pirkei Avot 1:14", heRef: "פרקי אבות א׳:י״ד", text: "He [Hillel] used to say: If I am not for myself, who will be for me? And when I am only for myself, what am I? And if not now, when?", categories: ["Mishnah", "Seder Nezikin", "Pirkei Avot"], sefariaUrl: "https://www.sefaria.org/Pirkei_Avot.1.14" },
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
    'sup.fn', '[class*="footnote"]', '.note-callout', '.note-content',
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

// Books that use daf (page) numbering instead of chapters (Fix #15: moved outside loadMore)
const DAF_BOOKS = new Set([
  "Berakhot", "Shabbat", "Pesachim", "Yoma", "Sukkah", "Rosh Hashanah",
  "Taanit", "Megillah", "Chagigah", "Sotah", "Gittin", "Kiddushin",
  "Bava Kamma", "Bava Metzia", "Bava Batra", "Sanhedrin", "Makkot",
  "Avodah Zarah", "Niddah",
]);

// Chapter counts for every Tanakh book (Fix #1: includes Ezra)
const TANAKH_BOOKS = {
  // Torah
  "Genesis": 50, "Exodus": 40, "Leviticus": 27, "Numbers": 36, "Deuteronomy": 34,
  // Nevi'im
  "Joshua": 24, "Judges": 21, "I Samuel": 31, "II Samuel": 24,
  "I Kings": 22, "II Kings": 25, "Isaiah": 66, "Jeremiah": 52, "Ezekiel": 48,
  "Hosea": 14, "Joel": 4, "Amos": 9, "Obadiah": 1, "Jonah": 4, "Micah": 7,
  "Nahum": 3, "Habakkuk": 3, "Zephaniah": 3, "Haggai": 2, "Zechariah": 14, "Malachi": 3,
  // Ketuvim
  "Psalms": 150, "Proverbs": 31, "Job": 42, "Song of Songs": 8, "Ruth": 4,
  "Lamentations": 5, "Ecclesiastes": 12, "Esther": 10, "Daniel": 12,
  "Ezra": 10, "Nehemiah": 13, "I Chronicles": 29, "II Chronicles": 36,
};

// Generate all chapter refs from the TANAKH_BOOKS map (Fix #5: moved outside component)
const RANDOM_REFS = Object.entries(TANAKH_BOOKS).flatMap(
  ([book, chapters]) => Array.from({length: chapters}, (_, i) => `${book} ${i + 1}`)
);

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
  textBody: {
    fontSize: 16, lineHeight: 1.8, color: "var(--text-primary)",
    fontFamily: "var(--font-body)",
    whiteSpace: "pre-wrap",
  },
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
  const [resetKey, setResetKey] = useState(0); // Fix #2: force reset even when mode/book unchanged
  const [orderEnded, setOrderEnded] = useState(false); // Fix #3: detect end of book in ordered mode
  const [popularLooped, setPopularLooped] = useState(false); // Fix #10: detect popular mode cycling
  const [copiedId, setCopiedId] = useState(null); // Fix #11: share button feedback
  const busy = useRef(false);
  const obsRef = useRef(null);
  const sentRef = useRef(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Load Hebrew date from Hebcal converter using browser's local date
  useEffect(() => {
    if (mode !== "parasha") return;
    const now = new Date();
    const gy = now.getFullYear(), gm = now.getMonth() + 1, gd = now.getDate();
    fetch(`/hebcal/converter?cfg=json&gy=${gy}&gm=${gm}&gd=${gd}&g2h=1`)
      .then(r => r.json())
      .then(data => {
        if (data.hd && data.hm && data.hy) {
          setHebrewDate(`${data.hd} ${data.hm}, ${data.hy}`);
        }
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
    if (orderEnded && mode === "inorder") return; // Fix #3: stop loading past end of book
    if (popularLooped && mode === "popular") return; // Fix #10: stop after full cycle
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
              const idx = popularIdx + newCards.length;
              if (idx >= POPULAR_REFS.length) break; // Fix #10: stop at end
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

        if (mode === "popular") {
          const nextIdx = popularIdx + newCards.length;
          setPopularIdx(nextIdx);
          if (nextIdx >= POPULAR_REFS.length) setPopularLooped(true);
        }
      }

      // If nothing loaded, handle appropriately
      if (newCards.length === 0 && mode !== "parasha") {
        if (mode === "inorder" && orderRefCurrent.current) {
          // Fix #3: Reached end of book — don't show samples
          setOrderEnded(true);
        } else {
          const pool = shuffle(SAMPLE_CARDS);
          for (let i = 0; i < count; i++) {
            newCards.push({ ...pool[i % pool.length], id: Date.now() + Math.random() });
          }
          setError("Couldn't reach Sefaria — showing sample texts.");
        }
      }

      setCards(prev => [...prev, ...newCards]);
    } finally {
      setLoading(false);
      busy.current = false;
    }
  }, [mode, selectedBook, popularIdx, parashaLoaded, orderEnded, fetchText, fetchRandom]);

  // Reset on settings change
  useEffect(() => {
    setCards([]);
    setPopularIdx(0);
    setPopularLooped(false);
    orderRefCurrent.current = null;
    setOrderEnded(false);
    setError(null);
    setParashaLoaded(false);
    setParashaData(null);
    busy.current = false;
    const t = setTimeout(loadMore, 80);
    return () => clearTimeout(t);
  }, [mode, selectedBook, resetKey]);

  // Fix #6: Keep a stable ref to loadMore so the observer isn't torn down on every state change
  const loadMoreRef = useRef(loadMore);
  useEffect(() => { loadMoreRef.current = loadMore; }, [loadMore]);

  // Infinite scroll observer — created once, reads loadMore from ref
  useEffect(() => {
    obsRef.current?.disconnect();
    obsRef.current = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) loadMoreRef.current();
    }, { threshold: 0.1 });
    if (sentRef.current) obsRef.current.observe(sentRef.current);
    return () => obsRef.current?.disconnect();
  }, []); // only run once

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
      { en: "Ezra", tr: "Ezra", he: "עזרא" },
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
            setResetKey(k => k + 1);
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
        <div style={{
          maxWidth: 620, margin: viewMode === "mobile" ? "0 auto" : "14px auto",
          padding: viewMode === "mobile" ? "20px 14px" : "0 14px",
          flexShrink: 0,
          ...(viewMode === "mobile" ? { flex: 1, overflow: "auto" } : {}),
        }}>
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

      {/* ===== CARD FEED ===== (hidden when About is shown in mobile) */}
      {!(showAbout && viewMode === "mobile") && (
      <div className={`snap-feed${viewMode === "desktop" ? " view-desktop" : ""}${viewMode === "mobile" ? " view-mobile" : ""}`} style={s.feed}>
        {error && (
          <div style={s.infoBox}>{error}</div>
        )}

        {cards.map((card, idx) => {
          const cc = catColor(card.categories);
          const display = card.text || "";
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
                          href={`https://www.sefaria.org/${encodeURIComponent(a)}`}
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
                            setCopiedId(card.id);
                            setTimeout(() => setCopiedId(null), 1500);
                          }
                        }}
                        style={s.shareBtn}
                      >
                        {copiedId === card.id ? "Copied!" : "Share"}
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
                <div className="card-text" style={s.textBody}>
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
                        setCopiedId(card.id);
                        setTimeout(() => setCopiedId(null), 1500);
                      }
                    }}
                    style={s.shareBtn}
                  >
                    {copiedId === card.id ? "Copied!" : "Share"}
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

        {/* Ordered mode: end of book message */}
        {mode === "inorder" && orderEnded && !loading && (
          <div style={{
            textAlign: "center", padding: "20px 16px",
            color: "var(--text-tertiary)", fontSize: 13,
            borderTop: "1px solid var(--border-light)",
          }}>
            You've reached the end of {selectedBook || "this text"}.<br />Select another text or switch browsing modes.
          </div>
        )}

        {/* Popular mode: end of list message */}
        {mode === "popular" && popularLooped && !loading && (
          <div style={{
            textAlign: "center", padding: "20px 16px",
            color: "var(--text-tertiary)", fontSize: 13,
            borderTop: "1px solid var(--border-light)",
          }}>
            You've seen all the popular passages.<br />Switch to a different browsing mode to read more texts.
          </div>
        )}

        {/* Scroll sentinel */}
        <div ref={sentRef} style={{ height: 1 }} />
      </div>
      )}
    </div>
  );
}
