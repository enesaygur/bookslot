import request from "supertest";
import app from "../app";

describe("health endpoints", () => {
  it("reports ok and a disabled redis in the test environment", async () => {
    const health = await request(app).get("/health");
    expect(health.status).toBe(200);

    const redis = await request(app).get("/health/redis");
    expect(redis.status).toBe(200);
    expect(redis.body).toEqual({ redis: "disabled" });
  });
});