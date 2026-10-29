import { MemberRole, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { CreateBusinessInput } from "../schemas/businessSchema";
import { AppError } from "../errors/AppError";

export async function createBusiness(
  userId: string,
  input: CreateBusinessInput,
) {
  try {
    return await prisma.business.create({
      data: {
        name: input.name,
        slug: input.slug,
        members: { create: { userId, role: MemberRole.OWNER } },
      },
      select: { id: true, name: true, slug: true, createdAt: true },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new AppError(409, "Slug already taken", "SLUG_TAKEN");
    }
    throw err;
  }
}

export async function listMyBusiness(userId: string) {
  const memberships = await prisma.member.findMany({
    where: {
      userId,
    },
    select: {
      role: true,
      business: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({ ...m.business, role: m.role }));
}

const businessSelect = {
  id: true,
  name: true,
  slug: true,
  createdAt: true,
} as const;

export async function getBusiness(businessId: string) {
  return prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    select: businessSelect,
  });
}

export async function renameBusiness(businessId: string, name: string) {
  return prisma.business.update({
    where: { id: businessId },
    data: { name },
    select: businessSelect,
  });
}
