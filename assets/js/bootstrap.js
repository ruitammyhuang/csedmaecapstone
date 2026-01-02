// assets/js/bootstrap.js
// Configures Supabase once for all pages that import this module.

import { configureSupabase, getSupabase } from "./supabaseClient.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, EDG6973_PROJECT_ID } from "./config.js";

let _bootstrapped = false;

export function bootstrapSupabase() {
  if (_bootstrapped) return getSupabase();

  configureSupabase({
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY
  });

  _bootstrapped = true;
  return getSupabase();
}

export { EDG6973_PROJECT_ID };
