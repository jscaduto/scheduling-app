import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Cancel token is required' }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({ where: { cancelToken: token } });

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

  return NextResponse.json({ success: true });
}
