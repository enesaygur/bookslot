import { Request, Response } from "express";
import {
  getCurrentUser,
  loginUser,
  logoutSession,
  refreshSession,
  registerUser,
  resendVerificationEmail,
  verifyUserEmail,
} from "../services/authService";
import {
  clearRefreshCookieOptions,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from "../config/cookies";

export async function register(req: Request, res: Response) {
  const user = await registerUser(req.body);
  res.status(201).json({ user });
}

export async function verifyEmail(req: Request, res: Response) {
  await verifyUserEmail(req.body.token);
  res.json({ message: "Email verified" });
}

export async function resendVerification(req: Request, res: Response) {
  await resendVerificationEmail(req.body.email);
  res.json({
    message: "If the account exists and is unverified, a new link was sent",
  });
}

export async function login(req: Request, res: Response) {
  const { refreshToken, ...result } = await loginUser(req.body);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  res.json(result);
}

export async function me(req: Request, res: Response) {
  const user = await getCurrentUser(req.userId!);
  res.json({ user });
}

export async function refresh(req: Request, res: Response) {
  try {
    const { accessToken, refreshToken } = await refreshSession(
      req.cookies?.[REFRESH_COOKIE_NAME]!,
    );
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
    res.json({ accessToken });
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions);
    throw err;
  }
}

export async function logout(req: Request, res: Response) {
  await logoutSession(req.cookies?.[REFRESH_COOKIE_NAME]);
  res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions);
  res.status(204).send();
}
