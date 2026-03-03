'use client';

import type { AvailabilitySchedule, DaySchedule } from '@/lib/types';

const DAYS = [
  { key: 'monday',    label: 'Monday' },
  { key: 'tuesday',   label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday',  label: 'Thursday' },
  { key: 'friday',    label: 'Friday' },
  { key: 'saturday',  label: 'Saturday' },
  { key: 'sunday',    label: 'Sunday' },
] as const;

type Day = (typeof DAYS)[number]['key'];

function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

type Props = {
  value: AvailabilitySchedule;
  onChange: (schedule: AvailabilitySchedule) => void;
};

export default function AvailabilityBuilder({ value, onChange }: Props) {
  function toggleDay(day: Day, enabled: boolean) {
    const current = value[day];
    const updated: DaySchedule = enabled
      ? {
          enabled: true,
          start: 'start' in current ? current.start : '09:00',
          end: 'end' in current ? current.end : '17:00',
        }
      : { enabled: false };
    onChange({ ...value, [day]: updated });
  }

  function setTime(day: Day, field: 'start' | 'end', time: string) {
    const current = value[day];
    if (!current.enabled) return;
    onChange({ ...value, [day]: { ...current, [field]: time } });
  }

  return (
    <div className="space-y-1">
      {DAYS.map(({ key, label }) => {
        const schedule = value[key];
        return (
          <div
            key={key}
            className="flex items-center gap-4 py-2.5 border-b border-gray-100 last:border-0"
          >
            <div className="flex items-center gap-2 w-36 shrink-0">
              <input
                type="checkbox"
                id={`day-${key}`}
                checked={schedule.enabled}
                onChange={(e) => toggleDay(key, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer"
              />
              <label
                htmlFor={`day-${key}`}
                className={`text-sm font-medium cursor-pointer select-none ${
                  schedule.enabled ? 'text-gray-700' : 'text-gray-400'
                }`}
              >
                {label}
              </label>
            </div>

            {schedule.enabled ? (
              <div className="flex items-center gap-2">
                <select
                  value={schedule.start}
                  onChange={(e) => setTime(key, 'start', e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {formatTime(t)}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-400">–</span>
                <select
                  value={schedule.end}
                  onChange={(e) => setTime(key, 'end', e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TIME_OPTIONS.filter((t) => t > schedule.start).map((t) => (
                    <option key={t} value={t}>
                      {formatTime(t)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-sm text-gray-400">Unavailable</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
