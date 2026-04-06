import EventTypeForm from '@/components/dashboard/EventTypeForm';
import Link from 'next/link';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';

export default async function NewEventTypePage() {
  const session = await auth0.getSession();
  const user = session
    ? await prisma.user.findUnique({ where: { auth0Id: session.user.sub } })
    : null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-6">
        <Link href="/dashboard/event-types" className="text-sm text-gray-500 hover:text-gray-700">
          ← Event Types
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">New Event Type</h1>
      </div>
      <EventTypeForm username={user?.username} />
    </div>
  );
}
