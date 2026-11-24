import request from "supertest";
import { DateTime } from "luxon";
import app from "../app";
import { prisma } from "../lib/prisma";
import { iyzico } from "../lib/iyzico";
import { sendEmail } from "../lib/mailer";
import { resetDb, createBusinessFixture } from "../test/helpers";

jest.mock("../lib/iyzico", () => ({
  iyzico: {
    checkoutFormInitialize: { create: jest.fn() },
    checkoutForm: { retrieve: jest.fn() },
  },
  iyzicoCall: (run: (done: (err: unknown, result: unknown) => void) => void) =>
    new Promise((resolve, reject) =>
      run((err, result) => (err ? reject(err) : resolve(result))),
    ),
}));

jest.mock("../lib/mailer", () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

type Done = (err: unknown, result: unknown) => void;

const client = iyzico as unknown as {
  checkoutFormInitialize: { create: jest.Mock };
  checkoutForm: { retrieve: jest.Mock };
};
const sendEmailMock = sendEmail as jest.Mock;

async function bookDepositAppointment() {
  const f = await createBusinessFixture();
  const service = await prisma.service.create({
    data: {
      businessId: f.business.id,
      name: "Color",
      durationMinutes: 60,
      priceCents: 50000,
      depositCents: 10000,
    },
  });

  client.checkoutFormInitialize.create.mockImplementation((_req: unknown, done: Done) =>
    done(null, { status: "success", token: "tok-1", paymentPageUrl: "https://pay.test/tok-1" }),
  );

  const date = DateTime.now().plus({ days: 7 }).toISODate() as string;
  const availability = await request(app)
    .get("/public/test-salon/availability")
    .query({ date, serviceId: service.id, memberId: f.member.id });

  await request(app).post("/public/test-salon/appointments").send({
    memberId: f.member.id,
    serviceId: service.id,
    startsAt: availability.body.slots[0].start,
    customerName: "Ayse Yilmaz",
    customerEmail: "ayse@test.com",
  });

  const appointment = await prisma.appointment.findFirstOrThrow();
  const payment = await prisma.payment.findFirstOrThrow();
  sendEmailMock.mockClear();

  return { appointment, payment };
}

const retrieveReturns = (
  payment: { id: string },
  appointment: { id: string },
  overrides: Record<string, unknown> = {},
) =>
  client.checkoutForm.retrieve.mockImplementation((_req: unknown, done: Done) =>
    done(null, {
      status: "success",
      paymentStatus: "SUCCESS",
      paymentId: "pay-9",
      conversationId: payment.id,
      basketId: appointment.id,
      paidPrice: 100,
      ...overrides,
    }),
  );

const callback = () =>
  request(app).post("/payments/iyzico/callback").type("form").send({ token: "tok-1" });

describe("iyzico callback", () => {
  beforeEach(async () => {
    await resetDb();
    client.checkoutFormInitialize.create.mockReset();
    client.checkoutForm.retrieve.mockReset();
    sendEmailMock.mockClear();
  });
  afterAll(() => prisma.$disconnect());

  it("confirms the appointment once, even if the callback repeats", async () => {
    const { appointment, payment } = await bookDepositAppointment();
    retrieveReturns(payment, appointment);

    const first = await callback();
    expect(first.status).toBe(303);
    expect(first.headers.location).toContain("status=success");

    const confirmed = await prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
    expect(confirmed.status).toBe("CONFIRMED");
    expect(confirmed.holdExpiresAt).toBeNull();

    const paid = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(paid.status).toBe("PAID");
    expect(paid.providerPaymentId).toBe("pay-9");

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0][0].text).toContain("/manage?token=");

    const second = await callback();
    expect(second.headers.location).toContain("status=success");
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(client.checkoutForm.retrieve).toHaveBeenCalledTimes(1);
  });

  it("releases the slot when the payment fails", async () => {
    const { appointment, payment } = await bookDepositAppointment();
    retrieveReturns(payment, appointment, {
      paymentStatus: "FAILURE",
      errorMessage: "declined",
    });

    const res = await callback();
    expect(res.headers.location).toContain("status=failed");

    const cancelled = await prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
    expect(cancelled.status).toBe("CANCELLED");

    const failed = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(failed.status).toBe("FAILED");
    expect(failed.failureReason).toBe("declined");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("does not confirm when the paid amount does not match", async () => {
    const { appointment, payment } = await bookDepositAppointment();
    retrieveReturns(payment, appointment, { paidPrice: 1 });

    const res = await callback();
    expect(res.headers.location).toContain("status=error");

    const untouched = await prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
    expect(untouched.status).toBe("PENDING_PAYMENT");
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe(
      "PENDING",
    );
  });

  it("flags a payment that arrives after the appointment was released", async () => {
    const { appointment, payment } = await bookDepositAppointment();
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "CANCELLED" },
    });
    retrieveReturns(payment, appointment);

    const res = await callback();
    expect(res.headers.location).toContain("status=late");

    const flagged = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(flagged.status).toBe("PAID");
    expect(flagged.failureReason).toBe("PAID_AFTER_CANCELLATION");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});