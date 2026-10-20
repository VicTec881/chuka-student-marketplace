// Student sign-in: email one-time codes + signed session cookie.
//
// Only addresses on the Chuka University domain can sign in. We email a 6 digit code, the student
// types it in, and we set an HttpOnly cookie holding a signed (HMAC) session. No passwords exist.
// The signing key comes from SESSION_SECRET, or (if unset) is derived from SUPABASE_SECRET_KEY,
// so no extra setup is required.

const crypto = require("node:crypto");
const { NotConfiguredError } = require("./errors");

const COOKIE_NAME = "cm_session";
const SESSION_DAYS = 30;
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_SENDS_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

const DOMAIN = "chuka.ac.ke";
// chuka.ac.ke itself or any subdomain of it (e.g. students.chuka.ac.ke).
const EMAIL_RE = /^[a-z0-9._%+\-]{1,64}@(?:[a-z0-9\-]+\.)*chuka\.ac\.ke$/;

/** Lower-case, drop "+tag" so one mailbox is one account. Returns null if not a Chuka address. */
function normalizeStudentEmail(input) {
  const raw = String(input ?? "").trim().toLowerCase();
  if (raw.length > 120 || !EMAIL_RE.test(raw)) return null;
  const [local, domain] = raw.split("@");
  const base = local.split("+")[0];
  return base ? `${base}@${domain}` : null;
}

function getSecret() {
  const explicit = process.env.SESSION_SECRET;
  const fallback = process.env.SUPABASE_SECRET_KEY;
  if (!explicit && !fallback) throw new NotConfiguredError("SESSION_SECRET or SUPABASE_SECRET_KEY is not set");
  return crypto.createHash("sha256").update(`chuka-marketplace-session:${explicit || fallback}`).digest();
}

const b64 = (buf) => Buffer.from(buf).toString("base64url");

function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function hashCode(email, code) {
  return crypto.createHmac("sha256", getSecret()).update(`code:${email}:${code}`).digest("hex");
}

function safeEqualHex(a, b) {
  const x = Buffer.from(String(a), "hex");
  const y = Buffer.from(String(b), "hex");
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

function createSessionToken(email, now = Date.now()) {
  const payload = b64(JSON.stringify({ e: email, x: now + SESSION_DAYS * 86400000 }));
  const sig = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/** Returns the signed-in email, or null for a missing, forged or expired token. */
function readSessionToken(token, now = Date.now()) {
  if (typeof token !== "string") return null;
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined) return null;
  const expected = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const { e, x } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof e !== "string" || typeof x !== "number" || x < now) return null;
    return normalizeStudentEmail(e) === e ? e : null;
  } catch (err) {
    return null;
  }
}

function parseCookies(header) {
  const out = {};
  for (const part of String(header || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

/** The signed-in email for this request, or null. Never throws for a missing secret. */
function getSessionEmail(req) {
  try {
    return readSessionToken(parseCookies(req.headers?.cookie)[COOKIE_NAME]);
  } catch (e) {
    return null;
  }
}

function cookieHeader(req, value, maxAgeSeconds) {
  const secure = String(req.headers?.["x-forwarded-proto"] || "").split(",")[0] === "https" ? "; Secure" : "";
  return `${COOKIE_NAME}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${secure}`;
}

/** Reject cross-site state changes: if the browser sent an Origin, it must be our own host. */
function isSameOrigin(req) {
  const origin = req.headers?.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === String(req.headers.host || "");
  } catch (e) {
    return false;
  }
}

module.exports = {
  COOKIE_NAME, SESSION_DAYS, CODE_TTL_MS, RESEND_COOLDOWN_MS, MAX_SENDS_PER_HOUR, MAX_ATTEMPTS, DOMAIN,
  normalizeStudentEmail, generateCode, hashCode, safeEqualHex, createSessionToken, readSessionToken,
  parseCookies, getSessionEmail, cookieHeader, isSameOrigin
};
