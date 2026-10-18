// Thrown when the server has no database credentials; the API answers 503 and the
// front end falls back to browser-only mode.
class NotConfiguredError extends Error {
  constructor(message = "Supabase is not configured") {
    super(message);
    this.name = "NotConfiguredError";
  }
}

module.exports = { NotConfiguredError };
