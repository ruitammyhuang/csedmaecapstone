// assets/js/loadSharedModals.js
// Loads shared modal HTML into #shared-modals and uses event delegation
// so buttons injected later (topnav) still work.

function bindDelegatedModalEventsOnce() {
  if (document.body.dataset.modalDelegationBound === "1") return;
  document.body.dataset.modalDelegationBound = "1";

  // Open modal (delegated)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open-modal]");
    if (!btn) return;

    const id = btn.getAttribute("data-open-modal");
    if (!id) return;

    const dialog = document.getElementById(id);
    if (dialog && typeof dialog.showModal === "function") {
      dialog.showModal();
    }
  });

  // Backdrop click to close (delegated)
  document.addEventListener("click", (e) => {
    const dialog = e.target;
    if (!(dialog instanceof HTMLDialogElement)) return;
    if (!dialog.classList.contains("modal")) return;

    if (e.target === dialog) dialog.close();
  });
}

export async function loadSharedModals() {
  const container = document.getElementById("shared-modals");
  if (!container) return;

  // Always ensure delegation is bound
  bindDelegatedModalEventsOnce();

  // If already loaded, stop here
  if (container.dataset.loaded === "1") return;

  const partialUrl = new URL("../partials/shared-modals.html", import.meta.url);

  try {
    const res = await fetch(partialUrl.toString(), { cache: "no-cache" });
    if (!res.ok) throw new Error(`Shared modals fetch failed (${res.status})`);

    container.innerHTML = await res.text();
    container.dataset.loaded = "1";
  } catch (e) {
    console.error(e);
    container.innerHTML = "";
  }
}
