import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return { title: 'Not found' };

  const display = user.name ?? username;
  return {
    title: `Schedule with ${display}`,
    description: `Book a time with ${display}.`,
  };
}

export default async function PublicSchedulingPage({ params }: Props) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      eventTypes: {
        where: { isActive: true, isPublic: true },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          duration: true,
          description: true,
          color: true,
        },
      },
    },
  });

  if (!user) notFound();

  const heading = user.name ?? username;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
        <header className="mb-8 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-gray-900">{heading}</h1>
          <p className="mt-1 text-sm text-gray-500">Select an event type to book a time.</p>
        </header>

        {user.eventTypes.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center text-sm text-gray-500">
            No public events are available right now.
          </div>
        ) : (
          <ul className="space-y-3">
            {user.eventTypes.map((et) => (
              <li key={et.id}>
                <Link
                  href={`/${username}/${et.slug}`}
                  className="block bg-white rounded-xl border border-gray-200 shadow-sm hover:border-gray-300 hover:shadow transition overflow-hidden group"
                >
                  <div className="h-1" style={{ backgroundColor: et.color }} />
                  <div className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                        {et.title}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">{et.duration} minutes</p>
                      {et.description && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{et.description}</p>
                      )}
                    </div>
                    <span className="text-sm font-medium text-blue-600 shrink-0 pt-0.5 group-hover:text-blue-700">
                      Book →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
