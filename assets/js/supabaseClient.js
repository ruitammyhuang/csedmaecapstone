// assets/js/supabaseClient.js
export function getSupabase() {
  const url = window.__ENV?.SUPABASE_URL;
  const key = window.__ENV?.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return window.supabase.createClient(url, key);
}
