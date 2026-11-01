// Chuka Student Marketplace - search, filter and sort logic (pure functions, no DOM).
// Used by app.js; also loaded by the Node tests.

/** Lower-case and strip accents so "café" matches "cafe". */
function normalizeSearchText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Parse a price box: "1,500" / " 2000 " -> number, anything else (empty, text, negative) -> null. */
function parsePriceInput(value) {
  const cleaned = String(value ?? "").replace(/[,\s]/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Search matches when EVERY word appears somewhere in the listing's text. */
function matchesSearch(product, query, categoryNames = {}) {
  const words = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = normalizeSearchText(
    [
      product.title,
      product.description,
      product.longDescription,
      product.seller && product.seller.name,
      product.seller && product.seller.department,
      product.seller && product.seller.location,
      product.condition,
      product.category,
      categoryNames[product.category]
    ].join(" ")
  );
  return words.every((w) => hay.includes(w));
}

const CONDITION_GROUPS = {
  all: () => true,
  new: (c) => c === "Brand New",
  used: (c) => typeof c === "string" && c.startsWith("Used"),
  fresh: (c) => c === "Freshly Prepared"
};

/**
 * @param {Array} products
 * @param {object} o
 *   search, category ("all" | id), filter ("all"|"popular"|"best-deal"|"under1000"|"saved"|"mine"|category id),
 *   saved (Set of ids), minPrice / maxPrice (number|null), condition ("all"|"new"|"used"|"fresh"),
 *   sort ("newest"|"price-asc"|"price-desc"), categoryNames ({id: name})
 * Returns a new array; the input is never modified.
 */
function filterAndSortProducts(products, o = {}) {
  const {
    search = "", category = "all", filter = "all", saved = new Set(),
    minPrice = null, maxPrice = null, condition = "all", sort = "newest", categoryNames = {}
  } = o;

  let out = products.filter((p) => {
    if (!matchesSearch(p, search, categoryNames)) return false;
    if (category !== "all" && p.category !== category) return false;

    if (filter === "popular" && p.badgeType !== "popular") return false;
    if (filter === "best-deal" && p.badgeType !== "best-deal") return false;
    if (filter === "under1000" && !(p.price < 1000)) return false;
    if (filter === "saved" && !saved.has(p.id)) return false;
    if (filter === "mine" && p.mine !== true) return false;
    if (categoryNames[filter] !== undefined && p.category !== filter) return false;

    if (minPrice !== null && p.price < minPrice) return false;
    if (maxPrice !== null && p.price > maxPrice) return false;
    return (CONDITION_GROUPS[condition] || CONDITION_GROUPS.all)(p.condition);
  });

  if (sort === "price-asc") out = out.map((p, i) => [p, i]).sort((a, b) => a[0].price - b[0].price || a[1] - b[1]).map((x) => x[0]);
  else if (sort === "price-desc") out = out.map((p, i) => [p, i]).sort((a, b) => b[0].price - a[0].price || a[1] - b[1]).map((x) => x[0]);
  return out;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { normalizeSearchText, parsePriceInput, matchesSearch, filterAndSortProducts };
}
