const { createAuthHandler } = require("../../lib/auth-handler");
const { getStore } = require("../../lib/supabase-store");

module.exports = createAuthHandler({ getStore });
