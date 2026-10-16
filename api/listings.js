// GET  /api/listings  -> { listings: [...] }
// POST /api/listings  -> { listing: {...} }   (JSON body, see lib/validate.js)

const { createHandler } = require("../lib/listings-handler");
const { getListingsCollection } = require("../lib/db");

module.exports = createHandler({ getCollection: getListingsCollection });
