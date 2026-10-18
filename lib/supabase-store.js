// Listings storage on Supabase (Postgres), used by the serverless API.
//
// Configuration (set in Vercel -> Project -> Settings -> Environment Variables):
//   SUPABASE_URL          e.g. https://abcdxyz.supabase.co
//   SUPABASE_SECRET_KEY   the project's secret key (starts with sb_secret_). Server only!
//                         It bypasses row level security, so never expose it to the browser.
//
// The store speaks in plain camelCase objects; the SQL table uses snake_case columns.

const { createClient } = require("@supabase/supabase-js");
const { NotConfiguredError } = require("./errors");

const TABLE = "listings";

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
    createdAt: row.created_at
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

module.exports = { createSupabaseStore, getStore, normalizeSupabaseUrl, toRow, fromRow, TABLE };
