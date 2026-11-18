import { UnrecoverableError, Worker } from "bullmq";
import { redis } from "./lib/redis";
import { EMAIL_QUEUE } from "./lib/queueNames";
import { type Email, sendEmail } from "./lib/mailer";
import { EmailSendError, isPermanentEmailFailure } from "./lib/emailErrors";

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

async function shutdown() {
  await emailWorker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("[worker] started");
