import { z } from "zod";
import { isRealDate } from "../lib/time";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine(isRealDate, "Invalid date");

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
