const test = require("node:test");
const assert = require("node:assert/strict");
const { filterAndSortProducts, parsePriceInput, matchesSearch, normalizeSearchText } = require("../js/filters");

const P = (id, title, price, extra = {}) => ({
  id, title, price, category: "electronics", condition: "Used - Good", badgeType: "new", description: "", seller: { name: "Sam", department: "BSc", location: "Chuka University (Library)" }, ...extra
});
const items = [
  P("a", "Dell Latitude Laptop", 28000, { badgeType: "popular" }),
  P("b", "Redmi 13C Phone", 12000, { category: "phones", condition: "Used - Very Good", description: "128 GB storage, 4GB RAM" }),
  P("c", "Biology Textbook", 800, { category: "books", condition: "Used - Fair" }),
  P("d", "Hot Pilau Meal", 150, { category: "food", condition: "Freshly Prepared" }),
  P("e", "Brand New Kettle", 1200, { category: "home", condition: "Brand New", badgeType: "best-deal" }),
  P("f", "Calculator", 1200, { category: "books", condition: "Brand New", mine: true })
];
const ids = (list) => list.map((p) => p.id).join("");
const cats = { electronics: "Electronics", phones: "Phones & Accessories", books: "Books & Stationery", food: "Food & Beverages", home: "Home & Living" };

test("parsePriceInput accepts numbers with commas and rejects junk", () => {
  assert.equal(parsePriceInput("1,500"), 1500);
  assert.equal(parsePriceInput(" 2000 "), 2000);
  assert.equal(parsePriceInput("0"), 0);
  for (const bad of ["", "abc", "-5", "1e3", "12abc", null, undefined]) assert.equal(parsePriceInput(bad), null, String(bad));
});

test("search needs every word, in any order, across title, description, category and seller", () => {
  assert.equal(ids(filterAndSortProducts(items, { search: "laptop dell" })), "a");
  assert.equal(ids(filterAndSortProducts(items, { search: "128gb" })), "", "128gb is not the same text as '128 GB'");
  assert.equal(ids(filterAndSortProducts(items, { search: "128 ram" })), "b", "words found in the description");
  assert.equal(ids(filterAndSortProducts(items, { search: "stationery", categoryNames: cats })), "cf", "category label");
  assert.equal(ids(filterAndSortProducts(items, { search: "library" })), "abcdef", "meetup location");
  assert.equal(ids(filterAndSortProducts(items, { search: "  DELL   " })), "a");
  assert.equal(ids(filterAndSortProducts(items, { search: "dell phone" })), "", "all words must match");
  assert.equal(ids(filterAndSortProducts(items, { search: "" })), "abcdef");
  assert.equal(normalizeSearchText("Café"), "cafe");
  assert.equal(matchesSearch({ title: "Café table", seller: {} }, "cafe"), true);
});

test("price range is inclusive and either end can be left open", () => {
  assert.equal(ids(filterAndSortProducts(items, { minPrice: 1200, maxPrice: 12000 })), "bef");
  assert.equal(ids(filterAndSortProducts(items, { maxPrice: 800 })), "cd");
  assert.equal(ids(filterAndSortProducts(items, { minPrice: 20000 })), "a");
  assert.equal(ids(filterAndSortProducts(items, { minPrice: 5000, maxPrice: 100 })), "", "min above max matches nothing");
});

test("condition groups", () => {
  assert.equal(ids(filterAndSortProducts(items, { condition: "new" })), "ef");
  assert.equal(ids(filterAndSortProducts(items, { condition: "used" })), "abc");
  assert.equal(ids(filterAndSortProducts(items, { condition: "fresh" })), "d");
  assert.equal(ids(filterAndSortProducts(items, { condition: "bogus" })), "abcdef", "unknown value does not hide everything");
});

test("sorting is by price and stable for ties; original order is kept for newest", () => {
  assert.equal(ids(filterAndSortProducts(items, { sort: "price-asc" })), "dcefba");
  assert.equal(ids(filterAndSortProducts(items, { sort: "price-desc" })), "abefcd");
  assert.equal(ids(filterAndSortProducts(items, { sort: "newest" })), "abcdef");
});

test("chips, categories and saved/mine views still work and combine with the new filters", () => {
  assert.equal(ids(filterAndSortProducts(items, { filter: "popular" })), "a");
  assert.equal(ids(filterAndSortProducts(items, { filter: "best-deal" })), "e");
  assert.equal(ids(filterAndSortProducts(items, { filter: "under1000" })), "cd");
  assert.equal(ids(filterAndSortProducts(items, { filter: "saved", saved: new Set(["b", "d"]) })), "bd");
  assert.equal(ids(filterAndSortProducts(items, { filter: "mine" })), "f");
  assert.equal(ids(filterAndSortProducts(items, { filter: "books", categoryNames: cats })), "cf");
  assert.equal(ids(filterAndSortProducts(items, { category: "books", condition: "new", sort: "price-desc" })), "f");
  assert.equal(ids(filterAndSortProducts(items, { filter: "books", categoryNames: cats, maxPrice: 1000, search: "bio" })), "c");
});

test("the input array is never mutated", () => {
  const copy = items.map((p) => p.id).join("");
  filterAndSortProducts(items, { sort: "price-desc" });
  assert.equal(ids(items), copy);
});
