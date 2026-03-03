import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';

type Context = { params: Promise<{ id: string }> };

// Host cancels a booking from their dashboard (requires auth, must own the booking).
export const DELETE = withAuth<Context>(async (_req: NextRequest, session, { params }) => {
  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { auth0Id: session.user.sub } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const booking = await prisma.booking.findUnique({ where: { id } });

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

  return NextResponse.json({ success: true });
});
