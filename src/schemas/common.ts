import { z } from "zod";
import { isRealDate } from "../lib/time";

export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine(isRealDate, "Invalid date");

  