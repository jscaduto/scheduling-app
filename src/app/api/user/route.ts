import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { timezone?: unknown };
  const { timezone } = body;

  if (!timezone || typeof timezone !== 'string') {
    return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 });
  }

  // Validate that the timezone string is a real IANA zone.
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch {
    return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { auth0Id: session.user.sub } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { timezone },
  });

  return NextResponse.json({ timezone: updated.timezone });
}
