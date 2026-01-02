// assets/js/supabaseClient.js

let _client = null;
let _config = null;

/**
 * Configure Supabase ONCE (typically from bootstrap.js).
 * Call again only if you intentionally want to re-init (it will reset the client).
 */
export function configureSupabase({ url, anonKey, options } = {}) {
  if (!url || !anonKey) {
    throw new Error("configureSupabase requires { url, anonKey }.");
  }

  _config = { url, anonKey, options: options || {} };
  _client = null; // force re-create on next getSupabase()
}

/**
 * Get a singleton Supabase client.
 * Requires configureSupabase() to have been called first.
 */
export function getSupabase() {
  if (_client) return _client;

  if (!_config?.url || !_config?.anonKey) {
    throw new Error(
      "Supabase is not configured. Call configureSupabase({ url, anonKey }) before getSupabase()."
    );
  }

  if (!window.supabase?.createClient) {
    throw new Error(
      "Supabase library not loaded. Include @supabase/supabase-js v2 in your HTML <head>."
    );
  }

  _client = window.supabase.createClient(_config.url, _config.anonKey, _config.options);
  return _client;
}

/**
 * Optional helper if you want to check config state safely.
 */
export function isSupabaseConfigured() {
  return Boolean(_config?.url && _config?.anonKey);
}
