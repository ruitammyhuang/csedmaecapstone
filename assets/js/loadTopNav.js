// assets/js/loadTopNav.js
import { getSupabase } from "./supabaseClient.js";

function getCurrentFileName() {
  const path = (window.location.pathname || "").toLowerCase();
  const parts = path.split("/");
  return parts[parts.length - 1] || "";
}

function detectActiveTopNavKey() {
  const file = getCurrentFileName();
  const hash = (window.location.hash || "").toLowerCase();

  // Hash-based highlighting on index.html
  if (file === "" || file === "index.html") {
    if (hash.includes("modules")) return "modules";
    return null;
  }

  // Page-based highlighting
  if (file === "self_intro.html" || file === "self-intro.html") return "self-intro";

  // Any module/sprint pages should highlight Modules
  const modulePages = new Set([
    "getting_started.html",
    "sprint1.html",
    "sprint2.html",
    "sprint3.html",
    "sprint4.html",
    "sprint5.html",
    "wrap_up.html"
  ]);
  if (modulePages.has(file)) return "modules";

  return null;
}

function applyActiveNav(activeKey) {
  document.querySelectorAll(".topnav-link").forEach((el) => {
    el.classList.toggle("active", el.dataset.nav === activeKey);
  });
}

/**
 * GitHub Pages project site:
 * https://username.github.io/<repo>/(pages...)
 * We want the stable base "/<repo>/".
 */
function repoBasePath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  // For a GitHub Pages project site, parts[0] is the repo name (e.g., "csedmaecapstone")
  const repo = parts[0] || "";
  return `/${repo}/`;
}

function urlFromRepoRoot(file) {
  return `${window.location.origin}${repoBasePath()}${file}`;
}

export async function loadTopNav() {
  const container = document.getElementById("topnav-container");
  if (!container) return;

  // Keep your known-good partial path
  const partialUrl = new URL("../../partials/topnav.html", import.meta.url);

  try {
    const res = await fetch(partialUrl.toString(), { cache: "no-cache" });
    if (!res.ok) throw new Error(`Topnav fetch failed (${res.status})`);
    container.innerHTML = await res.text();
  } catch (e) {
    console.error(e);
    container.innerHTML = "";
    return;
  }

  // Highlight now and on hash changes
  applyActiveNav(detectActiveTopNavKey());

  if (!window.__topnavHashListenerBound) {
    window.__topnavHashListenerBound = true;
    window.addEventListener("hashchange", () => {
      applyActiveNav(detectActiveTopNavKey());
    });
  }

  // Sign out
  const signOutBtn = document.getElementById("signOutBtn");
  if (signOutBtn && signOutBtn.dataset.bound !== "1") {
    signOutBtn.dataset.bound = "1";

    signOutBtn.addEventListener("click", async () => {
      const sb = getSupabase();

      try {
        await sb.auth.signOut({ scope: "local" });
      } catch (e) {
        console.error("Sign out error:", e);
      } finally {
        // Recommended: send users to your dedicated auth page
        // If you have not created it yet, temporarily switch to index.html
        const target = urlFromRepoRoot("signup_signin.html"); // preferred
        // const target = urlFromRepoRoot("index.html"); // temporary fallback
        window.location.replace(target);
      }
    });
  }
}
