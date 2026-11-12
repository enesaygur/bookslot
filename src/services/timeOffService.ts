import { assertMemberInBusiness } from "./memberService";
import { prisma } from "../lib/prisma";
import { formatDate, parseDate } from "../lib/time";
import { createTimeOffInput } from "../schemas/timeOffSchema";
import { AppError } from "../errors/AppError";
import { overlappingActive } from "../lib/appointmentWhere";
import { nextDate, zoneToUtc } from "../lib/timezone";

const timeOffSelect = {
  id: true,
  startDate: true,
  endDate: true,
  reason: true,
} as const;

function toDto(row: {
  id: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
}) {
  return {
    id: row.id,
    startDate: formatDate(row.startDate),
    endDate: formatDate(row.endDate),
    reason: row.reason,
  };
}

export async function findTimeOff(businessId: string, memberId: string) {
  await assertMemberInBusiness(businessId, memberId);

  const rows = await prisma.timeOff.findMany({
    where: { memberId },
    select: timeOffSelect,
    orderBy: { startDate: "asc" },
  });
  return rows.map(toDto);
}

export async function addTimeOff(
  businessId: string,
  memberId: string,
  input: createTimeOffInput,
) {
  await assertMemberInBusiness(businessId, memberId);

  const row = await prisma.timeOff.create({
    data: {
      memberId,
      startDate: parseDate(input.startDate),
      endDate: parseDate(input.endDate),
      reason: input.reason,
    },
    select: timeOffSelect,
  });

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    select: { timezone: true },
  });

  const conflicts = await prisma.appointment.findMany({
    where: overlappingActive(
      memberId,
      zoneToUtc(input.startDate, 0, business.timezone),
      zoneToUtc(nextDate(input.endDate), 0, business.timezone),
    ),
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      customerName: true,
      customerEmail: true,
    },
    orderBy: { startsAt: "asc" },
  });

  return { timeOff: toDto(row), conflicts };
}

export async function removeTimeOff(
  businessId: string,
  memberId: string,
  timeOffId: string,
) {
  const result = await prisma.timeOff.deleteMany({
    where: { id: timeOffId, memberId, member: { businessId } },
  });

  if (result.count === 0) {
    throw new AppError(404, "Time off  not found", "NOT_FOUND");
  }
}
