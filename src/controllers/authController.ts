import { Request, Response } from "express";
import { registerUser } from "../services/authService";

export async function register(req: Request, res: Response) {
  const user = await registerUser(req.body);
  res.status(201).json({ user });
}
