import { env } from "../config/env";
import { emailLayout } from "../lib/emailLayout";
import { escapeHtml } from "../lib/html";
import { type Email } from "../lib/mailer";
import { prisma } from "../lib/prisma";
import { enqueueEmail } from "../lib/queue";
import { formatLocalDateTime } from "../lib/timezone";

type Context = {
  to: string;
  customerName: string;
  businessName: string;
  serviceName: string;
  memberName: string;
  when: string;
};

async function loadContext(appointmentId: string): Promise<Context> {
  const row = await prisma.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
    select: {
      startsAt: true,
      customerName: true,
      customerEmail: true,
      service: { select: { name: true } },
      member: { select: { user: { select: { name: true } } } },
      business: { select: { name: true, timezone: true } },
    },
  });

  return {
    to: row.customerEmail,
    customerName: row.customerName,
    businessName: row.business.name,
    serviceName: row.service.name,
    memberName: row.member.user.name,
    when: formatLocalDateTime(row.startsAt, row.business.timezone),
  };
}

function summaryText(c: Context) {
  return `${c.serviceName}\n${c.when}\n${c.memberName} · ${c.businessName}`;
}

async function summaryHtml(c: Context) {
  return `<p><strong>${escapeHtml(c.serviceName)}</strong><br>${escapeHtml(c.when)}<br>${escapeHtml(c.memberName)} · ${escapeHtml(c.businessName)}</p>`;
}

async function notify(build: () => Promise<Email>) {
  try {
    await enqueueEmail(await build());
  } catch (err) {
    console.error("[email] appointment notification failed", err);
  }
}

export async function notifyBooked(appointmentId: string, manageToken: string) {
  return notify(async () => {
    const c = await loadContext(appointmentId);
    const link = `${env.FRONTEND_URL}/manage?token=${manageToken}`;

    return {
      to: c.to,
      subject: `Randevun onaylandı: ${c.businessName}`,
      text: `Merhaba ${c.customerName},\n\nRandevun onaylandı.\n\n${summaryText(c)}\n\nRandevunu görüntülemek, taşımak veya iptal etmek için: ${link}\n\nBu bağlantıyı başkasıyla paylaşma, randevunu yönetmeye yarar.`,
      html: emailLayout({
        heading: "Randevun onaylandı",
        bodyHtml: `<p>Merhaba ${escapeHtml(c.customerName)},</p>${summaryHtml(c)}<p>Bu bağlantıyı başkasıyla paylaşma, randevunu yönetmeye yarar.</p>`,
        button: { label: "Randevumu yönet", url: link },
      }),
    };
  });
}

export function notifyRescheduled(appointmentId: string) {
  return notify(async () => {
    const c = await loadContext(appointmentId);

    return {
      to: c.to,
      subject: `Randevun taşındı: ${c.businessName}`,
      text: `Merhaba ${c.customerName},\n\nRandevun yeni saate taşındı.\n\n${summaryText(c)}\n\nRandevunu ilk onay e-postandaki bağlantıyla yönetebilirsin.`,
      html: emailLayout({
        heading: "Randevun taşındı",
        bodyHtml: `<p>Merhaba ${escapeHtml(c.customerName)},</p><p>Randevun yeni saate taşındı:</p>${summaryHtml(c)}<p>Randevunu ilk onay e-postandaki bağlantıyla yönetebilirsin.</p>`,
      }),
    };
  });
}

export function notifyCancelled(appointmentId: string) {
  return notify(async () => {
    const c = await loadContext(appointmentId);

    return {
      to: c.to,
      subject: `Randevun iptal edildi: ${c.businessName}`,
      text: `Merhaba ${c.customerName},\n\nAşağıdaki randevun iptal edildi.\n\n${summaryText(c)}`,
      html: emailLayout({
        heading: "Randevun iptal edildi",
        bodyHtml: `<p>Merhaba ${escapeHtml(c.customerName)},</p><p>Aşağıdaki randevun iptal edildi:</p>${summaryHtml(c)}`,
      }),
    };
  });
}
