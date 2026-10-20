// In-memory stand-in for the Supabase store, with the same interface. Used by tests and the
// local dev server so no real database is needed.
function createMemoryStore() {
  const rows = [];
  let next = 1;
  return {
    rows, // exposed so tests can inspect what was stored
    async count() {
      return rows.length;
    },
    async listAvailable(limit) {
      return rows
        .filter((r) => r.status === "available")
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
        .slice(0, limit)
        .map(({ ipHash, ...publicFields }) => publicFields); // like the real store: never returns ipHash
    },
    async countRecentByIp(ipHash, since) {
      return rows.filter((r) => r.ipHash === ipHash && new Date(r.createdAt) > since).length;
    },
    async insert(listing) {
      const row = { ...listing, id: `id${next++}`, createdAt: new Date().toISOString() }; // server decides id/time
      rows.push(row);
      const { ipHash, ...publicFields } = row;
      return publicFields;
    },
    uploads: [],
    async uploadImage(photo) {
      this.uploads.push(photo);
      return `https://example.supabase.co/storage/v1/object/public/listing-images/2026-10/test${this.uploads.length}.${photo.ext}`;
    },
    async seed(listings) {
      for (const l of listings) if (!rows.some((r) => r.id === l.id)) rows.push({ ...l });
    }
  };
}

module.exports = { createMemoryStore };
