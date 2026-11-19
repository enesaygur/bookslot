import { sendEmail } from "../lib/mailer";
import { prisma } from "../lib/prisma";
import { sendDueReminders } from "../services/reminderService";
import { AppointmentStatus } from "@prisma/client";
import { resetDb, createBusinessFixture } from "../test/helpers";

jest.mock("../lib/mailer", () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

const sendEmailMock = sendEmail as jest.Mock;
const HOUR = 3_600_000;

describe("appointment reminders", () => {
  beforeEach(async () => {
    await resetDb();
    sendEmailMock.mockClear();
  });
  afterAll(() => prisma.$disconnect());

  it("reminds only advance-booked, active appointments within 24 hours, once", async () => {
    const f = await createBusinessFixture();
    const now = new Date();

    const make = (
      email: string,
      startsInHours: number,
      createdHoursAgo: number,
      status: AppointmentStatus = AppointmentStatus.CONFIRMED,
    ) =>
      prisma.appointment.create({
        data: {
          businessId: f.business.id,
          memberId: f.member.id,
          serviceId: f.service.id,
          startsAt: new Date(now.getTime() + startsInHours * HOUR),
          endsAt: new Date(now.getTime() + startsInHours * HOUR + 30 * 60_000),
          createdAt: new Date(now.getTime() - createdHoursAgo * HOUR),
          status,
          priceCents: 0,
          customerName: "Test",
          customerEmail: email,
        },
      });

    await make("a@test.com", 20, 72);
    await make("b@test.com", 30, 72);
    const late = await make("c@test.com", 21, 1);
    await make("d@test.com", 20, 72, AppointmentStatus.CANCELLED);

    expect(await sendDueReminders(now)).toBe(1);
    expect(sendEmailMock.mock.calls.map((call) => call[0].to)).toEqual(["a@test.com"]);
    expect(sendEmailMock.mock.calls[0][0].subject).toContain("hatırlatması");

    const processed = await prisma.appointment.findUniqueOrThrow({ where: { id: late.id } });
    expect(processed.reminderProcessedAt).not.toBeNull();

    sendEmailMock.mockClear();
    expect(await sendDueReminders(now)).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});