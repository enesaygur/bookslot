import request from "supertest";
import { DateTime } from "luxon";
import app from "../app";
import { prisma } from "../lib/prisma";
import { iyzico } from "../lib/iyzico";
import { resetDb, createBusinessFixture } from "../test/helpers";

jest.mock("../lib/iyzico", () => ({
  iyzico: { checkoutFormInitialize: { create: jest.fn() } },
  iyzicoCall: (run: (done: (err: unknown, result: unknown) => void) => void) =>
    new Promise((resolve, reject) =>
      run((err, result) => (err ? reject(err) : resolve(result))),
    ),
}));

const createMock = (iyzico as unknown as {
  checkoutFormInitialize: { create: jest.Mock };
}).checkoutFormInitialize.create;

const succeed = (token: string) =>
  createMock.mockImplementation((_req: unknown, done: (e: unknown, r: unknown) => void) =>
    done(null, { status: "success", token, paymentPageUrl: `https://pay.test/${token}` }),
  );

const fail = () =>
  createMock.mockImplementation((_req: unknown, done: (e: unknown, r: unknown) => void) =>
    done(null, { status: "failure", errorMessage: "rejected" }),
  );

async function setup() {
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
  const date = DateTime.now().plus({ days: 7 }).toISODate() as string;
  const availability = await request(app)
    .get("/public/test-salon/availability")
    .query({ date, serviceId: service.id, memberId: f.member.id });
  const startsAt: string = availability.body.slots[0].start;

  const book = (email: string) =>
    request(app).post("/public/test-salon/appointments").send({
      memberId: f.member.id,
      serviceId: service.id,
      startsAt,
      customerName: "Ayse Yilmaz",
      customerEmail: email,
    });

  return { f, book };
}

describe("payment checkout", () => {
  beforeEach(async () => {
    await resetDb();
    createMock.mockReset();
  });
  afterAll(() => prisma.$disconnect());

  it("holds the slot and returns the payment page for a deposit service", async () => {
    succeed("tok-1");
    const { book } = await setup();

    const res = await book("a@test.com");

    expect(res.status).toBe(201);
    expect(res.body.appointment.status).toBe("PENDING_PAYMENT");
    expect(res.body.appointment.payment.pageUrl).toBe("https://pay.test/tok-1");
    expect(res.body.appointment.payment.amountCents).toBe(10000);

    const payment = await prisma.payment.findFirstOrThrow();
    expect(payment.providerToken).toBe("tok-1");
    expect(payment.status).toBe("PENDING");

    const sentPrice = createMock.mock.calls[0][0].price;
    expect(sentPrice).toBe("100.00");

    const taken = await book("b@test.com");
    expect(taken.status).toBe(409);
  });

  it("releases the slot when the provider rejects the checkout", async () => {
    fail();
    const { book } = await setup();

    const res = await book("a@test.com");
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe("PAYMENT_INIT_FAILED");

    const appointment = await prisma.appointment.findFirstOrThrow();
    expect(appointment.status).toBe("CANCELLED");
    expect((await prisma.payment.findFirstOrThrow()).status).toBe("FAILED");

    succeed("tok-2");
    const retry = await book("c@test.com");
    expect(retry.status).toBe(201);
  });
});