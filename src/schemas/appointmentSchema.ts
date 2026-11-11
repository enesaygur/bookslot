import { z } from "zod";

export const createAppointmentSchema = z.object({
  memberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startsAt: z.string().datetime(),
  customerName: z.string().trim().min(2).max(100),
  customerEmail: z.string().trim().toLowerCase().email(),
  customerPhone: z.string().trim().min(7).max(20).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export const rescheduleAppointmentSchema = z.object({
  startsAt: z.string().datetime(),
});
