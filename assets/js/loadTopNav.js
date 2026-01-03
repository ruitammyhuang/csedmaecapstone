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

  // IMPORTANT: go up two levels from /assets/js/ to reach /partials/
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

  setActiveNav(activeKey);

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
