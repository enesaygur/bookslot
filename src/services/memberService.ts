import { MemberRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../errors/AppError";

export async function listBusinessMembers(businessId: string) {
  return prisma.member.findMany({
    where: { businessId },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function removeStaffMember(businessId: string, memberId: string) {
  const result = await prisma.member.deleteMany({
    where: { id: memberId, businessId, role: MemberRole.STAFF },
  });

  if (result.count === 0) {
    throw new AppError(404, "Member not found", "NOT_FOUND");
  }
}
