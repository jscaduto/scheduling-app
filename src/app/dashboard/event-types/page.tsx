import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import EventTypeCard from '@/components/dashboard/EventTypeCard';

export default async function EventTypesPage() {
  const session = await auth0.getSession();
  const user = session
    ? await prisma.user.findUnique({
        where: { auth0Id: session.user.sub },
        include: { eventTypes: { orderBy: { createdAt: 'desc' } } },
      })
    : null;

  const eventTypes = user?.eventTypes ?? [];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Event Types</h1>
        <Link
          href="/dashboard/event-types/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          New Event Type
        </Link>
      </div>

      {eventTypes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="mb-3">No event types yet.</p>
          <Link href="/dashboard/event-types/new" className="text-blue-600 hover:underline text-sm">
            Create your first event type →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {eventTypes.map((et) => (
            <EventTypeCard key={et.id} eventType={et} username={user!.username} />
          ))}
        </div>
      )}
    </div>
  );
}
