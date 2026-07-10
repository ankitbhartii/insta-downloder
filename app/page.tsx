'use client';

import { useState, useRef, useCallback } from 'react';

/* ─── Types ─────────────────────────────────────────────── */
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
}

interface FetchResult {
  success: boolean;
  data?: PostData;
  error?: string;
  hint?: string;
  code?: string;
}

/* ─── Helpers ────────────────────────────────────────────── */
function formatCount(n?: number): string {
  if (n === undefined || n === null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function formatDuration(secs?: number): string {
  if (!secs) return '';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getInitial(name?: string): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

/* ─── Component ─────────────────────────────────────────── */
export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FetchResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Paste from clipboard */
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      inputRef.current?.focus();
    } catch {
      inputRef.current?.focus();
    }
  }, []);

  /* Fetch post metadata */
  const handleFetch = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setResult(null);
    setDownloadDone(false);

    try {
      const res = await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });

      const json: FetchResult = await res.json();
      setResult(json);
    } catch {
      setResult({ success: false, error: 'Network error. Please check your connection.' });
    } finally {
      setLoading(false);
    }
  }, [url]);

  /* Keyboard submit */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleFetch();
    },
    [handleFetch]
  );

  /* Download via proxy */
  const handleDownload = useCallback(async () => {
    if (!result?.data?.mediaUrl) return;

    const { mediaUrl, mediaType, uploader, id } = result.data;
    const ext = mediaType === 'video' ? 'mp4' : 'jpg';
    const filename = `instadown-${uploader || id}`;

    setDownloading(true);
    setDownloadDone(false);

    try {
      const proxyUrl = `/api/download?url=${encodeURIComponent(mediaUrl)}&filename=${encodeURIComponent(filename)}&ext=${ext}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        // Fallback: open direct link in new tab
        window.open(mediaUrl, '_blank');
        setDownloadDone(true);
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${filename}.${ext}`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      setDownloadDone(true);
    } catch {
      // Fallback to direct open
      window.open(mediaUrl, '_blank');
      setDownloadDone(true);
    } finally {
      setDownloading(false);
    }
  }, [result]);

  const postData = result?.success ? result.data : null;

  return (
    <div className="page-wrapper">
      {/* ── Navbar ─────────────────────────────────── */}
      <nav className="navbar" aria-label="Main navigation">
        <div className="container navbar__inner">
          <a href="/" className="navbar__logo" aria-label="InstaDown home">
            <span className="navbar__logo-icon" aria-hidden="true">📸</span>
            <span className="navbar__logo-text">InstaDown</span>
          </a>
          <span className="navbar__badge">Free &amp; Open</span>
        </div>
      </nav>

      <main>
        {/* ── Hero ───────────────────────────────────── */}
        <section className="hero" aria-labelledby="hero-title">
          <div className="container">
            <div className="hero__eyebrow">
              <span className="hero__eyebrow-dot" aria-hidden="true" />
              Powered by yt-dlp reverse engineering
            </div>
            <h1 id="hero-title" className="hero__title">
              Download Instagram{' '}
              <span className="hero__title-gradient">Photos &amp; Reels</span>
              <br />in High Quality
            </h1>
            <p className="hero__subtitle">
              Paste any public Instagram post link and download images or videos
              in the highest available quality — no login, no watermarks, completely free.
            </p>
          </div>
        </section>

        {/* ── Input ──────────────────────────────────── */}
        <section className="input-section" aria-label="Download form">
          <div className="container">
            <div className="input-card">
              <label htmlFor="ig-url-input" className="input-label">
                Instagram Post URL
              </label>
              <div className="input-row">
                <input
                  id="ig-url-input"
                  ref={inputRef}
                  type="url"
                  className="url-input"
                  placeholder="https://www.instagram.com/p/... or /reel/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  aria-label="Instagram post URL"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  id="paste-btn"
                  className="btn btn--secondary"
                  onClick={handlePaste}
                  type="button"
                  title="Paste from clipboard"
                  aria-label="Paste URL from clipboard"
                >
                  📋 Paste
                </button>
                <button
                  id="fetch-btn"
                  className="btn btn--primary"
                  onClick={handleFetch}
                  disabled={loading || !url.trim()}
                  type="button"
                  aria-label="Fetch Instagram post"
                  aria-busy={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      Fetching…
                    </>
                  ) : (
                    <>🔍 Fetch Post</>
                  )}
                </button>
              </div>

              {/* ── Error / Hint ─────────────────────── */}
              {result && !result.success && (
                <div
                  className={`message-box message-box--${result.code === 'YTDLP_NOT_FOUND' ? 'warning' : 'error'}`}
                  role="alert"
                >
                  <span className="message-box__icon" aria-hidden="true">
                    {result.code === 'YTDLP_NOT_FOUND' ? '⚠️' : result.code === 'PRIVATE_POST' ? '🔒' : '❌'}
                  </span>
                  <div className="message-box__content">
                    <p className="message-box__title">{result.error}</p>
                    {result.hint && (
                      <p className="message-box__body">
                        {result.hint}
                        {result.code === 'YTDLP_NOT_FOUND' && (
                          <span className="message-box__code">winget install yt-dlp</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Result Card ──────────────────────────── */}
            {postData && (
              <div className="result-section" aria-live="polite" aria-label="Post details">
                <div className="result-card">
                  {/* Header */}
                  <div className="result-card__header">
                    <span
                      className={`result-card__badge result-card__badge--${postData.mediaType}`}
                    >
                      {postData.mediaType === 'video' ? '🎬 Reel / Video' : '🖼️ Photo'}
                    </span>
                    <span className="result-card__header-title">Post fetched successfully</span>
                    {postData.resolution && (
                      <span className="result-card__resolution">
                        📐 {postData.resolution}
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="result-card__body">
                    {/* Thumbnail */}
                    <div className="result-card__thumbnail-wrap">
                      {postData.thumbnail ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={postData.thumbnail}
                            alt={`Thumbnail for ${postData.title}`}
                            className="result-card__thumbnail"
                            loading="lazy"
                          />
                          <div className="result-card__thumbnail-overlay">
                            {postData.mediaType === 'video' && postData.duration && (
                              <span className="result-card__play-badge">
                                ▶️ {formatDuration(postData.duration)}
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div
                          className="result-card__thumbnail skeleton"
                          style={{ width: '100%', height: '100%' }}
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div className="result-card__info">
                      {/* Author */}
                      <div className="result-card__author">
                        <div
                          className="result-card__avatar"
                          aria-label={`Avatar for ${postData.uploader || 'user'}`}
                        >
                          {getInitial(postData.uploader)}
                        </div>
                        <div>
                          <div className="result-card__author-name">
                            {postData.uploader || 'Unknown User'}
                          </div>
                          {postData.uploaderUsername && (
                            <div className="result-card__author-handle">
                              @{postData.uploaderUsername}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      {postData.title && postData.title !== 'Instagram Post' && (
                        <p className="result-card__title">{postData.title}</p>
                      )}

                      {/* Description */}
                      {postData.description && (
                        <p className="result-card__description">{postData.description}</p>
                      )}

                      {/* Meta Stats */}
                      <div className="result-card__meta" aria-label="Post statistics">
                        {postData.likeCount !== undefined && (
                          <div className="result-card__meta-item">
                            <span className="result-card__meta-icon" aria-hidden="true">❤️</span>
                            <span className="result-card__meta-value">
                              {formatCount(postData.likeCount)}
                            </span>
                            <span>likes</span>
                          </div>
                        )}
                        {postData.viewCount !== undefined && (
                          <div className="result-card__meta-item">
                            <span className="result-card__meta-icon" aria-hidden="true">👁️</span>
                            <span className="result-card__meta-value">
                              {formatCount(postData.viewCount)}
                            </span>
                            <span>views</span>
                          </div>
                        )}
                        {postData.commentCount !== undefined && (
                          <div className="result-card__meta-item">
                            <span className="result-card__meta-icon" aria-hidden="true">💬</span>
                            <span className="result-card__meta-value">
                              {formatCount(postData.commentCount)}
                            </span>
                            <span>comments</span>
                          </div>
                        )}
                      </div>

                      <div className="result-card__divider" aria-hidden="true" />

                      {/* Download Buttons */}
                      <div className="result-card__download">
                        <p className="result-card__download-label">
                          Download {postData.mediaType === 'video' ? 'Video' : 'Image'}
                          {postData.resolution ? ` (${postData.resolution})` : ' (Highest Quality)'}
                        </p>

                        {postData.mediaUrl ? (
                          <>
                            <button
                              id="download-btn"
                              className={`btn ${postData.mediaType === 'video' ? 'btn--download-reel' : 'btn--download'}`}
                              onClick={handleDownload}
                              disabled={downloading}
                              type="button"
                              aria-label={`Download ${postData.mediaType === 'video' ? 'video' : 'image'}`}
                              aria-busy={downloading}
                            >
                              {downloading ? (
                                <>
                                  <span className="spinner" aria-hidden="true" />
                                  Downloading…
                                </>
                              ) : (
                                <>
                                  {postData.mediaType === 'video' ? '🎬' : '📥'}{' '}
                                  Download {postData.mediaType === 'video' ? 'Reel / Video' : 'Photo'}
                                </>
                              )}
                            </button>

                            <a
                              id="open-direct-link"
                              href={postData.mediaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn--secondary btn--sm"
                              aria-label="Open direct media link in new tab"
                            >
                              🔗 Direct Link
                            </a>

                            {downloadDone && !downloading && (
                              <p className="download-progress" role="status">
                                ✅ Download started!
                              </p>
                            )}
                          </>
                        ) : (
                          <div className="message-box message-box--info" style={{ marginTop: 0, width: '100%' }}>
                            <span className="message-box__icon" aria-hidden="true">ℹ️</span>
                            <div className="message-box__content">
                              <p className="message-box__title">Media URL unavailable</p>
                              <p className="message-box__body">
                                The direct media link couldn&apos;t be extracted. This may be a private post
                                or a story. Try opening the post directly on Instagram.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="result-card__footer">
                    <a
                      href={postData.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="result-card__source-link"
                      aria-label="Open original Instagram post"
                    >
                      🔗 View on Instagram
                    </a>
                    {postData.uploadDate && (
                      <span className="result-card__date" aria-label={`Posted on ${postData.uploadDate}`}>
                        📅 {postData.uploadDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── How It Works ────────────────────────────── */}
        <section className="steps-section" aria-labelledby="steps-title">
          <div className="container">
            <h2 id="steps-title" className="steps-section__title">
              How It <span className="text-gradient">Works</span>
            </h2>
            <div className="steps-grid" role="list">
              <div className="step-card" role="listitem">
                <div className="step-card__number" aria-hidden="true">1</div>
                <h3 className="step-card__title">Copy the Link</h3>
                <p className="step-card__desc">
                  Open any public Instagram post, reel, or photo. Copy the URL from your browser or the Instagram app.
                </p>
              </div>
              <div className="step-card" role="listitem">
                <div className="step-card__number" aria-hidden="true">2</div>
                <h3 className="step-card__title">Paste &amp; Fetch</h3>
                <p className="step-card__desc">
                  Paste the link above and click &ldquo;Fetch Post&rdquo;. Our engine reverse-engineers Instagram&apos;s API to extract the highest-quality media.
                </p>
              </div>
              <div className="step-card" role="listitem">
                <div className="step-card__number" aria-hidden="true">3</div>
                <h3 className="step-card__title">Download HD</h3>
                <p className="step-card__desc">
                  Click the download button to save the photo or video in full HD quality directly to your device.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ────────────────────────────────── */}
        <section className="features-section" aria-labelledby="features-title">
          <div className="container container--wide">
            <h2 id="features-title" className="features-section__title">
              Why <span className="text-gradient">InstaDown</span>?
            </h2>
            <p className="features-section__subtitle">
              Built on yt-dlp, the most powerful open-source media downloader
            </p>
            <div className="features-grid" role="list">
              {[
                {
                  icon: '⚡',
                  title: 'High Quality Downloads',
                  desc: 'Automatically selects the highest resolution format available — no compression, no quality loss.',
                },
                {
                  icon: '🔓',
                  title: 'No Login Required',
                  desc: 'Download any public post without signing in. Works with photos, videos, and Reels instantly.',
                },
                {
                  icon: '🛠️',
                  title: 'yt-dlp Powered',
                  desc: 'Uses yt-dlp\'s reverse-engineered Instagram extractor to fetch direct CDN media URLs.',
                },
                {
                  icon: '🖼️',
                  title: 'Photos & Reels',
                  desc: 'Supports single photos, carousels, and video Reels. All formats, all in one place.',
                },
                {
                  icon: '🚫',
                  title: 'No Watermarks',
                  desc: 'Downloads the original media without any added watermarks or branding.',
                },
                {
                  icon: '🌐',
                  title: 'Open Source',
                  desc: 'Built transparently on open-source tools. No data collection, no tracking.',
                },
              ].map((f) => (
                <div className="feature-card" key={f.title} role="listitem">
                  <div className="feature-card__icon" aria-hidden="true">{f.icon}</div>
                  <h3 className="feature-card__title">{f.title}</h3>
                  <p className="feature-card__desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="footer" aria-label="Site footer">
        <div className="container">
          <p className="footer__text">
            © {new Date().getFullYear()} InstaDown. Built with{' '}
            <a href="https://github.com/yt-dlp/yt-dlp" target="_blank" rel="noopener noreferrer">
              yt-dlp
            </a>{' '}
            &amp;{' '}
            <a href="https://nextjs.org" target="_blank" rel="noopener noreferrer">
              Next.js
            </a>
            .{' '}
            <br />
            For personal and educational use only. Respect content creators&apos; rights.
          </p>
        </div>
      </footer>
    </div>
  );
}
