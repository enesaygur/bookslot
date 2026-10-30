import { env } from "../config/env";
import { email } from "zod";

export async function sendVerificationEmail(to: string, token: string) {
  const link = `${env.FRONTEND_URL}/verify-email?token=${token}`;

  if (env.NODE_ENV !== "production") {
    console.log(`[email] To: ${to}`);
    console.log(`[email] Verify link: ${link}`);
  }
}

export async function sendInviteEmail(
  to: string,
  token: string,
  businessName: string,
) {
  const link = `${env.FRONTEND_URL}/accept-invite?token=${token}`;

  if (env.NODE_ENV !== "production") {
    console.log(`[email] To: ${to}`);
    console.log(`[email] Invite to ${businessName}: ${link}`);
  }
}
