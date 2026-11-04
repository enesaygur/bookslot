import { Request, Response } from "express";
import {
  createBusiness,
  getBusiness,
  listMyBusiness,
  updateBusiness,
} from "../services/businessService";

export async function create(req: Request, res: Response) {
  const business = await createBusiness(req.userId!, req.body);
  res.status(201).json({ business });
}

export async function listMine(req: Request, res: Response) {
  const businesses = await listMyBusiness(req.userId!);
  res.json({ businesses });
}

export async function getOne(req: Request, res: Response) {
  const business = await getBusiness(req.member!.businessId);
  res.json({ business });
}

export async function update(req: Request, res: Response) {
  const business = await updateBusiness(req.member!.businessId, req.body);
  res.json({ business });
}
