'use client';

import { useState } from 'react';

type Slot = { start: string; end: string };

type Props = {
  slot: Slot;
  duration: number;
  locationType: string | null;
  onSubmit: (data: { name: string; email: string; phone: string; notes: string }) => Promise<void>;
};

export default function BookingForm({ slot, duration, locationType, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const phoneRequired = locationType === 'PHONE_CALL';

  const slotLabel = new Date(slot.start).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSubmit({ name, email, phone, notes });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
      setLoading(false);
    }
  }

  const inputClass =
    'w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Selected slot summary */}
      <div className="bg-gray-50 rounded-md px-4 py-3 text-sm text-gray-700">
        <p className="font-medium">{slotLabel}</p>
        <p className="text-gray-500">{duration} minutes</p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {error}
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Jane Smith"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="jane@example.com"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone number {phoneRequired ? <span className="text-red-500">*</span> : <span className="text-gray-400">(optional)</span>}
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required={phoneRequired}
          placeholder="+1 (555) 000-0000"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Anything you'd like to share beforehand…"
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Confirming…' : 'Confirm Booking'}
      </button>
    </form>
  );
}
