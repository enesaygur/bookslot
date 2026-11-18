import { env } from "../config/env";
import { escapeHtml } from "../lib/html";
import { type Email } from "../lib/mailer";
import { enqueueEmail } from "../lib/queue";

async function safeSend(email: Email) {
  try {
    await enqueueEmail(email);
  } catch (err) {
    console.error(
      `[email] failed to send "${email.subject}" to ${email.to}`,
      err,
    );
  }
}

export async function sendVerificationEmail(to: string, token: string) {
  const link = `${env.FRONTEND_URL}/verify-email?token=${token}`;

  await safeSend({
    to,
    subject: "BookSlot e-postanı doğrula",
    text: `BookSlot'a hoş geldin! E-postanı doğrulamak için bu bağlantıyı aç: ${link}`,
    html: `<p>BookSlot'a hoş geldin!</p>
<p><a href="${link}">E-postamı doğrula</a></p>
<p>Düğme çalışmazsa bu adresi tarayıcına yapıştır: ${link}</p>`,
  });
}

export async function sendInviteEmail(
  to: string,
  token: string,
  businessName: string,
) {
  const link = `${env.FRONTEND_URL}/accept-invite?token=${token}`;
  const name = escapeHtml(businessName);

  await safeSend({
    to,
    subject: `${businessName} seni ekibine davet etti`,
    text: `${businessName} seni BookSlot'ta ekibine davet etti. Daveti kabul etmek için giriş yapıp bu bağlantıyı aç: ${link}`,
    html: `<p><strong>${name}</strong> seni BookSlot'ta ekibine davet etti.</p>
<p><a href="${link}">Daveti kabul et</a></p>
<p>Düğme çalışmazsa bu adresi tarayıcına yapıştır: ${link}</p>`,
  });
}
