import { MemberRole, Prisma } from "@prisma/client";
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
  try {
    const result = await prisma.member.deleteMany({
      where: { id: memberId, businessId, role: MemberRole.STAFF },
    });

    if (result.count === 0) {
      throw new AppError(404, "Member not found", "NOT_FOUND");
    }
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      throw new AppError(
        409,
        "Member has appointments and cannot be removed",
        "MEMBER_HAS_APPOINTMENTS",
      );
    }
    throw err;
  }
}

export async function assertMemberInBusiness(
  businessId: string,
  memberId: string,
) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, businessId },
    select: { id: true },
  });
  if (!member) {
    throw new AppError(404, "Member not found", "NOT_FOUND");
  }
}
