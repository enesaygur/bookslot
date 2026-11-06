import { z } from "zod";
import { dateString } from "./common";

export const createTimeOffSchema = z
  .object({
    startDate: dateString,
    endDate: dateString,
    reason: z.string().trim().max(200).optional(),
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: "End date must not be before start date",
    path: ["endDate"],
  });

export type createTimeOffInput = z.infer<typeof createTimeOffSchema>;
