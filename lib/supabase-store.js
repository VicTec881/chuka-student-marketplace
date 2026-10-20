// Listings storage on Supabase (Postgres), used by the serverless API.
//
// Configuration (set in Vercel -> Project -> Settings -> Environment Variables):
//   SUPABASE_URL          e.g. https://abcdxyz.supabase.co
//   SUPABASE_SECRET_KEY   the project's secret key (starts with sb_secret_). Server only!
//                         It bypasses row level security, so never expose it to the browser.
//
// The store speaks in plain camelCase objects; the SQL table uses snake_case columns.

const crypto = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");
const { NotConfiguredError } = require("./errors");

const TABLE = "listings";
const BUCKET = "listing-images";

function toRow(listing) {
  const row = {
    title: listing.title,
    price: listing.price,
    category: listing.category,
    condition: listing.condition,
    badge: listing.badge,
    badge_type: listing.badgeType,
    description: listing.description,
    long_description: listing.longDescription ?? listing.description,
    image: listing.image,
    seller: listing.seller,
    sample: listing.sample === true,
    status: listing.status || "available"
  };
  if (listing.id) row.id = listing.id;
  if (listing.createdAt) row.created_at = new Date(listing.createdAt).toISOString();
  if (listing.ipHash) row.ip_hash = listing.ipHash;
  if (listing.ownerEmail) row.owner_email = listing.ownerEmail;
  return row;
}

// Note: ip_hash is deliberately not copied out, so it can never reach the browser.
function fromRow(row) {
  return {
    id: String(row.id),
    title: row.title,
    price: row.price,
    category: row.category,
    condition: row.condition,
    badge: row.badge,
    badgeType: row.badge_type,
    description: row.description,
    longDescription: row.long_description || row.description,
    image: row.image,
    seller: row.seller,
    sample: row.sample === true,
    status: row.status,
    createdAt: row.created_at,
    ownerEmail: row.owner_email || null // internal: the handler turns this into mine/verified, never sends it out
  };
}

function check({ error }, action) {
  if (error) {
    const err = new Error(`Supabase ${action} failed: ${error.message}`);
    err.code = error.code;
    throw err;
  }
}

// A HEAD request has no body, so when it fails (for example a wrong URL) supabase-js reports
// "no error" and "no count". Treating that as zero rows would hide the real problem, so refuse it.
function requireCount(res, action) {
  if (typeof res.count !== "number") {
    throw new Error(`Supabase ${action} failed: no count returned (HTTP ${res.status}). Check SUPABASE_URL and the table.`);
  }
  return res.count;
}

/**
 * Accept the project URL however it was copied. Only the origin matters, so extra text such as
 * a trailing slash, "/rest/v1" or spaces is dropped: "https://abc.supabase.co/rest/v1/" -> "https://abc.supabase.co".
 */
function normalizeSupabaseUrl(raw) {
  let parsed;
  try {
    parsed = new URL(String(raw).trim());
  } catch (e) {
    throw new NotConfiguredError("SUPABASE_URL is not a valid URL (expected https://<project-ref>.supabase.co)");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new NotConfiguredError("SUPABASE_URL must start with https://");
  }
  return parsed.origin;
}

/** Wrap a supabase-js client in the small interface the API handler needs. */
function createSupabaseStore(client) {
  return {
    async count() {
      const res = await client.from(TABLE).select("id", { count: "exact", head: true });
      check(res, "count");
      return requireCount(res, "count");
    },

    async listAvailable(limit) {
      const res = await client
        .from(TABLE)
        .select("*")
        .eq("status", "available")
        .order("created_at", { ascending: false })
        .limit(limit);
      check(res, "list");
      return (res.data || []).map(fromRow);
    },

    async countRecentByIp(ipHash, since) {
      const res = await client
        .from(TABLE)
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gt("created_at", since.toISOString());
      check(res, "rate-limit count");
      return requireCount(res, "rate-limit count");
    },

    async insert(listing) {
      const res = await client.from(TABLE).insert(toRow(listing)).select().single();
      check(res, "insert");
      return fromRow(res.data);
    },

    // Store a validated photo in the public "listing-images" bucket and return its public URL.
    // The bucket is created on first use, so there is no extra setup step.
    async uploadImage({ buffer, mime, ext }) {
      const name = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
      const upload = () => client.storage.from(BUCKET).upload(name, buffer, { contentType: mime, cacheControl: "31536000" });
      let res = await upload();
      if (res.error && /bucket not found/i.test(res.error.message || "")) {
        const made = await client.storage.createBucket(BUCKET, {
          public: true,
          fileSizeLimit: 2 * 1024 * 1024,
          allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"]
        });
        if (made.error && !/already exists/i.test(made.error.message || "")) {
          throw new Error(`Supabase create bucket failed: ${made.error.message}`);
        }
        res = await upload();
      }
      if (res.error) throw new Error(`Supabase photo upload failed: ${res.error.message}`);
      const { data } = client.storage.from(BUCKET).getPublicUrl(name);
      return data.publicUrl;
    },

    // ---- sign-in codes ----
    async getLoginCode(email) {
      const res = await client.from("login_codes").select("*").eq("email", email).maybeSingle();
      check(res, "get login code");
      const r = res.data;
      return r && {
        email: r.email, codeHash: r.code_hash, expiresAt: r.expires_at, attempts: r.attempts,
        lastSentAt: r.last_sent_at, windowStart: r.window_start, sendsInWindow: r.sends_in_window
      };
    },

    async saveLoginCode(r) {
      const res = await client.from("login_codes").upsert({
        email: r.email, code_hash: r.codeHash, expires_at: r.expiresAt, attempts: r.attempts,
        last_sent_at: r.lastSentAt, window_start: r.windowStart, sends_in_window: r.sendsInWindow
      }, { onConflict: "email" });
      check(res, "save login code");
    },

    async deleteLoginCode(email) {
      check(await client.from("login_codes").delete().eq("email", email), "delete login code");
    },

    // ---- per-network throttle for sign-in code requests ----
    async getThrottle(ipHash) {
      const res = await client.from("login_throttle").select("*").eq("ip_hash", ipHash).maybeSingle();
      check(res, "get throttle");
      return res.data && { ipHash: res.data.ip_hash, windowStart: res.data.window_start, count: res.data.count };
    },

    async saveThrottle(r) {
      check(
        await client.from("login_throttle").upsert({ ip_hash: r.ipHash, window_start: r.windowStart, count: r.count }, { onConflict: "ip_hash" }),
        "save throttle"
      );
    },

    // ---- owner actions ----
    async getById(id) {
      const res = await client.from(TABLE).select("*").eq("id", id).maybeSingle();
      check(res, "get listing");
      return res.data ? fromRow(res.data) : null;
    },

    async updateStatus(id, status) {
      check(await client.from(TABLE).update({ status }).eq("id", id), "update status");
    },

    // Insert sample rows, silently skipping any that already exist (safe if two requests race).
    async seed(listings) {
      const res = await client
        .from(TABLE)
        .upsert(listings.map(toRow), { onConflict: "id", ignoreDuplicates: true });
      check(res, "seed");
    }
  };
}

// Reuse one client across warm serverless invocations.
let cachedStore = null;

function getStore() {
  if (cachedStore) return cachedStore;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new NotConfiguredError("SUPABASE_URL or SUPABASE_SECRET_KEY is not set");
  const client = createClient(normalizeSupabaseUrl(url), String(key).trim(), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  cachedStore = createSupabaseStore(client);
  return cachedStore;
}

module.exports = { BUCKET, createSupabaseStore, getStore, normalizeSupabaseUrl, toRow, fromRow, TABLE };
