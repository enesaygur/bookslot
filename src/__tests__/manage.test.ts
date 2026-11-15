import request from "supertest";
import { DateTime } from "luxon";
import app from "../app";
import { prisma } from "../lib/prisma";
import { resetDb, createBusinessFixture } from "../test/helpers";

describe("guest appointment management", () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it("lets a guest view, reschedule and cancel with the secret token", async () => {
    const f = await createBusinessFixture();
    const date = DateTime.now().plus({ days: 7 }).toISODate() as string;

    const availability = await request(app)
      .get("/public/test-salon/availability")
      .query({ date, serviceId: f.service.id, memberId: f.member.id });
    const slots: { start: string }[] = availability.body.slots;

    const booked = await request(app).post("/public/test-salon/appointments").send({
      memberId: f.member.id,
      serviceId: f.service.id,
      startsAt: slots[0].start,
      customerName: "Guest",
      customerEmail: "guest@example.com",
    });
    const token: string = booked.body.appointment.manageToken;

    const view = await request(app).get("/manage/appointment").set("x-manage-token", token);
    expect(view.status).toBe(200);
    expect(view.body.appointment).toMatchObject({
      status: "CONFIRMED",
      serviceName: "Cut",
      canModify: true,
    });
    expect(JSON.stringify(view.body)).not.toContain("manageToken");

    const wrong = await request(app).get("/manage/appointment").set("x-manage-token", "wrong");
    expect(wrong.status).toBe(404);
    const missing = await request(app).get("/manage/appointment");
    expect(missing.status).toBe(404);

    const moved = await request(app)
      .patch("/manage/appointment")
      .set("x-manage-token", token)
      .send({ startsAt: slots[4].start });
    expect(moved.status).toBe(200);
    expect(moved.body.appointment.startsAt).toBe(slots[4].start);

    const cancelled = await request(app)
      .post("/manage/appointment/cancel")
      .set("x-manage-token", token);
    expect(cancelled.body.appointment).toMatchObject({ status: "CANCELLED", canModify: false });

    const again = await request(app)
      .post("/manage/appointment/cancel")
      .set("x-manage-token", token);
    expect(again.status).toBe(200);
  });
});