import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendBookingCancellation } from '@/lib/email';
import { deleteGoogleCalendarEvent } from '@/lib/calendar/google';

export async function DELETE(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Cancel token is required' }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { cancelToken: token },
    include: {
      eventType: { select: { title: true } },
      user:      { select: { name: true, email: true } },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (booking.status === 'CANCELLED') {
    return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 409 });
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: 'CANCELLED' },
  });

  // Delete Google Calendar event (non-fatal).
  if (booking.googleEventId) {
    prisma.calendarConnection.findFirst({
      where: { userId: booking.userId, provider: 'google' },
    }).then((conn) => {
      if (!conn || !booking.googleEventId) return;
      return deleteGoogleCalendarEvent(conn, booking.googleEventId);
    }).catch((err: unknown) => console.error('[calendar] event deletion failed:', err));
  }

  // Send cancellation emails (non-fatal).
  sendBookingCancellation({
    guestName:  booking.guestName,
    guestEmail: booking.guestEmail,
    hostName:   booking.user.name,
    hostEmail:  booking.user.email,
    eventTitle: booking.eventType.title,
    startTime:  booking.startTime,
  }).catch((err: unknown) => console.error('[email] cancellation failed:', err));

  return NextResponse.json({ success: true });
}
