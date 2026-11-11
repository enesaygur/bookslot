import type { RequestHandler } from "express";
import { MemberRole } from "@prisma/client";
import { AppError } from "../errors/AppError";

export const requireOwnerOrAssignee: RequestHandler = (req, _res, next) => {
  const actor = req.member!;
  const appointment = req.appointment!;

  if (actor.role === MemberRole.OWNER || appointment.memberId === actor.id) {
    return next();
  }

  throw new AppError(403, "Forbidden", "FORBIDDEN");
};