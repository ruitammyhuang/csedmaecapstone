import { getSupabase } from "./supabaseClient.js";

export async function loadTopNav(activeKey) {
  const container = document.getElementById("topnav-container");
  if (!container) return;

  const res = await fetch("partials/topnav.html");
  const html = await res.text();
  container.innerHTML = html;

  // Highlight active nav item
  if (activeKey) {
    document
      .querySelectorAll(".topnav-link")
      .forEach((el) => {
        if (el.dataset.nav === activeKey) {
          el.classList.add("active");
        }
      });
  }

  // Sign out behavior
  const sb = getSupabase();
  document.getElementById("signOutBtn")?.addEventListener("click", async () => {
    await sb.auth.signOut();
    window.location.href = "index.html";
  });
}
