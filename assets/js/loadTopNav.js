// assets/js/loadTopNav.js
import { getSupabase } from "./supabaseClient.js";

function setActiveNav(activeKey) {
  if (!activeKey) return;
  document.querySelectorAll(".topnav-link").forEach((el) => {
    if (el.dataset.nav === activeKey) el.classList.add("active");
  });
}

export async function loadTopNav(activeKey) {
  const container = document.getElementById("topnav-container");
  if (!container) return;

  // Build an absolute URL so this works from any page path (e.g., /, /getting_started.html, /pages/x.html)
  const partialUrl = new URL("../partials/topnav.html", import.meta.url);

  let html = "";
  try {
    const res = await fetch(partialUrl.toString(), { cache: "no-cache" });
    if (!res.ok) throw new Error(`Topnav fetch failed (${res.status})`);
    html = await res.text();
  } catch (e) {
    console.error(e);
    // Fail gracefully: don't break the page if nav can't load.
    container.innerHTML = "";
    return;
  }

  container.innerHTML = html;

  // Highlight active nav item
  setActiveNav(activeKey);

  // Sign out behavior (avoid double-binding)
  const signOutBtn = document.getElementById("signOutBtn");
  if (signOutBtn && signOutBtn.dataset.bound !== "1") {
    signOutBtn.dataset.bound = "1";
    signOutBtn.addEventListener("click", async () => {
      try {
        const sb = getSupabase();
        await sb.auth.signOut();
      } finally {
        // Always return to course hub
        window.location.href = "index.html";
      }
    });
  }
}
