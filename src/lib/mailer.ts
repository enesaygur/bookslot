import { Resend } from "resend";
import { env } from "../config/env";

export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendEmail(email: Email): Promise<void> {
  if (env.NODE_ENV === "test") return;

  if (!resend) {
    if (env.NODE_ENV === "production") {
      console.warn("[email] RESEND_API_KEY is not set, email was not sent");
    } else {
      console.log(
        `[email] To: ${email.to}\n[email] Subject: ${email.subject}\n${email.text}`,
      );
    }
    return;
  }

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  if (error) {
    throw new Error(`Email send failed: ${error.message}`);
  }
}
