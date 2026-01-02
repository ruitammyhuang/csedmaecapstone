function detectActiveFromPath() {
  const path = (window.location.pathname || "").toLowerCase();

  if (path.endsWith("getting_started.html")) return "getting-started";
  if (path.endsWith("sprint1.html")) return "s1";
  if (path.endsWith("sprint2.html")) return "s2";
  if (path.endsWith("sprint3.html")) return "s3";
  if (path.endsWith("sprint4.html")) return "s4";
  if (path.endsWith("sprint5.html")) return "s5";
  if (path.endsWith("wrap_up.html")) return "w";

  // On other pages (index.html, self_intro.html, etc.), no active subnav item.
  return null;
}

export async function loadModulesSubNav({ active } = {}) {
  const container = document.getElementById("modules-subnav-container");
  if (!container) return;

  const res = await fetch("./partials/modules-subnav.html", { cache: "no-cache" });
  if (!res.ok) {
    console.error("Failed to load modules-subnav.html");
    return;
  }

  container.innerHTML = await res.text();

  const chosen = active ?? detectActiveFromPath();
  if (!chosen) return;

  container.querySelectorAll("[data-subnav]").forEach((link) => {
    if (link.dataset.subnav === chosen) link.classList.add("active");
  });
}
