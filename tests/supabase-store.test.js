// Checks that the Supabase store sends the right requests. The real supabase-js client runs;
// only the network is stubbed, so we can inspect each HTTP request it would make.
const test = require("node:test");
const assert = require("node:assert/strict");
const { createClient } = require("@supabase/supabase-js");
const { createSupabaseStore, normalizeSupabaseUrl, toRow, fromRow } = require("../lib/supabase-store");

const URL_BASE = "https://example-project.supabase.co";
const KEY = "sb_secret_test_key";

function makeStore(respond) {
  const calls = [];
  const fetchStub = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    const headers = new Headers(init.headers);
    const call = {
      method: (init.method || "GET").toUpperCase(),
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      headers,
      body: init.body ? JSON.parse(init.body) : undefined
    };
    calls.push(call);
    const { status = 200, body = [], responseHeaders = {} } = respond(call) || {};
    return new Response(call.method === "HEAD" ? null : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", ...responseHeaders }
    });
  };
  const client = createClient(URL_BASE, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchStub }
  });
  return { store: createSupabaseStore(client), calls };
}

const dbRow = (over = {}) => ({
  id: "abc",
  title: "Lamp",
  price: 650,
  category: "home",
  condition: "Brand New",
  badge: "New",
  badge_type: "new",
  description: "A very nice lamp.",
  long_description: null,
  image: "assets/images/desk_lamp.jpg",
  seller: { name: "Faith" },
  sample: false,
  status: "available",
  created_at: "2026-10-18T10:00:00+00:00",
  ip_hash: "SECRET_HASH",
  ...over
});

test("listAvailable queries available rows newest first with a limit, and hides ip_hash", async () => {
  const { store, calls } = makeStore(() => ({ body: [dbRow()] }));
  const list = await store.listAvailable(50);

  const c = calls[0];
  assert.equal(c.method, "GET");
  assert.equal(c.path, "/rest/v1/listings");
  assert.equal(c.query.status, "eq.available");
  assert.equal(c.query.order, "created_at.desc");
  assert.equal(c.query.limit, "50");
  assert.equal(c.headers.get("apikey"), KEY);
  assert.equal(c.headers.get("authorization"), `Bearer ${KEY}`);

  assert.equal(list.length, 1);
  assert.equal(list[0].badgeType, "new");
  assert.equal(list[0].longDescription, "A very nice lamp.", "falls back to description");
  assert.ok(!("ipHash" in list[0]) && !("ip_hash" in list[0]));
  assert.ok(!JSON.stringify(list).includes("SECRET_HASH"));
});

test("count asks Postgres for an exact count without fetching rows", async () => {
  const { store, calls } = makeStore(() => ({ responseHeaders: { "content-range": "*/11" } }));
  assert.equal(await store.count(), 11);
  assert.equal(calls[0].method, "HEAD");
  assert.match(calls[0].headers.get("prefer") || "", /count=exact/);
});

test("countRecentByIp filters by hash and time window", async () => {
  const { store, calls } = makeStore(() => ({ responseHeaders: { "content-range": "*/3" } }));
  const since = new Date("2026-10-18T09:00:00.000Z");
  assert.equal(await store.countRecentByIp("hash123", since), 3);
  assert.equal(calls[0].query.ip_hash, "eq.hash123");
  assert.equal(calls[0].query.created_at, "gt.2026-10-18T09:00:00.000Z");
});

test("insert posts snake_case columns, omits id/created_at, and returns the saved listing", async () => {
  const { store, calls } = makeStore(() => ({ status: 201, body: dbRow({ id: "new-uuid" }) }));
  const saved = await store.insert({
    title: "Lamp",
    price: 650,
    category: "home",
    condition: "Brand New",
    badge: "New",
    badgeType: "new",
    description: "A very nice lamp.",
    image: "assets/images/desk_lamp.jpg",
    seller: { name: "Faith" },
    sample: false,
    status: "available",
    ipHash: "hash123"
  });
  const c = calls[0];
  assert.equal(c.method, "POST");
  assert.equal(c.path, "/rest/v1/listings");
  assert.equal(c.body.badge_type, "new");
  assert.equal(c.body.ip_hash, "hash123");
  assert.ok(!("id" in c.body) && !("created_at" in c.body), "database generates id and time");
  assert.match(c.headers.get("prefer") || "", /return=representation/);
  assert.equal(saved.id, "new-uuid");
  assert.ok(!("ipHash" in saved));
});

test("seed upserts and ignores rows that already exist", async () => {
  const { store, calls } = makeStore(() => ({ status: 201, body: [] }));
  await store.seed([
    { id: "p1", title: "A", price: 100, category: "books", condition: "Brand New", badge: "New", badgeType: "new",
      description: "Long enough text", image: "x.jpg", seller: {}, sample: true, createdAt: "2026-10-18T10:00:00.000Z" }
  ]);
  const c = calls[0];
  assert.equal(c.method, "POST");
  assert.equal(c.query.on_conflict, "id");
  assert.match(c.headers.get("prefer") || "", /resolution=ignore-duplicates/);
  assert.equal(c.body[0].id, "p1");
  assert.equal(c.body[0].sample, true);
});

test("database errors are thrown (so the handler can answer 500) without exposing keys", async () => {
  const { store } = makeStore(() => ({ status: 401, body: { message: "Invalid API key", code: "PGRST301" } }));
  await assert.rejects(() => store.listAvailable(10), (err) => {
    assert.match(err.message, /list failed/);
    assert.ok(!err.message.includes(KEY));
    return true;
  });
});

test("toRow / fromRow round-trip the fields the UI needs", () => {
  const original = fromRow(dbRow({ long_description: "Longer text here." }));
  const row = toRow({ ...original, ipHash: undefined });
  assert.equal(row.long_description, "Longer text here.");
  assert.equal(fromRow({ ...dbRow(), ...row, created_at: original.createdAt }).title, "Lamp");
});

test("getStore refuses to run without credentials", () => {
  const saved = { u: process.env.SUPABASE_URL, k: process.env.SUPABASE_SECRET_KEY };
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
  try {
    const { getStore } = require("../lib/supabase-store");
    assert.throws(() => getStore(), { name: "NotConfiguredError" });
  } finally {
    if (saved.u) process.env.SUPABASE_URL = saved.u;
    if (saved.k) process.env.SUPABASE_SECRET_KEY = saved.k;
  }
});

test("normalizeSupabaseUrl keeps only the origin, however the URL was copied", () => {
  const expected = "https://abcdxyz.supabase.co";
  for (const input of [
    "https://abcdxyz.supabase.co",
    "https://abcdxyz.supabase.co/",
    "https://abcdxyz.supabase.co/rest/v1",
    "https://abcdxyz.supabase.co/rest/v1/",
    "  https://abcdxyz.supabase.co/rest/v1/listings?x=1  ",
    "https://ABCDXYZ.supabase.co/"
  ]) {
    assert.equal(normalizeSupabaseUrl(input), expected, `input: ${JSON.stringify(input)}`);
  }
  for (const bad of ["", "abcdxyz.supabase.co", "ftp://abcdxyz.supabase.co", "not a url"]) {
    assert.throws(() => normalizeSupabaseUrl(bad), { name: "NotConfiguredError" }, `input: ${JSON.stringify(bad)}`);
  }
});

test("root cause of PGRST125: a URL ending in /rest/v1 doubles the path unless it is normalised", async () => {
  const seen = [];
  const fetchStub = async (input) => {
    seen.push(new URL(typeof input === "string" ? input : input.url).pathname);
    return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
  };
  const build = (url) =>
    createSupabaseStore(
      createClient(url, KEY, { auth: { persistSession: false }, global: { fetch: fetchStub } })
    );

  await build("https://abcdxyz.supabase.co/rest/v1/").listAvailable(1); // what a wrongly copied value does
  await build(normalizeSupabaseUrl("https://abcdxyz.supabase.co/rest/v1/")).listAvailable(1);

  assert.equal(seen[0], "/rest/v1/rest/v1/listings", "un-normalised URL produces the broken path");
  assert.equal(seen[1], "/rest/v1/listings", "normalised URL produces the correct path");
});

test("a failed HEAD count (empty 404) is an error, not zero rows", async () => {
  // supabase-js reports a bodiless 404 as "no error, no count"; we must not read that as an empty table.
  const { store } = makeStore(() => ({ status: 404 }));
  await assert.rejects(() => store.count(), /no count returned \(HTTP 204\)/);
  await assert.rejects(() => store.countRecentByIp("h", new Date()), /no count returned/);
});
