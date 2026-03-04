import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
import { sendBookingCancellation } from '@/lib/email';
import { deleteGoogleCalendarEvent } from '@/lib/calendar/google';
import type { CalendarConnection } from '@prisma/client';

type Context = { params: Promise<{ id: string }> };

// Host cancels a booking from their dashboard (requires auth, must own the booking).
export const DELETE = withAuth<Context>(async (_req: NextRequest, session, { params }) => {
  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { auth0Id: session.user.sub } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { eventType: { select: { title: true } } },
  });

  if (!booking || booking.userId !== user.id) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (booking.status === 'CANCELLED') {
    return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 409 });
  }

  await prisma.booking.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  // Delete Google Calendar event (non-fatal).
  if (booking.googleEventId) {
    prisma.calendarConnection.findFirst({
      where: { userId: user.id, provider: 'google' },
    }).then((conn: CalendarConnection | null) => {
      if (!conn || !booking.googleEventId) return;
      return deleteGoogleCalendarEvent(conn, booking.googleEventId);
    }).catch((err: unknown) => console.error('[calendar] event deletion failed:', err));
  }

  // Send cancellation emails (non-fatal).
  sendBookingCancellation({
    guestName:  booking.guestName,
    guestEmail: booking.guestEmail,
    hostName:   user.name,
    hostEmail:  user.email,
    eventTitle: booking.eventType.title,
    startTime:  booking.startTime,
  }).catch((err: unknown) => console.error('[email] cancellation failed:', err));

  return NextResponse.json({ success: true });
});
