import { prisma } from "../lib/prisma";

const DAY_MS = 86_400_000;

export async function cleanupExpired(now: Date = new Date()) {
  const dayAgo = new Date(now.getTime() - DAY_MS);
  const monthAgo = new Date(now.getTime() - 30 * DAY_MS);

  const refreshTokens = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: dayAgo } },
  });

  const verificationTokens = await prisma.emailVerificationToken.deleteMany({
    where: { expiresAt: { lt: dayAgo } },
  });

  const invites = await prisma.invite.deleteMany({
    where: { acceptedAt: null, expiresAt: { lt: monthAgo } },
  });

  return {
    refreshTokens: refreshTokens.count,
    verificationTokens: verificationTokens.count,
    invites: invites.count,
  };
}
