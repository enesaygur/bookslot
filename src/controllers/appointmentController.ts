import { Request, Response } from "express";
import { bookAppointment } from "../services/appointmentService";

export async function createAppointment(req: Request, res: Response) {
  const appointment = await bookAppointment(req.member!.businessId, req.body);
  res.status(201).json({ appointment });
}


