import { MemberRole, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type {
  CreateBusinessInput,
  UpdateBusinessInput,
} from "../schemas/businessSchema";
import { AppError } from "../errors/AppError";

const businessSelect = {
  id: true,
  name: true,
  slug: true,
  timezone: true,
  createdAt: true,
} as const;

export async function createBusiness(
  userId: string,
  input: CreateBusinessInput,
) {
  try {
    return await prisma.business.create({
      data: {
        name: input.name,
        slug: input.slug,
        timezone: input.timezone,
        members: { create: { userId, role: MemberRole.OWNER } },
      },
      select: businessSelect,
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

export async function getBusiness(businessId: string) {
  return prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    select: businessSelect,
  });
}

export async function updateBusiness(
  businessId: string,
  input: UpdateBusinessInput,
) {
  return prisma.business.update({
    where: { id: businessId },
    data: input,
    select: businessSelect,
  });
}
