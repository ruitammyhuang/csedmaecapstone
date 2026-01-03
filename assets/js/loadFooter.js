// assets/js/loadFooter.js
// Loads shared footer HTML into #footer-container and sets the year.

function setYear() {
  const el = document.getElementById("year");
  if (el) el.textContent = String(new Date().getFullYear());
}

export async function loadFooter() {
  const container = document.getElementById("footer-container");
  if (!container) return;

  // Avoid re-loading if bootstrap runs again
  if (container.dataset.loaded === "1") {
    setYear();
    return;
  }

  const partialUrl = new URL("../partials/footer.html", import.meta.url);

  try {
    const res = await fetch(partialUrl.toString(), { cache: "no-cache" });
    if (!res.ok) throw new Error(`Footer fetch failed (${res.status})`);

    container.innerHTML = await res.text();
    container.dataset.loaded = "1";
    setYear();
  } catch (e) {
    console.error(e);
    container.innerHTML = "";
  }
}
