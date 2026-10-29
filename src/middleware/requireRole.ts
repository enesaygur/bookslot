import { MemberRole } from "@prisma/client";
import { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../errors/AppError";

export const requireRole = (...allowed: MemberRole[]): RequestHandler => {
  return async (req, _res, next) => {
    const businessId = req.params.businessId as string;

    const member = await prisma.member.findUnique({
      where: { businessId_userId: { businessId, userId: req.userId! } },
      select: { id: true, role: true, businessId: true },
    });

    if (!member || !allowed.includes(member.role)) {
      throw new AppError(403, "Forbidden", "FORBIDDEN");
    }

    req.member = member;
    next();
  };
};
