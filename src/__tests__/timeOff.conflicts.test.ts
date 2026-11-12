import request from "supertest";
import { AppointmentStatus } from "@prisma/client";
import app from "../app";
import { prisma } from "../lib/prisma";
import { resetDb, createBusinessFixture } from "../test/helpers";

describe("time off conflicts", () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it("reports active appointments on the business's local days only", async () => {
    const f = await createBusinessFixture();
    const make = (start: string, end: string, status: AppointmentStatus) =>
      prisma.appointment.create({
        data: {
          businessId: f.business.id,
          memberId: f.member.id,
          serviceId: f.service.id,
          startsAt: new Date(start),
          endsAt: new Date(end),
          status,
          priceCents: 0,
          customerName: "Test",
          customerEmail: "test@example.com",
        },
      });

    const inside = await make("2030-01-07T06:00:00Z", "2030-01-07T06:30:00Z", AppointmentStatus.CONFIRMED);
    await make("2030-01-07T07:00:00Z", "2030-01-07T07:30:00Z", AppointmentStatus.CANCELLED);
    await make("2030-01-07T21:30:00Z", "2030-01-07T22:00:00Z", AppointmentStatus.CONFIRMED);

    const res = await request(app)
      .post(`/businesses/${f.business.id}/members/${f.member.id}/time-off`)
      .set("Authorization", `Bearer ${f.token}`)
      .send({ startDate: "2030-01-07", endDate: "2030-01-07" });

    expect(res.status).toBe(201);
    expect(res.body.conflicts.map((c: { id: string }) => c.id)).toEqual([inside.id]);
  });
});