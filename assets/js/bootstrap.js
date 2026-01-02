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

export async function bootstrapApp({ topnavActive, subnavActive } = {}) {
  // Make bootstrap safe if called more than once
  if (window.__BOOTSTRAPPED__ === true) return;
  window.__BOOTSTRAPPED__ = true;

  // Configure Supabase ONCE
  configureSupabase(SUPABASE_CONFIG);

  // Shared UI (each loader fails gracefully if its container is missing)
  await loadTopNav(topnavActive);
  await loadModulesSubNav({ active: subnavActive });
  await loadSharedModals();

  setYear();
}
