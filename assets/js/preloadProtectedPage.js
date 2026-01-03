// assets/js/preloadProtectedPage.js
import { configureSupabase, getSupabase } from "./supabaseClient.js";
import { SUPABASE_CONFIG } from "./config.js";
import { bootstrapApp } from "./bootstrap.js";

// Small helpers
function repoBasePath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const repo = parts[0] || "";
  return `/${repo}/`;
}

function urlFromRepoRoot(file) {
  return `${window.location.origin}${repoBasePath()}${file}`;
}

function returnToParam() {
  return encodeURIComponent(
    window.location.pathname + window.location.search + window.location.hash
  );
}

async function fetchInto(containerId, relativeFromRepoRoot) {
  const el = document.getElementById(containerId);
  if (!el) throw new Error(`Missing container #${containerId}`);

  const url = urlFromRepoRoot(relativeFromRepoRoot);
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to fetch ${relativeFromRepoRoot} (${res.status})`);
  el.innerHTML = await res.text();
}

export async function preloadProtectedPage({
  contentSelector = "#page-content",
  redirectTo = "signup_signin.html",
  shellPartial = "partials/page-shell.html"
} = {}) {
  // 1) Ensure Supabase is configured before any auth check
  configureSupabase(SUPABASE_CONFIG);

  // 2) Load the shared page shell (contains appShell, topnav/footer containers, modals, etc.)
  await fetchInto("page-shell-container", shellPartial);

  // 3) Auth check
  const sb = getSupabase();
  let session = null;
  try {
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    session = data?.session || null;
  } catch (e) {
    console.error("Auth session check error:", e);
    session = null;
  }

  if (!session) {
    // Signed out -> redirect to centralized auth page
    window.location.replace(`${urlFromRepoRoot(redirectTo)}?returnTo=${returnToParam()}`);
    return;
  }

  // 4) Signed in -> show shell and move this page’s content into #main
  const appShell = document.getElementById("appShell");
  if (appShell) appShell.style.display = "block";

  const content = document.querySelector(contentSelector);
  const main = document.getElementById("main");
  if (!main) throw new Error("Missing #main in page shell partial");

  if (content) {
    content.style.display = "block";
    main.innerHTML = "";
    main.appendChild(content);
  }

  // 5) Now load shared partials (topnav/footer/modals/year) into the containers
  await bootstrapApp();
}
