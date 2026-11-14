import request from "supertest";
import { MemberRole } from "@prisma/client";
import app from "../app";
import { prisma } from "../lib/prisma";
import { resetDb, createBusinessFixture } from "../test/helpers";
import { DateTime } from "luxon";

describe("public business info", () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it("exposes only bookable data without authentication", async () => {
    const f = await createBusinessFixture();

    await prisma.service.create({
      data: {
        businessId: f.business.id,
        name: "Hidden",
        durationMinutes: 30,
        priceCents: 1000,
        isActive: false,
      },
    });

    const idleUser = await prisma.user.create({
      data: {
        name: "Idle",
        email: "idle@test.com",
        passwordHash: "x",
        emailVerifiedAt: new Date(),
      },
    });
    await prisma.member.create({
      data: {
        userId: idleUser.id,
        businessId: f.business.id,
        role: MemberRole.STAFF,
      },
    });

    const res = await request(app).get("/public/test-salon");

    expect(res.status).toBe(200);
    expect(res.body.business.services).toHaveLength(1);
    expect(res.body.business.members).toEqual([
      { id: f.member.id, name: "Owner" },
    ]);
    expect(JSON.stringify(res.body)).not.toContain("@test.com");

    const missing = await request(app).get("/public/does-not-exist");
    expect(missing.status).toBe(404);
  });

  it("serves slots without auth and enforces the booking horizon", async () => {
    const f = await createBusinessFixture();
    const soon = DateTime.now().plus({ days: 7 }).toISODate() as string;
    const far = DateTime.now().plus({ days: 200 }).toISODate() as string;
    const query = (date: string) => ({
      date,
      serviceId: f.service.id,
      memberId: f.member.id,
    });

    const ok = await request(app)
      .get("/public/test-salon/availability")
      .query(query(soon));
    expect(ok.status).toBe(200);
    expect(ok.body.slots.length).toBeGreaterThan(0);

    const tooFar = await request(app)
      .get("/public/test-salon/availability")
      .query(query(far));
    expect(tooFar.status).toBe(400);
    expect(tooFar.body.error.code).toBe("DATE_TOO_FAR");

    const missing = await request(app)
      .get("/public/nope/availability")
      .query(query(soon));
    expect(missing.status).toBe(404);

    const wrongService = await request(app)
      .get("/public/test-salon/availability")
      .query({
        ...query(soon),
        serviceId: "00000000-0000-4000-8000-000000000000",
      });
    expect(wrongService.status).toBe(404);
  });

  it("books without authentication and limits upcoming appointments per email", async () => {
    const f = await createBusinessFixture();
    const date = DateTime.now().plus({ days: 7 }).toISODate() as string;

    const availability = await request(app)
      .get("/public/test-salon/availability")
      .query({ date, serviceId: f.service.id, memberId: f.member.id });
    const slots: { start: string }[] = availability.body.slots;

    const book = (startsAt: string, email = "guest@example.com") =>
      request(app).post("/public/test-salon/appointments").send({
        memberId: f.member.id,
        serviceId: f.service.id,
        startsAt,
        customerName: "Guest",
        customerEmail: email,
      });

    const first = await book(slots[0].start);
    expect(first.status).toBe(201);
    expect(Object.keys(first.body.appointment).sort()).toEqual([
      "endsAt",
      "id",
      "priceCents",
      "startsAt",
      "status",
    ]);

    const clash = await book(slots[0].start, "other@example.com");
    expect(clash.status).toBe(409);

    const results = [first.status];
    for (const index of [2, 4, 6]) {
      results.push((await book(slots[index].start)).status);
    }
    expect(results).toEqual([201, 201, 201, 429]);

    const far = DateTime.now().plus({ days: 200 }).toUTC().toISO() as string;
    const tooFar = await book(far, "late@example.com");
    expect(tooFar.status).toBe(400);
    expect(tooFar.body.error.code).toBe("DATE_TOO_FAR");
  });
});
