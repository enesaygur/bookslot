import { Request, Response } from "express";
import { getAvailability } from "../services/availabilityService";
import { AvailabilityQuery } from "../schemas/availabilitySchema";

export async function showAvailability(req: Request, res: Response) {
  const result = await getAvailability(
    req.member!.businessId,
    res.locals.query as AvailabilityQuery,
  );

  res.json({ result });
}
