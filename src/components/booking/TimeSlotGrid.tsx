'use client';

type Slot = { start: string; end: string };

type Props = {
  date: string; // YYYY-MM-DD
  slots: Slot[];
  onSelect: (slot: Slot) => void;
};

export default function TimeSlotGrid({ date, slots, onSelect }: Props) {
  // Use noon to avoid DST/timezone edge cases when parsing a date-only string.
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-1">{dateLabel}</p>
      <p className="text-xs text-gray-400 mb-3">{timezone}</p>

      {slots.length === 0 ? (
        <p className="text-sm text-gray-400">No times available on this day.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {slots.map((slot) => {
            const label = new Date(slot.start).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            });
            return (
              <button
                key={slot.start}
                onClick={() => onSelect(slot)}
                className="border border-blue-500 text-blue-600 rounded-md py-2 px-3 text-sm font-medium hover:bg-blue-600 hover:text-white transition-colors"
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
