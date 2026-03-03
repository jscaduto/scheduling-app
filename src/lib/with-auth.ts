import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';

type Session = NonNullable<Awaited<ReturnType<typeof auth0.getSession>>>;

type AuthedHandler<TContext = Record<string, unknown>> = (
  req: NextRequest,
  session: Session,
  context: TContext
) => Promise<NextResponse> | NextResponse;

export function withAuth<TContext = Record<string, unknown>>(
  handler: AuthedHandler<TContext>
) {
  return async (req: NextRequest, context: TContext) => {
    const session = await auth0.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return handler(req, session, context);
  };
}
