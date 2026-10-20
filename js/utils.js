// Chuka Student Marketplace - Shared helpers (safe rendering + Kenyan phone handling)
// Works in the browser (globals) and in Node (module.exports) so it can be unit tested.

const DEFAULT_AVATAR = "assets/images/avatar_default.svg";
const DEFAULT_PRODUCT_IMAGE = "assets/images/exercise_books.jpg";

/**
 * Escape a value so it is safe to place inside HTML text or a quoted attribute.
 */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Only allow images that ship with the site (assets/images/...).
 * Anything else (javascript:, data:, external URLs, tampered localStorage) falls back.
 */
function safeImagePath(src, fallback = DEFAULT_PRODUCT_IMAGE) {
  if (typeof src !== "string") return fallback;
  if (/^assets\/images\/[\w\-.]+$/.test(src)) return src;
  // Photos uploaded by students live in this project's Supabase public "listing-images" bucket.
  if (/^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/listing-images\/[\w\-./]+$/.test(src) && !src.includes("..")) return src;
  return fallback;
}

/**
 * Normalise a Kenyan mobile number to the international digits-only form used by wa.me.
 * Accepts: 0712345678, 0112345678, 712345678, +254712345678, 254 712 345 678, (0712) 345-678 ...
 * Returns e.g. "254712345678", or null when the number is not a valid Kenyan mobile number.
 */
function normalizeKenyanPhone(input) {
  if (input === null || input === undefined) return null;
  let digits = String(input).replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (!/^\d+$/.test(digits)) return null;

  if (digits.startsWith("254")) digits = digits.slice(3);
  else if (digits.startsWith("0")) digits = digits.slice(1);

  // Kenyan mobile numbers: 9 digits starting with 7 (Safaricom, Airtel...) or 1 (newer ranges).
  if (!/^[17]\d{8}$/.test(digits)) return null;
  return "254" + digits;
}

/**
 * Pretty-print a normalised number: "254712345678" -> "+254 712 345 678".
 */
function formatKenyanPhone(normalized) {
  const n = normalizeKenyanPhone(normalized);
  if (!n) return "";
  return `+254 ${n.slice(3, 6)} ${n.slice(6, 9)} ${n.slice(9)}`;
}

/**
 * Collision-resistant id for new listings.
 */
function generateId(prefix = "p") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Respect the user's "reduce motion" setting for programmatic scrolling.
 */
function scrollBehavior() {
  return typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    DEFAULT_AVATAR,
    DEFAULT_PRODUCT_IMAGE,
    escapeHtml,
    safeImagePath,
    normalizeKenyanPhone,
    formatKenyanPhone,
    generateId,
    scrollBehavior
  };
}
