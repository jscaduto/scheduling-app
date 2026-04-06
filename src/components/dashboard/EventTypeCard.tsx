'use client';

import type { EventType } from '@prisma/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  eventType: EventType;
  username: string;
};

export default function EventTypeCard({ eventType, username }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${eventType.title}"?`)) return;
    setDeleting(true);
    await fetch(`/api/event-types/${eventType.id}`, { method: 'DELETE' });
    router.refresh();
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(
      `${window.location.origin}/${username}/${eventType.slug}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-1.5 h-10 rounded-full flex-shrink-0"
          style={{ backgroundColor: eventType.color }}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">{eventType.title}</span>
            {!eventType.isActive && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded flex-shrink-0">
                Inactive
              </span>
            )}
            {eventType.isActive && !eventType.isPublic && (
              <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded flex-shrink-0">
                Not on public page
              </span>
            )}
          </div>
          <span className="text-sm text-gray-500">{eventType.duration} min</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        <button
          onClick={handleCopyLink}
          className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-md border border-gray-200 hover:border-gray-300"
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <Link
          href={`/dashboard/event-types/${eventType.id}`}
          className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-md border border-gray-200 hover:border-gray-300"
        >
          Edit
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-red-500 hover:text-red-700 px-3 py-1.5 rounded-md border border-red-200 hover:border-red-300 disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
