import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  JWT_ACCESS_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("BookSlot <onboarding@resend.dev>"),
  REDIS_URL: z.string().optional(),
  IYZICO_API_KEY: z.string().optional(),
  IYZICO_SECRET_KEY: z.string().optional(),
  IYZICO_BASE_URL: z.string().url().default("https://sandbox-api.iyzipay.com"),
  API_PUBLIC_URL: z.string().url().default("http://localhost:3000"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment variables:");
  for (const issue of result.error.issues) {
    console.error(`- ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = result.data;
