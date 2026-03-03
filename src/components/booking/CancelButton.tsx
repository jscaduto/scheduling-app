'use client';

import { useState } from 'react';

type Props = { token: string };

export default function CancelButton({ token }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleCancel() {
    setLoading(true);
    setError('');

    const res = await fetch(`/api/bookings/cancel?token=${token}`, { method: 'DELETE' });

    if (res.ok) {
      setDone(true);
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? 'Failed to cancel booking');
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p className="text-gray-700 font-medium">Booking cancelled</p>
        <p className="text-sm text-gray-400 mt-1">You&apos;re all set.</p>
      </div>
    );
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="w-full border border-red-300 text-red-600 rounded-md py-2.5 text-sm font-medium hover:bg-red-50 transition-colors"
      >
        Cancel this booking
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 text-center">Are you sure you want to cancel?</p>
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="flex-1 border border-gray-300 text-gray-600 rounded-md py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          Keep it
        </button>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="flex-1 bg-red-600 text-white rounded-md py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Cancelling…' : 'Yes, cancel'}
        </button>
      </div>
    </div>
  );
}
