import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";
import { formatTime, parseTime } from "../lib/time";
import { ReplaceWorkingHoursInput } from "../schemas/workingHoursSchema";
import { assertMemberInBusiness } from "./memberService";

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
