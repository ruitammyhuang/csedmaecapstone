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

async function isAuthorized(sb) {
  const { data: sessData } = await sb.auth.getSession();
  const uid = sessData?.session?.user?.id;
  if (!uid) return false;

  // Check users table flags (keep this if you use it)
  const { data: userRow, error: userErr } = await sb
    .from("users")
    .select("is_active")
    .eq("user_id", uid)
    .maybeSingle();

  if (userErr) return false;
  if (!userRow || userRow.is_active === false) return false;

  // Require at least one approved + active membership
  const { data: memberships, error: memErr } = await sb
    .from("project_memberships")
    .select("project_id, role, is_active, approved_at")
    .eq("user_id", uid);

  if (memErr) return false;
  if (!Array.isArray(memberships) || memberships.length === 0) return false;

  return memberships.some((m) => {
    const role = String(m.role || "").toLowerCase();
    const isAdmin = role === "admin";
    const approved = Boolean(m.approved_at);      // approved_at is not null
    const active = m.is_active === true;

    // Admins can pass if active; students must be active + approved
    return (isAdmin && active) || (active && approved);
  });
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

  // authorization check
  const ok = await isAuthorized(sb);
  if (!ok) {
    window.location.replace(`${urlFromRepoRoot("signup_signin.html")}?step=not_authorized`);
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
