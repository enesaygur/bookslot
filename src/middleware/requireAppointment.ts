import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../errors/AppError";

export const requireAppointment: RequestHandler = async (req, _res, next) => {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: req.params.appointmentId as string,
      businessId: req.member!.businessId,
    },
  });

  if (!appointment) {
    throw new AppError(404, "Appointment not found", "NOT_FOUND");
  }

  req.appointment = appointment;
  next();
};