import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await auth0.getSession();
  const user = session
    ? await prisma.user.findUnique({ where: { auth0Id: session.user.sub } })
    : null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Welcome back{user?.name ? `, ${user.name}` : ''}
      </h1>
      <p className="text-gray-500 mb-8">Manage your event types and bookings.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/dashboard/event-types"
          className="block p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-400 transition-colors"
        >
          <h2 className="font-semibold text-gray-900 mb-1">Event Types</h2>
          <p className="text-sm text-gray-500">Create and manage your booking pages.</p>
        </Link>

        <Link
          href="/dashboard/bookings"
          className="block p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-400 transition-colors"
        >
          <h2 className="font-semibold text-gray-900 mb-1">Bookings</h2>
          <p className="text-sm text-gray-500">View and manage your upcoming bookings.</p>
        </Link>

        <Link
          href="/dashboard/settings"
          className="block p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-400 transition-colors"
        >
          <h2 className="font-semibold text-gray-900 mb-1">Settings</h2>
          <p className="text-sm text-gray-500">Connect calendars and manage your profile.</p>
        </Link>
      </div>
    </div>
  );
}
