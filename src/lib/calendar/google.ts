import { prisma } from '@/lib/prisma';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_FREEBUSY_URL = 'https://www.googleapis.com/calendar/v3/freeBusy';
const GOOGLE_CALENDAR_LIST_URL = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';

const GOOGLE_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

// calendar.events for creating/deleting events; calendar.readonly for FreeBusy queries.
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');

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

type Connection = { id: string; accessToken: string; refreshToken: string; expiresAt: Date };

/** Returns a valid access token, refreshing and persisting it if expiring soon. */
async function ensureFreshToken(connection: Connection): Promise<string> {
  if (connection.expiresAt.getTime() < Date.now() + 5 * 60_000) {
    const refreshed = await refreshAccessToken(connection.refreshToken);
    await prisma.calendarConnection.update({
      where: { id: connection.id },
      data: { accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt },
    });
    return refreshed.accessToken;
  }
  return connection.accessToken;
}

/** Fetches all calendars from the user's Google Calendar list, following pagination. */
async function fetchCalendarList(
  accessToken: string
): Promise<{ id: string; summary: string }[]> {
  const items: { id: string; summary: string }[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(GOOGLE_CALENDAR_LIST_URL);
    url.searchParams.set('showHidden', 'true');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`CalendarList request failed: ${res.status} ${body}`);
    }

    const data = await res.json() as {
      items?: { id: string; summary: string }[];
      nextPageToken?: string;
    };

    for (const cal of data.items ?? []) items.push({ id: cal.id, summary: cal.summary });
    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
}

/** Returns the user's Google Calendar list with id and display name. */
export async function getGoogleCalendarList(
  connection: Connection
): Promise<{ id: string; summary: string }[]> {
  const accessToken = await ensureFreshToken(connection);
  return fetchCalendarList(accessToken);
}

/**
 * Fetches busy times across the user's Google Calendars.
 * If calendarIds is provided and non-empty, only those calendars are queried.
 * Otherwise all calendars are fetched via CalendarList.
 */
export async function getGoogleBusyTimes(
  connection: Connection,
  timeMin: Date,
  timeMax: Date,
  calendarIds?: string[]
): Promise<BusyPeriod[]> {
  const accessToken = await ensureFreshToken(connection);

  let ids: string[];
  if (calendarIds && calendarIds.length > 0) {
    ids = calendarIds;
  } else {
    try {
      ids = (await fetchCalendarList(accessToken)).map((c) => c.id);
    } catch (err) {
      console.error('[calendar] CalendarList fetch failed, falling back to primary:', err);
      ids = ['primary'];
    }
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
      items: ids.map((id) => ({ id })),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`FreeBusy request failed: ${res.status} ${body}`);
  }

  const data = await res.json() as {
    calendars?: Record<string, { busy?: { start: string; end: string }[] }>;
  };

  return Object.values(data.calendars ?? {})
    .flatMap((cal) => cal.busy ?? [])
    .map((b) => ({ startTime: new Date(b.start), endTime: new Date(b.end) }));
}

export type CalendarEventPayload = {
  summary: string;
  description?: string | null;
  startTime: Date;
  endTime: Date;
  guestName: string;
  guestEmail: string;
};

/**
 * Creates an event on the host's primary Google Calendar and returns the event ID.
 */
export async function createGoogleCalendarEvent(
  connection: Connection,
  event: CalendarEventPayload
): Promise<string> {
  const accessToken = await ensureFreshToken(connection);

  const res = await fetch(GOOGLE_EVENTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: event.summary,
      description: event.description ?? undefined,
      start: { dateTime: event.startTime.toISOString() },
      end:   { dateTime: event.endTime.toISOString() },
      attendees: [{ email: event.guestEmail, displayName: event.guestName }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Calendar event creation failed: ${res.status} ${body}`);
  }

  const data = await res.json() as { id: string };
  return data.id;
}

/**
 * Deletes an event from the host's primary Google Calendar by event ID.
 */
export async function deleteGoogleCalendarEvent(
  connection: Connection,
  eventId: string
): Promise<void> {
  const accessToken = await ensureFreshToken(connection);

  const res = await fetch(`${GOOGLE_EVENTS_URL}/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // 404 means already deleted — treat as success.
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`Calendar event deletion failed: ${res.status} ${body}`);
  }
}
