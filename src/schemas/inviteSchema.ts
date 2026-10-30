import { z } from "zod";

export const createInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
});
