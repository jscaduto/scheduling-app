import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendBookingCancellation } from '@/lib/email';

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
