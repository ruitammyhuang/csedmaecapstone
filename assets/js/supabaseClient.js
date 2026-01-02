// assets/js/supabaseClient.js

let _client = null;

export function configureSupabase({ url, anonKey }) {
  window.__ENV = window.__ENV || {};
  window.__ENV.SUPABASE_URL = url;
  window.__ENV.SUPABASE_ANON_KEY = anonKey;
  _client = null;
}

export function getSupabase() {
  if (_client) return _client;

  const url = window.__ENV?.SUPABASE_URL;
  const key = window.__ENV?.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  if (!window.supabase?.createClient) {
    throw new Error("Supabase library not loaded. Include @supabase/supabase-js v2 in your HTML <head>.");
  }

  _client = window.supabase.createClient(url, key);
  return _client;
}
