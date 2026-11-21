import { z } from "zod";

const durationMinutes = z
  .number()
  .int()
  .min(5)
  .max(480)
  .refine((v) => v % 5 === 0, "Must be a multiple of 5");

const baseFields = {
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  durationMinutes,
  priceCents: z.number().int().min(0).max(10_000_000),
};

export const createServiceSchema = z
  .object({
    ...baseFields,
    depositCents: z.number().int().min(0).default(0),
  })
  .refine((value) => value.depositCents <= value.priceCents, {
    message: "Deposit cannot exceed price",
    path: ["depositCents"],
  });

export const updateServiceSchema = z
  .object(baseFields)
  .partial()
  .extend({
    depositCents: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  });

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;