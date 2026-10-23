import express from "express";
import { prisma } from "./lib/prisma";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "OK" });
});

app.get("/health/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "DB health is OK" });
  } catch {
    res.status(503).json({ db: "unreachable" });
  }
});

export default app;
