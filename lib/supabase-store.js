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

/** Wrap a supabase-js client in the small interface the API handler needs. */
function createSupabaseStore(client) {
  return {
    async count() {
      const res = await client.from(TABLE).select("id", { count: "exact", head: true });
      check(res, "count");
      return res.count ?? 0;
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
      return res.count ?? 0;
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
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  cachedStore = createSupabaseStore(client);
  return cachedStore;
}

module.exports = { createSupabaseStore, getStore, toRow, fromRow, TABLE };
