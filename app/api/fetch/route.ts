import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface YtDlpFormat {
  format_id: string;
  ext: string;
  width?: number;
  height?: number;
  filesize?: number;
  vcodec?: string;
  acodec?: string;
  url: string;
  quality?: number;
  tbr?: number;
  vbr?: number;
  format_note?: string;
}

interface YtDlpOutput {
  id: string;
  title: string;
  description?: string;
  uploader?: string;
  uploader_id?: string;
  thumbnail?: string;
  thumbnails?: Array<{ url: string; width?: number; height?: number }>;
  webpage_url: string;
  upload_date?: string;
  like_count?: number;
  view_count?: number;
  comment_count?: number;
  duration?: number;
  width?: number;
  height?: number;
  ext?: string;
  url?: string; // direct URL for images
  formats?: YtDlpFormat[];
  _type?: string;
}

function runYtDlp(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      '--quiet',
      url,
    ];

    const proc = spawn('yt-dlp', args, { shell: true });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code: number) => {
      if (code === 0 && stdout.trim()) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr || `yt-dlp exited with code ${code}`));
      }
    });

    proc.on('error', (err: Error) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error('yt-dlp is not installed. Please install it: winget install yt-dlp'));
      } else {
        reject(err);
      }
    });

    // timeout after 50 seconds
    setTimeout(() => {
      proc.kill();
      reject(new Error('yt-dlp timed out after 50 seconds'));
    }, 50000);
  });
}

function pickBestVideoFormat(formats: YtDlpFormat[]): YtDlpFormat | null {
  // Filter formats that have video
  const videoFormats = formats.filter(
    (f) => f.vcodec && f.vcodec !== 'none' && f.url
  );

  if (videoFormats.length === 0) return null;

  // Sort by resolution (height) then by bitrate
  videoFormats.sort((a, b) => {
    const heightDiff = (b.height || 0) - (a.height || 0);
    if (heightDiff !== 0) return heightDiff;
    return (b.tbr || 0) - (a.tbr || 0);
  });

  return videoFormats[0];
}

function pickBestImageFormat(formats: YtDlpFormat[]): YtDlpFormat | null {
  const imageFormats = formats.filter(
    (f) => (f.vcodec === 'none' || !f.vcodec) && f.url
  );
  return imageFormats.length > 0 ? imageFormats[0] : null;
}

function formatDate(dateStr?: string): string | undefined {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  return new Date(`${year}-${month}-${day}`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function POST(request: NextRequest) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url } = body;

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  // Validate Instagram URL
  const igPattern =
    /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv|stories)\/[A-Za-z0-9_\-]+\/?/;
  if (!igPattern.test(url.trim())) {
    return NextResponse.json(
      { error: 'Please enter a valid Instagram post URL (instagram.com/p/... or /reel/...)' },
      { status: 400 }
    );
  }

  try {
    const rawJson = await runYtDlp(url.trim());

    // yt-dlp may return multiple JSON lines for slideshows; take first
    const firstLine = rawJson.split('\n').find((l) => l.trim().startsWith('{'));
    if (!firstLine) throw new Error('No JSON output from yt-dlp');

    const data: YtDlpOutput = JSON.parse(firstLine);

    // Determine media type
    const isVideo =
      data.formats?.some((f) => f.vcodec && f.vcodec !== 'none') ||
      data.ext === 'mp4';

    let mediaUrl: string | null = null;
    let mediaType: 'video' | 'image' = 'image';
    let resolution: string | undefined;

    if (data.formats && data.formats.length > 0) {
      if (isVideo) {
        const best = pickBestVideoFormat(data.formats);
        if (best) {
          mediaUrl = best.url;
          mediaType = 'video';
          resolution = best.width && best.height ? `${best.width}x${best.height}` : undefined;
        }
      } else {
        const best = pickBestImageFormat(data.formats);
        if (best) {
          mediaUrl = best.url;
          mediaType = 'image';
        }
      }
    }

    // Fallback: direct URL (for images or simpler posts)
    if (!mediaUrl && data.url) {
      mediaUrl = data.url;
      mediaType = data.ext === 'mp4' ? 'video' : 'image';
    }

    // Pick best thumbnail
    let thumbnail = data.thumbnail;
    if (data.thumbnails && data.thumbnails.length > 0) {
      const sorted = [...data.thumbnails].sort(
        (a, b) => (b.width || 0) - (a.width || 0)
      );
      thumbnail = sorted[0].url || thumbnail;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        title: data.title || 'Instagram Post',
        description: data.description,
        uploader: data.uploader,
        uploaderUsername: data.uploader_id,
        thumbnail,
        mediaUrl,
        mediaType,
        resolution,
        duration: data.duration,
        uploadDate: formatDate(data.upload_date),
        likeCount: data.like_count,
        viewCount: data.view_count,
        commentCount: data.comment_count,
        pageUrl: data.webpage_url || url.trim(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    // Provide helpful error messages
    if (message.includes('not installed') || message.includes('ENOENT')) {
      return NextResponse.json(
        {
          error: 'yt-dlp is not installed on this system.',
          hint: 'Run: winget install yt-dlp  (or: pip install yt-dlp)',
          code: 'YTDLP_NOT_FOUND',
        },
        { status: 503 }
      );
    }

    if (message.includes('private') || message.includes('login')) {
      return NextResponse.json(
        {
          error: 'This post is private or requires login.',
          hint: 'Only public Instagram posts can be downloaded without authentication.',
          code: 'PRIVATE_POST',
        },
        { status: 403 }
      );
    }

    if (message.includes('timed out')) {
      return NextResponse.json(
        { error: 'Request timed out. Instagram may be rate-limiting. Try again in a moment.', code: 'TIMEOUT' },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { error: `Failed to fetch post: ${message}` },
      { status: 500 }
    );
  }
}
