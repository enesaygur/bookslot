import request from "supertest";
import { MemberRole } from "@prisma/client";
import app from "../app";
import { prisma } from "../lib/prisma";
import { signAccessToken } from "../lib/jwt";
import { resetDb, createBusinessFixture } from "../test/helpers";

describe("appointment listing", () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it("shows owners everything and staff only their own, by local day", async () => {
    const f = await createBusinessFixture();

    const staffUser = await prisma.user.create({
      data: {
        name: "Staff",
        email: "staff@test.com",
        passwordHash: "x",
        emailVerifiedAt: new Date(),
      },
    });
    const staff = await prisma.member.create({
      data: {
        userId: staffUser.id,
        businessId: f.business.id,
        role: MemberRole.STAFF,
      },
    });
    const staffToken = signAccessToken(staffUser.id);

    const make = (memberId: string, start: string, end: string) =>
      prisma.appointment.create({
        data: {
          businessId: f.business.id,
          memberId,
          serviceId: f.service.id,
          startsAt: new Date(start),
          endsAt: new Date(end),
          priceCents: 0,
          customerName: "Test",
          customerEmail: "test@example.com",
        },
      });

    await make(f.member.id, "2030-01-07T06:00:00Z", "2030-01-07T06:30:00Z");
    await make(staff.id, "2030-01-07T07:00:00Z", "2030-01-07T07:30:00Z");
    await make(f.member.id, "2030-01-07T21:30:00Z", "2030-01-07T22:00:00Z");

    const list = (token: string, query: Record<string, string>) =>
      request(app)
        .get(`/businesses/${f.business.id}/appointments`)
        .query(query)
        .set("Authorization", `Bearer ${token}`);

    const owner = await list(f.token, { from: "2030-01-07", to: "2030-01-07" });
    console.log("STATUS:", owner.status);
    console.log("BODY:", JSON.stringify(owner.body, null, 2));
    console.log("TEXT:", owner.text);
    expect(owner.body.appointments).toHaveLength(2);

    const staffView = await list(staffToken, {
      from: "2030-01-07",
      to: "2030-01-07",
      memberId: f.member.id,
    });
    expect(staffView.body.appointments).toHaveLength(1);
    expect(staffView.body.appointments[0].memberName).toBe("Staff");

    const nextDay = await list(f.token, {
      from: "2030-01-08",
      to: "2030-01-08",
    });
    expect(nextDay.body.appointments).toHaveLength(1);

    const tooWide = await list(f.token, {
      from: "2030-01-01",
      to: "2030-03-01",
    });
    expect(tooWide.status).toBe(400);
  });
});
