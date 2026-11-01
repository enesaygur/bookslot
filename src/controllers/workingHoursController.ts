import { Request, Response } from "express";
import {
  findWorkingHours,
  saveWorkingHours,
} from "../services/workingHoursService";

export async function getWorkingHours(req: Request, res: Response) {
  const hours = await findWorkingHours(
    req.member!.businessId,
    req.params.memberId as string,
  );
  res.json({ hours });
}

export async function putWorkingHours(req: Request, res: Response) {
  const hours = await saveWorkingHours(
    req.member!.businessId,
    req.params.memberId as string,
    req.body,
  );
  res.json({ hours });
}
