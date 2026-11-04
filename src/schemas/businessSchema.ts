import { z } from "zod";
import { canonicalTimeZone, isValidTimeZone } from "../lib/time";

const timezoneSchema = z
  .string()
  .trim()
  .refine(isValidTimeZone, "Invalid IANA time zone (e.g. Europe/Istanbul)")
  .transform(canonicalTimeZone);

export const createBusinessSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(50)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and single hyphens",
    ),
  timezone: timezoneSchema.optional(),
});

export const updateBusinessSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    timezone: timezoneSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.timezone !== undefined, {
    message: "Provide at least one field",
  });

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
