import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';

type Context = { params: Promise<{ id: string }> };

export const PATCH = withAuth<Context>(async (req: NextRequest, session, { params }) => {
  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { auth0Id: session.user.sub } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const eventType = await prisma.eventType.findUnique({ where: { id }, include: { location: true } });
  if (!eventType) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (eventType.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { title, slug, duration, slotIncrement, description, color, isActive, isPublic, availability, location } = body;

  const updated = await prisma.eventType.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(slug !== undefined && { slug }),
      ...(duration !== undefined && { duration: Number(duration) }),
      ...(slotIncrement !== undefined && { slotIncrement: Number(slotIncrement) }),
      ...(description !== undefined && { description }),
      ...(color !== undefined && { color }),
      ...(isActive !== undefined && { isActive }),
      ...(isPublic !== undefined && { isPublic }),
      ...(availability !== undefined && { availability }),
      ...(location !== undefined && location !== null && {
        location: {
          upsert: {
            create: { type: location.type, value: location.value ?? null },
            update: { type: location.type, value: location.value ?? null },
          },
        },
      }),
      ...(location === null && eventType.location && {
        location: { delete: true },
      }),
    },
    include: { location: true },
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
