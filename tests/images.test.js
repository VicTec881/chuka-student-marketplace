const test = require("node:test");
const assert = require("node:assert/strict");
const { parseImageDataUrl, MAX_IMAGE_BYTES } = require("../lib/images");
const { createHandler } = require("../lib/listings-handler");
const { createSupabaseStore, BUCKET } = require("../lib/supabase-store");
const { validateListingInput } = require("../lib/validate");
const { safeImagePath } = require("../js/utils");
const { createMemoryStore } = require("./helpers/memory-store");

const jpegBytes = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100, 1)]);
const pngBytes = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(50)]);
const dataUrl = (mime, buf) => `data:image/${mime};base64,${buf.toString("base64")}`;

const body = (extra = {}) => ({
  title: "Redmi 13C", price: 12000, category: "phones", condition: "Used - Very Good", badge: "Fresh",
  description: "128 GB storage, 4GB RAM and 50MP camera", sellerName: "Victor", sellerDept: "BSc. CS",
  sellerPhone: "0758799823", sellerLocation: "Pavilion", ...extra
});

function mockRes() {
  return { statusCode: 200, headers: {}, body: "", setHeader(k, v) { this.headers[k] = v; }, end(c) { this.body = c || ""; } };
}
async function post(handler, b) {
  const res = mockRes();
  await handler({ method: "POST", body: b, headers: { "content-type": "application/json" }, socket: {} }, res);
  return { status: res.statusCode, json: JSON.parse(res.body) };
}

test("parseImageDataUrl accepts real jpeg/png and checks the actual bytes", () => {
  assert.equal(parseImageDataUrl(dataUrl("jpeg", jpegBytes)).ext, "jpg");
  assert.equal(parseImageDataUrl(dataUrl("png", pngBytes)).ext, "png");
  // declared as jpeg but really text / html / svg
  assert.equal(parseImageDataUrl(dataUrl("jpeg", Buffer.from("<script>alert(1)</script>"))).ok, false);
  assert.equal(parseImageDataUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=").ok, false);
  assert.equal(parseImageDataUrl("https://evil.example/x.jpg").ok, false);
  assert.equal(parseImageDataUrl(12345).ok, false);
});

test("parseImageDataUrl rejects oversized photos", () => {
  const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(MAX_IMAGE_BYTES + 10)]);
  assert.equal(parseImageDataUrl(dataUrl("jpeg", big)).ok, false);
});

test("validateListingInput reports a bad photo and allows no photo", () => {
  assert.equal(validateListingInput(body()).ok, true);
  assert.equal(validateListingInput(body()).photo, null);
  const bad = validateListingInput(body({ image: "data:image/png;base64,AAAA" }));
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.image);
});

test("POST uploads the photo and stores its public URL as the listing image", async () => {
  const store = createMemoryStore();
  const handler = createHandler({ getStore: async () => store });
  const { status, json } = await post(handler, body({ image: dataUrl("jpeg", jpegBytes) }));
  assert.equal(status, 201);
  assert.equal(store.uploads.length, 1);
  assert.match(json.listing.image, /^https:\/\/.*\/listing-images\/.*\.jpg$/);
});

test("POST with a fake photo is rejected and nothing is uploaded or stored", async () => {
  const store = createMemoryStore();
  const handler = createHandler({ getStore: async () => store });
  const { status, json } = await post(handler, body({ image: dataUrl("jpeg", Buffer.from("not an image")) }));
  assert.equal(status, 400);
  assert.ok(json.fields.image);
  assert.equal(store.uploads.length, 0);
  assert.equal(store.rows.length, 0);
});

test("safeImagePath allows only local assets and this project's listing-images bucket", () => {
  const ok = "https://abc123.supabase.co/storage/v1/object/public/listing-images/2026-10/a-b.jpg";
  assert.equal(safeImagePath(ok), ok);
  for (const bad of [
    "https://evil.example/storage/v1/object/public/listing-images/a.jpg",
    "https://abc.supabase.co/storage/v1/object/public/other/a.jpg",
    "https://abc.supabase.co/storage/v1/object/public/listing-images/../x.jpg",
    "javascript:alert(1)", "data:image/png;base64,AAAA"
  ]) assert.equal(safeImagePath(bad), safeImagePath(null), bad);
});

function fakeClient({ bucketExists }) {
  const calls = [];
  let exists = bucketExists;
  return {
    calls,
    storage: {
      from: (bucket) => ({
        upload: async (name, buf, opts) => {
          calls.push(["upload", bucket, name, opts.contentType]);
          return exists ? { data: { path: name }, error: null } : { data: null, error: { message: "Bucket not found" } };
        },
        getPublicUrl: (name) => ({ data: { publicUrl: `https://abc.supabase.co/storage/v1/object/public/${bucket}/${name}` } })
      }),
      createBucket: async (name, opts) => { calls.push(["createBucket", name, opts.public]); exists = true; return { data: {}, error: null }; }
    }
  };
}

test("supabase store uploads to the public bucket and creates it on first use", async () => {
  const client = fakeClient({ bucketExists: false });
  const url = await createSupabaseStore(client).uploadImage({ buffer: jpegBytes, mime: "image/jpeg", ext: "jpg" });
  assert.deepEqual(client.calls.map((c) => c[0]), ["upload", "createBucket", "upload"]);
  assert.equal(client.calls[1][1], BUCKET);
  assert.equal(client.calls[1][2], true);
  assert.match(url, /\/listing-images\/\d{4}-\d{2}\/[0-9a-f-]+\.jpg$/);
});

test("supabase store does not recreate an existing bucket", async () => {
  const client = fakeClient({ bucketExists: true });
  await createSupabaseStore(client).uploadImage({ buffer: jpegBytes, mime: "image/jpeg", ext: "jpg" });
  assert.deepEqual(client.calls.map((c) => c[0]), ["upload"]);
});
