import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import BookingWidget from '@/components/booking/BookingWidget';

type Props = {
  params: Promise<{ username: string; eventSlug: string }>;
};

export default async function BookingPage({ params }: Props) {
  const { username, eventSlug } = await params;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) notFound();

  const eventType = await prisma.eventType.findFirst({
    where: { userId: user.id, slug: eventSlug, isActive: true },
    include: { location: true },
  });
  if (!eventType) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Color bar */}
          <div className="h-1.5" style={{ backgroundColor: eventType.color }} />

          <div className="p-6 sm:p-8 md:flex md:gap-10">
            {/* Left — event info */}
            <div className="md:w-64 md:shrink-0 mb-8 md:mb-0">
              {user.name && (
                <p className="text-sm text-gray-500 mb-1">{user.name}</p>
              )}
              <h1 className="text-xl font-bold text-gray-900 mb-2">{eventType.title}</h1>

              <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {eventType.duration} minutes
              </div>

              {eventType.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{eventType.description}</p>
              )}

              {eventType.location && (
                <div className="flex items-start gap-1.5 text-sm text-gray-500 mt-4">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {eventType.location.type === 'GOOGLE_MEET' && (
                    <span>Google Meet</span>
                  )}
                  {eventType.location.type === 'IN_PERSON' && (
                    <span>{eventType.location.value ?? 'In Person'}</span>
                  )}
                  {eventType.location.type === 'PHONE_CALL' && (
                    <span>{eventType.location.value ?? 'Phone Call'}</span>
                  )}
                  {eventType.location.type === 'CUSTOM' && (
                    <span>{eventType.location.value ?? 'Custom'}</span>
                  )}
                </div>
              )}
            </div>

            {/* Divider (desktop) */}
            <div className="hidden md:block w-px bg-gray-100 self-stretch" />

            {/* Right — booking widget */}
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Select a date &amp; time</h2>
              <BookingWidget
                username={username}
                eventSlug={eventSlug}
                duration={eventType.duration}
                color={eventType.color}
                locationType={eventType.location?.type ?? null}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
