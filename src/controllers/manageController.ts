import { Request, Response } from "express";
import {
  describeManagedAppointments,
  rescheduleManaged,
} from "../services/manageService";
import { cancelAppointment } from "../services/appointmentService";

export async function showManagedAppointment(req: Request, res: Response) {
  const appointment = await describeManagedAppointments(req.appointment!);
  res.json({ appointment });
}

export async function cancelManagedAppointment(req: Request, res: Response) {
  await cancelAppointment(req.appointment!);
  const appointment = await describeManagedAppointments(req.appointment!);
  res.json({ appointment });
}

export async function rescheduleManagedAppointment(
  req: Request,
  res: Response,
) {
  await rescheduleManaged(req.appointment!, req.body.startsAt);
  const appointment = await describeManagedAppointments(req.appointment!);
  res.json({ appointment });
}
