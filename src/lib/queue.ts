import { Queue, type JobsOptions } from "bullmq";
import { EMAIL_QUEUE } from "./queueNames";
import { redis } from "./redis";
import { sendEmail, type Email } from "./mailer";
import { withTimeout } from "./timeout";

const emailJobOptions: JobsOptions = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 10_000,
  },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

export const emailQueue = redis
  ? new Queue<Email>(EMAIL_QUEUE, { connection: redis })
  : null;

export async function enqueueEmail(email: Email): Promise<void> {
  if (emailQueue) {
    try {
      await withTimeout(
        emailQueue.add("send", email, emailJobOptions),
        3000,
        "Queue add",
      );
      return;
    } catch (err) {
      console.error("[queue] could not enqueue email, sending directly", err);
    }
  }
  await sendEmail(email);
}
