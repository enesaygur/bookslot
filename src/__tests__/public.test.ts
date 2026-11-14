import request from "supertest";
import { MemberRole } from "@prisma/client";
import app from "../app";
import { prisma } from "../lib/prisma";
import { resetDb, createBusinessFixture } from "../test/helpers";

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
      data: { userId: idleUser.id, businessId: f.business.id, role: MemberRole.STAFF },
    });

    const res = await request(app).get("/public/test-salon");

    expect(res.status).toBe(200);
    expect(res.body.business.services).toHaveLength(1);
    expect(res.body.business.members).toEqual([{ id: f.member.id, name: "Owner" }]);
    expect(JSON.stringify(res.body)).not.toContain("@test.com");

    const missing = await request(app).get("/public/does-not-exist");
    expect(missing.status).toBe(404);
  });
});