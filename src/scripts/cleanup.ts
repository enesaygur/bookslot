import { prisma } from "../lib/prisma";
import { cleanupExpired } from "../services/cleanupService";

cleanupExpired()
  .then((result) => console.log("Cleanup done:", result))
  .finally(() => prisma.$disconnect());
