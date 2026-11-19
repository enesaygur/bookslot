import { prisma } from "../lib/prisma";
import { cleanupExpired } from "../services/cleanupService";
import { resetDb, createBusinessFixture } from "../test/helpers";

const DAY_MS = 86_400_000;

describe("cleanup", () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it("removes only long-expired tokens and stale invites", async () => {
    const f = await createBusinessFixture();
    const now = new Date();
    const inDays = (days: number) => new Date(now.getTime() + days * DAY_MS);

    await prisma.refreshToken.createMany({
      data: [
        { tokenHash: "r-old", familyId: "f1", userId: f.user.id, expiresAt: inDays(-3) },
        { tokenHash: "r-fresh", familyId: "f1", userId: f.user.id, expiresAt: inDays(3) },
      ],
    });

    await prisma.emailVerificationToken.createMany({
      data: [
        { tokenHash: "v-old", userId: f.user.id, expiresAt: inDays(-2) },
        { tokenHash: "v-fresh", userId: f.user.id, expiresAt: inDays(1) },
      ],
    });

    const invite = (email: string, hash: string, expiresIn: number, acceptedIn?: number) => ({
      email,
      tokenHash: hash,
      businessId: f.business.id,
      invitedById: f.user.id,
      expiresAt: inDays(expiresIn),
      acceptedAt: acceptedIn === undefined ? null : inDays(acceptedIn),
    });

    await prisma.invite.createMany({
      data: [
        invite("old@test.com", "i-old", -40),
        invite("recent@test.com", "i-recent", -5),
        invite("accepted@test.com", "i-accepted", -40, -41),
      ],
    });

    const result = await cleanupExpired(now);

    expect(result).toEqual({ refreshTokens: 1, verificationTokens: 1, invites: 1 });
    expect(await prisma.refreshToken.count()).toBe(1);
    expect(await prisma.emailVerificationToken.count()).toBe(1);
    expect(await prisma.invite.count()).toBe(2);
  });
});