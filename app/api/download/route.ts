import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mediaUrl = searchParams.get('url');
  const filename = searchParams.get('filename') || 'instagram-download';
  const ext = searchParams.get('ext') || 'mp4';

  if (!mediaUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Only allow Instagram CDN domains for security
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(mediaUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const allowedDomains = [
    'instagram.com',
    'cdninstagram.com',
    'fbcdn.net',
    'scontent.cdninstagram.com',
    'twimg.com',
    'twitter.com',
    'x.com',
  ];

  const isAllowed = allowedDomains.some(
    (domain) =>
      parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
  );

  if (!isAllowed) {
    return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
  }

  try {
    const referer = mediaUrl.includes('twimg.com') ? 'https://x.com/' : 'https://www.instagram.com/';
    const response = await fetch(mediaUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: referer,
        Accept: '*/*',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `CDN responded with ${response.status}` },
        { status: response.status }
      );
    }

    const isInline = searchParams.get('inline') === 'true';
    const contentType = response.headers.get('content-type') || (isInline ? 'image/jpeg' : `video/${ext}`);
    const contentLength = response.headers.get('content-length');

    const headers: HeadersInit = {
      'Content-Type': contentType,
      'Content-Disposition': isInline ? 'inline' : `attachment; filename="${filename}.${ext}"`,
      'Cache-Control': isInline ? 'public, max-age=31536000, immutable' : 'no-store',
    };

    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }

    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Download failed: ${message}` },
      { status: 500 }
    );
  }
}
