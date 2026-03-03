import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import BookingCancelButton from '@/components/dashboard/BookingCancelButton';

export default async function BookingsPage() {
  const session = await auth0.getSession();
  if (!session) redirect('/auth/login');

  const user = await prisma.user.findUnique({ where: { auth0Id: session.user.sub } });
  if (!user) redirect('/auth/login');

  const now = new Date();

  const [upcoming, past] = await Promise.all([
    prisma.booking.findMany({
      where: { userId: user.id, status: 'CONFIRMED', startTime: { gte: now } },
      include: { eventType: { select: { title: true, color: true, duration: true } } },
      orderBy: { startTime: 'asc' },
    }),
    prisma.booking.findMany({
      where: { userId: user.id, startTime: { lt: now } },
      include: { eventType: { select: { title: true, color: true, duration: true } } },
      orderBy: { startTime: 'desc' },
      take: 30,
    }),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Bookings</h1>

      <section className="mb-10">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Upcoming ({upcoming.length})
        </h2>

        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">No upcoming bookings.</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((b) => (
              <div
                key={b.id}
                className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-4"
              >
                <div
                  className="w-1 self-stretch rounded-full shrink-0"
                  style={{ backgroundColor: b.eventType.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{b.eventType.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {b.startTime.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {' · '}
                    {b.startTime.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    {' · '}
                    {b.eventType.duration} min
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {b.guestName}{' '}
                    <span className="text-gray-400">&lt;{b.guestEmail}&gt;</span>
                  </p>
                  {b.notes && (
                    <p className="text-xs text-gray-400 mt-1 italic">&ldquo;{b.notes}&rdquo;</p>
                  )}
                </div>
                <BookingCancelButton bookingId={b.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Past ({past.length})
        </h2>

        {past.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">No past bookings.</p>
        ) : (
          <div className="space-y-3">
            {past.map((b) => (
              <div
                key={b.id}
                className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-4 opacity-70"
              >
                <div
                  className="w-1 self-stretch rounded-full shrink-0"
                  style={{ backgroundColor: b.eventType.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{b.eventType.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {b.startTime.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {' · '}
                    {b.startTime.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    {' · '}
                    {b.eventType.duration} min
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {b.guestName}{' '}
                    <span className="text-gray-400">&lt;{b.guestEmail}&gt;</span>
                  </p>
                  <span
                    className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium
                      ${b.status === 'CANCELLED'
                        ? 'bg-red-50 text-red-500'
                        : 'bg-gray-100 text-gray-500'
                      }`}
                  >
                    {b.status === 'CANCELLED' ? 'Cancelled' : 'Completed'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
