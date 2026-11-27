import request from "supertest";
import app from "../app";
import { prisma } from "../lib/prisma";
import { sendEmail } from "../lib/mailer";
import { resetDb } from "../test/helpers";

jest.mock("../lib/mailer", () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.setTimeout(20_000);

const sendEmailMock = sendEmail as jest.Mock;

const credentials = { name: "Ali", email: "ali@test.com", password: "gizli12345" };

const register = (body = credentials) => request(app).post("/auth/register").send(body);

const login = (
  body: { email: string; password: string } = {
    email: credentials.email,
    password: credentials.password,
  },
) => request(app).post("/auth/login").send(body);

const verificationToken = (): string => {
  const email = sendEmailMock.mock.calls.at(-1)?.[0];
  const match = /verify-email\?token=([a-f0-9]{64})/.exec(email?.text ?? "");
  if (!match) throw new Error("no verification link found");
  return match[1];
};

const refreshCookie = (res: request.Response): string => {
  const cookies = res.headers["set-cookie"] as unknown as string[];
  const header = cookies.find((c) => c.startsWith("refreshToken="));
  if (!header) throw new Error("no refresh cookie");
  return header.split(";")[0];
};

async function registeredAndVerified() {
  await register();
  await request(app).post("/auth/verify-email").send({ token: verificationToken() });
}

describe("auth flows", () => {
  beforeEach(async () => {
    await resetDb();
    sendEmailMock.mockClear();
  });
  afterAll(() => prisma.$disconnect());

  it("registers with a hashed password and rejects duplicate emails regardless of case", async () => {
    const res = await register({ ...credentials, email: "Ali@Test.com" });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("ali@test.com");
    expect(res.body.user.passwordHash).toBeUndefined();

    const user = await prisma.user.findUniqueOrThrow({ where: { email: "ali@test.com" } });
    expect(user.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(user.passwordHash).not.toContain(credentials.password);

    const duplicate = await register();
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("blocks login until the email is verified, and the link works once", async () => {
    await register();

    const blocked = await login();
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("EMAIL_NOT_VERIFIED");

    const token = verificationToken();
    const verify = () => request(app).post("/auth/verify-email").send({ token });
    expect((await verify()).status).toBe(200);
    expect((await verify()).status).toBe(400);

    const ok = await login();
    expect(ok.status).toBe(200);
    expect(ok.body.accessToken).toEqual(expect.any(String));
    expect(ok.body.refreshToken).toBeUndefined();

    const cookies = ok.headers["set-cookie"] as unknown as string[];
    expect(cookies.join(";")).toMatch(/HttpOnly/i);
  });

  it("gives the same error for a wrong password and an unknown email", async () => {
    await registeredAndVerified();

    const wrong = await login({ email: credentials.email, password: "yanlis-sifre" });
    const unknown = await login({ email: "yok@test.com", password: "yanlis-sifre" });

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it("protects /auth/me with a valid access token", async () => {
    await registeredAndVerified();
    const { accessToken } = (await login()).body;

    const me = await request(app).get("/auth/me").set("Authorization", `Bearer ${accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(credentials.email);

    expect((await request(app).get("/auth/me")).status).toBe(401);
    const forged = await request(app).get("/auth/me").set("Authorization", "Bearer abc.def.ghi");
    expect(forged.status).toBe(401);
  });

  it("rotates refresh tokens and revokes the whole family when one is reused", async () => {
    await registeredAndVerified();
    const first = refreshCookie(await login());

    const rotated = await request(app).post("/auth/refresh").set("Cookie", first);
    expect(rotated.status).toBe(200);
    const second = refreshCookie(rotated);
    expect(second).not.toBe(first);

    const reused = await request(app).post("/auth/refresh").set("Cookie", first);
    expect(reused.status).toBe(401);

    const afterReuse = await request(app).post("/auth/refresh").set("Cookie", second);
    expect(afterReuse.status).toBe(401);
  });

  it("revokes the session on the server when logging out", async () => {
    await registeredAndVerified();
    const cookie = refreshCookie(await login());

    const out = await request(app).post("/auth/logout").set("Cookie", cookie);
    expect(out.status).toBe(204);

    const refresh = await request(app).post("/auth/refresh").set("Cookie", cookie);
    expect(refresh.status).toBe(401);

    const again = await request(app).post("/auth/logout").set("Cookie", cookie);
    expect(again.status).toBe(204);
  });

  it("does not reveal which emails exist when resending verification", async () => {
    await register();
    sendEmailMock.mockClear();

    const known = await request(app)
      .post("/auth/resend-verification")
      .send({ email: credentials.email });
    const unknown = await request(app)
      .post("/auth/resend-verification")
      .send({ email: "yok@test.com" });

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });
});