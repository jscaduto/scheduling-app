import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const auth0 = new Auth0Client({
  onCallback: async (error, ctx, session) => {
    const base = process.env.APP_BASE_URL!;

    if (error) {
      console.error('[auth0] callback error:', error);
      return NextResponse.redirect(new URL('/', base));
    }

    if (session) {
      const { sub, email, name } = session.user;

      const existing = await prisma.user.findUnique({ where: { auth0Id: sub } });

      if (!existing) {
        const username = await generateUniqueUsername(email ?? sub);
        await prisma.user.create({
          data: {
            auth0Id: sub,
            email: email ?? sub,
            name: name ?? null,
            username,
          },
        });
      }
    }

    return NextResponse.redirect(new URL(ctx.returnTo ?? '/dashboard', base));
  },
});

async function generateUniqueUsername(emailOrSub: string): Promise<string> {
  const base = emailOrSub
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  let username = base;
  let attempt = 0;

  while (await prisma.user.findUnique({ where: { username } })) {
    attempt++;
    username = `${base}-${attempt}`;
  }

  return username;
}
