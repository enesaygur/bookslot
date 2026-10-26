import bcrypt from "bcryptjs";
import { LoginInput, RegisterInput } from "../schemas/authSchema";
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { AppError } from "../errors/AppError";
import { generateToken, hashToken } from "../lib/token";
import { sendVerificationEmail } from "./emailService";
import { signAccessToken } from "../lib/jwt";

const BCRYPT_COST = 12;
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const DUMMY_HASH = bcrypt.hashSync("dummy-password", BCRYPT_COST);
export async function registerUser(input: RegisterInput) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  const rawToken = generateToken();

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        emailVerificationTokens: {
          create: {
            tokenHash: hashToken(rawToken),
            expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
          },
        },
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    await sendVerificationEmail(user.email, rawToken);
    return user;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new AppError(409, "Email already registered", "EMAIL_TAKEN");
    }
    throw err;
  }
}

export async function verifyUserEmail(token: string) {
  const tokenHash = hashToken(token);

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.emailVerificationToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    if (claimed.count === 0) {
      throw new AppError(400, "Invalid or expired token", "INVALID_TOKEN");
    }

    const record = await tx.emailVerificationToken.findUniqueOrThrow({
      where: { tokenHash },
    });

    await tx.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    });
  });
}

export async function resendVerificationEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.emailVerifiedAt) return;

  const rawToken = generateToken();

  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    }),

    prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
      },
    }),
  ]);

  await sendVerificationEmail(user.email, rawToken);
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  const passwordOk = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? DUMMY_HASH,
  );

  if (!user || !passwordOk) {
    throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  if (!user.emailVerifiedAt) {
    throw new AppError(403, "Email not verified", "EMAIL_NOT_VERIFIED");
  }

  return {
    accessToken: signAccessToken(user.id),
    user: { id: user.id, name: user.name, email: user.email },
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  if (!user) {
    throw new AppError(401, "User no longer exists", "UNAUTHORIZED");
  }

  return user;
}
