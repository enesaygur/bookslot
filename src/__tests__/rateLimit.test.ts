import express from "express";
import request from "supertest";
import { createRateLimiter } from "../middleware/rateLimit";
import { errorHandler } from "../middleware/errorHandler";

describe("rate limiter", () => {
  it("returns a standard 429 error once the limit is exceeded", async () => {
    const app = express();
    app.use(createRateLimiter({ windowMs: 60_000, limit: 2, skip: () => false }));
    app.get("/ping", (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);

    expect((await request(app).get("/ping")).status).toBe(200);
    expect((await request(app).get("/ping")).status).toBe(200);

    const blocked = await request(app).get("/ping");
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("RATE_LIMITED");
    expect(blocked.headers["retry-after"]).toBeDefined();
  });
});