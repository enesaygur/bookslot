import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";
import { computeSlots, type BusyPeriod } from "../lib/slots";
import { parseDate } from "../lib/time";
import { formatLocalTime, isoWeekday } from "../lib/timezone";
import { type AvailabilityQuery } from "../schemas/availabilitySchema";
import { assertMemberInBusiness } from "./memberService";

async function findBusyPeriods(
  memberId: string,
  date: string,
  timeZone: string,
): Promise<BusyPeriod[]> {
  return [];
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

  const onTimeOff = await prisma.timeOff.findFirst({
    where: {
      memberId: query.memberId,
      startDate: { lte: parseDate(query.date) },
      endDate: { gte: parseDate(query.date) },
    },
    select: { id: true },
  });

  const result = { date: query.date, timeZone: business.timezone };
  if (onTimeOff) {
    return { ...result, slots: [] };
  }

  const intervals = await prisma.workingInterval.findMany({
    where: { memberId: query.memberId, dayOfWeek: isoWeekday(query.date) },
    select: { startMinute: true, endMinute: true },
  });

  const busy = await findBusyPeriods(
    query.memberId,
    query.date,
    business.timezone,
  );

  const slots = computeSlots({
    date: query.date,
    timeZone: business.timezone,
    intervals,
    durationMinutes: service.durationMinutes,
    busy,
    now,
  });

  return {
    ...result,
    slots: slots.map((slot) => ({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      localStart: formatLocalTime(slot.start, business.timezone),
    })),
  };
}
