import { Prisma, AppointmentStatus } from "@prisma/client";

export function overlappingActive(
  memberId: string,
  from: Date,
  to: Date,
): Prisma.AppointmentWhereInput {
  return {
    memberId,
    status: { not: AppointmentStatus.CANCELLED },
    startsAt: { lt: to },
    endsAt: { gt: from },
  };
}
