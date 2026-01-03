// assets/js/loadTopNav.js
import { getSupabase } from "./supabaseClient.js";

function getCurrentFileName() {
  const path = (window.location.pathname || "").toLowerCase();
  const parts = path.split("/");
  return parts[parts.length - 1] || "";
}

function detectActiveTopNavKey() {
  const file = getCurrentFileName();
  const hash = (window.location.hash || "").toLowerCase();

  // Hash-based highlighting on index.html
  if (file === "" || file === "index.html") {
    if (hash.includes("modules")) return "modules";
    return null;
  }

  if (file === "self_intro.html" || file === "self-intro.html") return "self-intro";

  const modulePages = new Set([
    "getting_started.html",
    "sprint1.html",
    "sprint2.html",
    "sprint3.html",
    "sprint4.html",
    "sprint5.html",
    "wrap_up.html"
  ]);
  if (modulePages.has(file)) return "modules";

  return null;
}

function applyActiveNav(activeKey) {
  document.querySelectorAll(".topnav-link").forEach((el) => {
    el.classList.toggle("active", el.dataset.nav === activeKey);
  });
}

// /csedmaecapstone/signup_signin.html?returnTo=...
function authPageUrl() {
  const url = new URL("signup_signin.html", window.location.href);
  const returnTo =
    window.location.pathname +
    window.location.search +
    window.location.hash;

  url.searchParams.set("returnTo", returnTo);
  return url.toString();
}

// Best-effort cleanup if Supabase isn't configured on this page yet
function clearSupabaseTokensBestEffort() {
  try {
    // Supabase v2 stores auth under keys that start with "sb-"
    // This is safe to run even if nothing exists.
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-")) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    // ignore
  }
}

// adjusted to make sure signout button works
function bindDelegatedSignOutOnce() {
  if (document.body.dataset.signOutDelegationBound === "1") return;
  document.body.dataset.signOutDelegationBound = "1";

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("#signOutBtn");
    if (!btn) return;

    e.preventDefault();

    // Always redirect to the dedicated auth page
    const redirectUrl = authPageUrl();

    try {
      const sb = getSupabase();
      await sb.auth.signOut({ scope: "local" });
    } catch (err) {
      console.warn("Sign out: Supabase not ready or signOut failed. Redirecting anyway.", err);
      clearSupabaseTokensBestEffort();
    } finally {
      window.location.replace(redirectUrl);
    }
  });
}


export async function loadTopNav() {
  const container = document.getElementById("topnav-container");
  if (!container) return;

  // Bind once (delegation survives DOM replacement)
  bindDelegatedSignOutOnce();

  // Use your known-good path pattern
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

  // Initial highlight
  applyActiveNav(detectActiveTopNavKey());

  // Update highlight on hash changes (index anchors)
  if (!window.__topnavHashListenerBound) {
    window.__topnavHashListenerBound = true;
    window.addEventListener("hashchange", () => {
      applyActiveNav(detectActiveTopNavKey());
    });
  }

  // remove the old Sign out behavior (avoid double-binding)
  // const signOutBtn = document.getElementById("signOutBtn");
  // if (signOutBtn && signOutBtn.dataset.bound !== "1") {
  //   signOutBtn.dataset.bound = "1";

  //   signOutBtn.addEventListener("click", async (e) => {
  //     e.preventDefault();

  //     // Always redirect to the dedicated auth page
  //     const redirectUrl = authPageUrl();

  //     try {
  //       // This will throw if Supabase isn't configured on this page
  //       const sb = getSupabase();
  //       await sb.auth.signOut({ scope: "local" });
  //     } catch (err) {
  //       console.warn("Sign out: Supabase not ready or signOut failed. Redirecting anyway.", err);
  //       clearSupabaseTokensBestEffort();
  //     } finally {
  //       window.location.replace(redirectUrl);
  //     }
  //   });
  // }
}
