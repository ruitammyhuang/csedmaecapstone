// assets/js/bootstrap.js

import { configureSupabase } from "./supabaseClient.js";
import { SUPABASE_CONFIG } from "./config.js";
import { loadTopNav } from "./loadTopNav.js";
import { loadSharedModals } from "./loadSharedModals.js";
import { loadFooter } from "./loadFooter.js";

export async function bootstrapApp() {
  // Configure Supabase ONCE
  configureSupabase(SUPABASE_CONFIG);

  try {
    // Shared UI
    await loadTopNav();          // top bar
    await loadSharedModals();    // advisor dialog + bindings
    await loadFooter();
  } catch (e) {
    console.error("bootstrapApp failed:", e);
  }
}
