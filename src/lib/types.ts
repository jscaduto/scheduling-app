export type DaySchedule =
  | { enabled: true; start: string; end: string }
  | { enabled: false };

export type AvailabilitySchedule = {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
};

export const DEFAULT_AVAILABILITY: AvailabilitySchedule = {
  monday:    { enabled: true,  start: '09:00', end: '17:00' },
  tuesday:   { enabled: true,  start: '09:00', end: '17:00' },
  wednesday: { enabled: true,  start: '09:00', end: '17:00' },
  thursday:  { enabled: true,  start: '09:00', end: '17:00' },
  friday:    { enabled: true,  start: '09:00', end: '17:00' },
  saturday:  { enabled: false },
  sunday:    { enabled: false },
};
