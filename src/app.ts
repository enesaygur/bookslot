import express from "express";
import { prisma } from "./lib/prisma";
import { AppError } from "./errors/AppError";
import { errorHandler } from "./middleware/errorHandler";
import authRouter from "./routes/authRoutes";
import businessRouter from "./routes/businessRoutes";
import inviteRouter from "./routes/inviteRoutes";
import publicRouter from "./routes/publicRoutes";
import manageRouter from "./routes/manageRoutes";
import paymentRouter from "./routes/paymentRoutes";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { globalLimiter } from "./middleware/rateLimit";
import { pingRedis } from "./lib/redis";

const app = express();

if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
app.use(globalLimiter);

app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/health/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ db: "unreachable" });
  }
});
app.get("/health/redis", async (_req, res) => {
  try {
    res.json({ redis: await pingRedis() });
  } catch {
    res.status(503).json({ redis: "unreachable" });
  }
});

app.use("/auth", authRouter);
app.use("/businesses", businessRouter);
app.use("/invites", inviteRouter);
app.use("/public", publicRouter);
app.use("/manage", manageRouter);
app.use("/payments", paymentRouter);

app.use((_req, _res, next) => {
  next(new AppError(404, "Route not found", "NOT_FOUND"));
});

app.use(errorHandler);

export default app;
