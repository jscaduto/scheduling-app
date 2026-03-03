import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAvailableSlots } from '@/lib/availability';
import type { AvailabilitySchedule } from '@/lib/types';

const MAX_DAYS = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; slug: string }> }
) {
  const { username, slug } = await params;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json(
      { error: '"from" and "to" query params are required (YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json(
      { error: '"from" and "to" must be in YYYY-MM-DD format' },
      { status: 400 }
    );
  }

  if (from > to) {
    return NextResponse.json(
      { error: '"from" must be on or before "to"' },
      { status: 400 }
    );
  }

  const diffDays =
    (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) /
    86_400_000;

  if (diffDays > MAX_DAYS) {
    return NextResponse.json(
      { error: `Date range cannot exceed ${MAX_DAYS} days` },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const eventType = await prisma.eventType.findFirst({
    where: { userId: user.id, slug, isActive: true },
  });
  if (!eventType) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Fetch all CONFIRMED bookings that overlap the requested date range.
  const existingBookings = await prisma.booking.findMany({
    where: {
      eventTypeId: eventType.id,
      status: 'CONFIRMED',
      startTime: { lt: new Date(`${to}T23:59:59.999Z`) },
      endTime:   { gt: new Date(`${from}T00:00:00Z`) },
    },
    select: { startTime: true, endTime: true },
  });

  const slots = generateAvailableSlots({
    fromDate: from,
    toDate: to,
    duration: eventType.duration,
    availability: eventType.availability as unknown as AvailabilitySchedule,
    timezone: user.timezone,
    existingBookings,
  });

  return NextResponse.json({
    eventType: {
      title:       eventType.title,
      slug:        eventType.slug,
      duration:    eventType.duration,
      description: eventType.description,
      color:       eventType.color,
    },
    host: {
      name:     user.name,
      timezone: user.timezone,
    },
    slots: slots.map((s) => ({
      start: s.start.toISOString(),
      end:   s.end.toISOString(),
    })),
  });
}
