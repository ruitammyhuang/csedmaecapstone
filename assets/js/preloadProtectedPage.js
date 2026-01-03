// assets/js/preloadProtectedPage.js
import { configureSupabase } from "./supabaseClient.js";
import { SUPABASE_CONFIG } from "./config.js";
import { loadAuthGate } from "./loadAuthGate.js";
import { initAuthGate } from "./authGate.js";
import { bootstrapApp } from "./bootstrap.js";

async function loadShell() {
  const shellHost = document.getElementById("page-shell-container");
  if (!shellHost) throw new Error('Missing <div id="page-shell-container"></div>');

  // Path: this file is /assets/js/, partials is /partials/
  const shellUrl = new URL("../../partials/page-shell.html", import.meta.url);
  const res = await fetch(shellUrl.toString(), { cache: "no-cache" });
  if (!res.ok) throw new Error(`page-shell fetch failed (${res.status})`);
  shellHost.innerHTML = await res.text();
}

export async function preloadProtectedPage({ onAuthed } = {}) {
  // 1) Configure Supabase first
  configureSupabase(SUPABASE_CONFIG);

  // 2) Load page shell (creates authGate/appShell containers)
  await loadShell();

  // 3) Load auth gate markup into #auth-gate-container
  await loadAuthGate();

  // 4) Run auth gate. Only after authorization do we load shared UI + page-specific code.
  let bootstrapped = false;

  await initAuthGate({
    onAuthed: async () => {
      if (bootstrapped) return;
      bootstrapped = true;

      await bootstrapApp(); // loads topnav/footer/modals + binds sign out, etc.

      if (typeof onAuthed === "function") {
        await onAuthed();
      }
    }
  });
}
