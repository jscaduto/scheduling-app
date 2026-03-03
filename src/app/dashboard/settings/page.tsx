import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CalendarDisconnectButton from '@/components/dashboard/CalendarDisconnectButton';
import TimezoneSelect from '@/components/dashboard/TimezoneSelect';

type Props = {
  searchParams: Promise<{ connected?: string; error?: string }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  calendar_denied:        'Google Calendar access was denied.',
  invalid_state:          'Security check failed. Please try again.',
  missing_code:           'No authorization code received. Please try again.',
  exchange_failed:        'Failed to connect Google Calendar. Please try again.',
  google_not_configured:  'Google OAuth credentials are not set. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local.',
};

export default async function SettingsPage({ searchParams }: Props) {
  const session = await auth0.getSession();
  if (!session) redirect('/auth/login');

  const user = await prisma.user.findUnique({
    where: { auth0Id: session.user.sub },
    include: { calendarConns: true },
  });
  if (!user) redirect('/auth/login');

  const { connected, error } = await searchParams;
  const googleConn = user.calendarConns.find((c) => c.provider === 'google');

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>

      {/* Calendar connections */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Calendar connections</h2>
        <p className="text-sm text-gray-500 mb-5">
          Connect your calendar so busy times are automatically excluded from your availability.
        </p>

        {connected === 'google' && (
          <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-4 py-3">
            Google Calendar connected successfully.
          </div>
        )}
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
            {ERROR_MESSAGES[error] ?? 'An unexpected error occurred.'}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Google "G" badge */}
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
              G
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Google Calendar</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {googleConn
                  ? 'Connected — busy times synced automatically'
                  : 'Not connected'}
              </p>
            </div>
          </div>

          {googleConn ? (
            <CalendarDisconnectButton provider="google" />
          ) : (
            <Link
              href="/api/calendar/connect?provider=google"
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Connect
            </Link>
          )}
        </div>
      </section>

      {/* Profile */}
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Profile</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex gap-3">
            <dt className="w-24 text-gray-500 shrink-0">Username</dt>
            <dd className="font-mono text-gray-800">{user.username}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 text-gray-500 shrink-0">Email</dt>
            <dd className="text-gray-800">{user.email}</dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="w-24 text-gray-500 shrink-0">Timezone</dt>
            <dd><TimezoneSelect current={user.timezone} /></dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
