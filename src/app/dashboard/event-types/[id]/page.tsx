import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import EventTypeForm from '@/components/dashboard/EventTypeForm';

export default async function EditEventTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth0.getSession();

  const user = session
    ? await prisma.user.findUnique({ where: { auth0Id: session.user.sub } })
    : null;

  const eventType = await prisma.eventType.findUnique({ where: { id } });

  if (!eventType || !user || eventType.userId !== user.id) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-6">
        <Link href="/dashboard/event-types" className="text-sm text-gray-500 hover:text-gray-700">
          ← Event Types
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Edit Event Type</h1>
      </div>
      <EventTypeForm eventType={eventType} />
    </div>
  );
}
