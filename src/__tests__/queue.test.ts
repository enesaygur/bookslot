import { sendEmail } from "../lib/mailer";
import { enqueueEmail } from "../lib/queue";
import { isPermanentEmailFailure } from "../lib/emailErrors";

jest.mock("../lib/mailer", () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

describe("email queue", () => {
  it("sends directly when no queue is configured", async () => {
    const email = { to: "a@test.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi" };

    await enqueueEmail(email);

    expect(sendEmail).toHaveBeenCalledWith(email);
  });

  it("retries transient failures but not permanent ones", () => {
    expect(isPermanentEmailFailure(403)).toBe(true);
    expect(isPermanentEmailFailure(422)).toBe(true);
    expect(isPermanentEmailFailure(429)).toBe(false);
    expect(isPermanentEmailFailure(500)).toBe(false);
    expect(isPermanentEmailFailure(null)).toBe(false);
  });
});