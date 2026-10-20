const test = require("node:test");
const assert = require("node:assert/strict");
process.env.SUPABASE_SECRET_KEY = "sb_secret_test_key";
const A = require("../lib/auth");
const { createAuthHandler } = require("../lib/auth-handler");
const { createHandler } = require("../lib/listings-handler");
const { createMemoryStore } = require("./helpers/memory-store");

function mockRes() {
  return { statusCode: 200, headers: {}, body: "", setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(c) { this.body = c || ""; } };
}
async function call(handler, { method = "GET", query = {}, body, cookie, headers = {} } = {}) {
  const req = { method, query, body, headers: { "content-type": "application/json", host: "site.test", ...(cookie ? { cookie } : {}), ...headers }, socket: {} };
  const res = mockRes();
  await handler(req, res);
  return { status: res.statusCode, json: res.body ? JSON.parse(res.body) : null, headers: res.headers };
}
const cookieOf = (r) => String(r.headers["set-cookie"]).split(";")[0];

function setup() {
  const store = createMemoryStore();
  const sent = [];
  let t = Date.now();
  const auth = createAuthHandler({ getStore: async () => store, sendMail: async (e, c) => sent.push({ e, c }), now: () => t });
  const listings = createHandler({ getStore: async () => store });
  return { store, sent, auth, listings, advance: (ms) => (t += ms) };
}
async function signIn(ctx, email = "jane@students.chuka.ac.ke") {
  await call(ctx.auth, { method: "POST", query: { action: "start" }, body: { email } });
  const code = ctx.sent[ctx.sent.length - 1].c;
  const r = await call(ctx.auth, { method: "POST", query: { action: "verify" }, body: { email, code } });
  return { r, cookie: cookieOf(r) };
}
const listingBody = (extra = {}) => ({
  title: "Calculator", price: 1500, category: "books", condition: "Used - Good", badge: "New",
  description: "Casio fx-991 works perfectly", sellerName: "Jane", sellerDept: "BSc CS", sellerPhone: "0712345678", sellerLocation: "Library", ...extra
});

test("only chuka.ac.ke addresses are accepted; +tags and case are normalised", () => {
  assert.equal(A.normalizeStudentEmail("Jane.Doe+shop@Chuka.ac.ke"), "jane.doe@chuka.ac.ke");
  assert.equal(A.normalizeStudentEmail("x@students.chuka.ac.ke"), "x@students.chuka.ac.ke");
  for (const bad of ["x@gmail.com", "x@chuka.ac.ke.evil.com", "x@notchuka.ac.ke", "x@evilchuka.ac.ke", "@chuka.ac.ke", "a b@chuka.ac.ke", "", null, "x@chuka.ac.ke\nbcc:y@z.com"]) {
    assert.equal(A.normalizeStudentEmail(bad), null, String(bad));
  }
});

test("session tokens verify, and forged, tampered or expired ones do not", () => {
  const tok = A.createSessionToken("a@chuka.ac.ke", 1000);
  assert.equal(A.readSessionToken(tok, 2000), "a@chuka.ac.ke");
  assert.equal(A.readSessionToken(tok, 1000 + A.SESSION_DAYS * 86400000 + 1), null);
  const [p, s] = tok.split(".");
  const forged = Buffer.from(JSON.stringify({ e: "boss@chuka.ac.ke", x: 9e15 })).toString("base64url");
  assert.equal(A.readSessionToken(`${forged}.${s}`, 2000), null);
  assert.equal(A.readSessionToken(`${p}.AAAA`, 2000), null);
  assert.equal(A.readSessionToken("garbage", 2000), null);
  const outsider = Buffer.from(JSON.stringify({ e: "x@gmail.com", x: 9e15 })).toString("base64url");
  assert.equal(A.readSessionToken(outsider, 2000), null);
});

test("sign-in flow: code is emailed, verifies once, sets an HttpOnly cookie", async () => {
  const ctx = setup();
  const start = await call(ctx.auth, { method: "POST", query: { action: "start" }, body: { email: "Jane@chuka.ac.ke" } });
  assert.equal(start.status, 200);
  assert.equal(ctx.sent.length, 1);
  assert.match(ctx.sent[0].c, /^\d{6}$/);
  assert.equal(ctx.sent[0].e, "jane@chuka.ac.ke");
  const stored = ctx.store.codes.get("jane@chuka.ac.ke");
  assert.ok(!JSON.stringify(stored).includes(ctx.sent[0].c), "code itself is never stored");

  const ok = await call(ctx.auth, { method: "POST", query: { action: "verify" }, body: { email: "jane@chuka.ac.ke", code: ctx.sent[0].c } });
  assert.equal(ok.status, 200);
  assert.match(ok.headers["set-cookie"], /HttpOnly/);
  assert.match(ok.headers["set-cookie"], /SameSite=Lax/);
  const me = await call(ctx.auth, { query: { action: "me" }, cookie: cookieOf(ok) });
  assert.deepEqual(me.json.user, { email: "jane@chuka.ac.ke" });
  assert.equal((await call(ctx.auth, { query: { action: "me" } })).json.user, null);

  const again = await call(ctx.auth, { method: "POST", query: { action: "verify" }, body: { email: "jane@chuka.ac.ke", code: ctx.sent[0].c } });
  assert.equal(again.status, 400, "a code cannot be reused");
});

test("non-Chuka emails get no code; wrong codes lock out after 5; expired codes fail", async () => {
  const ctx = setup();
  const r = await call(ctx.auth, { method: "POST", query: { action: "start" }, body: { email: "someone@gmail.com" } });
  assert.equal(r.status, 400);
  assert.equal(ctx.sent.length, 0);

  await call(ctx.auth, { method: "POST", query: { action: "start" }, body: { email: "a@chuka.ac.ke" } });
  const good = ctx.sent[0].c;
  const wrong = good === "000000" ? "111111" : "000000";
  for (let i = 0; i < 5; i++) {
    assert.equal((await call(ctx.auth, { method: "POST", query: { action: "verify" }, body: { email: "a@chuka.ac.ke", code: wrong } })).status, 400);
  }
  assert.equal((await call(ctx.auth, { method: "POST", query: { action: "verify" }, body: { email: "a@chuka.ac.ke", code: good } })).status, 400, "locked after 5 bad tries");

  const ctx2 = setup();
  await call(ctx2.auth, { method: "POST", query: { action: "start" }, body: { email: "b@chuka.ac.ke" } });
  ctx2.advance(11 * 60 * 1000);
  assert.equal((await call(ctx2.auth, { method: "POST", query: { action: "verify" }, body: { email: "b@chuka.ac.ke", code: ctx2.sent[0].c } })).status, 400);
});

test("code requests are rate limited per email", async () => {
  const ctx = setup();
  const start = () => call(ctx.auth, { method: "POST", query: { action: "start" }, body: { email: "c@chuka.ac.ke" } });
  assert.equal((await start()).status, 200);
  assert.equal((await start()).status, 429, "cooldown");
  for (let i = 0; i < 4; i++) { ctx.advance(61000); assert.equal((await start()).status, 200); }
  ctx.advance(61000);
  assert.equal((await start()).status, 429, "hourly cap");
  assert.equal(ctx.sent.length, 5);
});

test("auth rejects cross-site and non-JSON requests, and logout clears the cookie", async () => {
  const ctx = setup();
  const cross = await call(ctx.auth, { method: "POST", query: { action: "start" }, body: { email: "a@chuka.ac.ke" }, headers: { origin: "https://evil.example" } });
  assert.equal(cross.status, 403);
  const form = await call(ctx.auth, { method: "POST", query: { action: "start" }, body: {}, headers: { "content-type": "text/plain" } });
  assert.equal(form.status, 415);
  const out = await call(ctx.auth, { method: "POST", query: { action: "logout" }, body: {} });
  assert.match(out.headers["set-cookie"], /Max-Age=0/);
});

test("email failure is reported and records nothing", async () => {
  const store = createMemoryStore();
  const auth = createAuthHandler({ getStore: async () => store, sendMail: async () => { throw new Error("smtp down"); } });
  const r = await call(auth, { method: "POST", query: { action: "start" }, body: { email: "a@chuka.ac.ke" } });
  assert.equal(r.status, 500);
  assert.equal(store.codes.size, 0);
});

test("contact numbers are hidden from visitors and shown to signed-in students", async () => {
  const ctx = setup();
  const anon = await call(ctx.listings);
  assert.ok(anon.json.listings.length > 0);
  for (const l of anon.json.listings) {
    assert.equal(l.contactLocked, true);
    assert.ok(!("phone" in l.seller) && !("whatsapp" in l.seller));
    assert.ok(!("ownerEmail" in l));
  }
  assert.ok(!JSON.stringify(anon.json).includes("254712345678"));

  const { cookie } = await signIn(ctx);
  const authed = await call(ctx.listings, { cookie });
  assert.equal(authed.json.user.email, "jane@students.chuka.ac.ke");
  assert.ok(authed.json.listings.every((l) => l.contactLocked === false && l.seller.whatsapp));
});

test("anonymous posts are allowed but unverified; signed-in posts are verified and owned", async () => {
  const ctx = setup();
  const anon = await call(ctx.listings, { method: "POST", body: listingBody() });
  assert.equal(anon.status, 201);
  assert.equal(anon.json.listing.verified, false);
  assert.ok(anon.json.listing.seller.whatsapp, "poster sees their own number");

  const { cookie } = await signIn(ctx);
  const mine = await call(ctx.listings, { method: "POST", body: listingBody({ title: "Verified calc" }), cookie });
  assert.equal(mine.json.listing.verified, true);
  assert.equal(mine.json.listing.mine, true);
  assert.ok(!("ownerEmail" in mine.json.listing));

  const list = await call(ctx.listings, { cookie });
  const found = list.json.listings.find((l) => l.title === "Verified calc");
  assert.equal(found.mine, true);
  const other = await signIn(ctx, "bob@chuka.ac.ke");
  const bobView = await call(ctx.listings, { cookie: other.cookie });
  assert.equal(bobView.json.listings.find((l) => l.title === "Verified calc").mine, false);
});

test("only the owner can mark sold or delete; others cannot even tell it exists", async () => {
  const ctx = setup();
  const jane = await signIn(ctx, "jane@chuka.ac.ke");
  const bob = await signIn(ctx, "bob@chuka.ac.ke");
  const posted = await call(ctx.listings, { method: "POST", body: listingBody(), cookie: jane.cookie });
  const id = posted.json.listing.id;

  assert.equal((await call(ctx.listings, { method: "PATCH", query: { id }, body: { status: "sold" } })).status, 401);
  assert.equal((await call(ctx.listings, { method: "PATCH", query: { id }, body: { status: "sold" }, cookie: bob.cookie })).status, 404);
  assert.equal((await call(ctx.listings, { method: "DELETE", query: { id }, cookie: bob.cookie })).status, 404);
  assert.equal((await call(ctx.listings, { method: "DELETE", query: { id: "p1" }, cookie: bob.cookie })).status, 404, "sample listings cannot be deleted");
  assert.equal((await call(ctx.listings, { method: "PATCH", query: { id }, body: { status: "removed" }, cookie: jane.cookie })).status, 400);
  assert.equal((await call(ctx.listings, { method: "PATCH", query: { id }, body: { status: "sold" }, cookie: jane.cookie, headers: { origin: "https://evil.example" } })).status, 403);

  assert.equal((await call(ctx.listings, { method: "PATCH", query: { id }, body: { status: "sold" }, cookie: jane.cookie })).status, 200);
  assert.ok(!(await call(ctx.listings)).json.listings.some((l) => l.id === id), "sold items leave the marketplace");

  const second = await call(ctx.listings, { method: "POST", body: listingBody({ title: "Another thing" }), cookie: jane.cookie });
  assert.equal((await call(ctx.listings, { method: "DELETE", query: { id: second.json.listing.id }, cookie: jane.cookie })).status, 200);
  assert.ok(!(await call(ctx.listings)).json.listings.some((l) => l.id === second.json.listing.id));
});
