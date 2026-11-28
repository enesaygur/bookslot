import request from "supertest";
import { MemberRole } from "@prisma/client";
import app from "../app";
import { prisma } from "../lib/prisma";
import { signAccessToken } from "../lib/jwt";
import { resetDb, createBusinessFixture, type Fixture } from "../test/helpers";

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

async function addStaff(f: Fixture) {
  const user = await prisma.user.create({
    data: {
      name: "Staff",
      email: `staff-${f.business.slug}@test.com`,
      passwordHash: "x",
      emailVerifiedAt: new Date(),
    },
  });
  const member = await prisma.member.create({
    data: { userId: user.id, businessId: f.business.id, role: MemberRole.STAFF },
  });
  return { user, member, token: signAccessToken(user.id) };
}

function addAppointment(f: Fixture, memberId: string, startsAt: string) {
  const start = new Date(startsAt);
  return prisma.appointment.create({
    data: {
      businessId: f.business.id,
      memberId,
      serviceId: f.service.id,
      startsAt: start,
      endsAt: new Date(start.getTime() + 30 * 60_000),
      priceCents: 0,
      customerName: "Guest",
      customerEmail: "guest@test.com",
    },
  });
}

describe("tenant isolation and roles", () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it("keeps business A closed to the owner of business B", async () => {
    const a = await createBusinessFixture();
    const b = await createBusinessFixture("-b");
    const base = `/businesses/${a.business.id}`;
    const auth = bearer(b.token);

    const responses = await Promise.all([
      request(app).get(base).set(auth),
      request(app).patch(base).set(auth).send({ name: "Hacked" }),
      request(app).get(`${base}/members`).set(auth),
      request(app).get(`${base}/services`).set(auth),
    ]);

    expect(responses.map((r) => r.status)).toEqual([403, 403, 403, 403]);
  });

  it("hides resources of another business behind 404", async () => {
    const a = await createBusinessFixture();
    const b = await createBusinessFixture("-b");
    const staffA = await addStaff(a);
    const appointmentA = await addAppointment(a, a.member.id, "2030-01-07T06:00:00Z");

    const own = `/businesses/${b.business.id}`;
    const auth = bearer(b.token);

    const responses = await Promise.all([
      request(app).get(`${own}/services/${a.service.id}`).set(auth),
      request(app).patch(`${own}/services/${a.service.id}`).set(auth).send({ name: "Hacked" }),
      request(app).delete(`${own}/services/${a.service.id}`).set(auth),
      request(app).delete(`${own}/members/${staffA.member.id}`).set(auth),
      request(app).put(`${own}/members/${a.member.id}/working-hours`).set(auth).send({ hours: [] }),
      request(app).post(`${own}/appointments/${appointmentA.id}/cancel`).set(auth),
      request(app)
        .patch(`${own}/appointments/${appointmentA.id}`)
        .set(auth)
        .send({ startsAt: "2030-01-07T08:00:00.000Z" }),
      request(app)
        .get(`${own}/availability`)
        .query({ date: "2030-01-07", serviceId: b.service.id, memberId: a.member.id })
        .set(auth),
    ]);

    expect(responses.map((r) => r.status)).toEqual([404, 404, 404, 404, 404, 404, 404, 404]);

    const untouched = await prisma.appointment.findUniqueOrThrow({ where: { id: appointmentA.id } });
    expect(untouched.status).toBe("CONFIRMED");
    expect(await prisma.member.count({ where: { id: staffA.member.id } })).toBe(1);

    const service = await prisma.service.findUniqueOrThrow({ where: { id: a.service.id } });
    expect(service.isActive).toBe(true);
    expect(service.name).toBe("Cut");
  });

  it("limits staff to what their role allows", async () => {
    const a = await createBusinessFixture();
    const staff = await addStaff(a);
    const ownerAppointment = await addAppointment(a, a.member.id, "2030-01-07T06:00:00Z");
    const staffAppointment = await addAppointment(a, staff.member.id, "2030-01-07T07:00:00Z");

    const base = `/businesses/${a.business.id}`;
    const auth = bearer(staff.token);

    const readable = await request(app).get(`${base}/services`).set(auth);
    expect(readable.status).toBe(200);

    const forbidden = await Promise.all([
      request(app)
        .post(`${base}/services`)
        .set(auth)
        .send({ name: "Color", durationMinutes: 60, priceCents: 1000 }),
      request(app).patch(base).set(auth).send({ name: "Mine now" }),
      request(app).post(`${base}/invites`).set(auth).send({ email: "new@test.com" }),
      request(app).delete(`${base}/members/${staff.member.id}`).set(auth),
      request(app).put(`${base}/members/${a.member.id}/working-hours`).set(auth).send({ hours: [] }),
      request(app).post(`${base}/appointments/${ownerAppointment.id}/cancel`).set(auth),
    ]);
    expect(forbidden.map((r) => r.status)).toEqual([403, 403, 403, 403, 403, 403]);

    const ownHours = await request(app)
      .put(`${base}/members/${staff.member.id}/working-hours`)
      .set(auth)
      .send({ hours: [{ dayOfWeek: 1, start: "09:00", end: "17:00" }] });
    expect(ownHours.status).toBe(200);

    const ownCancel = await request(app)
      .post(`${base}/appointments/${staffAppointment.id}/cancel`)
      .set(auth);
    expect(ownCancel.status).toBe(200);
    expect(ownCancel.body.appointment.status).toBe("CANCELLED");
  });

  it("rejects requests without a valid access token", async () => {
    const a = await createBusinessFixture();
    const base = `/businesses/${a.business.id}`;

    const responses = await Promise.all([
      request(app).get("/businesses"),
      request(app).get(base),
      request(app).post(`${base}/appointments`).send({}),
      request(app).get(`${base}/appointments`).query({ from: "2030-01-07", to: "2030-01-07" }),
    ]);

    expect(responses.map((r) => r.status)).toEqual([401, 401, 401, 401]);
  });
});