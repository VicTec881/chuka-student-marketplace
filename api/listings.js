// GET  /api/listings  -> { listings: [...] }
// POST /api/listings  -> { listing: {...} }   (JSON body, see lib/validate.js)

const { createHandler } = require("../lib/listings-handler");
const { getStore } = require("../lib/supabase-store");

module.exports = createHandler({ getStore });
