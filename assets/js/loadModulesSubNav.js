// assets/js/loadModulesSubNav.js
// Loads the second-level Modules sub-nav into #modules-subnav-container
// and highlights the active item based on the current page (or an override).

function detectActiveFromPath() {
  const path = (window.location.pathname || "").toLowerCase();

  if (path.endsWith("/getting_started.html") || path.endsWith("getting_started.html")) return "getting-started";
  if (path.endsWith("/sprint1.html") || path.endsWith("sprint1.html")) return "s1";
  if (path.endsWith("/sprint2.html") || path.endsWith("sprint2.html")) return "s2";
  if (path.endsWith("/sprint3.html") || path.endsWith("sprint3.html")) return "s3";
  if (path.endsWith("/sprint4.html") || path.endsWith("sprint4.html")) return "s4";
  if (path.endsWith("/sprint5.html") || path.endsWith("sprint5.html")) return "s5";
  if (path.endsWith("/wrap_up.html") || path.endsWith("wrap_up.html")) return "w";

  // On other pages (index.html, self_intro.html, etc.), no active subnav item.
  return null;
}

export async function loadModulesSubNav({ active } = {}) {
  const container = document.getElementById("modules-subnav-container");
  if (!container) return;

  // If already loaded once, just re-highlight (useful if bootstrap runs again)
  if (container.dataset.loaded === "1") {
    const chosen2 = active ?? detectActiveFromPath();
    if (!chosen2) return;

    container.querySelectorAll("[data-subnav]").forEach((link) => {
      link.classList.toggle("active", link.dataset.subnav === chosen2);
    });
    return;
  }

  // Robust path to partial from any page
  const partialUrl = new URL("../partials/modules-subnav.html", import.meta.url);

  try {
    const res = await fetch(partialUrl.toString(), { cache: "no-cache" });
    if (!res.ok) throw new Error(`modules-subnav fetch failed (${res.status})`);

    container.innerHTML = await res.text();
    container.dataset.loaded = "1";

    const chosen = active ?? detectActiveFromPath();
    if (!chosen) return;

    container.querySelectorAll("[data-subnav]").forEach((link) => {
      link.classList.toggle("active", link.dataset.subnav === chosen);
    });
  } catch (e) {
    console.error(e);
    container.innerHTML = "";
  }
}
