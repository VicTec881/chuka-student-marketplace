// Request handler for /api/auth/<action>: me, start, verify, logout.

const A = require("./auth");
const { hashIp } = require("./listings-handler");
const { sendLoginCode } = require("./mailer");

function send(res, status, body, extraHeaders = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  return {};
}

function createAuthHandler({ getStore, sendMail = sendLoginCode, now = () => Date.now(), isNotConfigured = (e) => e && e.name === "NotConfiguredError" }) {
  return async function handler(req, res) {
    try {
      const action = String(req.query?.action || "");

      if (action === "me") {
        if (req.method !== "GET") return send(res, 405, { error: "method_not_allowed" }, { Allow: "GET" });
        const email = A.getSessionEmail(req);
        return send(res, 200, { user: email ? { email, student: A.isStudentEmail(email) } : null });
      }

      if (!["start", "verify", "logout"].includes(action)) return send(res, 404, { error: "not_found" });
      if (req.method !== "POST") return send(res, 405, { error: "method_not_allowed" }, { Allow: "POST" });
      if (!A.isSameOrigin(req)) return send(res, 403, { error: "forbidden" });
      if (!String(req.headers["content-type"] || "").includes("application/json")) {
        return send(res, 415, { error: "unsupported_media_type", message: "Send JSON." });
      }

      if (action === "logout") {
        return send(res, 200, { ok: true }, { "Set-Cookie": A.cookieHeader(req, "", 0) });
      }

      let body;
      try {
        body = parseBody(req);
      } catch (e) {
        return send(res, 400, { error: "invalid_json" });
      }

      const email = A.normalizeEmail(body.email);
      if (!email) {
        return send(res, 400, { error: "invalid_email", message: "Enter a valid email address." });
      }
      const store = await getStore();
      const t = now();

      if (action === "start") {
        // Per-network limit, so nobody can burn the email quota or spam other people's inboxes
        // by cycling through addresses. Raw IPs are never stored, only a salted hash.
        const ipHash = hashIp(req);
        const ip = await store.getThrottle(ipHash);
        let ipWindow = ip ? new Date(ip.windowStart).getTime() : t;
        let ipCount = ip ? ip.count : 0;
        if (t - ipWindow > 3600000) { ipWindow = t; ipCount = 0; }
        if (ipCount >= A.MAX_STARTS_PER_IP_HOUR) {
          return send(res, 429, { error: "rate_limited", message: "Too many sign-in attempts from this network. Please try again in an hour." }, { "Retry-After": "3600" });
        }

        const existing = await store.getLoginCode(email);
        let windowStart = existing ? new Date(existing.windowStart).getTime() : t;
        let sends = existing ? existing.sendsInWindow : 0;
        if (t - windowStart > 3600000) { windowStart = t; sends = 0; }

        if (existing && t - new Date(existing.lastSentAt).getTime() < A.RESEND_COOLDOWN_MS) {
          return send(res, 429, { error: "too_soon", message: "A code was just sent. Please wait a minute before asking for another." }, { "Retry-After": "60" });
        }
        if (sends >= A.MAX_SENDS_PER_HOUR) {
          return send(res, 429, { error: "rate_limited", message: "Too many codes requested. Please try again in an hour." }, { "Retry-After": "3600" });
        }

        const code = A.generateCode();
        await sendMail(email, code); // send first: if email fails, nothing is recorded
        await store.saveThrottle({ ipHash, windowStart: new Date(ipWindow).toISOString(), count: ipCount + 1 });
        await store.saveLoginCode({
          email,
          codeHash: A.hashCode(email, code),
          expiresAt: new Date(t + A.CODE_TTL_MS).toISOString(),
          attempts: 0,
          lastSentAt: new Date(t).toISOString(),
          windowStart: new Date(windowStart).toISOString(),
          sendsInWindow: sends + 1
        });
        return send(res, 200, { ok: true });
      }

      // ---- verify ----
      const code = String(body.code ?? "").replace(/\s/g, "");
      if (!/^\d{6}$/.test(code)) return send(res, 400, { error: "invalid_code", message: "Enter the 6-digit code from your email." });

      const record = await store.getLoginCode(email);
      const bad = () => send(res, 400, { error: "invalid_code", message: "That code is not right or has expired. Request a new one." });
      if (!record || new Date(record.expiresAt).getTime() < t || record.attempts >= A.MAX_ATTEMPTS) return bad();

      if (!A.safeEqualHex(record.codeHash, A.hashCode(email, code))) {
        await store.saveLoginCode({ ...record, attempts: record.attempts + 1 });
        return bad();
      }

      await store.deleteLoginCode(email); // a code works once
      const token = A.createSessionToken(email, t);
      return send(res, 200, { user: { email, student: A.isStudentEmail(email) } }, { "Set-Cookie": A.cookieHeader(req, token, A.SESSION_DAYS * 86400) });
    } catch (err) {
      if (isNotConfigured(err)) {
        return send(res, 503, { error: "not_configured", message: "Sign-in is not set up yet." });
      }
      console.error("auth handler error", err);
      return send(res, 500, { error: "server_error", message: "Something went wrong. Please try again." });
    }
  };
}

module.exports = { createAuthHandler };
