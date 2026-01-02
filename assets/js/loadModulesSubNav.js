// assets/js/loadModulesSubNav.js
// Loads the second-level Modules sub-nav into #modules-subnav-container
// and highlights the active item based on the current page (or an override).

function getCurrentFileName() {
  const path = (window.location.pathname || "").toLowerCase();
  const parts = path.split("/");
  return parts[parts.length - 1] || "";
}

function detectActiveFromPath() {
  const file = getCurrentFileName();

  if (file === "getting_started.html") return "getting-started";
  if (file === "sprint1.html") return "s1";
  if (file === "sprint2.html") return "s2";
  if (file === "sprint3.html") return "s3";
  if (file === "sprint4.html") return "s4";
  if (file === "sprint5.html") return "s5";
  if (file === "wrap_up.html") return "w";

  // On other pages (index.html, self_intro.html, etc.), no active subnav item.
  return null;
}

function applyActive(container, chosen) {
  if (!chosen) return;
  container.querySelectorAll("[data-subnav]").forEach((link) => {
    link.classList.toggle("active", link.dataset.subnav === chosen);
  });
}

export async function loadModulesSubNav({ active } = {}) {
  const container = document.getElementById("modules-subnav-container");
  if (!container) return;

  const chosen = active ?? detectActiveFromPath();

  // If already loaded once, just re-highlight
  if (container.dataset.loaded === "1") {
    applyActive(container, chosen);
    return;
  }

  // Robust path to partial from any page
  const partialUrl = new URL("../partials/modules-subnav.html", import.meta.url);

  try {
    const res = await fetch(partialUrl.toString(), { cache: "no-cache" });
    if (!res.ok) throw new Error(`modules-subnav fetch failed (${res.status})`);

    container.innerHTML = await res.text();
    container.dataset.loaded = "1";

    applyActive(container, chosen);
  } catch (e) {
    console.error(e);
    container.innerHTML = "";
  }
}
