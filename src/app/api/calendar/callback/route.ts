import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { exchangeCode } from '@/lib/calendar/google';

const BASE = () => process.env.APP_BASE_URL!;

export async function GET(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', BASE()));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=calendar_denied', BASE())
    );
  }

  // Validate CSRF state.
  const savedState = req.cookies.get('oauth_state')?.value;
  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=invalid_state', BASE())
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=missing_code', BASE())
    );
  }

  try {
    const redirectUri = `${BASE()}/api/calendar/callback`;
    const tokens = await exchangeCode(code, redirectUri);

    const user = await prisma.user.findUnique({ where: { auth0Id: session.user.sub } });
    if (!user) {
      return NextResponse.redirect(new URL('/dashboard', BASE()));
    }

    // Upsert: one connection per provider per user.
    await prisma.calendarConnection.upsert({
      where: { userId_provider: { userId: user.id, provider: 'google' } },
      create: {
        userId: user.id,
        provider: 'google',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
    });

    const res = NextResponse.redirect(
      new URL('/dashboard/settings?connected=google', BASE())
    );
    res.cookies.delete('oauth_state');
    return res;
  } catch (err) {
    console.error('[calendar/callback]', err);
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=exchange_failed', BASE())
    );
  }
}
