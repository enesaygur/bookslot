import { Request, Response } from "express";
import {
  findPublicBusiness,
  getPublicAvailability,
} from "../services/publicService";
import type { AvailabilityQuery } from "../schemas/availabilitySchema";

export async function getPublicBusiness(req: Request, res: Response) {
  const business = await findPublicBusiness(req.params.slug as string);
  res.json({ business });
}

export async function showPublicAvailability(req: Request, res: Response) {
  const result = await getPublicAvailability(
    req.params.slug as string,
    res.locals.query as AvailabilityQuery,
  );

  res.json(result);
}
