const test = require("node:test");
const assert = require("node:assert/strict");
const { sendLoginCode } = require("../lib/mailer");

test("mailer posts the code to Brevo with the API key, and fails clearly when unconfigured", async () => {
  delete process.env.BREVO_API_KEY; delete process.env.MAIL_FROM;
  await assert.rejects(() => sendLoginCode("a@chuka.ac.ke", "123456", async () => ({ ok: true })), { name: "NotConfiguredError" });

  process.env.BREVO_API_KEY = "k"; process.env.MAIL_FROM = "from@example.com";
  let seen;
  await sendLoginCode("a@chuka.ac.ke", "123456", async (url, opts) => { seen = { url, opts }; return { ok: true }; });
  assert.equal(seen.url, "https://api.brevo.com/v3/smtp/email");
  assert.equal(seen.opts.headers["api-key"], "k");
  const body = JSON.parse(seen.opts.body);
  assert.deepEqual(body.to, [{ email: "a@chuka.ac.ke" }]);
  assert.ok(body.textContent.includes("123456"));
  await assert.rejects(() => sendLoginCode("a@chuka.ac.ke", "1", async () => ({ ok: false, status: 401 })), /HTTP 401/);
  delete process.env.BREVO_API_KEY; delete process.env.MAIL_FROM;
});
