import { useState, useEffect, useRef, useCallback } from "react";

// Use Vercel proxy to avoid CORS issues in production.
// In local dev, Vite's proxy handles the rewrite (see vite.config.js).
const API = "/sefaria-api";

// Fallback texts for initial load / error states
const SAMPLE_CARDS = [
  { ref: "Genesis 1:1-5", heRef: "בראשית א׳:א׳-ה׳", text: "In the beginning God created the heaven and the earth. Now the earth was unformed and void, and darkness was upon the face of the deep; and the spirit of God hovered over the face of the waters. And God said: 'Let there be light.' And there was light. And God saw the light, that it was good; and God divided the light from the darkness. And God called the light Day, and the darkness He called Night. And there was evening and there was morning, one day.", categories: ["Tanakh", "Torah", "Genesis"], sefariaUrl: "https://www.sefaria.org/Genesis.1.1-5" },
  { ref: "Psalms 23", heRef: "תהילים כ״ג", text: "A Psalm of David. The LORD is my shepherd; I shall not want. He maketh me to lie down in green pastures; He leadeth me beside the still waters. He restoreth my soul; He guideth me in straight paths for His name's sake. Yea, though I walk through the valley of the shadow of death, I will fear no evil, for Thou art with me; Thy rod and Thy staff, they comfort me.", categories: ["Tanakh", "Writings", "Psalms"], sefariaUrl: "https://www.sefaria.org/Psalms.23" },
  { ref: "Ecclesiastes 3:1-8", heRef: "קהלת ג׳:א׳-ח׳", text: "To every thing there is a season, and a time to every purpose under the heaven: A time to be born, and a time to die; a time to plant, and a time to pluck up that which is planted; A time to kill, and a time to heal; a time to break down, and a time to build up; A time to weep, and a time to laugh; a time to mourn, and a time to dance.", categories: ["Tanakh", "Writings", "Ecclesiastes"], sefariaUrl: "https://www.sefaria.org/Ecclesiastes.3.1-8" },
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
    .replace(/[ \t]+/g, " ")
    .replace(/\n /g, "\n")
    .replace(/ \n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
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

// Chapter counts for every Tanakh book (all 929 chapters)
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

// All chapter refs across the complete Tanakh
const ALL_TANAKH_REFS = Object.entries(TANAKH_BOOKS).flatMap(
  ([book, chapters]) => Array.from({ length: chapters }, (_, i) => `${book} ${i + 1}`)
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
  const [showSettings, setShowSettings] = useState(false);
  const [selectedBook, setSelectedBook] = useState("");
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    return "light";
  });
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== "undefined") return window.innerWidth <= 1024 ? "mobile" : "desktop";
    return "mobile";
  });
  const [showAbout, setShowAbout] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [copiedId, setCopiedId] = useState(null);
  const busy = useRef(false);
  const obsRef = useRef(null);
  const sentRef = useRef(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

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

  // Pick a random chapter ref, optionally filtered to a specific book
  const pickRandomRef = useCallback(() => {
    if (selectedBook) {
      const bookRefs = ALL_TANAKH_REFS.filter(r => r.startsWith(selectedBook + " "));
      if (bookRefs.length > 0) return bookRefs[Math.floor(Math.random() * bookRefs.length)];
    }
    return ALL_TANAKH_REFS[Math.floor(Math.random() * ALL_TANAKH_REFS.length)];
  }, [selectedBook]);

  // Load next batch of cards
  const loadMore = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);

    const newCards = [];

    try {
      for (let i = 0; i < 3; i++) {
        try {
          const ref = pickRandomRef();
          const card = await fetchText(ref);
          if (card && card.text) {
            newCards.push({ ...card, id: Date.now() + Math.random() });
          }
        } catch (e) {
          console.warn("Skipping card:", e.message);
        }
      }

      if (newCards.length === 0) {
        // Fallback to sample texts when API is unreachable
        const pool = [...SAMPLE_CARDS].sort(() => Math.random() - 0.5);
        for (let i = 0; i < 3; i++) {
          newCards.push({ ...pool[i % pool.length], id: Date.now() + Math.random() });
        }
        setError("Couldn't reach Sefaria — showing sample texts.");
      }

      setCards(prev => [...prev, ...newCards]);
    } finally {
      setLoading(false);
      busy.current = false;
    }
  }, [fetchText, pickRandomRef]);

  // Reset on settings change
  useEffect(() => {
    setCards([]);
    setError(null);
    busy.current = false;
    const t = setTimeout(loadMore, 80);
    return () => clearTimeout(t);
  }, [selectedBook, resetKey]);

  // Keep a stable ref to loadMore so the observer isn't torn down on every state change
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
  }, []);

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
            setSelectedBook("");
            setCards([]);
            setShowSettings(false);
            setShowAbout(false);
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
            {/* Book selector */}
            <div>
              <div style={s.label}>Book</div>
              <select value={selectedBook} onChange={e => setSelectedBook(e.target.value)} style={s.select}>
                <option value="">— All of Tanakh —</option>
                {BOOK_MENU.map(group => (
                  <optgroup key={group.cat} label={group.cat}>
                    {group.books.map(b => (
                      <option key={b.en} value={b.en}>{b.en}{b.tr !== b.en ? ` (${b.tr})` : ""} — {b.he}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Dark/Light + Mobile/Desktop toggles */}
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
                    cursor: "pointer", fontSize: 13,
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
                    cursor: "pointer", fontSize: 13,
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
                  fontSize: 12, color: "var(--text-tertiary)",
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
              {" "}Learn more at{" "}
              <a href="https://github.com/jsandburg/seferscroll" target="_blank" rel="noopener noreferrer">GitHub</a>.
            </div>
          </div>
        </div>
      )}

      {/* ===== CARD FEED ===== (hidden when About is shown in mobile) */}
      {!(showAbout && viewMode === "mobile") && (
        <div
          className={`snap-feed${viewMode === "desktop" ? " view-desktop" : ""}${viewMode === "mobile" ? " view-mobile" : ""}`}
          style={s.feed}
        >
          {error && (
            <div style={s.infoBox}>{error}</div>
          )}

          {cards.map((card, idx) => {
            const cc = catColor(card.categories);
            const display = card.text || "";

            return (
              <div key={card.id} className="snap-card" style={s.card((idx % 3) * 0.08)}>
                {/* Color strip */}
                <div style={{ height: 3, background: cc, opacity: 0.85 }} />
                <div style={s.cardBody}>

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
              Loading texts…
            </div>
          )}

          {/* Scroll sentinel */}
          <div ref={sentRef} style={{ height: 1 }} />
        </div>
      )}
    </div>
  );
}
