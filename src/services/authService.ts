import bcrypt from "bcryptjs";
import { RegisterInput } from "../schemas/authSchema";
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { AppError } from "../errors/AppError";

const BCRYPT_COST = 12;
export async function registerUser(input: RegisterInput) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

  try {
    return await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });
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
