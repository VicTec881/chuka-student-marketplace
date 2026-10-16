// Chuka Student Marketplace - API client for the shared listings backend (/api/listings).
// Every function here fails soft: if the API is missing (local preview, database not set up yet,
// network down) callers fall back to the browser-only mode instead of breaking the page.

const API_TIMEOUT_MS = 8000;

async function apiRequest(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(`/api${path}`, {
      ...options,
      headers: { Accept: "application/json", ...(options.headers || {}) },
      signal: controller.signal
    });
    let data = null;
    const type = res.headers.get("content-type") || "";
    if (type.includes("application/json")) {
      try {
        data = await res.json();
      } catch (e) {
        data = null;
      }
    }
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Load all available listings.
 * Resolves to an array, or throws if the shared backend cannot be used.
 */
async function fetchListings() {
  const { ok, data } = await apiRequest("/listings");
  if (!ok || !data || !Array.isArray(data.listings)) {
    throw new Error("Listings API unavailable");
  }
  return data.listings;
}

/**
 * Create a listing on the server.
 * Resolves to { ok: true, listing } or { ok: false, status, error, message, fields }.
 * Network errors resolve to { ok: false, status: 0, error: "network" }.
 */
async function postListing(payload) {
  try {
    const { ok, status, data } = await apiRequest("/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (ok && data && data.listing) return { ok: true, listing: data.listing };
    return {
      ok: false,
      status,
      error: (data && data.error) || "unknown",
      message: data && data.message,
      fields: (data && data.fields) || {}
    };
  } catch (e) {
    return { ok: false, status: 0, error: "network", message: "Could not reach the server.", fields: {} };
  }
}

// Listings posted from this browser (so "My Listings" works before accounts exist).
const MY_LISTINGS_KEY = "chuka_marketplace_my_listing_ids";

function getMyListingIds() {
  const stored = typeof storageGetJSON === "function" ? storageGetJSON(MY_LISTINGS_KEY) : null;
  return new Set(Array.isArray(stored) ? stored.filter((id) => typeof id === "string") : []);
}

function rememberMyListingId(id) {
  const ids = getMyListingIds();
  ids.add(id);
  return storageSet(MY_LISTINGS_KEY, JSON.stringify([...ids]));
}
