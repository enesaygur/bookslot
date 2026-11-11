import type { Request, Response } from "express";
import {
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
} from "../services/appointmentService";

export async function createAppointment(req: Request, res: Response) {
  const appointment = await bookAppointment(req.member!.businessId, req.body);
  res.status(201).json({ appointment });
}

export async function cancel(req: Request, res: Response) {
  const appointment = await cancelAppointment(req.appointment!);
  res.json({ appointment });
}

export async function reschedule(req: Request, res: Response) {
  const appointment = await rescheduleAppointment(req.appointment!, req.body.startsAt);
  res.json({ appointment });
}