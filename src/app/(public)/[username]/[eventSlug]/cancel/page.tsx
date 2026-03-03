import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import CancelButton from '@/components/booking/CancelButton';

type Props = {
  params: Promise<{ username: string; eventSlug: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function CancelPage({ params, searchParams }: Props) {
  const { username, eventSlug } = await params;
  const { token } = await searchParams;

  if (!token) notFound();

  const booking = await prisma.booking.findUnique({
    where: { cancelToken: token },
    include: { eventType: true },
  });

  if (!booking) notFound();

  if (booking.status === 'CANCELLED') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <p className="text-gray-500 mb-4">This booking has already been cancelled.</p>
          <Link
            href={`/${username}/${eventSlug}`}
            className="text-sm text-blue-600 hover:underline"
          >
            Book a new time
          </Link>
        </div>
      </div>
    );
  }

  const startDate = booking.startTime;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Cancel booking</h1>
        <p className="text-sm text-gray-500 mb-6">
          This action cannot be undone.
        </p>

        {/* Booking summary */}
        <div className="bg-gray-50 rounded-lg px-4 py-4 mb-6 text-sm">
          <p className="font-medium text-gray-800">{booking.eventType.title}</p>
          <p className="text-gray-500 mt-1">
            {startDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <p className="text-gray-500">
            {startDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
            {' '}·{' '}
            {booking.eventType.duration} min
          </p>
          {booking.guestName && (
            <p className="text-gray-500 mt-1">{booking.guestName}</p>
          )}
        </div>

        <CancelButton token={token} />

        <div className="mt-4 text-center">
          <Link
            href={`/${username}/${eventSlug}`}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Keep my booking
          </Link>
        </div>
      </div>
    </div>
  );
}
