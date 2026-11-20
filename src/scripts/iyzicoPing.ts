import { iyzico, iyzicoCall } from "../lib/iyzico";

async function main() {
  if (!iyzico) {
    console.error("IYZICO_API_KEY / IYZICO_SECRET_KEY are not set");
    process.exit(1);
  }

  const client = iyzico;
  const result = await iyzicoCall<{ status: string }>((done) =>
    client.apiTest.retrieve({}, done),
  );

  console.log("iyzico says:", result.status);
}

main().catch((err) => {
  console.error("iyzico ping failed:", err);
  process.exit(1);
});