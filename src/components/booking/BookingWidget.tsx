'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CalendarPicker from './CalendarPicker';
import TimeSlotGrid from './TimeSlotGrid';
import BookingForm from './BookingForm';

type Slot = { start: string; end: string };

type Props = {
  username: string;
  eventSlug: string;
  duration: number;
  color: string;
};

export default function BookingWidget({ username, eventSlug, duration, color }: Props) {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  useEffect(() => {
    const today = new Date();
    const from = today.toLocaleDateString('en-CA');
    const to = new Date(today.getTime() + 59 * 86_400_000).toLocaleDateString('en-CA');

    fetch(`/api/availability/${username}/${eventSlug}?from=${from}&to=${to}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load availability');
        return r.json();
      })
      .then((data) => setSlots(data.slots ?? []))
      .catch((err: unknown) =>
        setFetchError(err instanceof Error ? err.message : 'Failed to load availability')
      )
      .finally(() => setLoading(false));
  }, [username, eventSlug]);

  // Group slots by local date (YYYY-MM-DD).
  const slotsByDate: Record<string, Slot[]> = {};
  for (const slot of slots) {
    const key = new Date(slot.start).toLocaleDateString('en-CA');
    (slotsByDate[key] ??= []).push(slot);
  }

  async function handleBook(data: { name: string; email: string; notes: string }) {
    if (!selectedSlot) return;

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        eventSlug,
        guestName: data.name,
        guestEmail: data.email,
        notes: data.notes,
        start: selectedSlot.start,
        end: selectedSlot.end,
      }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(json.error ?? 'Booking failed');
    }

    const booking = await res.json() as { cancelToken: string; locationLink?: string | null };
    const params = new URLSearchParams({
      guestName: data.name,
      start: selectedSlot.start,
      cancelToken: booking.cancelToken,
    });
    if (booking.locationLink) params.set('locationLink', booking.locationLink);
    router.push(`/${username}/${eventSlug}/confirmed?${params}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
        Loading availability…
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="py-8 text-center text-red-500 text-sm">{fetchError}</div>
    );
  }

  // Step 3 — Booking form
  if (selectedDate && selectedSlot) {
    return (
      <div>
        <button
          onClick={() => setSelectedSlot(null)}
          className="mb-4 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back
        </button>
        <BookingForm slot={selectedSlot} duration={duration} onSubmit={handleBook} />
      </div>
    );
  }

  // Step 2 — Time slot picker
  if (selectedDate) {
    return (
      <div>
        <button
          onClick={() => setSelectedDate(null)}
          className="mb-4 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back
        </button>
        <TimeSlotGrid
          date={selectedDate}
          slots={slotsByDate[selectedDate] ?? []}
          onSelect={setSelectedSlot}
        />
      </div>
    );
  }

  // Step 1 — Calendar
  return (
    <div>
      {Object.keys(slotsByDate).length === 0 ? (
        <p className="text-sm text-gray-500 py-4">
          No availability in the next 60 days.
        </p>
      ) : (
        <CalendarPicker slotsByDate={slotsByDate} onSelect={setSelectedDate} />
      )}
      <p className="mt-4 text-xs text-gray-400">
        Times shown in your local timezone
        {color && (
          <span
            className="ml-2 inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
      </p>
    </div>
  );
}
