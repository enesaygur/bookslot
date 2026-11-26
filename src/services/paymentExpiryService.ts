import { prisma } from "../lib/prisma";
import { AppointmentStatus, PaymentStatus } from "@prisma/client";

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const GRACE_MS = 5 * MINUTE_MS;

export async function releaseExpiredHolds(now: Date = new Date()) {
  const released = await prisma.appointment.updateMany({
    where: {
      status: AppointmentStatus.PENDING_PAYMENT,
      holdExpiresAt: { lt: new Date(now.getTime() - GRACE_MS) },
    },
    data: { status: AppointmentStatus.CANCELLED, cancelledAt: now },
  });

  const abandoned = await prisma.payment.updateMany({
    where: {
      status: PaymentStatus.PENDING,
      createdAt: { lt: new Date(now.getTime() - DAY_MS) },
      appointment: { status: AppointmentStatus.CANCELLED },
    },
    data: {
      status: PaymentStatus.FAILED,
      failureReason: "ABANDONED",
    },
  });
  return {
    releasedAppointments: released.count,
    abandonedPayments: abandoned.count,
  };
}
