import Iyzipay from "iyzipay";
import { env } from "../config/env";

export const iyzico =
  env.NODE_ENV !== "test" && env.IYZICO_API_KEY && env.IYZICO_SECRET_KEY
    ? new Iyzipay({
        apiKey: env.IYZICO_API_KEY,
        secretKey: env.IYZICO_SECRET_KEY,
        uri: env.IYZICO_BASE_URL,
      })
    : null;
export function iyzicoCall<T>(
  run: (done: (err: unknown, result: T) => void) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    run((err, result) => (err ? reject(err) : resolve(result)));
  });
}
