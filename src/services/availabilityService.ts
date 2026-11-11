import { AppError } from "../errors/AppError";
import { overlappingActive } from "../lib/appointmentWhere";
import { prisma } from "../lib/prisma";
import { computeSlots, Slot, type BusyPeriod } from "../lib/slots";
import { parseDate } from "../lib/time";
import {
  formatLocalTime,
  isoWeekday,
  nextDate,
  zoneToUtc,
} from "../lib/timezone";
import { type AvailabilityQuery } from "../schemas/availabilitySchema";
import { assertMemberInBusiness } from "./memberService";

async function findBusyPeriods(
  memberId: string,
  date: string,
  timeZone: string,
  excludeAppointmentId?: string,
): Promise<BusyPeriod[]> {
  const dayStart = zoneToUtc(date, 0, timeZone);
  const dayEnd = zoneToUtc(nextDate(date), 0, timeZone);

  const rows = await prisma.appointment.findMany({
    where: overlappingActive(memberId, dayStart, dayEnd, excludeAppointmentId),
    select: { startsAt: true, endsAt: true },
  });

  return rows.map((row) => ({
    start: row.startsAt,
    end: row.endsAt,
  }));
}

type DayAvailabilityInput = {
  memberId: string;
  date: string;
  durationMinutes: number;
  timeZone: string;
  now: Date;
  excludeAppointmentId?: string;
};

export async function computeDayAvailability(
  input: DayAvailabilityInput,
): Promise<Slot[]> {
  const {
    memberId,
    date,
    durationMinutes,
    timeZone,
    now,
    excludeAppointmentId,
  } = input;

  const onTimeOff = await prisma.timeOff.findFirst({
    where: {
      memberId,
      startDate: { lte: parseDate(date) },
      endDate: { gte: parseDate(date) },
    },
    select: { id: true },
  });
  if (onTimeOff) return [];

  const intervals = await prisma.workingInterval.findMany({
    where: { memberId, dayOfWeek: isoWeekday(date) },
    select: { startMinute: true, endMinute: true },
  });

  const busy = await findBusyPeriods(
    memberId,
    date,
    timeZone,
    excludeAppointmentId,
  );

  return computeSlots({
    date,
    timeZone,
    intervals,
    durationMinutes,
    busy,
    now,
  });
}

export async function getAvailability(
  businessId: string,
  query: AvailabilityQuery,
  now: Date = new Date(),
) {
  await assertMemberInBusiness(businessId, query.memberId);

  const service = await prisma.service.findFirst({
    where: { id: query.serviceId, businessId, isActive: true },
    select: { durationMinutes: true },
  });

  if (!service) {
    throw new AppError(404, "Service not found", "NOT_FOUND");
  }

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    select: { timezone: true },
  });

  const slots = await computeDayAvailability({
    memberId: query.memberId,
    date: query.date,
    durationMinutes: service.durationMinutes,
    timeZone: business.timezone,
    now,
  });

  return {
    date: query.date,
    timeZone: business.timezone,
    slots: slots.map((slot) => ({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      localStart: formatLocalTime(slot.start, business.timezone),
    })),
  };
}
