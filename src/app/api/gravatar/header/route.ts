import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxies the Gravatar header/banner image so the browser receives it at full
 * resolution without needing to include the API key itself.
 *
 * Usage:  /api/gravatar/header?url=https%3A%2F%2F2.gravatar.com%2Fuserimage%2F...
 */
export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get('url');
  if (!rawUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // Only proxy known Gravatar domains
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  if (!parsed.hostname.endsWith('gravatar.com')) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const apiKey = process.env.GRAVATAR_API_KEY;
  const headers: Record<string, string> = {};
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  try {
    const upstream = await fetch(rawUrl, { headers });
    if (!upstream.ok) {
      return new NextResponse('Upstream error', { status: upstream.status });
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Cache for 1 hour in the browser, 1 hour in CDN
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch {
    return new NextResponse('Failed to fetch image', { status: 502 });
  }
}
