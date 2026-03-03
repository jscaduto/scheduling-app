import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { getAuthUrl } from '@/lib/calendar/google';

const BASE = () => process.env.APP_BASE_URL!;

// GET /api/calendar/connect?provider=google
// Initiates the Google OAuth flow by redirecting to the authorization URL.
export async function GET(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', BASE()));
  }

  const provider = new URL(req.url).searchParams.get('provider');
  if (provider !== 'google') {
    return NextResponse.json({ error: 'Only "google" is supported' }, { status: 400 });
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=google_not_configured', BASE())
    );
  }

  const state = crypto.randomUUID();
  const redirectUri = `${BASE()}/api/calendar/callback`;
  const authUrl = getAuthUrl(redirectUri, state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });
  return res;
}

// DELETE /api/calendar/connect?provider=google
// Removes the stored calendar connection.
export async function DELETE(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const provider = new URL(req.url).searchParams.get('provider');
  if (provider !== 'google') {
    return NextResponse.json({ error: 'Only "google" is supported' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { auth0Id: session.user.sub } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  await prisma.calendarConnection.deleteMany({
    where: { userId: user.id, provider: 'google' },
  });

  return NextResponse.json({ success: true });
}
