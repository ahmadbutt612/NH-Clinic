import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the NH Gyne Clinic landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /NH Gyne Clinic/);
  assert.match(html, /Care that listens/);
  assert.match(html, /Dr\. Umar Farooq Shahzada/);
  assert.match(html, /Dr\. Sofia Bano/);
  assert.match(html, /Book an appointment/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("server-renders booking and doctor portal routes", async () => {
  const [bookingResponse, doctorResponse] = await Promise.all([
    render("/book"),
    render("/doctor"),
  ]);

  assert.equal(bookingResponse.status, 200);
  assert.equal(doctorResponse.status, 200);
  assert.match(await bookingResponse.text(), /Choose the care and time that suit you/i);
  assert.match(await doctorResponse.text(), /Opening the doctor portal|Doctor Portal/i);
});

test("keeps secrets out of the committed environment template", async () => {
  const [environmentExample, packageJson] = await Promise.all([
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(environmentExample, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(environmentExample, /DOCTOR_UMAR_PASSWORD/);
  assert.match(environmentExample, /RESEND_API_KEY/);
  assert.doesNotMatch(environmentExample, /re_[A-Za-z0-9]{12,}|sb_publishable_[A-Za-z0-9]{12,}/);
  assert.match(packageJson, /"supabase:setup"/);
  await assert.rejects(access(new URL("../app/_sites-preview", projectRoot)));
});
