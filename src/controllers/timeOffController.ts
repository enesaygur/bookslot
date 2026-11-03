import { Request, Response } from "express";
import {
  addTimeOff,
  findTimeOff,
  removeTimeOff,
} from "../services/timeOffService";

export async function listTimeOff(req: Request, res: Response) {
  const timeOff = await findTimeOff(
    req.member!.businessId,
    req.params.memberId as string,
  );
  res.json({ timeOff });
}

export async function createTimeOff(req: Request, res: Response) {
  const timeOff = await addTimeOff(
    req.member!.businessId,
    req.params.memberId as string,
    req.body,
  );
  res.status(201).json({ timeOff });
}

export async function deleteTimeOff(req: Request, res: Response) {
  await removeTimeOff(
    req.member!.businessId,
    req.params.memberId as string,
    req.params.timeOffId as string,
  );
  res.status(204).send();
}
