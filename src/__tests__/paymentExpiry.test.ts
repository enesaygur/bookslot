import { AppointmentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { releaseExpiredHolds } from "../services/paymentExpiryService";
import { resetDb, createBusinessFixture } from "../test/helpers";

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

describe("payment hold expiry", () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it("releases only holds that are past the grace period", async () => {
    const f = await createBusinessFixture();
    const now = new Date();

    const make = (
      hours: number,
      status: AppointmentStatus,
      holdMinutes: number | null,
      paymentAgeDays = 0,
    ) => {
      const startsAt = new Date(now.getTime() + hours * HOUR_MS);
      return prisma.appointment.create({
        data: {
          businessId: f.business.id,
          memberId: f.member.id,
          serviceId: f.service.id,
          startsAt,
          endsAt: new Date(startsAt.getTime() + 30 * MINUTE_MS),
          status,
          holdExpiresAt:
            holdMinutes === null ? null : new Date(now.getTime() + holdMinutes * MINUTE_MS),
          priceCents: 0,
          customerName: "Test",
          customerEmail: `t${hours}@test.com`,
          payment: {
            create: {
              amountCents: 10000,
              createdAt: new Date(now.getTime() - paymentAgeDays * DAY_MS),
            },
          },
        },
      });
    };

    const expired = await make(50, AppointmentStatus.PENDING_PAYMENT, -10);
    const inGrace = await make(52, AppointmentStatus.PENDING_PAYMENT, -2);
    const stillHeld = await make(54, AppointmentStatus.PENDING_PAYMENT, 10);
    const confirmed = await make(56, AppointmentStatus.CONFIRMED, null);
    const cancelledOld = await make(58, AppointmentStatus.CANCELLED, null, 2);

    const result = await releaseExpiredHolds(now);
    expect(result).toEqual({ releasedAppointments: 1, abandonedPayments: 1 });

    const statusOf = async (id: string) =>
      (await prisma.appointment.findUniqueOrThrow({ where: { id } })).status;

    expect(await statusOf(expired.id)).toBe("CANCELLED");
    expect(await statusOf(inGrace.id)).toBe("PENDING_PAYMENT");
    expect(await statusOf(stillHeld.id)).toBe("PENDING_PAYMENT");
    expect(await statusOf(confirmed.id)).toBe("CONFIRMED");

    const expiredPayment = await prisma.payment.findUniqueOrThrow({
      where: { appointmentId: expired.id },
    });
    expect(expiredPayment.status).toBe("PENDING");

    const abandonedPayment = await prisma.payment.findUniqueOrThrow({
      where: { appointmentId: cancelledOld.id },
    });
    expect(abandonedPayment.status).toBe("FAILED");
    expect(abandonedPayment.failureReason).toBe("ABANDONED");
  });
});