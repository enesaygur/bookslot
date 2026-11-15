import { rateLimit, type Options } from "express-rate-limit";
import { env } from "../config/env";
import { AppError } from "../errors/AppError";

type LimiterOptions = {
  windowMs: number;
  limit: number;
  skip?: Options["skip"];
};

export function createRateLimiter({ windowMs, limit, skip }: LimiterOptions) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: skip ?? (() => env.NODE_ENV === "test"),
    handler: (_req, _res, next) => {
      next(
        new AppError(
          429,
          "Too many requests, please try again later",
          "RATE_LIMITED",
        ),
      );
    },
  });
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const globalLimiter = createRateLimiter({
  windowMs: 15 * MINUTE,
  limit: 600,
});
export const loginLimiter = createRateLimiter({
  windowMs: 15 * MINUTE,
  limit: 10,
});
export const registerLimiter = createRateLimiter({ windowMs: HOUR, limit: 5 });
export const resendLimiter = createRateLimiter({ windowMs: HOUR, limit: 5 });
export const refreshLimiter = createRateLimiter({
  windowMs: 15 * MINUTE,
  limit: 60,
});
export const inviteLimiter = createRateLimiter({ windowMs: HOUR, limit: 20 });
export const publicReadLimiter = createRateLimiter({
  windowMs: 15 * MINUTE,
  limit: 300,
});
export const publicBookingLimiter = createRateLimiter({
  windowMs: HOUR,
  limit: 20,
});
export const manageLimiter = createRateLimiter({
  windowMs: 15 * MINUTE,
  limit: 60,
});
