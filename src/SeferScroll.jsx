import React, { useState, useEffect, useRef, useCallback } from "react";

const API = "/sefaria-api";

const PSALMS_COLOR = "#1D9E75";

function stripHtml(h) {
  if (!h) return "";
  const d = document.createElement("div");
  d.innerHTML = h;
  d.querySelectorAll([
    "sup", "i.footnote", "span.footnote", "a.footnote",
    ".footnote", ".footnote-marker", ".note", ".refLink",
    ".tooltip", ".itag", ".mfootnote", ".nfootnote",
    "sup.fn", '[class*="footnote"]', ".note-callout", ".note-content",
  ].join(", ")).forEach(el => el.remove());
  d.querySelectorAll("br").forEach(el => el.replaceWith("\n"));
  d.querySelectorAll("p, div, h1, h2, h3, h4, h5, h6").forEach(el => {
    el.insertAdjacentText("afterend", "\n");
  });
  return (d.textContent || "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n /g, "\n")
    .replace(/ \n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Strip Hebrew Unicode characters that Sefaria inlines into English text (e.g. acrostic markers)
function cleanVerse(t) {
  return t.replace(/[֐-׿יִ-פֿ]+/g, "").replace(/\s{2,}/g, " ").trim();
}

function shareVerse(card, setCopiedId) {
  const text = `${card.ref}\n\n${card.text}\n\n${card.sefariaUrl}`;
  if (navigator.share) {
    navigator.share({ title: card.ref, text, url: card.sefariaUrl }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedId(card.id);
      setTimeout(() => setCopiedId(null), 1500);
    }).catch(() => {});
  }
}

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
  aboutBtn: (active) => ({
    background: active ? "var(--bg-secondary)" : "transparent",
    border: "1px solid var(--border-medium)",
    borderRadius: "var(--radius-md)", padding: "7px 14px",
    cursor: "pointer", fontSize: 13, color: "var(--text-secondary)",
    transition: "background 0.15s",
  }),
  feed: { maxWidth: 620, margin: "0 auto", padding: "14px 14px 100px", display: "flex", flexDirection: "column", gap: 14 },
  card: (delay) => ({
    background: "var(--bg-primary)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border-light)",
    boxShadow: "var(--shadow-card)",
    overflow: "hidden",
    animation: "fadeSlideIn 0.45s ease-out both",
    animationDelay: `${delay}s`,
    transition: "box-shadow 0.2s",
  }),
  cardBody: { padding: "18px 22px" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  ref: { fontSize: 17, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 },
  heRef: { fontSize: 14, color: "var(--text-secondary)", direction: "rtl", marginTop: 3, fontFamily: "var(--font-hebrew)" },
  textBody: {
    fontSize: 16, lineHeight: 1.9, color: "var(--text-primary)",
    fontFamily: "var(--font-body)",
    whiteSpace: "pre-wrap",
    marginTop: 14,
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
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    return "light";
  });
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== "undefined") return window.innerWidth <= 768 ? "mobile" : "desktop";
    return "mobile";
  });
  const [showAbout, setShowAbout] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [copiedId, setCopiedId] = useState(null);
  const busy = useRef(false);
  const feedRef = useRef(null);
  const sentRef = useRef(null);
  const obsRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const handler = () => setViewMode(window.innerWidth <= 768 ? "mobile" : "desktop");
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Fetch a random chapter, then return one random verse from it
  const fetchRandomPsalmVerse = useCallback(async () => {
    const chapter = Math.floor(Math.random() * 150) + 1;
    const url = `${API}/v3/texts/${encodeURIComponent(`Psalms ${chapter}`)}?version=english`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();

    let verses = [];
    for (const v of (data.versions || [])) {
      if (!v.text) continue;
      const raw = Array.isArray(v.text) ? v.text : [v.text];
      verses = raw.flatMap(t =>
        Array.isArray(t)
          ? t.filter(s => typeof s === "string").map(stripHtml).map(cleanVerse).filter(Boolean)
          : typeof t === "string" ? [cleanVerse(stripHtml(t))].filter(Boolean) : []
      );
      if (verses.length > 0) break;
    }
    if (verses.length === 0) throw new Error("No verses in chapter");

    const idx = Math.floor(Math.random() * verses.length);
    return {
      ref: `Psalms ${chapter}:${idx + 1}`,
      heRef: data.heRef || "",
      text: verses[idx],
      sefariaUrl: `https://www.sefaria.org/Psalms.${chapter}.${idx + 1}`,
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    const newCards = [];
    try {
      const results = await Promise.allSettled([
        fetchRandomPsalmVerse(),
        fetchRandomPsalmVerse(),
        fetchRandomPsalmVerse(),
      ]);
      for (const r of results) {
        if (r.status === "fulfilled" && r.value?.text) {
          newCards.push({ ...r.value, id: Date.now() + Math.random() });
        }
      }
      if (newCards.length === 0) {
        setError("Couldn't reach Sefaria. Please try again later.");
      } else {
        setCards(prev => [...prev, ...newCards]);
      }
    } finally {
      setLoading(false);
      busy.current = false;
    }
  }, [fetchRandomPsalmVerse]);

  useEffect(() => {
    setCards([]);
    setError(null);
    busy.current = false;
    const t = setTimeout(() => loadMoreRef.current(), 80);
    return () => clearTimeout(t);
  }, [resetKey]);

  const loadMoreRef = useRef(loadMore);
  useEffect(() => { loadMoreRef.current = loadMore; }, [loadMore]);

  useEffect(() => {
    obsRef.current?.disconnect();
    obsRef.current = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) loadMoreRef.current();
    }, { threshold: 0, rootMargin: "100px" });
    if (sentRef.current) obsRef.current.observe(sentRef.current);
    return () => obsRef.current?.disconnect();
  }, []);

  return (
    <div style={{
      ...s.page,
      position: "fixed", inset: 0, overflow: "hidden",
    }}>
      {/* ===== HEADER ===== */}
      <div style={s.header}>
        <div style={s.headerInner}>
          <div style={{ ...s.logo, cursor: "pointer" }} onClick={() => {
            setCards([]);
            setShowAbout(false);
            setError(null);
            setResetKey(k => k + 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}>
            <span style={{ fontSize: 24 }}>🌀</span>
            <div style={s.logoText}>SeferScroll</div>
          </div>
          <button onClick={() => setShowAbout(v => !v)} style={s.aboutBtn(showAbout)}>
            About
          </button>
        </div>
      </div>

      {/* ===== ABOUT ===== */}
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
              <button onClick={() => setShowAbout(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-tertiary)", padding: "2px 6px" }}>✕</button>
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text-primary)" }}>
              SeferScroll is a random infinite-scroll browser for Tehillim/Psalms, powered by the{" "}
              <a href="https://developers.sefaria.org/" target="_blank" rel="noopener noreferrer">Sefaria API</a>.
              {" "}Learn more at{" "}
              <a href="https://github.com/jsandburg/seferscroll" target="_blank" rel="noopener noreferrer">GitHub</a>.
            </div>
          </div>
        </div>
      )}

      {/* ===== CARD FEED ===== */}
      {!(showAbout && viewMode === "mobile") && (
        <div ref={feedRef} className={`snap-feed view-${viewMode}`} style={s.feed}>
          {error && <div style={s.infoBox}>{error}</div>}

          {cards.map((card) => {
            const snapCard = (
              <div className="snap-card" style={s.card(0)}>
                <div style={{ height: 3, background: PSALMS_COLOR, opacity: 0.85 }} />
                <div style={s.cardBody}>
                  {viewMode === "mobile" ? (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <a href={card.sefariaUrl} target="_blank" rel="noopener noreferrer"
                            style={{ ...s.ref, textDecoration: "none", color: "var(--text-primary)", display: "block" }}>
                            {card.ref}
                          </a>
                          {card.heRef && <div style={s.heRef}>{card.heRef}</div>}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <a href={card.sefariaUrl} target="_blank" rel="noopener noreferrer" style={{ ...s.shareBtn, textDecoration: "none", textAlign: "center", display: "block" }}>
                            Read more
                          </a>
                          <button onClick={() => shareVerse(card, setCopiedId)} style={s.shareBtn}>
                            {copiedId === card.id ? "Copied!" : "Share"}
                          </button>
                        </div>
                      </div>
                      <div className="card-text" style={s.textBody}>{card.text}</div>
                    </div>
                  ) : (
                    <div>
                      <div style={s.cardHeader}>
                        <div>
                          <div style={s.ref}>{card.ref}</div>
                          {card.heRef && <div style={s.heRef}>{card.heRef}</div>}
                        </div>
                      </div>
                      <div className="card-text" style={s.textBody}>{card.text}</div>
                      <div style={s.footer}>
                        <a href={card.sefariaUrl} target="_blank" rel="noopener noreferrer" style={{ ...s.shareBtn, textDecoration: "none", display: "inline-block" }}>
                          Read more on Sefaria
                        </a>
                        <button onClick={() => shareVerse(card, setCopiedId)} style={s.shareBtn}>
                          {copiedId === card.id ? "Copied!" : "Share"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
            return viewMode === "desktop"
              ? <div key={card.id} className="snap-slide">{snapCard}</div>
              : <React.Fragment key={card.id}>{snapCard}</React.Fragment>;
          })}

          {loading && (
            <div style={s.loading}>
              <div style={s.spinner} />
              Loading verses…
            </div>
          )}

          {/* Sentinel: slight negative margin so it overlaps the last card when snapped */}
          <div ref={sentRef} style={{ height: 40, marginTop: -4, flexShrink: 0 }} />
        </div>
      )}
    </div>
  );
}
