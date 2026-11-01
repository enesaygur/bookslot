import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";
import { formatTime, parseTime } from "../lib/time";
import { ReplaceWorkingHoursInput } from "../schemas/workingHoursSchema";

async function assertMemberInBusiness(businessId: string, memberId: string) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, businessId },
    select: { id: true },
  });
  if (!member) {
    throw new AppError(404, "Member not found", "NOT_FOUND");
  }
}

export async function findWorkingHours(businessId: string, memberId: string) {
  await assertMemberInBusiness(businessId, memberId);

  const rows = await prisma.workingInterval.findMany({
    where: { memberId },
    orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
  });

  return rows.map((row) => ({
    dayofWeek: row.dayOfWeek,
    start: formatTime(row.startMinute),
    end: formatTime(row.endMinute),
  }));
}

export async function saveWorkingHours(
  businessId: string,
  memberId: string,
  input: ReplaceWorkingHoursInput,
) {
  await assertMemberInBusiness(businessId, memberId);

  await prisma.$transaction([
    prisma.workingInterval.deleteMany({
      where: {
        memberId,
      },
    }),
    prisma.workingInterval.createMany({
      data: input.hours.map((item) => ({
        memberId,
        dayOfWeek: item.dayOfWeek,
        startMinute: parseTime(item.start),
        endMinute: parseTime(item.end),
      })),
    }),
  ]);

  return findWorkingHours(businessId, memberId);
}
