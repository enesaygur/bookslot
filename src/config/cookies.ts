import { CookieOptions } from "express";
import { env } from "./env";

export const REFRESH_COOKIE_NAME = "refreshToken";
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const isProd = env.NODE_ENV === "production";

const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  path: "/auth",
};

export const refreshCookieOptions: CookieOptions = {
  ...baseOptions,
  maxAge: REFRESH_TOKEN_TTL_MS,
};

export const clearRefreshCookieOptions: CookieOptions = baseOptions;
