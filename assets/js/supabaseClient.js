// assets/js/supabaseClient.js

let _client = null;

function requireEnv() {
  const url = window.__ENV?.SUPABASE_URL;
  const key = window.__ENV?.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set window.__ENV.SUPABASE_URL and window.__ENV.SUPABASE_ANON_KEY."
    );
  }
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    throw new Error(
      "Supabase library not loaded. Add <script src=\"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2\"></script> in your HTML <head>."
    );
  }

  return { url, key };
}

export function configureSupabase({ url, anonKey }) {
  window.__ENV = window.__ENV || {};
  window.__ENV.SUPABASE_URL = url;
  window.__ENV.SUPABASE_ANON_KEY = anonKey;
  _client = null;
}

export function getSupabase() {
  if (_client) return _client;

  const { url, key } = requireEnv();
  _client = window.supabase.createClient(url, key);
  return _client;
}

export async function sendMagicLink(email, redirectTo) {
  const sb = getSupabase();

  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo }
  });

  if (error) throw error;
  return true;
}

export async function getSession() {
  const sb = getSupabase();
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  return data.session || null;
}

export async function signOut() {
  const sb = getSupabase();
  const { error } = await sb.auth.signOut();
  if (error) throw error;
  return true;
}
