import request from "supertest";
import app from "../app";
import { prisma } from "../lib/prisma";
import { sendEmail } from "../lib/mailer";
import { escapeHtml } from "../lib/html";
import { resetDb } from "../test/helpers";

jest.mock("../lib/mailer", () => ({ sendEmail: jest.fn() }));

const sendEmailMock = sendEmail as jest.Mock;
const registerBody = { name: "Ali", email: "ali@test.com", password: "gizli12345" };

describe("email delivery", () => {
  beforeEach(async () => {
    await resetDb();
    sendEmailMock.mockReset();
  });
  afterAll(() => prisma.$disconnect());

  it("sends a verification email when registering", async () => {
    sendEmailMock.mockResolvedValue(undefined);

    const res = await request(app).post("/auth/register").send(registerBody);

    expect(res.status).toBe(201);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ali@test.com", subject: expect.stringContaining("doğrula") }),
    );
  });

  it("does not fail registration when the email provider is down", async () => {
    sendEmailMock.mockRejectedValue(new Error("provider down"));
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(app).post("/auth/register").send(registerBody);

    expect(res.status).toBe(201);
    expect(await prisma.user.count()).toBe(1);
    errorSpy.mockRestore();
  });

  it("escapes HTML in user supplied values", () => {
    expect(escapeHtml('<a href="x">&</a>')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
  });
});