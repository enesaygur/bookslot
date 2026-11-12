import request from "supertest";
import { DateTime } from "luxon";
import { AppointmentStatus } from "@prisma/client";
import app from "../app";
import { prisma } from "../lib/prisma";
import { isOverlapViolation } from "../lib/dbErrors";
import { resetDb, createBusinessFixture, type Fixture } from "../test/helpers";

const row = (
  f: Fixture,
  start: string,
  end: string,
  status: AppointmentStatus = AppointmentStatus.CONFIRMED,
) => ({
  businessId: f.business.id,
  memberId: f.member.id,
  serviceId: f.service.id,
  startsAt: new Date(start),
  endsAt: new Date(end),
  status,
  priceCents: 0,
  customerName: "Test",
  customerEmail: "test@example.com",
});

describe("appointment overlap protection", () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it("allows exactly one booking when many requests hit the same slot", async () => {
    const f = await createBusinessFixture();
    const auth = { Authorization: `Bearer ${f.token}` };
    const date = DateTime.now().plus({ days: 7 }).toISODate() as string;

    const availability = await request(app)
      .get(`/businesses/${f.business.id}/availability`)
      .query({ date, serviceId: f.service.id, memberId: f.member.id })
      .set(auth);
    const startsAt: string = availability.body.slots[0].start;

    const responses = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post(`/businesses/${f.business.id}/appointments`)
          .set(auth)
          .send({
            memberId: f.member.id,
            serviceId: f.service.id,
            startsAt,
            customerName: `Racer ${i}`,
            customerEmail: `racer${i}@example.com`,
          }),
      ),
    );

    expect(responses.map((r) => r.status).sort()).toEqual([
      201, 409, 409, 409, 409,
    ]);
    expect(
      await prisma.appointment.count({ where: { memberId: f.member.id } }),
    ).toBe(1);
  });

  it("rejects overlapping rows at the database level", async () => {
    const f = await createBusinessFixture();
    await prisma.appointment.create({
      data: row(f, "2030-01-07T06:00:00Z", "2030-01-07T06:30:00Z"),
    });

    const error = await prisma.appointment
      .create({ data: row(f, "2030-01-07T06:15:00Z", "2030-01-07T06:45:00Z") })
      .then(
        () => null,
        (err) => err,
      );

    expect(isOverlapViolation(error)).toBe(true);
  });

  it("allows back-to-back rows and ignores cancelled ones", async () => {
    const f = await createBusinessFixture();
    await prisma.appointment.create({
      data: row(f, "2030-01-07T06:00:00Z", "2030-01-07T06:30:00Z"),
    });

    await prisma.appointment.create({
      data: row(f, "2030-01-07T06:30:00Z", "2030-01-07T07:00:00Z"),
    });
    await prisma.appointment.create({
      data: row(
        f,
        "2030-01-07T06:00:00Z",
        "2030-01-07T06:30:00Z",
        AppointmentStatus.CANCELLED,
      ),
    });

    expect(await prisma.appointment.count()).toBe(3);
  });
});
