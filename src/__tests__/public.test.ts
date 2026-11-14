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
});
