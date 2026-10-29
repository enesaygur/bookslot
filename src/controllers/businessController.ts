import { Request, Response } from "express";
import { createBusiness, listMyBusiness } from "../services/businessService";

export async function create(req: Request, res: Response) {
  const business = await createBusiness(req.userId!, req.body);
  res.status(201).json({ business });
}

export async function listMine(req: Request, res: Response) {
  const businesses = await listMyBusiness(req.userId!);
  res.json({ businesses });
}
