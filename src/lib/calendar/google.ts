import { prisma } from '@/lib/prisma';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_FREEBUSY_URL = 'https://www.googleapis.com/calendar/v3/freeBusy';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'].join(' ');

/** Returns the Google OAuth authorization URL. */
export function getAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent', // Always request refresh token
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

/** Exchanges an authorization code for access + refresh tokens. */
export async function exchangeCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed: ${body}`);
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/** Refreshes an access token using the stored refresh token. */
async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: Date }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token refresh failed: ${body}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };

  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export type BusyPeriod = { startTime: Date; endTime: Date };

/**
 * Fetches busy times from the user's primary Google Calendar.
 * Automatically refreshes the access token if it is expiring soon and
 * persists the new token to the database.
 */
export async function getGoogleBusyTimes(
  connection: { id: string; accessToken: string; refreshToken: string; expiresAt: Date },
  timeMin: Date,
  timeMax: Date
): Promise<BusyPeriod[]> {
  let { accessToken } = connection;

  // Refresh if the token expires within 5 minutes.
  if (connection.expiresAt.getTime() < Date.now() + 5 * 60_000) {
    const refreshed = await refreshAccessToken(connection.refreshToken);
    await prisma.calendarConnection.update({
      where: { id: connection.id },
      data: { accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt },
    });
    accessToken = refreshed.accessToken;
  }

  const res = await fetch(GOOGLE_FREEBUSY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: 'primary' }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`FreeBusy request failed: ${res.status} ${body}`);
  }

  const data = await res.json() as {
    calendars?: { primary?: { busy?: { start: string; end: string }[] } };
  };

  return (data.calendars?.primary?.busy ?? []).map((b) => ({
    startTime: new Date(b.start),
    endTime: new Date(b.end),
  }));
}
