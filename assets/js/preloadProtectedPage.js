// assets/js/preloadProtectedPage.js
import { configureSupabase, getSupabase } from "./supabaseClient.js";
import { SUPABASE_CONFIG } from "./config.js";

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

async function loadShell() {
  const mount = document.getElementById("page-shell-container");
  if (!mount) throw new Error("Missing #page-shell-container");

  const shellUrl = new URL("../../partials/page-shell.html", import.meta.url);
  const res = await fetch(shellUrl.toString(), { cache: "no-cache" });
  if (!res.ok) throw new Error(`Shell fetch failed (${res.status})`);

  mount.innerHTML = await res.text();
}

export async function preloadProtectedPage({
  contentSelector = "#page-content",
  redirectTo = "signup_signin.html",
  onAuthed
} = {}) {
  // Configure Supabase once up-front
  configureSupabase(SUPABASE_CONFIG);

  // Load the shared shell markup (contains #main, #topnav-container, etc.)
  await loadShell();

  // Auth check: redirect signed-out users
  const sb = getSupabase();
  const { data, error } = await sb.auth.getSession();
  if (error || !data?.session) {
    window.location.replace(`${urlFromRepoRoot(redirectTo)}?returnTo=${returnToParam()}`);
    return;
  }

  // Signed in: show app shell
  const appShell = document.getElementById("appShell");
  if (appShell) appShell.style.display = "block";

  // Move page HTML into shared shell main
  const content = document.querySelector(contentSelector);
  const main = document.getElementById("main");
  if (content && main) {
    main.appendChild(content);
    content.style.display = "block";
  }

  // Optional per-page init
  if (typeof onAuthed === "function") await onAuthed();
}
