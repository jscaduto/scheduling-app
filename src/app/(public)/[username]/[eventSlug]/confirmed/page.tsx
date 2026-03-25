import Link from 'next/link';

type Props = {
  params: Promise<{ username: string; eventSlug: string }>;
  searchParams: Promise<{
    guestName?: string;
    start?: string;
    cancelToken?: string;
    locationLink?: string;
    tz?: string;
  }>;
};

export default async function ConfirmedPage({ params, searchParams }: Props) {
  const { username, eventSlug } = await params;
  const { guestName, start, cancelToken, locationLink, tz } = await searchParams;

  const startDate = start ? new Date(start) : null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
        {/* Check icon */}
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg
            className="w-7 h-7 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re booked!</h1>

        {guestName && (
          <p className="text-gray-500 mb-4">
            A confirmation has been sent to you, {guestName}.
          </p>
        )}

        {startDate && (
          <div className="bg-gray-50 rounded-lg px-4 py-3 mb-6 text-sm text-gray-700">
            <p className="font-medium">
              {startDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                ...(tz ? { timeZone: tz } : {}),
              })}
            </p>
            <p className="text-gray-500 mt-0.5">
              {startDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                timeZoneName: 'short',
                ...(tz ? { timeZone: tz } : {}),
              })}
            </p>
          </div>
        )}

        {locationLink && (
          <div className="mb-5">
            <a
              href={locationLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 3H4a1 1 0 00-1 1v16a1 1 0 001 1h16a1 1 0 001-1V4a1 1 0 00-1-1zm-9 14H7v-2h4v2zm6-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
              Join with Google Meet
            </a>
          </div>
        )}

        {cancelToken && (
          <div className="border-t border-gray-100 pt-5 mb-5">
            <p className="text-xs text-gray-400 mb-2">Need to reschedule?</p>
            <Link
              href={`/${username}/${eventSlug}/cancel?token=${cancelToken}${tz ? `&tz=${encodeURIComponent(tz)}` : ''}`}
              className="text-sm text-red-500 hover:text-red-600 hover:underline"
            >
              Cancel this booking
            </Link>
          </div>
        )}

        <Link
          href={`/${username}/${eventSlug}`}
          className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
        >
          Book another time
        </Link>
      </div>
    </div>
  );
}
