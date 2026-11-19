import { AppointmentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { notifyReminder } from "./appointmentEmailService";

const DAY_MS = 86_400_000;

export async function sendDueReminders(
  now: Date = new Date(),
): Promise<number> {
  const due = await prisma.appointment.findMany({
    where: {
      status: { not: AppointmentStatus.CANCELLED },
      reminderProcessedAt: null,
      startsAt: { gt: now, lte: new Date(now.getTime() + DAY_MS) },
    },
    select: { id: true, startsAt: true, createdAt: true },
    orderBy: { startsAt: "asc" },
    take: 200,
  });

  let sent = 0;

  for (const appointment of due) {
    const claimed = await prisma.appointment.updateMany({
      where: {
        id: appointment.id,
        reminderProcessedAt: null,
        status: { not: AppointmentStatus.CANCELLED },
      },
      data: { reminderProcessedAt: now },
    });

    if (claimed.count !== 1) continue;

    const bookInAdvice =
      appointment.createdAt.getTime() <=
      appointment.startsAt.getTime() - DAY_MS;

    if (bookInAdvice) {
      await notifyReminder(appointment.id);
      sent += 1;
    }
  }

  return sent;
}
