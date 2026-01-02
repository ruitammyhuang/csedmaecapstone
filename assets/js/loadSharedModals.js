// assets/js/loadSharedModals.js
// Loads shared modal HTML (advisor modal) into #shared-modals and binds open/close behavior.

function bindModalTriggers() {
  // Open buttons (can live anywhere, including injected topnav)
  document.querySelectorAll("[data-open-modal]").forEach((btn) => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";

    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-open-modal");
      if (!id) return;

      const dialog = document.getElementById(id);
      if (dialog && typeof dialog.showModal === "function") dialog.showModal();
    });
  });

  // Click on backdrop to close
  document.querySelectorAll("dialog.modal").forEach((dialog) => {
    if (dialog.dataset.bound === "1") return;
    dialog.dataset.bound = "1";

    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
  });
}

export async function loadSharedModals() {
  const container = document.getElementById("shared-modals");
  if (!container) return;

  // If already loaded once, just (re)bind triggers safely.
  if (container.dataset.loaded === "1") {
    bindModalTriggers();
    return;
  }

  // Resolve partial path robustly from any page
  const partialUrl = new URL("../partials/shared-modals.html", import.meta.url);

  try {
    const res = await fetch(partialUrl.toString(), { cache: "no-cache" });
    if (!res.ok) throw new Error(`Shared modals fetch failed (${res.status})`);

    container.innerHTML = await res.text();
    container.dataset.loaded = "1";

    // Now that HTML exists in DOM, bind behaviors
    bindModalTriggers();
  } catch (e) {
    console.error(e);
    container.innerHTML = "";
  }
}
