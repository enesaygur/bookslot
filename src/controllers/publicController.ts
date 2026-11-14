import { Request, Response } from "express";
import { findPublicBusiness } from "../services/publicService";

export async function getPublicBusiness(req: Request, res: Response) {
  const business = await findPublicBusiness(req.params.slug as string);
  res.json({ business });
}
