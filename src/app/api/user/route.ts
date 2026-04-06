import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { validateUsernameInput } from '@/lib/username';

export async function PATCH(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as { timezone?: unknown; username?: unknown };

  const wantsTimezone = body.timezone !== undefined;
  const wantsUsername = body.username !== undefined;

  if (!wantsTimezone && !wantsUsername) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  let timezone: string | undefined;
  if (wantsTimezone) {
    if (typeof body.timezone !== 'string') {
      return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 });
    }
    try {
      Intl.DateTimeFormat(undefined, { timeZone: body.timezone });
    } catch {
      return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 });
    }
    timezone = body.timezone;
  }

  let username: string | undefined;
  if (wantsUsername) {
    if (typeof body.username !== 'string') {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    }
    const parsed = validateUsernameInput(body.username);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    username = parsed.username;
  }

  const user = await prisma.user.findUnique({ where: { auth0Id: session.user.sub } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (username !== undefined && username !== user.username) {
    const taken = await prisma.user.findUnique({ where: { username } });
    if (taken) {
      return NextResponse.json({ error: 'That username is already taken.' }, { status: 409 });
    }
  }

  const data: { timezone?: string; username?: string } = {};
  if (timezone !== undefined) data.timezone = timezone;
  if (username !== undefined && username !== user.username) data.username = username;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ timezone: user.timezone, username: user.username });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: { timezone: true, username: true },
  });

  return NextResponse.json(updated);
}
