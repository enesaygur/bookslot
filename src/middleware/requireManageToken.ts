import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";
import { hashToken } from "../lib/token";

export const requireManageToken: RequestHandler = async (req, _res, next) => {
  const token = req.get("x-manage-token");

  if (!token) {
    throw new AppError(404, "Appointment not found", "NOT_FOUND");
  }

  const appointment = await prisma.appointment.findUnique({
    where: { manageTokenHash: hashToken(token) },
  });
  if (!appointment) {
    throw new AppError(404, "Appointment not found", "NOT_FOUND");
  }

  req.appointment = appointment;
  next();
};
