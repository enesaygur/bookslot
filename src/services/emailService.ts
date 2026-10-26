import { env } from "../config/env";

export async function sendVerificationEmail(to: string, token: string) {
  const link = `${env.FRONTEND_URL}/verify-email?token=${token}`;

  if (env.NODE_ENV !== "production") {
    console.log(`[email] To: ${to}`);
    console.log(`[email] Verify link: ${link}`);
  }
}
