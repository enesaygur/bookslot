import { DateTime } from "luxon";

export function zoneToUtc(
  date: string,
  minutesFromMidnight: number,
  timeZone: string,
): Date {
  const [year, month, day] = date.split("-").map(Number);

  return DateTime.fromObject(
    {
      year,
      month,
      day,
      hour: Math.floor(minutesFromMidnight / 60),
      minute: minutesFromMidnight % 60,
    },
    {
      zone: timeZone,
    },
  )
    .toUTC()
    .toJSDate();
}

export function isoWeekday(date: string): number {
  return DateTime.fromISO(date, { zone: "UTC" }).weekday;
}

export function formatLocalTime(date: Date, timeZone: string): string {
  return DateTime.fromJSDate(date, { zone: timeZone }).toFormat("HH:mm");
}

function isoDateOrThrow(value: DateTime): string {
  const result = value.toISODate();
  if (!result) throw new Error("Invalid date");
  return result;
}

export function toLocalDate(date: Date, timeZone: string): string {
  return isoDateOrThrow(DateTime.fromJSDate(date, { zone: timeZone }));
}

export function nextDate(date: string): string {
  return isoDateOrThrow(
    DateTime.fromISO(date, { zone: "UTC" }).plus({ days: 1 }),
  );
}
