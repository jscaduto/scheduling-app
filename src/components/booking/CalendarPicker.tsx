'use client';

import { useState } from 'react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Props = {
  slotsByDate: Record<string, unknown[]>;
  onSelect: (date: string) => void;
};

export default function CalendarPicker({ slotsByDate, onSelect }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday

  const maxDate = new Date(today.getTime() + 60 * 86_400_000);
  const canGoPrev =
    year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth());
  const canGoNext =
    year < maxDate.getFullYear() ||
    (year === maxDate.getFullYear() && month < maxDate.getMonth());

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  return (
    <div className="w-full max-w-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          disabled={!canGoNext}
          className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {/* Empty cells before the 1st */}
        {Array.from({ length: startOffset }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const date = new Date(year, month, day);
          const dateKey = date.toLocaleDateString('en-CA'); // YYYY-MM-DD local
          const isPast = date < today;
          const hasSlots = (slotsByDate[dateKey]?.length ?? 0) > 0;
          const isAvailable = !isPast && hasSlots;

          return (
            <div key={day} className="flex justify-center py-0.5">
              <button
                onClick={() => isAvailable && onSelect(dateKey)}
                disabled={!isAvailable}
                className={`w-9 h-9 rounded-full text-sm font-medium transition-colors
                  ${isAvailable
                    ? 'text-blue-600 hover:bg-blue-600 hover:text-white cursor-pointer'
                    : 'text-gray-300 cursor-default'
                  }`}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
