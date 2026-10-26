import { RequestHandler } from "express";
import { AppError } from "../errors/AppError";
import { verifyAccessToken } from "../lib/jwt";

export const authMiddleware: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "Missing access token", "UNAUTHORIZED");
  }

  try {
    const { userId } = verifyAccessToken(header.slice(7));
    req.userId = userId;
    next();
  } catch {
    throw new AppError(401, "Invalid or expired access token", "UNAUTHORIZED");
  }
};
