import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { validateUsernameInput } from '@/lib/username';

export async function PATCH(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as {
    timezone?: unknown;
    username?: unknown;
    showGravatar?: unknown;
    showGravatarProfileCard?: unknown;
    gravatarEmail?: unknown;
    gravatarUsername?: unknown;
  };

  const wantsTimezone = body.timezone !== undefined;
  const wantsUsername = body.username !== undefined;
  const wantsShowGravatar = body.showGravatar !== undefined;
  const wantsShowGravatarProfileCard = body.showGravatarProfileCard !== undefined;
  const wantsGravatarEmail = body.gravatarEmail !== undefined;
  const wantsGravatarUsername = body.gravatarUsername !== undefined;

  if (
    !wantsTimezone &&
    !wantsUsername &&
    !wantsShowGravatar &&
    !wantsShowGravatarProfileCard &&
    !wantsGravatarEmail &&
    !wantsGravatarUsername
  ) {
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

  let showGravatar: boolean | undefined;
  if (wantsShowGravatar) {
    if (typeof body.showGravatar !== 'boolean') {
      return NextResponse.json({ error: 'Invalid showGravatar value' }, { status: 400 });
    }
    showGravatar = body.showGravatar;
  }

  let showGravatarProfileCard: boolean | undefined;
  if (wantsShowGravatarProfileCard) {
    if (typeof body.showGravatarProfileCard !== 'boolean') {
      return NextResponse.json({ error: 'Invalid showGravatarProfileCard value' }, { status: 400 });
    }
    showGravatarProfileCard = body.showGravatarProfileCard;
  }

  let gravatarEmail: string | null | undefined;
  if (wantsGravatarEmail) {
    if (body.gravatarEmail === null || body.gravatarEmail === '') {
      gravatarEmail = null; // allow clearing
    } else if (typeof body.gravatarEmail !== 'string') {
      return NextResponse.json({ error: 'Invalid gravatarEmail value' }, { status: 400 });
    } else {
      const trimmed = body.gravatarEmail.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
      }
      gravatarEmail = trimmed;
    }
  }

  let gravatarUsername: string | null | undefined;
  if (wantsGravatarUsername) {
    if (body.gravatarUsername === null || body.gravatarUsername === '') {
      gravatarUsername = null;
    } else if (typeof body.gravatarUsername !== 'string') {
      return NextResponse.json({ error: 'Invalid gravatarUsername value' }, { status: 400 });
    } else {
      // Accept either a full gravatar.com URL or a bare username and normalise to just the username
      const raw = body.gravatarUsername.trim();
      const fromUrl = raw.match(/^(?:https?:\/\/)?(?:www\.)?gravatar\.com\/([^/?#]+)/i);
      gravatarUsername = fromUrl ? fromUrl[1] : raw;
      if (!/^[a-zA-Z0-9_-]+$/.test(gravatarUsername)) {
        return NextResponse.json({ error: 'Invalid Gravatar username' }, { status: 400 });
      }
    }
  }

  const nextShowGravatar = wantsShowGravatar ? showGravatar! : user.showGravatar;
  let nextProfileCard = wantsShowGravatarProfileCard
    ? showGravatarProfileCard!
    : user.showGravatarProfileCard;
  if (!nextShowGravatar) nextProfileCard = false;

  const data: {
    timezone?: string;
    username?: string;
    showGravatar?: boolean;
    showGravatarProfileCard?: boolean;
    gravatarEmail?: string | null;
    gravatarUsername?: string | null;
  } = {};
  if (timezone !== undefined) data.timezone = timezone;
  if (username !== undefined && username !== user.username) data.username = username;
  if (nextShowGravatar !== user.showGravatar) data.showGravatar = nextShowGravatar;
  if (nextProfileCard !== user.showGravatarProfileCard) data.showGravatarProfileCard = nextProfileCard;
  if (gravatarEmail !== undefined) data.gravatarEmail = gravatarEmail;
  if (gravatarUsername !== undefined) data.gravatarUsername = gravatarUsername;

  const userFields = {
    timezone: user.timezone,
    username: user.username,
    showGravatar: user.showGravatar,
    showGravatarProfileCard: user.showGravatarProfileCard,
    gravatarEmail: user.gravatarEmail,
    gravatarUsername: user.gravatarUsername,
  };

  if (Object.keys(data).length === 0) {
    return NextResponse.json(userFields);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: {
      timezone: true,
      username: true,
      showGravatar: true,
      showGravatarProfileCard: true,
      gravatarEmail: true,
      gravatarUsername: true,
    },
  });

  return NextResponse.json(updated);
}
