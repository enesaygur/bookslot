import { z } from "zod";
import { dateString } from "./common";

export const availabilityQuerySchema = z.object({
  date: dateString,
  serviceId: z.string().uuid(),
  memberId: z.string().uuid(),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
