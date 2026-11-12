import { MemberRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { signAccessToken } from "../lib/jwt";

export async function resetDb() {
  if (!process.env.DATABASE_URL?.includes("test")) {
    throw new Error("Refusing to reset a non-test database");
  }
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "User", "Business" CASCADE');
}

export async function createBusinessFixture() {
  const user = await prisma.user.create({
    data: {
      name: "Owner",
      email: "owner@test.com",
      passwordHash: "x",
      emailVerifiedAt: new Date(),
    },
  });

  const business = await prisma.business.create({
    data: {
      name: "Test Salon",
      slug: "test-salon",
      timezone: "Europe/Istanbul",
      members: { create: { userId: user.id, role: MemberRole.OWNER } },
    },
    include: { members: true },
  });
  const member = business.members[0];

  const service = await prisma.service.create({
    data: { businessId: business.id, name: "Cut", durationMinutes: 30, priceCents: 25000 },
  });

  await prisma.workingInterval.createMany({
    data: [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
      memberId: member.id,
      dayOfWeek,
      startMinute: 540,
      endMinute: 1080,
    })),
  });

  return { user, business, member, service, token: signAccessToken(user.id) };
}

export type Fixture = Awaited<ReturnType<typeof createBusinessFixture>>;