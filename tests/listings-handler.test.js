const test = require("node:test");
const assert = require("node:assert/strict");
const { createHandler, POSTS_PER_HOUR } = require("../lib/listings-handler");
const { validateListingInput } = require("../lib/validate");

// ---- minimal in-memory stand-in for the MongoDB collection methods the handler uses ----
function fakeCollection() {
  const docs = [];
  let nextId = 1;
  const matches = (doc, filter) =>
    Object.entries(filter).every(([key, cond]) => {
      if (cond && typeof cond === "object" && "$gt" in cond) return doc[key] > cond.$gt;
      return doc[key] === cond;
    });
  return {
    docs,
    async countDocuments(filter = {}) {
      return docs.filter((d) => matches(d, filter)).length;
    },
    find(filter = {}) {
      let result = docs.filter((d) => matches(d, filter));
      const cursor = {
        sort(spec) {
          const [[key, dir]] = Object.entries(spec);
          result = [...result].sort((a, b) => {
            const cmp = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
            return cmp * dir; // dir: 1 ascending, -1 descending (as in MongoDB)
          });
          return cursor;
        },
        limit(n) {
          result = result.slice(0, n);
          return cursor;
        },
        async toArray() {
          return result;
        }
      };
      return cursor;
    },
    async insertOne(doc) {
      const _id = doc._id ?? `id${nextId++}`;
      docs.push({ ...doc, _id });
      return { insertedId: _id };
    },
    async insertMany(list) {
      for (const d of list) docs.push({ ...d });
      return { insertedCount: list.length };
    }
  };
}

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(chunk) { this.body = chunk || ""; }
  };
  return res;
}

async function call(handler, { method = "GET", body, query = {}, headers = {} } = {}) {
  const req = {
    method,
    query,
    body,
    headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.1", ...headers },
    socket: { remoteAddress: "127.0.0.1" }
  };
  const res = mockRes();
  await handler(req, res);
  return { status: res.statusCode, json: res.body ? JSON.parse(res.body) : null, headers: res.headers };
}

const validBody = () => ({
  title: "Scientific Calculator",
  price: 1500,
  category: "books",
  condition: "Used - Good",
  badge: "Popular",
  description: "Works perfectly, comes with the cover.",
  sellerName: "Test Student",
  sellerDept: "BSc. Computer Science",
  sellerPhone: "0712 345 678",
  sellerLocation: "Library Lawn"
});

test("GET seeds the sample listings the first time and hides private fields", async () => {
  const col = fakeCollection();
  const handler = createHandler({ getCollection: async () => col });
  const { status, json } = await call(handler);
  assert.equal(status, 200);
  assert.equal(json.listings.length, 11);
  assert.ok(json.listings.every((l) => l.sample === true));
  assert.ok(json.listings.every((l) => !("ipHash" in l) && !("_id" in l)));
  assert.equal(json.listings[0].id, "p1");

  // A second GET must not seed again.
  await call(handler);
  assert.equal(col.docs.length, 11);
});

test("POST creates a listing with a normalised WhatsApp number", async () => {
  const col = fakeCollection();
  const handler = createHandler({ getCollection: async () => col });
  await call(handler); // seeds the sample listings first, as on the live site
  await new Promise((r) => setTimeout(r, 5));
  const { status, json } = await call(handler, { method: "POST", body: validBody() });
  assert.equal(status, 201);
  assert.equal(json.listing.seller.whatsapp, "254712345678");
  assert.equal(json.listing.seller.phone, "+254 712 345 678");
  assert.equal(json.listing.sample, false);
  assert.ok(!("ipHash" in json.listing));
  assert.match(json.listing.seller.location, /Library Lawn/);

  const list = await call(handler);
  assert.equal(list.json.listings[0].id, json.listing.id, "new listing is newest");
});

test("POST rejects invalid input with per-field messages", async () => {
  const handler = createHandler({ getCollection: async () => fakeCollection() });
  const bad = { ...validBody(), title: "x", price: 5, sellerPhone: "12345", category: "weapons" };
  const { status, json } = await call(handler, { method: "POST", body: bad });
  assert.equal(status, 400);
  assert.equal(json.error, "validation");
  for (const field of ["title", "price", "sellerPhone", "category"]) {
    assert.ok(json.fields[field], `expected an error for ${field}`);
  }
});

test("POST stores markup as plain text and ignores client-supplied internal fields", async () => {
  const col = fakeCollection();
  const handler = createHandler({ getCollection: async () => col });
  const body = {
    ...validBody(),
    title: `<img src=x onerror=alert(1)> Cheap`,
    image: "https://evil.example/x.png",
    sample: true,
    status: "sold",
    ipHash: "forged",
    _id: "p1"
  };
  const { status, json } = await call(handler, { method: "POST", body });
  assert.equal(status, 201);
  assert.equal(json.listing.title, "<img src=x onerror=alert(1)> Cheap"); // stored as text; the UI escapes it
  assert.match(json.listing.image, /^assets\/images\//);
  assert.equal(json.listing.sample, false);
  assert.equal(json.listing.status, "available");
  assert.notEqual(col.docs[0].ipHash, "forged");
  assert.notEqual(col.docs[0]._id, "p1");
});

test("POST is rate limited per IP, but another IP is unaffected", async () => {
  const col = fakeCollection();
  const handler = createHandler({ getCollection: async () => col });
  for (let i = 0; i < POSTS_PER_HOUR; i++) {
    const r = await call(handler, { method: "POST", body: validBody() });
    assert.equal(r.status, 201, `post ${i + 1}`);
  }
  const blocked = await call(handler, { method: "POST", body: validBody() });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers["retry-after"], "3600");

  const other = await call(handler, {
    method: "POST",
    body: validBody(),
    headers: { "x-forwarded-for": "10.9.9.9" }
  });
  assert.equal(other.status, 201);
});

test("POST requires JSON", async () => {
  const handler = createHandler({ getCollection: async () => fakeCollection() });
  const r = await call(handler, { method: "POST", body: "x", headers: { "content-type": "text/plain" } });
  assert.equal(r.status, 415);
});

test("unsupported methods get 405 and a missing database config gets 503", async () => {
  const handler = createHandler({ getCollection: async () => fakeCollection() });
  assert.equal((await call(handler, { method: "DELETE" })).status, 405);

  const { NotConfiguredError } = require("../lib/db");
  const unconfigured = createHandler({
    getCollection: async () => {
      throw new NotConfiguredError();
    }
  });
  const r = await call(unconfigured);
  assert.equal(r.status, 503);
  assert.equal(r.json.error, "not_configured");
});

test("unexpected database errors return 500 without leaking details", async () => {
  const original = console.error;
  console.error = () => {};
  try {
    const handler = createHandler({
      getCollection: async () => {
        throw new Error("mongodb+srv://user:secret@cluster exploded");
      }
    });
    const r = await call(handler);
    assert.equal(r.status, 500);
    assert.ok(!JSON.stringify(r.json).includes("secret"));
  } finally {
    console.error = original;
  }
});

test("validateListingInput trims, collapses whitespace and strips control characters", () => {
  const r = validateListingInput({
    ...validBody(),
    title: "  Nice \u0000  lamp\t\n ",
    description: "Line one\r\n\r\n\r\n\r\nLine two with \u0007 bell"
  });
  assert.equal(r.ok, true);
  assert.equal(r.value.title, "Nice lamp");
  assert.equal(r.value.description, "Line one\n\nLine two with bell");
});
