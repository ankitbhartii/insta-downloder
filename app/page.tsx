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
  uploaderVerified?: boolean;
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
  isTwitter?: boolean;
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

const getDownloadUrl = (u: string, filename: string, ext: string) =>
  `/api/download?url=${encodeURIComponent(u)}&filename=${encodeURIComponent(filename)}&ext=${ext}`;

function triggerDownload(url: string, filename: string) {
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

/* ─── Carousel Slide component ───────────────────────────── */
function CarouselSlide({
  item, index, total, onDownload, downloading, isTwitter,
}: {
  item: MediaItem; index: number; total: number;
  onDownload: (item: MediaItem, idx: number) => void;
  downloading: boolean;
  isTwitter?: boolean;
}) {
  return (
    <div className="slide">
      <div className="slide__counter">{index + 1} / {total}</div>
      <div className="slide__media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={proxyUrl(item.thumbnail, true)}
          alt={`Slide ${index + 1}`}
          loading="lazy"
        />
        {item.mediaType === 'video' && <div className="video-badge">▶ {isTwitter ? 'Video' : 'Reel'}</div>}
      </div>
      <div className="slide__actions">
        {item.resolution && <span className="slide__res">{item.resolution}</span>}
        <button
          className={isTwitter ? "btn-slide-dl twitter-btn" : "btn-slide-dl"}
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
function Carousel({ items, postId, isTwitter }: { items: MediaItem[]; postId: string; isTwitter?: boolean }) {
  const [active, setActive]   = useState(0);
  const [dlIdx, setDlIdx]     = useState<number | null>(null);
  const [dlAll, setDlAll]     = useState(false);
  const [doneSet, setDoneSet] = useState<Set<number>>(new Set());

  const downloadOne = async (item: MediaItem, idx: number) => {
    setDlIdx(idx);
    const ext  = item.mediaType === 'video' ? 'mp4' : 'jpg';
    const name = `download-${postId}-${idx + 1}`;
    triggerDownload(getDownloadUrl(item.url, name, ext), `${name}.${ext}`);
    await new Promise(r => setTimeout(r, 800));
    setDoneSet(prev => new Set([...prev, idx]));
    setDlIdx(null);
  };

  const downloadAll = async () => {
    setDlAll(true);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const ext  = item.mediaType === 'video' ? 'mp4' : 'jpg';
      const name = `download-${postId}-${i + 1}`;
      triggerDownload(getDownloadUrl(item.url, name, ext), `${name}.${ext}`);
      await new Promise(r => setTimeout(r, 600));
    }
    setDoneSet(new Set(items.map((_, i) => i)));
    setDlAll(false);
  };

  return (
    <div className="carousel">
      <div className="carousel__strip">
        {items.map((item, i) => (
          <button
            key={i}
            className={`strip-thumb${i === active ? ' active' : ''}${doneSet.has(i) ? ' done' : ''}${isTwitter ? ' twitter-active' : ''}`}
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

      <CarouselSlide
        key={active}
        item={items[active]}
        index={active}
        total={items.length}
        onDownload={downloadOne}
        downloading={dlIdx === active}
        isTwitter={isTwitter}
      />

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
              className={`dot${i === active ? ' active' : ''}${isTwitter && i === active ? ' twitter-active-dot' : ''}`}
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

      <div className="carousel__dl-all">
        <button className={isTwitter ? "btn-dl-all twitter-gradient-btn" : "btn-dl-all"} onClick={downloadAll} disabled={dlAll}>
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

/* ─── Platform Downloader Column ─────────────────────────── */
function DownloaderCol({
  platform,
  icon,
  title,
  sub,
  placeholder,
  hint,
  btnText,
  gradientClass,
}: {
  platform: 'instagram' | 'twitter';
  icon: string;
  title: string;
  sub: string;
  placeholder: string;
  hint: string;
  btnText: string;
  gradientClass: string;
}) {
  const [url, setUrl]             = useState('');
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<FetchResult | null>(null);
  const [downloading, setDl]      = useState(false);
  const [done, setDone]           = useState(false);
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
      const name = `download-${p.id}`;
      triggerDownload(getDownloadUrl(p.mediaUrl, name, ext), `${name}.${ext}`);
      await new Promise(r => setTimeout(r, 800));
      setDone(true);
    } finally { setDl(false); }
  }, []);

  const p = result?.data;
  const isX = platform === 'twitter';

  return (
    <div className="downloader-col">
      {/* Platform Title */}
      <div className="col-header">
        <div className={`col-header__icon ${isX ? 'twitter-theme-icon' : ''}`}>{icon}</div>
        <h2 className="col-header__title">
          {title} <span className={gradientClass}>Downloader</span>
        </h2>
        <p className="col-header__sub">{sub}</p>
      </div>

      {/* Downloader Card */}
      <div className="dl-card">
        <div className="input-wrap">
          <input
            ref={inputRef}
            type="url"
            className="url-input"
            placeholder={placeholder}
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetch_()}
            autoComplete="off"
            spellCheck={false}
            aria-label={`${platform} post URL`}
          />
          <button className="btn-paste" onClick={paste} type="button">
            📋 Paste
          </button>
        </div>

        <button
          className={isX ? "btn-fetch twitter-btn" : "btn-fetch"}
          onClick={fetch_}
          disabled={loading || !url.trim()}
          type="button"
        >
          {loading
            ? <><span className="spinner" /> Fetching…</>
            : <><span>✦</span> {btnText}</>}
        </button>

        {!result && !loading && (
          <div className="supported-hint">
            <span>Example: {hint}</span>
          </div>
        )}
      </div>

      {/* Result preview */}
      {result && (
        <div className="result">
          {result.success && p ? (
            <article className={`post-card ${isX ? 'twitter-post-card' : ''}`}>
              {/* Header */}
              <header className="post-header">
                <div className={isX ? "avatar-ring twitter-avatar" : "avatar-ring"}>
                  <div className={isX ? "avatar-inner twitter-avatar-inner" : "avatar-inner"}>
                    {initial(p.uploader)}
                  </div>
                </div>
                <div className="post-author">
                  <div className="post-name">
                    {p.uploader || 'Unknown'}
                    {p.uploaderVerified && <span className="verified-badge" title="Verified">✓</span>}
                  </div>
                  {p.uploaderUsername && <div className="post-handle">@{p.uploaderUsername}</div>}
                </div>
                <span className="post-type-badge">
                  {p.isCarousel ? `Album (${p.mediaItems?.length})` : p.mediaType === 'video' ? 'Video' : 'Photo'}
                </span>
              </header>

              {/* Carousel or single media */}
              {p.isCarousel && p.mediaItems && p.mediaItems.length > 0 ? (
                <Carousel items={p.mediaItems} postId={p.id} isTwitter={isX} />
              ) : (
                <>
                  {p.mediaType === 'video' && p.mediaUrl ? (
                    <div className="post-video-container">
                      <video
                        src={proxyUrl(p.mediaUrl, true)}
                        poster={p.thumbnail ? proxyUrl(p.thumbnail, true) : undefined}
                        controls
                        playsInline
                        className="post-video"
                      />
                    </div>
                  ) : p.thumbnail ? (
                    <div className="post-image">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proxyUrl(p.thumbnail, true)}
                        alt={`Post by ${p.uploader}`}
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="post-image-placeholder">
                      <span>{isX ? '🐦' : '📷'}</span>
                      <span>{p.mediaType === 'video' ? 'Video' : 'Photo'}</span>
                    </div>
                  )}
                </>
              )}

              {/* Actions & stats */}
              {!p.isCarousel && (
                <div className="post-actions">
                  <div className="action-icon heart">{isX ? '❤️' : '🤍'}</div>
                  <div className="action-icon">{isX ? '💬' : '💬'}</div>
                  <div className="action-icon">{isX ? '🔁' : '📤'}</div>
                  <div className="action-icon action-icon-ml">{isX ? '🔖' : '🔖'}</div>
                </div>
              )}

              {/* Stats values */}
              {(fmtN(p.likeCount) || fmtN(p.commentCount) || fmtN(p.viewCount)) && (
                <div className="post-stats">
                  {fmtN(p.likeCount) && (
                    <div className="stat-item">
                      <span className="stat-val">{fmtN(p.likeCount)}</span>
                      <span className="stat-key">{isX ? 'likes' : 'likes'}</span>
                    </div>
                  )}
                  {fmtN(p.commentCount) && (
                    <div className="stat-item">
                      <span className="stat-val">{fmtN(p.commentCount)}</span>
                      <span className="stat-key">{isX ? 'reposts' : 'comments'}</span>
                    </div>
                  )}
                  {fmtN(p.viewCount) && (
                    <div className="stat-item">
                      <span className="stat-val">{fmtN(p.viewCount)}</span>
                      <span className="stat-key">views</span>
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

              {/* Date */}
              {fmtDate(p.uploadDate) && (
                <div className="post-date">{fmtDate(p.uploadDate)}</div>
              )}

              {/* Single Download bar */}
              {!p.isCarousel && (
                <div className="post-download">
                  {p.mediaUrl ? (
                    <button
                      className={isX ? "btn-download-main twitter-gradient-btn" : "btn-download-main"}
                      onClick={() => downloadSingle(p)}
                      disabled={downloading}
                    >
                      {downloading
                        ? <><span className="spinner" /> Saving…</>
                        : <>⬇ Download {p.mediaType === 'video' ? 'Video' : 'Photo'}</>}
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

              {/* Carousel: view link */}
              {p.isCarousel && (
                <div className="post-download" style={{ justifyContent:'flex-end' }}>
                  <a href={p.pageUrl} target="_blank" rel="noopener noreferrer" className="btn-view">
                    ↗ View on {isX ? 'X' : 'Instagram'}
                  </a>
                </div>
              )}
            </article>
          ) : (
            <div className="error-box">
              <div className="error-box__title"><span>⚠️</span> Couldn&apos;t fetch post</div>
              <div className="error-box__msg">{result.error}</div>
              {result.hint && <div className="error-box__hint">💡 {result.hint}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Orchestrator Page ──────────────────────────────────── */
export default function Home() {
  return (
    <>
      {/* Frosted Glass Navbar */}
      <nav className="nav">
        <span className="nav__logo">InstaDown</span>
        <span className="nav__badge">v2.0 Dual Mode</span>
      </nav>

      {/* Main Container */}
      <main className="dual-page">
        {/* Main Title Header */}
        <header className="page-title-section">
          <h1 className="main-title">
            Universal Social Media <span className="accent-ig">Downloader</span>
          </h1>
          <p className="main-sub">
            Fetch and save high-quality Photos, Videos, and Albums directly from Instagram and X (Twitter) instantly.
          </p>
        </header>

        {/* Side-by-side column grid */}
        <div className="downloader-grid">
          {/* Instagram Downloader */}
          <DownloaderCol
            platform="instagram"
            icon="📸"
            title="Instagram"
            sub="Download Reels, Photos and Multi-Image albums."
            placeholder="Paste Instagram link here…"
            hint="instagram.com/p/..."
            btnText="Fetch Post"
            gradientClass="accent-ig"
          />

          {/* X / Twitter Downloader */}
          <DownloaderCol
            platform="twitter"
            icon="𝕏"
            title="X (Twitter)"
            sub="Download Tweet videos, GIFs and photo galleries."
            placeholder="Paste X / Twitter link here…"
            hint="x.com/username/status/..."
            btnText="Fetch Tweet"
            gradientClass="accent-tw"
          />
        </div>

        {/* Global Features List */}
        <div className="features">
          {[
            { icon:'⚡', title:'Ultra HD quality', desc:'Download highest source files' },
            { icon:'🗂️', title:'Multi-photo Albums', desc:'Staggered carousel bulk saving' },
            { icon:'🎬', title:'Full Resolution Video', desc:'Uncompressed Reels & Tweet MP4s' },
            { icon:'🛡️', title:'Zero Watermarks', desc:'Preserves original CDN assets' },
            { icon:'🔒', title:'Fully Private', desc:'All data runs securely through proxy' },
            { icon:'🆓', title:'100% Free', desc:'No limits, no subscriptions' },
          ].map(f => (
            <div key={f.title} className="feat">
              <div className="feat__icon">{f.icon}</div>
              <div className="feat__title">{f.title}</div>
              <div className="feat__desc">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="footer">
          <span className="footer__logo">InstaDown &amp; XDown</span>
          <span className="footer__copy">© {new Date().getFullYear()} · Personal use only</span>
        </footer>
      </main>
    </>
  );
}
