import { zoneToUtc } from "./timezone";

export type MinuteInterval = { startMinute: number; endMinute: number };
export type BusyPeriod = { start: Date; end: Date };
export type Slot = { start: Date; end: Date };

export type SlotInput = {
  date: string;
  timeZone: string;
  intervals: MinuteInterval[];
  durationMinutes: number;
  busy: BusyPeriod[];
  now: Date;
  stepMinutes?: number;
};

const MS_PER_MINUTE = 60_000;

export function computeSlots(input: SlotInput): Slot[] {
  const {
    date,
    timeZone,
    intervals,
    durationMinutes,
    busy,
    now,
    stepMinutes = 15,
  } = input;
  const slots: Slot[] = [];

  for (const interval of intervals) {
    const firstStart =
      Math.ceil(interval.startMinute / stepMinutes) * stepMinutes;

    for (
      let minute = firstStart;
      minute + durationMinutes <= interval.endMinute;
      minute += stepMinutes
    ) {
      const start = zoneToUtc(date, minute, timeZone);
      const end = new Date(start.getTime() + durationMinutes * MS_PER_MINUTE);

      if (start <= now) continue;
      if (busy.some((period) => period.start < end && period.end > start))
        continue;

      slots.push({ start, end });
    }
  }

  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}
