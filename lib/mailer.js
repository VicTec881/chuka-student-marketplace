// Sends the sign-in code by email through Brevo's HTTP API (free: 300 emails/day).
// Set BREVO_API_KEY and MAIL_FROM (a sender address you verified in Brevo).

const { NotConfiguredError } = require("./errors");

async function sendLoginCode(email, code, fetchImpl = fetch) {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) throw new NotConfiguredError("BREVO_API_KEY or MAIL_FROM is not set");

  const res = await fetchImpl("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "Chuka Student Marketplace", email: from },
      to: [{ email }],
      subject: `Your Chuka Marketplace code: ${code}`,
      textContent:
        `Your sign-in code is ${code}\n\nIt expires in 10 minutes. If you did not request it, ignore this email.\n` +
        `Never share this code with anyone.`
    })
  });
  if (!res.ok) throw new Error(`Email send failed with HTTP ${res.status}`);
}

module.exports = { sendLoginCode };
