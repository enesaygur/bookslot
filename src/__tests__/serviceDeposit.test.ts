import request from "supertest";
import app from "../app";
import { prisma } from "../lib/prisma";
import { resetDb, createBusinessFixture } from "../test/helpers";

describe("service deposit", () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it("keeps the deposit within the price", async () => {
    const f = await createBusinessFixture();
    const auth = { Authorization: `Bearer ${f.token}` };
    const url = `/businesses/${f.business.id}/services`;

    const tooHigh = await request(app)
      .post(url)
      .set(auth)
      .send({ name: "Color", durationMinutes: 60, priceCents: 50000, depositCents: 60000 });
    expect(tooHigh.status).toBe(400);

    const created = await request(app)
      .post(url)
      .set(auth)
      .send({ name: "Color", durationMinutes: 60, priceCents: 50000, depositCents: 10000 });
    expect(created.status).toBe(201);
    expect(created.body.service.depositCents).toBe(10000);

    const priceDrop = await request(app)
      .patch(`${url}/${created.body.service.id}`)
      .set(auth)
      .send({ priceCents: 5000 });
    expect(priceDrop.status).toBe(400);
    expect(priceDrop.body.error.code).toBe("INVALID_DEPOSIT");

    const noDeposit = await request(app)
      .post(url)
      .set(auth)
      .send({ name: "Cut", durationMinutes: 30, priceCents: 25000 });
    expect(noDeposit.body.service.depositCents).toBe(0);
  });
});