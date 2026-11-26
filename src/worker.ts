import { Queue, UnrecoverableError, Worker } from "bullmq";
import { redis } from "./lib/redis";
import { EMAIL_QUEUE, MAINTENANCE_QUEUE } from "./lib/queueNames";
import { type Email, sendEmail } from "./lib/mailer";
import { EmailSendError, isPermanentEmailFailure } from "./lib/emailErrors";
import { sendDueReminders } from "./services/reminderService";
import { prisma } from "./lib/prisma";
import { cleanupExpired } from "./services/cleanupService";
import { releaseExpiredHolds } from "./services/paymentExpiryService";

if (!redis) {
  console.error("[worker] REDIS_URL is not set, nothing to process");
  process.exit(1);
}

const connection = redis;

const emailWorker = new Worker<Email>(
  EMAIL_QUEUE,
  async (job) => {
    try {
      await sendEmail(job.data);
    } catch (err) {
      if (
        err instanceof EmailSendError &&
        isPermanentEmailFailure(err.statusCode)
      ) {
        throw new UnrecoverableError(err.message);
      }
      throw err;
    }
  },
  { connection, concurrency: 5 },
);

emailWorker.on("completed", (job) => {
  console.log(`[worker] email job ${job.id} sent`);
});

emailWorker.on("failed", (job, err) => {
  console.error(
    `[worker] email job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`,
  );
});

emailWorker.on("error", (err) => {
  console.error("[worker] error", err);
});

const maintenanceQueue = new Queue(MAINTENANCE_QUEUE, { connection });

const maintenanceJobOptions = {
  removeOnComplete: { count: 20 },
  removeOnFail: { count: 100 },
};

maintenanceQueue
  .upsertJobScheduler(
    "send-reminders",
    { every: 5 * 60_000 },
    { name: "send-reminders", opts: maintenanceJobOptions },
  )
  .catch((err) => console.error("[worker] could not schedule reminders", err));

maintenanceQueue
  .upsertJobScheduler(
    "cleanup-expired",
    { pattern: "0 3 * * *" },
    { name: "cleanup-expired", opts: maintenanceJobOptions },
  )
  .catch((err) => console.error("[worker] could not schedule cleanup", err));

maintenanceQueue
  .upsertJobScheduler(
    "release-expired-holds",
    { every: 60_000 },
    { name: "release-expired-holds", opts: maintenanceJobOptions },
  )
  .catch((err) =>
    console.error("[worker] could not schedule hold expiry", err),
  );

const maintenanceWorker = new Worker(
  MAINTENANCE_QUEUE,
  async (job) => {
    if (job.name === "send-reminders") {
      const count = await sendDueReminders();
      if (count > 0) console.log(`[worker] queued ${count} reminder email(s)`);
    }

    if (job.name === "cleanup-expired") {
      const result = await cleanupExpired();
      console.log("[worker] cleanup done", result);
    }

    if (job.name === "release-expired-holds") {
      const result = await releaseExpiredHolds();
      if (result.releasedAppointments > 0 || result.abandonedPayments > 0) {
        console.log("[worker] released holds", result);
      }
    }
  },
  { connection },
);

maintenanceWorker.on("failed", (job, err) => {
  console.error(`[worker] ${job?.name} failed: ${err.message}`);
});

maintenanceWorker.on("error", (err) => {
  console.error("[worker] maintenance error", err);
});

async function shutdown() {
  await emailWorker.close();
  await maintenanceWorker.close();
  await maintenanceQueue.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("[worker] started");
