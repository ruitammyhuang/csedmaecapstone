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

  // 1) Hash-based highlighting on index.html
  // If user is on index and jumps to #milestones or #modules, highlight accordingly.
  if (file === "" || file === "index.html") {
    if (hash.includes("modules")) return "modules";
    return null;
  }

  // 2) Page-based highlighting
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

export async function loadTopNav() {
  const container = document.getElementById("topnav-container");
  if (!container) return;

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

  // Initial highlight
  applyActiveNav(detectActiveTopNavKey());

  // Update highlight on hash changes (index anchors)
  if (!window.__topnavHashListenerBound) {
    window.__topnavHashListenerBound = true;
    window.addEventListener("hashchange", () => {
      applyActiveNav(detectActiveTopNavKey());
    });
  }

  // Sign out behavior (avoid double-binding)
  const signOutBtn = document.getElementById("signOutBtn");
  if (signOutBtn && signOutBtn.dataset.bound !== "1") {
    signOutBtn.dataset.bound = "1";
    signOutBtn.addEventListener("click", async () => {
      try {
        const sb = getSupabase();
        await sb.auth.signOut();
      } finally {
        window.location.href = "index.html";
      }
    });
  }
}
