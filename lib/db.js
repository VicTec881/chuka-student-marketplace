// MongoDB Atlas connection, reused across serverless invocations.
//
// Configuration (set in Vercel -> Project -> Settings -> Environment Variables):
//   MONGODB_URI  Atlas connection string (required, keep it secret)
//   MONGODB_DB   database name (optional, defaults to "chuka_marketplace")

const { MongoClient } = require("mongodb");

class NotConfiguredError extends Error {
  constructor() {
    super("MONGODB_URI is not set");
    this.name = "NotConfiguredError";
  }
}

// Cache the client on `global` so warm invocations reuse the same connection pool.
const cache = global.__chukaMongo || (global.__chukaMongo = { clientPromise: null });

function getClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new NotConfiguredError();
  if (!cache.clientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000
    });
    cache.clientPromise = client.connect().catch((err) => {
      cache.clientPromise = null; // allow a retry on the next request
      throw err;
    });
  }
  return cache.clientPromise;
}

let indexesReady = null;

async function getListingsCollection() {
  const client = await getClient();
  const col = client.db(process.env.MONGODB_DB || "chuka_marketplace").collection("listings");
  if (!indexesReady) {
    indexesReady = Promise.all([
      col.createIndex({ createdAt: -1 }),
      col.createIndex({ ipHash: 1, createdAt: -1 })
    ]).catch((err) => {
      indexesReady = null;
      console.error("Could not create indexes", err);
    });
  }
  await indexesReady;
  return col;
}

module.exports = { getListingsCollection, NotConfiguredError };
