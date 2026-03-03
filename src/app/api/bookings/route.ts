import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAvailableSlots } from '@/lib/availability';
import type { AvailabilitySchedule } from '@/lib/types';
import { withAuth } from '@/lib/with-auth';
import { sendBookingConfirmation } from '@/lib/email';
import { createGoogleCalendarEvent } from '@/lib/calendar/google';

// GET /api/bookings — list the authenticated host's bookings.
export const GET = withAuth(async (_req: NextRequest, session) => {
  const user = await prisma.user.findUnique({ where: { auth0Id: session.user.sub } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    include: { eventType: { select: { title: true, slug: true, duration: true, color: true } } },
    orderBy: { startTime: 'desc' },
  });

  return NextResponse.json(bookings);
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as Record<string, string>;
  const { username, eventSlug, guestName, guestEmail, notes, start, end } = body;

  if (!username || !eventSlug || !guestName || !guestEmail || !start || !end) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const startTime = new Date(start);
  const endTime = new Date(end);

  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    return NextResponse.json({ error: 'Invalid start or end time' }, { status: 400 });
  }

  if (startTime <= new Date()) {
    return NextResponse.json({ error: 'Cannot book a time in the past' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const eventType = await prisma.eventType.findFirst({
    where: { userId: user.id, slug: eventSlug, isActive: true },
  });
  if (!eventType) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Validate the slot has the correct duration.
  if (Math.round((endTime.getTime() - startTime.getTime()) / 60_000) !== eventType.duration) {
    return NextResponse.json({ error: 'Invalid time slot' }, { status: 400 });
  }

  // Validate the slot falls within the host's availability window.
  const slotDate = startTime.toISOString().slice(0, 10);
  const validSlots = generateAvailableSlots({
    fromDate: slotDate,
    toDate: slotDate,
    duration: eventType.duration,
    availability: eventType.availability as unknown as AvailabilitySchedule,
    timezone: user.timezone,
    existingBookings: [],
  });

  const isValidSlot = validSlots.some(
    (s) =>
      Math.abs(s.start.getTime() - startTime.getTime()) < 1000 &&
      Math.abs(s.end.getTime() - endTime.getTime()) < 1000
  );

  if (!isValidSlot) {
    return NextResponse.json({ error: 'This time is outside the host\'s availability' }, { status: 400 });
  }

  // Check for booking conflicts.
  const conflict = await prisma.booking.findFirst({
    where: {
      eventTypeId: eventType.id,
      status: 'CONFIRMED',
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });

  if (conflict) {
    return NextResponse.json(
      { error: 'This time slot is no longer available' },
      { status: 409 }
    );
  }

  const booking = await prisma.booking.create({
    data: {
      eventTypeId: eventType.id,
      userId: user.id,
      guestName,
      guestEmail: guestEmail.toLowerCase().trim(),
      startTime,
      endTime,
      status: 'CONFIRMED',
      notes: notes ?? null,
    },
  });

  // Create Google Calendar event (non-fatal).
  prisma.calendarConnection.findFirst({
    where: { userId: user.id, provider: 'google' },
  }).then((conn) => {
    if (!conn) return;
    return createGoogleCalendarEvent(conn, {
      summary:     `${eventType.title} with ${guestName}`,
      description: notes ?? null,
      startTime:   booking.startTime,
      endTime:     booking.endTime,
      guestName,
      guestEmail:  booking.guestEmail,
    }).then((eventId) =>
      prisma.booking.update({ where: { id: booking.id }, data: { googleEventId: eventId } })
    );
  }).catch((err: unknown) => console.error('[calendar] event creation failed:', err));

  // Send confirmation emails (non-fatal).
  sendBookingConfirmation({
    guestName:  booking.guestName,
    guestEmail: booking.guestEmail,
    hostName:   user.name,
    hostEmail:  user.email,
    eventTitle: eventType.title,
    startTime:  booking.startTime,
    endTime:    booking.endTime,
    duration:   eventType.duration,
    cancelToken: booking.cancelToken,
    username,
    eventSlug,
    notes:      booking.notes,
  }).catch((err: unknown) => console.error('[email] confirmation failed:', err));

  return NextResponse.json(
    {
      id: booking.id,
      cancelToken: booking.cancelToken,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
    },
    { status: 201 }
  );
}
