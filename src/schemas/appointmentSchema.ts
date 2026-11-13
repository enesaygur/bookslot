import { z } from "zod";
import { dateString } from "./common";
import { parseDate } from "../lib/time";

export const createAppointmentSchema = z.object({
  memberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startsAt: z.string().datetime(),
  customerName: z.string().trim().min(2).max(100),
  customerEmail: z.string().trim().toLowerCase().email(),
  customerPhone: z.string().trim().min(7).max(20).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const listAppointmentsQuerySchema = z
  .object({
    from: dateString,
    to: dateString,
    memberId: z.string().uuid().optional(),
  })
  .refine((value) => value.from <= value.to, {
    message: "End date must not be before start date",
    path: ["to"],
  })
  .refine(
    (value) => (
      parseDate(value.to).getTime() -
        parseDate(value.from).getTime()) / 86_400_000 <=
      30,
    {
      message: "Maximum range is 30 days",
      path: ["to"],
    },
  );

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export const rescheduleAppointmentSchema = z.object({
  startsAt: z.string().datetime(),
});
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;
