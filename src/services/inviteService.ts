import { MemberRole, Prisma } from "@prisma/client";
import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";
import { generateToken, hashToken } from "../lib/token";
import { sendInviteEmail } from "./emailService";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createInvite(
  businessId: string,
  invitedById: string,
  email: string,
) {
  const exitingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (exitingUser) {
    const existingMember = await prisma.member.findUnique({
      where: { businessId_userId: { businessId, userId: exitingUser.id } },
      select: { id: true },
    });

    if (existingMember) {
      throw new AppError(409, "User is already a member", "ALREADY_MEMBER");
    }
  }

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    select: { name: true },
  });

  const rawtoken = generateToken();

  const [, invite] = await prisma.$transaction([
    prisma.invite.deleteMany({
      where: { businessId, email, acceptedAt: null },
    }),
    prisma.invite.create({
      data: {
        email,
        businessId,
        invitedById,
        tokenHash: hashToken(rawtoken),
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
      select: { id: true, email: true, expiresAt: true },
    }),
  ]);

  await sendInviteEmail(email, rawtoken, business.name);
  return invite;
}

export async function acceptInvite(userId: string, token: string) {
  const invalid = new AppError(
    400,
    "Invalid or expired invite",
    "INVALID_INVITE",
  );

  const tokenHash = hashToken(token);

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { email: true },
      });
      const invite = await tx.invite.findUnique({
        where: { tokenHash },
      });

      if (
        !invite ||
        invite.acceptedAt ||
        invite.expiresAt <= new Date() ||
        invite.email !== user.email
      ) {
        throw invalid;
      }

      const claimed = await tx.invite.updateMany({
        where: { id: invite.id, acceptedAt: null },
        data: { acceptedAt: new Date() },
      });

      if (claimed.count === 0) throw invalid;

      return tx.member.create({
        data: { userId, businessId: invite.businessId, role: MemberRole.STAFF },
        select: {
          role: true,
          business: { select: { id: true, name: true, slug: true } },
        },
      });
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new AppError(409, "Already a member", "ALREADY_MEMBER");
    }
    throw err;
  }
}
