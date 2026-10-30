import { Request, Response } from "express";
import { acceptInvite, createInvite } from "../services/inviteService";

export async function sendInvite(req: Request, res: Response) {
  const invite = await createInvite(
    req.member!.businessId,
    req.userId!,
    req.body.email,
  );
  res.status(201).json({ invite });
}

export async function accept(req: Request, res: Response) {
  const membership = await acceptInvite(req.userId!, req.body.token);
  res.json({ membership });
}
