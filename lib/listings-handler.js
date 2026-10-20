// Request handler for /api/listings. The database is injected so the logic can be
// unit tested without a real database.

const crypto = require("node:crypto");
const { validateListingInput } = require("./validate");
const { buildSeedListings } = require("./seed");

const MAX_LIST = 200;
const DEFAULT_LIST = 100;
const POSTS_PER_HOUR = 5; // per IP address, until accounts exist

function send(res, status, body, extraHeaders = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

// One-way hash so we can rate limit without storing raw IP addresses.
function hashIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const ip = String(req.headers["x-real-ip"] || forwarded || req.socket?.remoteAddress || "unknown");
  const salt = process.env.IP_HASH_SALT || "chuka-marketplace";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

// Public shape of a listing: an explicit allow-list, so internal fields (e.g. ipHash)
// can never leak even if a store accidentally returns them.
function toPublic(listing) {
  return {
    id: String(listing.id),
    title: listing.title,
    price: listing.price,
    category: listing.category,
    condition: listing.condition,
    badge: listing.badge,
    badgeType: listing.badgeType,
    description: listing.description,
    longDescription: listing.longDescription || listing.description,
    image: listing.image,
    seller: listing.seller,
    sample: listing.sample === true,
    status: listing.status,
    createdAt: listing.createdAt instanceof Date ? listing.createdAt.toISOString() : listing.createdAt
  };
}

async function seedIfEmpty(store) {
  if ((await store.count()) > 0) return;
  await store.seed(buildSeedListings());
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  return null;
}

function createHandler({ getStore, isNotConfigured = (e) => e && e.name === "NotConfiguredError" }) {
  return async function handler(req, res) {
    try {
      if (req.method === "OPTIONS") {
        return send(res, 204, {}, { Allow: "GET, POST, OPTIONS" });
      }
      if (req.method !== "GET" && req.method !== "POST") {
        return send(res, 405, { error: "method_not_allowed" }, { Allow: "GET, POST, OPTIONS" });
      }

      const store = await getStore();

      if (req.method === "GET") {
        await seedIfEmpty(store);
        const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || DEFAULT_LIST, 1), MAX_LIST);
        const listings = await store.listAvailable(limit);
        return send(res, 200, { listings: listings.map(toPublic) });
      }

      // ---- POST ----
      const contentType = String(req.headers["content-type"] || "");
      if (!contentType.includes("application/json")) {
        return send(res, 415, { error: "unsupported_media_type", message: "Send JSON." });
      }

      let body;
      try {
        body = await readBody(req);
      } catch (e) {
        return send(res, 400, { error: "invalid_json", message: "Request body is not valid JSON." });
      }

      const result = validateListingInput(body);
      if (!result.ok) {
        return send(res, 400, { error: "validation", fields: result.errors });
      }

      const ipHash = hashIp(req);
      const since = new Date(Date.now() - 60 * 60 * 1000);
      const recent = await store.countRecentByIp(ipHash, since);
      if (recent >= POSTS_PER_HOUR) {
        return send(
          res,
          429,
          { error: "rate_limited", message: "You've posted a lot of listings recently. Please try again in an hour." },
          { "Retry-After": "3600" }
        );
      }

      const listingFields = { ...result.value };
      if (result.photo) {
        if (typeof store.uploadImage !== "function") {
          return send(res, 503, { error: "not_configured", message: "Photo uploads are not available yet." });
        }
        listingFields.image = await store.uploadImage(result.photo);
      }

      const saved = await store.insert({
        ...listingFields,
        longDescription: result.value.description,
        sample: false,
        status: "available",
        ipHash
      });
      return send(res, 201, { listing: toPublic(saved) });
    } catch (err) {
      if (isNotConfigured(err)) {
        return send(res, 503, { error: "not_configured", message: "The database is not configured yet." });
      }
      console.error("listings handler error", err);
      return send(res, 500, { error: "server_error", message: "Something went wrong. Please try again." });
    }
  };
}

module.exports = { createHandler, toPublic, hashIp, POSTS_PER_HOUR };
