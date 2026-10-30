import express from "express";
import { prisma } from "./lib/prisma";
import { AppError } from "./errors/AppError";
import { errorHandler } from "./middleware/errorHandler";
import authRouter from "./routes/authRoutes";
import businessRouter from "./routes/businessRoutes";
import inviteRouter from "./routes/inviteRoutes"
import cookieParser from "cookie-parser";

const app = express();

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

app.use("/auth", authRouter);
app.use("/businesses", businessRouter);
app.use("/invites", inviteRouter)

app.use((_req, _res, next) => {
  next(new AppError(404, "Route not found", "NOT_FOUND"));
});

app.use(errorHandler);

export default app;
