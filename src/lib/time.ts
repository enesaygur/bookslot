export function parseTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}: ${String(minutes).padStart(2, "0")}`;
}

export function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isRealDate(value: string): boolean {
  const date = parseDate(value);
  return !Number.isNaN(date.getTime()) && formatDate(date) === value;
}

export function isValidTimeZone(value: string): boolean {
  if (value !== "UTC" && !value.includes("/")) return false;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function canonicalTimeZone(value: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions()
    .timeZone;
}
