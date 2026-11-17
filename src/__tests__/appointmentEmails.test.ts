import request from "supertest";
import { DateTime } from "luxon";
import app from "../app";
import { prisma } from "../lib/prisma";
import { sendEmail } from "../lib/mailer";
import { resetDb, createBusinessFixture } from "../test/helpers";

jest.mock("../lib/mailer", () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

const sendEmailMock = sendEmail as jest.Mock;

describe("appointment emails", () => {
  beforeEach(async () => {
    await resetDb();
    sendEmailMock.mockClear();
  });
  afterAll(() => prisma.$disconnect());

  it("emails the guest when booking, rescheduling and cancelling", async () => {
    const f = await createBusinessFixture();
    const date = DateTime.now().plus({ days: 7 }).toISODate() as string;

    const availability = await request(app)
      .get("/public/test-salon/availability")
      .query({ date, serviceId: f.service.id, memberId: f.member.id });
    const slots: { start: string }[] = availability.body.slots;

    const booked = await request(app).post("/public/test-salon/appointments").send({
      memberId: f.member.id,
      serviceId: f.service.id,
      startsAt: slots[0].start,
      customerName: "Guest",
      customerEmail: "guest@example.com",
    });
    const token: string = booked.body.appointment.manageToken;

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const confirmation = sendEmailMock.mock.calls[0][0];
    expect(confirmation.to).toBe("guest@example.com");
    expect(confirmation.subject).toContain("onaylandı");
    expect(confirmation.text).toContain(`/manage?token=${token}`);

    await request(app)
      .patch("/manage/appointment")
      .set("x-manage-token", token)
      .send({ startsAt: slots[4].start });
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(sendEmailMock.mock.calls[1][0].subject).toContain("taşındı");

    await request(app).post("/manage/appointment/cancel").set("x-manage-token", token);
    expect(sendEmailMock).toHaveBeenCalledTimes(3);
    expect(sendEmailMock.mock.calls[2][0].subject).toContain("iptal");

    await request(app).post("/manage/appointment/cancel").set("x-manage-token", token);
    expect(sendEmailMock).toHaveBeenCalledTimes(3);
  });
});