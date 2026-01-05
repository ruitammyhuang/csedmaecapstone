// assets/js/bootstrap.js

import { configureSupabase } from "./supabaseClient.js";
import { SUPABASE_CONFIG } from "./config.js";
import { loadAuthGate } from "./loadAuthGate.js";
import { loadTopNav } from "./loadTopNav.js";
import { loadSharedModals } from "./loadSharedModals.js";
import { loadFooter } from "./loadFooter.js";

// export async function bootstrapApp() {
//   // Configure Supabase ONCE
//   configureSupabase(SUPABASE_CONFIG);

//   try {
//     // Shared UI
//     await loadAuthGate();
//     await loadTopNav();          // top bar
//     await loadSharedModals();    // advisor dialog + bindings
//     await loadFooter();
//   } catch (e) {
//     console.error("bootstrapApp failed:", e);
//   }
// }


export async function bootstrapApp({
  authGate = true,
  topNav = true,
  modals = true,
  footer = true
} = {}) {
  configureSupabase(SUPABASE_CONFIG);

  try {
    if (authGate) await loadAuthGate();
    if (topNav) await loadTopNav();
    if (modals) await loadSharedModals();
    if (footer) await loadFooter();
  } catch (e) {
    console.error("bootstrapApp failed:", e);
  }
}
