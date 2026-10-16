// Run with: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  escapeHtml,
  safeImagePath,
  normalizeKenyanPhone,
  formatKenyanPhone,
  generateId,
  DEFAULT_PRODUCT_IMAGE
} = require("../js/utils.js");

test("normalizeKenyanPhone converts common local and international formats", () => {
  const expected = "254712345678";
  for (const input of [
    "0712345678",
    "0712 345 678",
    "0712-345-678",
    "(0712) 345 678",
    "712345678",
    "+254712345678",
    "+254 712 345 678",
    "254712345678"
  ]) {
    assert.equal(normalizeKenyanPhone(input), expected, `input: ${input}`);
  }
});

test("normalizeKenyanPhone accepts the 01xx mobile range", () => {
  assert.equal(normalizeKenyanPhone("0112345678"), "254112345678");
});

test("normalizeKenyanPhone rejects invalid numbers", () => {
  for (const input of [
    "",
    "abc",
    "07123",
    "071234567890",
    "0212345678", // landline-style prefix
    "+1 415 555 0100",
    "254 612 345 678",
    "0712 345 67a",
    null,
    undefined
  ]) {
    assert.equal(normalizeKenyanPhone(input), null, `input: ${input}`);
  }
});

test("formatKenyanPhone prints a readable number or empty string", () => {
  assert.equal(formatKenyanPhone("0712345678"), "+254 712 345 678");
  assert.equal(formatKenyanPhone("nope"), "");
});

test("escapeHtml neutralises markup and quotes", () => {
  assert.equal(
    escapeHtml(`<img src=x onerror="alert('hi')">&`),
    "&lt;img src=x onerror=&quot;alert(&#39;hi&#39;)&quot;&gt;&amp;"
  );
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
  assert.equal(escapeHtml(42), "42");
});

test("safeImagePath only allows bundled images", () => {
  assert.equal(safeImagePath("assets/images/dell_laptop.jpg"), "assets/images/dell_laptop.jpg");
  assert.equal(safeImagePath("javascript:alert(1)"), DEFAULT_PRODUCT_IMAGE);
  assert.equal(safeImagePath("https://evil.example/x.png"), DEFAULT_PRODUCT_IMAGE);
  assert.equal(safeImagePath("assets/images/../../secret"), DEFAULT_PRODUCT_IMAGE);
  assert.equal(safeImagePath('assets/images/a.jpg" onerror="x'), DEFAULT_PRODUCT_IMAGE);
  assert.equal(safeImagePath(undefined, "x.png"), "x.png");
});

test("generateId returns unique prefixed ids", () => {
  const ids = new Set(Array.from({ length: 200 }, () => generateId("p")));
  assert.equal(ids.size, 200);
  for (const id of ids) assert.match(id, /^p_/);
});
