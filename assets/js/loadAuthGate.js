// assets/js/loadAuthGate.js
export async function loadAuthGate() {
  const container = document.getElementById("auth-gate-container");
  if (!container) return;

  if (container.dataset.loaded === "1") return;

  const partialUrl = new URL("../../partials/auth-gate.html", import.meta.url);

  try {
    const res = await fetch(partialUrl.toString(), { cache: "no-cache" });
    if (!res.ok) throw new Error(`Auth gate fetch failed (${res.status})`);
    container.innerHTML = await res.text();
    container.dataset.loaded = "1";
  } catch (e) {
    console.error(e);
    container.innerHTML = "";
  }
}
