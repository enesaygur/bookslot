import jwt from "jsonwebtoken";
import { env } from "../config/env";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export function signAccessToken(userId: string): string {
  return jwt.sign({}, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function verifyAccessToken(token: string): { userId: string } {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ["HS256"],
  });

  if (typeof payload === "string" || !payload.sub) {
    throw new Error("Invalid token payload");
  }

  return { userId: payload.sub };
}
