import { Request, Response } from "express";
import {
  getCurrentUser,
  loginUser,
  registerUser,
  resendVerificationEmail,
  verifyUserEmail,
} from "../services/authService";

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
  const result = await loginUser(req.body);
  res.json(result);
}

export async function me(req: Request, res: Response) {
  const user = await getCurrentUser(req.userId!);
  res.json({ user });
}
