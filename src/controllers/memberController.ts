import { Request, Response } from "express";
import {
  listBusinessMembers,
  removeStaffMember,
} from "../services/memberService";

export async function listMembers(req: Request, res: Response) {
  const members = await listBusinessMembers(req.member!.businessId);
  res.json({ members });
}

export async function removeMember(req: Request, res: Response) {
  await removeStaffMember(
    req.member!.businessId,
    req.params.memberId as string,
  );
  res.status(204).send();
}
