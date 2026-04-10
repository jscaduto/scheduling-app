'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  current: boolean;
  /** When false, the control is disabled (turn on "Show on booking page" first). */
  bookingGravatarEnabled: boolean;
};

/** Parent should pass `key` when server-driven flags change so local toggle state resets (e.g. after `router.refresh()`). */
export default function GravatarProfileCardToggle({ current, bookingGravatarEnabled }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (!bookingGravatarEnabled || saving) return;
    const next = !enabled;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showGravatarProfileCard: next }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to save');
      }
      setEnabled(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const disabled = !bookingGravatarEnabled || saving;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-disabled={!bookingGravatarEnabled}
          disabled={disabled}
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
            bookingGravatarEnabled ? 'cursor-pointer' : 'cursor-not-allowed'
          } ${enabled && bookingGravatarEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
              enabled && bookingGravatarEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <span className={`text-sm ${bookingGravatarEnabled ? 'text-gray-700' : 'text-gray-400'}`}>
          {!bookingGravatarEnabled
            ? '—'
            : enabled
              ? 'Full profile card is shown'
              : 'Only your Gravatar avatar is shown'}
        </span>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
      {!bookingGravatarEnabled && (
        <p className="text-xs text-gray-400">Turn on &quot;Show on booking page&quot; to enable this option.</p>
      )}
    </div>
  );
}
