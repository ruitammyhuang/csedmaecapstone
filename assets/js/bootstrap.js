// assets/js/bootstrap.js

import { configureSupabase } from "./supabaseClient.js";
import { SUPABASE_CONFIG } from "./config.js";
import { loadTopNav } from "./loadTopNav.js";
import { loadModulesSubNav } from "./loadModulesSubNav.js";
import { loadSharedModals } from "./loadSharedModals.js";

function setYear() {
  const el = document.getElementById("year");
  if (el) el.textContent = String(new Date().getFullYear());
}

export async function bootstrapApp() {
  // Configure Supabase ONCE
  configureSupabase(SUPABASE_CONFIG);

  // Shared UI
  await loadTopNav();
  await loadModulesSubNav();
  await loadSharedModals();

  setYear();
}
