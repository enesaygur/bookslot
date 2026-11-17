import IORedis from "ioredis";
import { env } from "../config/env";

const url = env.NODE_ENV === "test" ? undefined : env.REDIS_URL;

export const redis = url
  ? new IORedis(url, { maxRetriesPerRequest: null })
  : null;

export async function pingRedis(timeoutMs = 2000): Promise<"ok" | "disabled"> {
  if (!redis) return "disabled";

  await Promise.race([
    redis.ping(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Redis ping timeout")), timeoutMs),
    ),
  ]);
  return "ok";
}
