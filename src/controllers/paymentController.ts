import { Request, Response } from "express";
import { handleCheckoutCallback } from "../services/paymentService";
import { env } from "../config/env";

export async function iyzicoCallback(req: Request, res: Response) {
  const token =
    typeof req.body?.token === "string" ? req.body.token : undefined;

  let outcome = "error";
  let appointmentId: string | undefined;

  try {
    const result = await handleCheckoutCallback(token);
    outcome = result.outcome;
    appointmentId = result.appointmentId;
  } catch (err) {
    console.error("[payment] callback failed", err);
  }

  const params = new URLSearchParams({ status: outcome });
  if (appointmentId) params.set("appointment", appointmentId);

  res.redirect(303, `${env.FRONTEND_URL}/payment/result?${params.toString()}`);
}
