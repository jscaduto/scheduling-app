import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
import { DEFAULT_AVAILABILITY } from '@/lib/types';

export const GET = withAuth(async (_req: NextRequest, session) => {
  const user = await prisma.user.findUnique({ where: { auth0Id: session.user.sub } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const eventTypes = await prisma.eventType.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(eventTypes);
});

export const POST = withAuth(async (req: NextRequest, session) => {
  const user = await prisma.user.findUnique({ where: { auth0Id: session.user.sub } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await req.json();
  const { title, slug, duration, description, color, availability } = body;

  if (!title || !slug || !duration) {
    return NextResponse.json(
      { error: 'title, slug, and duration are required' },
      { status: 400 }
    );
  }

  const eventType = await prisma.eventType.create({
    data: {
      userId: user.id,
      title,
      slug,
      duration: Number(duration),
      description: description ?? null,
      color: color ?? '#0070f3',
      availability: availability ?? DEFAULT_AVAILABILITY,
    },
  });

  return NextResponse.json(eventType, { status: 201 });
});
