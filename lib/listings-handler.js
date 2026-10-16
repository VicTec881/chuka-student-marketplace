// Request handler for /api/listings. The database is injected so the logic can be
// unit tested without MongoDB.

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

// Public shape of a listing: never expose internal fields such as ipHash.
function toPublic(doc) {
  return {
    id: String(doc._id),
    title: doc.title,
    price: doc.price,
    category: doc.category,
    condition: doc.condition,
    badge: doc.badge,
    badgeType: doc.badgeType,
    description: doc.description,
    longDescription: doc.longDescription || doc.description,
    image: doc.image,
    seller: doc.seller,
    sample: doc.sample === true,
    status: doc.status,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt
  };
}

async function seedIfEmpty(col) {
  if ((await col.countDocuments({})) > 0) return;
  try {
    await col.insertMany(buildSeedListings(), { ordered: false });
  } catch (err) {
    // Two first requests can race; duplicate-key errors just mean someone else seeded.
    const duplicates = err && (err.code === 11000 || err.writeErrors?.every?.((w) => w.code === 11000));
    if (!duplicates) throw err;
  }
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  return null;
}

function createHandler({ getCollection, isNotConfigured = (e) => e && e.name === "NotConfiguredError" }) {
  return async function handler(req, res) {
    try {
      if (req.method === "OPTIONS") {
        return send(res, 204, {}, { Allow: "GET, POST, OPTIONS" });
      }
      if (req.method !== "GET" && req.method !== "POST") {
        return send(res, 405, { error: "method_not_allowed" }, { Allow: "GET, POST, OPTIONS" });
      }

      const col = await getCollection();

      if (req.method === "GET") {
        await seedIfEmpty(col);
        const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || DEFAULT_LIST, 1), MAX_LIST);
        const docs = await col
          .find({ status: "available" })
          .sort({ createdAt: -1 })
          .limit(limit)
          .toArray();
        return send(res, 200, { listings: docs.map(toPublic) });
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
      const recent = await col.countDocuments({ ipHash, createdAt: { $gt: since } });
      if (recent >= POSTS_PER_HOUR) {
        return send(
          res,
          429,
          { error: "rate_limited", message: "You've posted a lot of listings recently. Please try again in an hour." },
          { "Retry-After": "3600" }
        );
      }

      const doc = {
        ...result.value,
        longDescription: result.value.description,
        sample: false,
        status: "available",
        createdAt: new Date(),
        ipHash
      };
      const { insertedId } = await col.insertOne(doc);
      return send(res, 201, { listing: toPublic({ ...doc, _id: insertedId }) });
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
