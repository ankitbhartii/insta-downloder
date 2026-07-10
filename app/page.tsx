'use client';

import { useState, useRef, useCallback } from 'react';

/* ─── Types ──────────────────────────────────────────────── */
interface MediaItem {
  url: string;
  thumbnail: string;
  mediaType: 'video' | 'image';
  resolution?: string;
}

interface PostData {
  id: string;
  title: string;
  description?: string;
  uploader?: string;
  uploaderUsername?: string;
  thumbnail?: string;
  mediaUrl: string | null;
  mediaType: 'video' | 'image';
  resolution?: string;
  duration?: number;
  uploadDate?: string;
  likeCount?: number;
  viewCount?: number;
  commentCount?: number;
  pageUrl: string;
  mediaItems?: MediaItem[];
  isCarousel?: boolean;
}

interface FetchResult {
  success: boolean;
  partial?: boolean;
  data?: PostData;
  error?: string;
  hint?: string;
  code?: string;
  warning?: string;
}

/* ─── Helpers ────────────────────────────────────────────── */
const fmtN = (n?: number) => {
  if (n === undefined || n === null) return null;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
};
const initial  = (s?: string) => s?.charAt(0).toUpperCase() ?? '?';
const fmtDate  = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null;
const fmtDur   = (s?: number) => s ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '';
const proxyUrl = (u: string, inline = false) =>
  `/api/download?url=${encodeURIComponent(u)}${inline ? '&inline=true' : ''}`;

/* ─── Single-item downloader ─────────────────────────────── */
function triggerDownload(url: string, filename: string) {
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

/* ─── Carousel Slide component ───────────────────────────── */
function CarouselSlide({
  item, index, total, onDownload, downloading,
}: {
  item: MediaItem; index: number; total: number;
  onDownload: (item: MediaItem, idx: number) => void;
  downloading: boolean;
}) {
  return (
    <div className="slide">
      {/* slide number */}
      <div className="slide__counter">{index + 1} / {total}</div>

      {/* media */}
      <div className="slide__media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={proxyUrl(item.thumbnail, true)}
          alt={`Slide ${index + 1}`}
          loading="lazy"
        />
        {item.mediaType === 'video' && <div className="video-badge">▶ Reel</div>}
      </div>

      {/* per-slide download */}
      <div className="slide__actions">
        {item.resolution && <span className="slide__res">{item.resolution}</span>}
        <button
          className="btn-slide-dl"
          disabled={downloading}
          onClick={() => onDownload(item, index)}
        >
          {downloading ? <><span className="spinner sm" /> Saving…</> : <>⬇ Download</>}
        </button>
      </div>
    </div>
  );
}

/* ─── Carousel component ─────────────────────────────────── */
function Carousel({ items, postId }: { items: MediaItem[]; postId: string }) {
  const [active, setActive]   = useState(0);
  const [dlIdx, setDlIdx]     = useState<number | null>(null);
  const [dlAll, setDlAll]     = useState(false);
  const [doneSet, setDoneSet] = useState<Set<number>>(new Set());

  const downloadOne = async (item: MediaItem, idx: number) => {
    setDlIdx(idx);
    const ext  = item.mediaType === 'video' ? 'mp4' : 'jpg';
    const name = `instadown-${postId}-${idx + 1}.${ext}`;
    triggerDownload(proxyUrl(item.url), name);
    await new Promise(r => setTimeout(r, 800));
    setDoneSet(prev => new Set([...prev, idx]));
    setDlIdx(null);
  };

  const downloadAll = async () => {
    setDlAll(true);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const ext  = item.mediaType === 'video' ? 'mp4' : 'jpg';
      triggerDownload(proxyUrl(item.url), `instadown-${postId}-${i + 1}.${ext}`);
      await new Promise(r => setTimeout(r, 600)); // stagger so browser doesn't block
    }
    setDoneSet(new Set(items.map((_, i) => i)));
    setDlAll(false);
  };

  return (
    <div className="carousel">
      {/* thumbnail strip nav */}
      <div className="carousel__strip">
        {items.map((item, i) => (
          <button
            key={i}
            className={`strip-thumb${i === active ? ' active' : ''}${doneSet.has(i) ? ' done' : ''}`}
            onClick={() => setActive(i)}
            aria-label={`View slide ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={proxyUrl(item.thumbnail, true)} alt={`Slide ${i + 1}`} loading="lazy" />
            {doneSet.has(i) && <span className="strip-done">✓</span>}
            {item.mediaType === 'video' && <span className="strip-video">▶</span>}
          </button>
        ))}
      </div>

      {/* active slide */}
      <CarouselSlide
        key={active}
        item={items[active]}
        index={active}
        total={items.length}
        onDownload={downloadOne}
        downloading={dlIdx === active}
      />

      {/* prev / next arrows */}
      <div className="carousel__nav">
        <button
          className="nav-arrow"
          onClick={() => setActive(i => Math.max(0, i - 1))}
          disabled={active === 0}
          aria-label="Previous"
        >←</button>
        <span className="carousel__dots">
          {items.map((_, i) => (
            <span
              key={i}
              className={`dot${i === active ? ' active' : ''}`}
              onClick={() => setActive(i)}
            />
          ))}
        </span>
        <button
          className="nav-arrow"
          onClick={() => setActive(i => Math.min(items.length - 1, i + 1))}
          disabled={active === items.length - 1}
          aria-label="Next"
        >→</button>
      </div>

      {/* Download All */}
      <div className="carousel__dl-all">
        <button className="btn-dl-all" onClick={downloadAll} disabled={dlAll}>
          {dlAll
            ? <><span className="spinner sm" /> Downloading all {items.length} files…</>
            : <>📦 Download All {items.length} {items.every(i => i.mediaType === 'image') ? 'Photos' : 'Files'}</>}
        </button>
        {doneSet.size === items.length && (
          <span className="done-chip">✓ All saved!</span>
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function Home() {
  const [url, setUrl]         = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<FetchResult | null>(null);
  const [downloading, setDl]  = useState(false);
  const [done, setDone]       = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const paste = useCallback(async () => {
    try { const t = await navigator.clipboard.readText(); setUrl(t); }
    catch { /* ignore */ }
    inputRef.current?.focus();
  }, []);

  const fetch_ = useCallback(async () => {
    const t = url.trim();
    if (!t) return;
    setLoading(true); setResult(null); setDone(false);
    try {
      const r = await fetch(`/api/fetch?url=${encodeURIComponent(t)}`);
      setResult(await r.json());
    } catch {
      setResult({ success: false, error: 'Network error. Please check your connection.' });
    } finally { setLoading(false); }
  }, [url]);

  const downloadSingle = useCallback(async (p: PostData) => {
    if (!p.mediaUrl) return;
    setDl(true);
    try {
      const ext  = p.mediaType === 'video' ? 'mp4' : 'jpg';
      triggerDownload(proxyUrl(p.mediaUrl), `instadown-${p.id}.${ext}`);
      await new Promise(r => setTimeout(r, 800));
      setDone(true);
    } finally { setDl(false); }
  }, []);

  const p = result?.data;

  return (
    <>
      {/* ── Navbar ── */}
      <nav className="nav">
        <span className="nav__logo">InstaDown</span>
        <span className="nav__badge">Free &amp; Open Source</span>
      </nav>

      {/* ── Page ── */}
      <main className="page">

        {/* ── Hero ── */}
        <div className="hero">
          <div className="hero__icon">📸</div>
          <h1 className="hero__title">
            Download <span className="accent">Instagram</span><br />
            Photos &amp; Reels
          </h1>
          <p className="hero__sub">
            Paste any Instagram post link and instantly save it in full quality — single photos, Reels, or full carousel albums.
          </p>
        </div>

        {/* ── Downloader Card ── */}
        <div className="dl-card">
          <div className="input-wrap">
            <input
              ref={inputRef}
              id="instagram-url"
              type="url"
              className="url-input"
              placeholder="Paste Instagram link here…"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetch_()}
              autoComplete="off"
              spellCheck={false}
              aria-label="Instagram post URL"
            />
            <button className="btn-paste" onClick={paste} type="button">
              📋 Paste
            </button>
          </div>

          <button
            className="btn-fetch"
            onClick={fetch_}
            disabled={loading || !url.trim()}
            type="button"
            id="fetch-btn"
          >
            {loading
              ? <><span className="spinner" /> Fetching…</>
              : <><span>✦</span> Fetch Post</>}
          </button>

          {!result && !loading && (
            <>
              <div className="divider">supported links</div>
              <div style={{ display:'flex', gap:'0.5rem', justifyContent:'center', flexWrap:'wrap' }}>
                {['instagram.com/p/…', 'instagram.com/reel/…'].map(l => (
                  <span key={l} style={{
                    fontSize:'0.72rem', color:'var(--text-2)',
                    background:'var(--bg)', border:'1px solid var(--border)',
                    borderRadius:'var(--r-pill)', padding:'0.2rem 0.65rem'
                  }}>{l}</span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Result ── */}
        {result && (
          <div className="result">
            {result.success && p ? (
              <article className="post-card">
                {/* Instagram-style header */}
                <header className="post-header">
                  <div className="avatar-ring">
                    <div className="avatar-inner">{initial(p.uploader)}</div>
                  </div>
                  <div className="post-author">
                    <div className="post-name">{p.uploader || 'Unknown'}</div>
                    {p.uploaderUsername && <div className="post-handle">@{p.uploaderUsername}</div>}
                  </div>
                  <span className="post-type-badge">
                    {p.isCarousel ? `🖼️ Album (${p.mediaItems?.length})` : p.mediaType === 'video' ? '🎬 Reel' : '🖼️ Photo'}
                  </span>
                </header>

                {/* ── CAROUSEL ── */}
                {p.isCarousel && p.mediaItems && p.mediaItems.length > 0 ? (
                  <Carousel items={p.mediaItems} postId={p.id} />
                ) : (
                  /* ── SINGLE media ── */
                  <>
                    {p.thumbnail ? (
                      <div className="post-image">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={proxyUrl(p.thumbnail, true)}
                          alt={`Post by ${p.uploader}`}
                          loading="lazy"
                        />
                        {p.mediaType === 'video' && (
                          <div className="video-badge">▶ {fmtDur(p.duration) || 'Reel'}</div>
                        )}
                      </div>
                    ) : (
                      <div className="post-image-placeholder">
                        <span>📷</span>
                        <span>{p.mediaType === 'video' ? 'Reel' : 'Photo'}</span>
                      </div>
                    )}
                  </>
                )}

                {/* Action icons */}
                {!p.isCarousel && (
                  <div className="post-actions">
                    <div className="action-icon heart">🤍</div>
                    <div className="action-icon">💬</div>
                    <div className="action-icon">📤</div>
                    <div className="action-icon action-icon-ml">🔖</div>
                  </div>
                )}

                {/* Stats */}
                {(fmtN(p.likeCount) || fmtN(p.commentCount) || fmtN(p.viewCount)) && (
                  <div className="post-stats">
                    {fmtN(p.likeCount) && (
                      <div className="stat-item">
                        <span className="stat-val">{fmtN(p.likeCount)}</span>
                        <span className="stat-key">likes</span>
                      </div>
                    )}
                    {fmtN(p.commentCount) && (
                      <div className="stat-item">
                        <span className="stat-val">{fmtN(p.commentCount)}</span>
                        <span className="stat-key">comments</span>
                      </div>
                    )}
                    {fmtN(p.viewCount) && (
                      <div className="stat-item">
                        <span className="stat-val">{fmtN(p.viewCount)}</span>
                        <span className="stat-key">views</span>
                      </div>
                    )}
                    {p.resolution && (
                      <div className="stat-item" style={{ marginLeft:'auto' }}>
                        <span className="stat-val" style={{ fontSize:'0.78rem' }}>{p.resolution}</span>
                        <span className="stat-key">resolution</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Caption */}
                {(p.uploader || p.description) && (
                  <div className="post-caption">
                    {p.uploader && <strong>{p.uploader}</strong>}
                    {p.description && <p>{p.description}</p>}
                  </div>
                )}

                {fmtDate(p.uploadDate) && (
                  <div className="post-date">{fmtDate(p.uploadDate)}</div>
                )}

                {/* Download bar — only for single media */}
                {!p.isCarousel && (
                  <div className="post-download">
                    {p.mediaUrl ? (
                      <button
                        className="btn-download-main"
                        onClick={() => downloadSingle(p)}
                        disabled={downloading}
                        id="download-btn"
                      >
                        {downloading
                          ? <><span className="spinner" /> Downloading…</>
                          : <>⬇ Download {p.mediaType === 'video' ? 'Reel' : 'Photo'}</>}
                      </button>
                    ) : (
                      <div style={{ flex:1, fontSize:'0.78rem', color:'var(--text-2)' }}>
                        ⚠️ Direct media URL unavailable
                      </div>
                    )}
                    <a href={p.pageUrl} target="_blank" rel="noopener noreferrer" className="btn-view">
                      ↗ View
                    </a>
                    {done && <span className="done-chip">✓ Saved!</span>}
                  </div>
                )}

                {/* Carousel: view on Instagram link */}
                {p.isCarousel && (
                  <div className="post-download" style={{ justifyContent:'flex-end' }}>
                    <a href={p.pageUrl} target="_blank" rel="noopener noreferrer" className="btn-view">
                      ↗ View on Instagram
                    </a>
                  </div>
                )}
              </article>
            ) : (
              <div className="error-box">
                <div className="error-box__title"><span>⚠️</span> Couldn&apos;t fetch this post</div>
                <div className="error-box__msg">{result.error}</div>
                {result.hint && <div className="error-box__hint">💡 {result.hint}</div>}
              </div>
            )}
          </div>
        )}

        {/* ── Features ── */}
        <div className="features">
          {[
            { icon:'⚡', title:'HD Quality',   desc:'Highest resolution from CDN' },
            { icon:'🗂️', title:'Carousels',    desc:'Download all album photos at once' },
            { icon:'🎬', title:'Reels',        desc:'Full quality video downloads' },
            { icon:'🛡️', title:'No Watermark', desc:'Clean original files' },
            { icon:'🔒', title:'Private',      desc:'No data stored or tracked' },
            { icon:'🆓', title:'Free',         desc:'Always free, open source' },
          ].map(f => (
            <div key={f.title} className="feat">
              <div className="feat__icon">{f.icon}</div>
              <div className="feat__title">{f.title}</div>
              <div className="feat__desc">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <footer className="footer">
          <span className="footer__logo">InstaDown</span>
          <span className="footer__copy">© {new Date().getFullYear()} · Personal use only</span>
        </footer>

      </main>
    </>
  );
}
