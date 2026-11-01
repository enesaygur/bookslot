import { MemberRole } from "@prisma/client";
import { RequestHandler } from "express";
import { AppError } from "../errors/AppError";

export const requireSelfOrOwner: RequestHandler = (req, _res, next) => {
  const actor = req.member!;
  const targetMemberId = req.params.memberId as string;

  if (actor.role === MemberRole.OWNER || actor.id === targetMemberId) {
    return next();
  }

  throw new AppError(403, "Forbidden", "FORBIDDEN");
};
