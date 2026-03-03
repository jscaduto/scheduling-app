'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = { bookingId: string };

export default function BookingCancelButton({ bookingId }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCancel() {
    setLoading(true);
    setError('');

    const res = await fetch(`/api/bookings/${bookingId}`, { method: 'DELETE' });

    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? 'Failed to cancel');
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="text-xs px-2.5 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Keep
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="text-xs px-2.5 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? '…' : 'Cancel'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="shrink-0 text-xs text-gray-400 hover:text-red-500 transition-colors"
    >
      Cancel
    </button>
  );
}
