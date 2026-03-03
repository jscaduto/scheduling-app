import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';

type Context = { params: Promise<{ id: string }> };

export const PATCH = withAuth<Context>(async (req: NextRequest, session, { params }) => {
  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { auth0Id: session.user.sub } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const eventType = await prisma.eventType.findUnique({ where: { id } });
  if (!eventType) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (eventType.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { title, slug, duration, description, color, isActive, availability } = body;

  const updated = await prisma.eventType.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(slug !== undefined && { slug }),
      ...(duration !== undefined && { duration: Number(duration) }),
      ...(description !== undefined && { description }),
      ...(color !== undefined && { color }),
      ...(isActive !== undefined && { isActive }),
      ...(availability !== undefined && { availability }),
    },
  });

  return NextResponse.json(updated);
});

export const DELETE = withAuth<Context>(async (_req: NextRequest, session, { params }) => {
  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { auth0Id: session.user.sub } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const eventType = await prisma.eventType.findUnique({ where: { id } });
  if (!eventType) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (eventType.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.eventType.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
});
