'use client';

import type { EventType } from '@prisma/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  eventType: EventType;
  username: string;
};

function PublicVisibilityIcon({ isPublic }: { isPublic: boolean }) {
  const label = isPublic
    ? 'Listed on your public booking page'
    : 'Hidden from your public booking page';

  return (
    <span
      className={`inline-flex flex-shrink-0 ${isPublic ? 'text-blue-600' : 'text-amber-600'}`}
      title={label}
      aria-label={label}
    >
      {isPublic ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .53-.051 1.049-.145 1.55"
          />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
      )}
    </span>
  );
}

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
            <PublicVisibilityIcon isPublic={eventType.isPublic} />
            {!eventType.isActive && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded flex-shrink-0">
                Inactive
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
