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
