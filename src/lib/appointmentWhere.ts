import { Prisma, AppointmentStatus } from "@prisma/client";

export function overlappingActive(
  memberId: string,
  from: Date,
  to: Date,
  excludeId?: string,
): Prisma.AppointmentWhereInput {
  return {
    memberId,
    status: { not: AppointmentStatus.CANCELLED },
    startsAt: { lt: to },
    endsAt: { gt: from },
    ...(excludeId ? { id: { not: excludeId } } : {}),
  };
}
