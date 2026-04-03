import type { AvailabilitySchedule } from './types';

export type TimeSlot = {
  start: Date;
  end: Date;
};

const DAY_KEYS: Record<number, keyof AvailabilitySchedule> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

/**
 * Returns the day-of-week key for a UTC Date as seen in the given IANA timezone.
 */
function getDayOfWeek(date: Date, timezone: string): keyof AvailabilitySchedule {
  const short = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(date);
  const index = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(short);
  return DAY_KEYS[index] ?? 'monday';
}

/**
 * Converts a local date+time (e.g. "2026-03-02", "09:00") in the given IANA
 * timezone to a UTC Date. Uses the toLocaleString offset-calculation trick,
 * which is accurate for all standard IANA zones including DST.
 */
function localToUTC(dateStr: string, timeStr: string, timezone: string): Date {
  // Treat the local time as if it were UTC to get a naive anchor.
  const naive = new Date(`${dateStr}T${timeStr}:00Z`);
  // Measure how far the naive UTC timestamp is from the local representation.
  const localMs = new Date(naive.toLocaleString('en-US', { timeZone: timezone })).getTime();
  const utcMs = new Date(naive.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
  return new Date(naive.getTime() + (utcMs - localMs));
}

/**
 * Generate all available time slots between fromDate and toDate (YYYY-MM-DD,
 * inclusive) for an event type, excluding slots that are in the past or
 * overlap with an existing CONFIRMED booking.
 *
 * All dates are interpreted in the host's timezone.
 * Returned slots have UTC start/end timestamps.
 */
export function generateAvailableSlots({
  fromDate,
  toDate,
  duration,
  slotIncrement = 0,
  availability,
  timezone,
  existingBookings,
}: {
  fromDate: string;
  toDate: string;
  duration: number; // minutes
  slotIncrement?: number; // minutes between slot start times; 0 = same as duration
  availability: AvailabilitySchedule;
  timezone: string;
  existingBookings: Array<{ startTime: Date; endTime: Date }>;
}): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const now = new Date();
  // Step between consecutive slot start times.
  const stepMs = (slotIncrement > 0 ? slotIncrement : duration) * 60_000;

  const cursor = new Date(`${fromDate}T00:00:00Z`);
  const end = new Date(`${toDate}T00:00:00Z`);

  while (cursor <= end) {
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(cursor);
    const daySchedule = availability[getDayOfWeek(cursor, timezone)];

    if (daySchedule.enabled) {
      const windowEnd = localToUTC(dateStr, daySchedule.end, timezone);
      const durationMs = duration * 60_000;
      let slotStart = localToUTC(dateStr, daySchedule.start, timezone);

      while (slotStart.getTime() + durationMs <= windowEnd.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + durationMs);

        const isPast = slotStart <= now;
        const hasConflict = existingBookings.some(
          (b) => slotStart < b.endTime && slotEnd > b.startTime
        );

        if (!isPast && !hasConflict) {
          slots.push({ start: new Date(slotStart), end: slotEnd });
        }

        slotStart = new Date(slotStart.getTime() + stepMs);
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return slots;
}
