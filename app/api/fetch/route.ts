import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 60;

/* ─── Cookie loader ──────────────────────────────────────────────────── */
const COOKIES_FILE = path.join(process.cwd(), 'cookies.txt');

interface Cookie { name: string; value: string }

/**
 * Parse raw "key=value; key2=value2" cookie string (e.g. from env var).
 */
function parseRawCookieString(raw: string): Cookie[] {
  return raw
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      const eq = s.indexOf('=');
      if (eq === -1) return null;
      return { name: s.slice(0, eq).trim(), value: s.slice(eq + 1).trim() };
    })
    .filter(Boolean) as Cookie[];
}

/**
 * Parse Netscape / yt-dlp tab-separated cookies.txt format.
 */
function parseNetscapeCookies(text: string): Cookie[] {
  return text
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => {
      const p = l.trim().split('\t');
      return p.length >= 7 ? { name: p[5], value: p[6] } : null;
    })
    .filter(Boolean) as Cookie[];
}

function loadCookies(): Cookie[] {
  // 1. Prefer INSTAGRAM_COOKIES env var (works on Vercel / any serverless host)
  const envCookies = process.env.INSTAGRAM_COOKIES;
  if (envCookies?.trim()) {
    // Check if it's a JSON array
    if (envCookies.trim().startsWith('[')) {
      try {
        const parsedJson = JSON.parse(envCookies);
        if (Array.isArray(parsedJson)) {
          const mapped = parsedJson
            .map((c: any) => {
              if (c && typeof c.name === 'string' && typeof c.value === 'string') {
                return { name: c.name, value: c.value };
              }
              return null;
            })
            .filter(Boolean) as Cookie[];
          if (mapped.length > 0) return mapped;
        }
      } catch (err) {
        console.error('Error parsing INSTAGRAM_COOKIES JSON:', err);
      }
    }

    // Support both raw "key=val; key2=val2" and Netscape tab-separated format
    const parsed = envCookies.includes('\t')
      ? parseNetscapeCookies(envCookies)
      : parseRawCookieString(envCookies);
    if (parsed.length > 0) return parsed;
  }

  // 2. Fall back to local cookies.txt
  try {
    if (!fs.existsSync(COOKIES_FILE)) return [];
    return parseNetscapeCookies(fs.readFileSync(COOKIES_FILE, 'utf-8'));
  } catch { return []; }
}


function cookieHeader(cookies: Cookie[]): string {
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

function getCookieVal(cookies: Cookie[], name: string): string {
  return cookies.find((c) => c.name === name)?.value ?? '';
}

/* ─── Shortcode helpers ──────────────────────────────────────────────── */
function extractShortcode(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:p|reel|tv|stories\/[^/]+)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

const IG_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function shortcodeToMediaId(sc: string): string {
  let id = BigInt(0);
  for (const c of sc) id = id * BigInt(64) + BigInt(IG_CHARSET.indexOf(c));
  return id.toString();
}

/* ─── Base fetch headers ─────────────────────────────────────────────── */
function igHeaders(cookies: Cookie[], referer?: string, extraHeaders?: Record<string, string>) {
  const csrf = getCookieVal(cookies, 'csrftoken');
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    Cookie: cookieHeader(cookies),
    'X-IG-App-ID': '936619743392459',
    'X-CSRFToken': csrf,
    Referer: referer ?? 'https://www.instagram.com/',
    Accept: 'application/json',
    Origin: 'https://www.instagram.com',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    ...extraHeaders,
  };
}

/* ─── Extract lsd token from Instagram homepage ──────────────────────── */
async function getLsdToken(cookies: Cookie[]): Promise<string> {
  try {
    const res = await fetch('https://www.instagram.com/', {
      headers: {
        ...igHeaders(cookies),
        Accept: 'text/html',
        'Sec-Fetch-Mode': 'navigate',
      },
    });
    const html = await res.text();
    const m = html.match(/"LSD"\s*,\s*\[\s*\]\s*,\s*\{"token"\s*:\s*"([^"]+)"/);
    return m?.[1] ?? '';
  } catch { return ''; }
}

/* ─── Strategy: Relay GraphQL POST (doc_id rotation) ────────────────── */
// These are known working doc_ids — we try them in order
const DOC_IDS = [
  '10015901848480474',  // xdt_api v1 shortcode (current)
  '8845758582119845',   // PolarisPostAction
  '9496696870374771',   // alternate
  '17991233890457762',  // older web query
];

interface RelayMediaNode {
  id?: string;
  shortcode?: string;
  __typename?: string;
  is_video?: boolean;
  video_url?: string;
  display_url?: string;
  display_resources?: Array<{ src: string; config_width: number; config_height: number }>;
  thumbnail_src?: string;
  dimensions?: { width: number; height: number };
  edge_media_to_caption?: { edges: Array<{ node: { text: string } }> };
  edge_liked_by?: { count: number };
  edge_media_to_comment?: { count: number };
  video_view_count?: number;
  taken_at_timestamp?: number;
  owner?: { username: string; full_name: string };
  edge_sidecar_to_children?: {
    edges: Array<{
      node: RelayMediaNode;
    }>;
  };
}

async function queryRelayGraphQL(
  shortcode: string,
  lsd: string,
  cookies: Cookie[]
): Promise<RelayMediaNode | null> {
  const variables = JSON.stringify({
    shortcode,
    fetch_tagged_user_count: null,
    hoisted_comment_id: null,
    hoisted_reply_id: null,
  });

  for (const docId of DOC_IDS) {
    try {
      const body = new URLSearchParams({
        lsd,
        variables,
        doc_id: docId,
      });

      const res = await fetch('https://www.instagram.com/graphql/query', {
        method: 'POST',
        headers: {
          ...igHeaders(cookies, `https://www.instagram.com/p/${shortcode}/`, {
            'X-FB-LSD': lsd,
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        },
        body: body.toString(),
      });

      if (!res.ok) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = await res.json() as any;

      // Check different possible response shapes
      const media =
        json?.data?.xdt_shortcode_media ||
        json?.data?.shortcode_media ||
        json?.data?.media;

      if (media && (media.display_url || media.video_url || media.id)) {
        return media as RelayMediaNode;
      }
    } catch { /* try next */ }
  }
  return null;
}

/* ─── Strategy: scrape HTML page for embedded Relay store ───────────── */
async function scrapePageHTML(shortcode: string, cookies: Cookie[]): Promise<RelayMediaNode | null> {
  try {
    const res = await fetch(`https://www.instagram.com/p/${shortcode}/`, {
      headers: {
        ...igHeaders(cookies, 'https://www.google.com/', {
          Accept: 'text/html,application/xhtml+xml',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'cross-site',
        }),
      },
    });
    const html = await res.text();

    // Look for any known patterns that contain the media data
    const patterns = [
      /"shortcode_media"\s*:\s*(\{[\s\S]{100,}?\})\s*,?\s*"(?:gating_info|edge_web)/,
      /window\.__additionalDataLoaded\([^,]+,([\s\S]+?)\);/,
      /"video_url"\s*:\s*"(https:[^"]+)"/,
    ];

    for (const pat of patterns) {
      const m = html.match(pat);
      if (m) {
        try {
          const parsed = JSON.parse(m[1]);
          if (parsed?.display_url || parsed?.video_url) return parsed;
        } catch {
          // If it's just a URL string, reconstruct minimal node
          if (m[1]?.startsWith('http')) {
            return { video_url: m[1], is_video: true };
          }
        }
      }
    }
  } catch { /* ignore */ }
  return null;
}

/* ─── Strategy: Instagram embed page ────────────────────────────────── */
async function scrapeEmbedPage(shortcode: string, cookies: Cookie[]): Promise<RelayMediaNode | null> {
  try {
    const res = await fetch(`https://www.instagram.com/p/${shortcode}/embed/captioned/`, {
      headers: {
        ...igHeaders(cookies, 'https://www.google.com/', {
          Accept: 'text/html,application/xhtml+xml',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'cross-site',
        }),
      },
    });
    const html = await res.text();

    // Look in the embed for video/image src values
    const videoSrc = html.match(/class="[^"]*(?:EmbeddedMedia|CaptionedVideo)[^"]*"[^>]*src="([^"]+)"/)?.[1];
    const imgSrc = html.match(/class="[^"]*EmbeddedMedia(?:Image)[^"]*"[^>]*src="([^"]+)"/)?.[1];
    const ownerName = html.match(/class="[^"]*UsernameText[^"]*"[^>]*>([^<]+)</)?.[1];
    const caption = html.match(/class="[^"]*CaptionText[^"]*"[^>]*>([^<]+)</)?.[1];

    // Also look for any video URL embedded in a script
    const scriptVideoUrl = html.match(/["']video_url["']\s*:\s*["'](https:[^"']+)["']/)?.[1];

    if (videoSrc || imgSrc || scriptVideoUrl) {
      return {
        video_url: videoSrc || scriptVideoUrl,
        display_url: imgSrc,
        is_video: !!(videoSrc || scriptVideoUrl),
        owner: ownerName ? { username: ownerName, full_name: ownerName } : undefined,
        edge_media_to_caption: caption ? { edges: [{ node: { text: caption } }] } : undefined,
      };
    }
  } catch { /* ignore */ }
  return null;
}

/* ─── Strategy: oEmbed for basic metadata ───────────────────────────── */
interface OEmbedData {
  thumbnail_url?: string;
  author_name?: string;
  title?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
}

async function fetchOEmbed(url: string): Promise<OEmbedData | null> {
  try {
    const res = await fetch(
      `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(url)}&format=json`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json',
        },
      }
    );
    if (res.ok) return res.json();
  } catch { /* ignore */ }
  return null;
}

/* ─── Build result from RelayMediaNode ──────────────────────────────── */
interface MediaItem {
  url: string;
  thumbnail: string;
  mediaType: 'video' | 'image';
  resolution?: string;
}

interface PostResult {
  id: string;
  shortcode: string;
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
  mediaItems?: MediaItem[];  // carousel slides
  isCarousel?: boolean;
}

function buildResult(node: RelayMediaNode, shortcode: string, pageUrl: string): PostResult {
  const isVideo = node.is_video || node.__typename === 'GraphVideo' || !!node.video_url;
  const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text;

  // Best thumbnail
  let thumbnail = node.display_url || node.thumbnail_src;
  if (node.display_resources?.length) {
    const sorted = [...node.display_resources].sort((a, b) => b.config_width - a.config_width);
    thumbnail = sorted[0].src || thumbnail;
  }

  const mediaUrl = isVideo ? (node.video_url ?? null) : (node.display_url ?? node.thumbnail_src ?? null);
  const resolution = node.dimensions ? `${node.dimensions.width}x${node.dimensions.height}` : undefined;

  const ts = node.taken_at_timestamp;
  const uploadDate = ts
    ? new Date(ts * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : undefined;

  // ── Carousel / sidecar extraction ─────────────────────────────
  const sidecarEdges = node.edge_sidecar_to_children?.edges;
  let mediaItems: MediaItem[] | undefined;
  let isCarousel = false;

  if (sidecarEdges && sidecarEdges.length > 1) {
    isCarousel = true;
    mediaItems = sidecarEdges.map((edge) => {
      const child = edge.node;
      const childIsVideo = child.is_video || !!child.video_url;
      let childThumb = child.display_url || child.thumbnail_src || '';
      if (child.display_resources?.length) {
        const s = [...child.display_resources].sort((a, b) => b.config_width - a.config_width);
        childThumb = s[0].src || childThumb;
      }
      const childUrl = childIsVideo
        ? (child.video_url ?? childThumb)
        : (child.display_url ?? child.thumbnail_src ?? childThumb);
      const childRes = child.dimensions
        ? `${child.dimensions.width}x${child.dimensions.height}`
        : undefined;
      return {
        url: childUrl,
        thumbnail: childThumb,
        mediaType: childIsVideo ? 'video' : 'image',
        resolution: childRes,
      } satisfies MediaItem;
    });
  }

  return {
    id: node.id ?? shortcode,
    shortcode,
    title: node.owner?.full_name
      ? `${node.owner.full_name}'s ${isCarousel ? 'Album' : isVideo ? 'Reel' : 'Photo'}`
      : 'Instagram Post',
    description: caption,
    uploader: node.owner?.full_name,
    uploaderUsername: node.owner?.username,
    thumbnail,
    mediaUrl,
    mediaType: isVideo ? 'video' : 'image',
    resolution,
    uploadDate,
    likeCount: node.edge_liked_by?.count,
    viewCount: node.video_view_count,
    commentCount: node.edge_media_to_comment?.count,
    pageUrl: pageUrl.split('?')[0].replace(/\/$/, ''),
    mediaItems,
    isCarousel,
  };
}

/* ─── Shared scraping logic ──────────────────────────────────────────── */
async function scrapeAndRespond(shortcode: string, rawUrl: string) {
  const cookies = loadCookies();
  const hasCookies = cookies.length > 0;

  try {
    let node: RelayMediaNode | null = null;

    // Step 1: Get lsd token (needed for Relay queries)
    const lsd = hasCookies ? await getLsdToken(cookies) : '';

    // Step 2: Try Relay GraphQL (requires cookies + lsd)
    if (hasCookies && lsd) {
      node = await queryRelayGraphQL(shortcode, lsd, cookies);
    }

    // Step 3: Scrape HTML page
    if (!node) {
      node = await scrapePageHTML(shortcode, hasCookies ? cookies : []);
    }

    // Step 4: Scrape embed page
    if (!node) {
      node = await scrapeEmbedPage(shortcode, hasCookies ? cookies : []);
    }

    // Step 5: oEmbed partial fallback
    if (!node) {
      const oembed = await fetchOEmbed(rawUrl);
      if (oembed?.thumbnail_url) {
        return NextResponse.json({
          success: true,
          partial: true,
          data: {
            id: shortcode,
            shortcode,
            title: oembed.title || 'Instagram Post',
            uploader: oembed.author_name,
            uploaderUsername: undefined,
            thumbnail: oembed.thumbnail_url,
            mediaUrl: null,
            mediaType: 'image' as const,
            resolution: oembed.thumbnail_width && oembed.thumbnail_height
              ? `${oembed.thumbnail_width}x${oembed.thumbnail_height}` : undefined,
            pageUrl: `https://www.instagram.com/p/${shortcode}/`,
          },
          warning: 'Only preview available. The direct download link could not be extracted.',
        });
      }

      return NextResponse.json({
        error: 'Could not extract media from this post.',
        hint: hasCookies
          ? 'Your session cookies may have expired. Export fresh cookies from instagram.com and paste them again.'
          : 'Paste your Instagram session cookies to enable downloads.',
        code: 'EXTRACT_FAILED',
      }, { status: 502 });
    }

    const result = buildResult(node, shortcode, rawUrl);
    return NextResponse.json({ success: true, data: result });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 });
  }
}

/* ─── GET handler ────────────────────────────────────────────────────── */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  const igPattern = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv|stories)\/[A-Za-z0-9_\-]+/;
  if (!igPattern.test(url.trim())) {
    return NextResponse.json(
      { error: 'Please enter a valid Instagram URL (instagram.com/p/… or /reel/…)' },
      { status: 400 }
    );
  }

  const shortcode = extractShortcode(url.trim());
  if (!shortcode) {
    return NextResponse.json({ error: 'Could not extract post ID from URL.' }, { status: 400 });
  }

  return scrapeAndRespond(shortcode, url.trim());
}

/* ─── POST handler ───────────────────────────────────────────────────── */
export async function POST(request: NextRequest) {
  let body: { url?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const { url } = body;
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  const igPattern = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv|stories)\/[A-Za-z0-9_\-]+/;
  if (!igPattern.test(url.trim())) {
    return NextResponse.json(
      { error: 'Please enter a valid Instagram URL (instagram.com/p/… or /reel/…)' },
      { status: 400 }
    );
  }

  const shortcode = extractShortcode(url.trim());
  if (!shortcode) {
    return NextResponse.json({ error: 'Could not extract post ID from URL.' }, { status: 400 });
  }

  return scrapeAndRespond(shortcode, url.trim());
}
