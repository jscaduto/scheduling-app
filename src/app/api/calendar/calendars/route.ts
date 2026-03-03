import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
import { getGoogleCalendarList } from '@/lib/calendar/google';

// GET /api/calendar/calendars
// Returns the user's Google calendar list and their current selection.
export const GET = withAuth(async (_req: NextRequest, session) => {
  const user = await prisma.user.findUnique({ where: { auth0Id: session.user.sub } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const conn = await prisma.calendarConnection.findFirst({
    where: { userId: user.id, provider: 'google' },
  });
  if (!conn) return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 404 });

  try {
    const calendars = await getGoogleCalendarList(conn);
    return NextResponse.json({ calendars, selectedIds: conn.selectedCalendarIds });
  } catch (err) {
    console.error('[calendar/calendars] list fetch failed:', err);
    return NextResponse.json({ error: 'Failed to fetch calendars' }, { status: 502 });
  }
});

// PATCH /api/calendar/calendars
// Updates which calendar IDs are used for busy-time checks.
export const PATCH = withAuth(async (req: NextRequest, session) => {
  const user = await prisma.user.findUnique({ where: { auth0Id: session.user.sub } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await req.json().catch(() => ({})) as { selectedIds?: unknown };
  if (!Array.isArray(body.selectedIds) || !body.selectedIds.every((x) => typeof x === 'string')) {
    return NextResponse.json({ error: 'selectedIds must be an array of strings' }, { status: 400 });
  }

  const conn = await prisma.calendarConnection.findFirst({
    where: { userId: user.id, provider: 'google' },
  });
  if (!conn) return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 404 });

  await prisma.calendarConnection.update({
    where: { id: conn.id },
    data: { selectedCalendarIds: body.selectedIds as string[] },
  });

  return NextResponse.json({ success: true });
});
