// assets/js/authGate.js
// Supports two modes:
// 1) In-page gate (default): show authGate panel on the current page.
// 2) Redirect gate: if signed out, redirect to redirectTo with ?returnTo=...

import { getSupabase } from "./supabaseClient.js";

function $(id) {
  return document.getElementById(id);
}

function setMsg(elId, msg, isError) {
  const el = $(elId);
  if (!el) return;
  el.textContent = msg || "";
  el.style.color = isError ? "#b91c1c" : "";
}

function show(elId, isShown) {
  const el = $(elId);
  if (el) el.style.display = isShown ? "block" : "none";
}

function hideAllPanels() {
  show("panelSignup", false);
  show("panelSignin", false);
  show("panelSetPassword", false);
  show("panelUserInfo", false);
}

function setActiveTab(tab) {
  hideAllPanels();

  // Only show panels that exist on this page
  if (tab === "signup") {
    if ($("panelSignup")) show("panelSignup", true);
    else if ($("panelSignin")) show("panelSignin", true);
    return;
  }

  if (tab === "signin") {
    if ($("panelSignin")) show("panelSignin", true);
    else if ($("panelSignup")) show("panelSignup", true);
  }
}

function showUserInfoPanel(prefill) {
  hideAllPanels();
  show("panelUserInfo", true);

  const nameEl = $("uiFullName");
  const affEl = $("uiAffiliation");

  if (nameEl) nameEl.value = prefill?.full_name || "";
  if (affEl) affEl.value = prefill?.affiliation || "";

  setMsg("uiMsg", "", false);
}

function showSetPasswordPanel() {
  hideAllPanels();
  show("panelSetPassword", true);
  setMsg("setPasswordMsg", "", false);
}

function showGate(tab = "signin") {
  show("authGate", true);
  show("appShell", false);
  setActiveTab(tab);
}

function getRedirectToForEmails(mode) {
  // Supabase Auth emailRedirectTo / reset redirectTo
  // Keep user on the centralized auth page (or current page) and carry an optional mode.
  const u = new URL(window.location.origin + window.location.pathname);
  if (mode) u.searchParams.set("mode", mode);
  return u.toString();
}

function getReturnToFromUrl() {
  const u = new URL(window.location.href);
  return u.searchParams.get("returnTo");
}

function buildRedirectUrl(redirectTo, returnTo) {
  const u = new URL(redirectTo, window.location.origin);
  if (returnTo) u.searchParams.set("returnTo", returnTo);
  return u.toString();
}

function isIndexPage() {
  const path = (window.location.pathname || "").toLowerCase();
  return path.endsWith("/") || path.endsWith("/index.html") || path.endsWith("index.html");
}

async function getSessionOrNull(sb) {
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  return data?.session || null;
}

async function getDirectoryRow(sb, uid) {
  const { data, error } = await sb
    .from("users")
    .select("user_id, email, is_active, user_info_completed, password_set, full_name, affiliation")
    .eq("user_id", uid)
    .maybeSingle();

  if (error) throw error;
  return data; // null if no row
}

async function upsertUserInfo(sb, session, { full_name, affiliation }) {
  const uid = session.user.id;
  const email = session.user.email;

  const payload = {
    user_id: uid,
    email: email || null,
    full_name,
    affiliation,
    user_info_completed: true
  };

  const { error } = await sb.from("users").upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
}

async function setPassword(sb, newPassword) {
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

async function markPasswordSet(sb, uid) {
  const { error } = await sb.from("users").update({ password_set: true }).eq("user_id", uid);
  if (error) throw error;
}

export async function initAuthGate({
  onAuthed,
  requireRedirect = false,
  redirectTo = "index.html"
} = {}) {
  const sb = getSupabase();

  // Guard so onAuthed doesn't run multiple times
  let authedInitialized = false;

  function showAppShellOnce() {
    show("authGate", false);
    show("appShell", true);
    hideAllPanels();

    if (!authedInitialized && typeof onAuthed === "function") {
      authedInitialized = true;
      onAuthed();
    }
  }

  function redirectToIndex() {
    const returnTo = window.location.pathname + window.location.search + window.location.hash;
    window.location.href = buildRedirectUrl(redirectTo, returnTo);
  }

  // Default view if signed out
  if (!requireRedirect) showGate("signin");

  // Tabs (may not exist)
  $("tabSignup")?.addEventListener("click", () => showGate("signup"));
  $("tabSignin")?.addEventListener("click", () => showGate("signin"));

  // Sign up (magic link)
  $("signupSendLinkBtn")?.addEventListener("click", async () => {
    try {
      setMsg("signupMsg", "", false);
      const email = ($("signupEmail")?.value || "").trim();
      if (!email) return setMsg("signupMsg", "Please enter an email address.", true);

      const btn = $("signupSendLinkBtn");
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Sending...";
      }

      const { error } = await sb.auth.signInWithOtp({
        email,
        options: {
          // After the user clicks the verification link, we want to land back here
          // and immediately start the "complete registration" flow.
          emailRedirectTo: getRedirectToForEmails("complete"),
          shouldCreateUser: true
        }
      });
      if (error) throw error;

      setMsg("signupMsg", "Verification email sent. Please check your email.", false);
    } catch (e) {
      console.error(e);
      setMsg("signupMsg", e?.message || "Failed to send sign-up link.", true);
    } finally {
      const btn = $("signupSendLinkBtn");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Send sign-up link";
      }
    }
  });

  // Sign in (email + password)
  $("signinBtn")?.addEventListener("click", async () => {
    try {
      setMsg("signinMsg", "", false);
      const email = ($("signinEmail")?.value || "").trim();
      const password = ($("signinPassword")?.value || "").trim();
      if (!email || !password) return setMsg("signinMsg", "Enter email and password.", true);

      const btn = $("signinBtn");
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Signing in...";
      }

      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;

      setMsg("signinMsg", "", false);
    } catch (e) {
      console.error(e);
      setMsg("signinMsg", e?.message || "Sign-in failed.", true);
    } finally {
      const btn = $("signinBtn");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Sign in";
      }
    }
  });

  // Forgot password
  $("forgotBtn")?.addEventListener("click", async () => {
    try {
      setMsg("signinMsg", "", false);
      const email = ($("signinEmail")?.value || "").trim();
      if (!email) return setMsg("signinMsg", "Enter your email first.", true);

      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: getRedirectToForEmails("reset")
      });
      if (error) throw error;

      setMsg("signinMsg", "Password reset email sent. Check your inbox.", false);
    } catch (e) {
      console.error(e);
      setMsg("signinMsg", e?.message || "Could not send reset email.", true);
    }
  });

  // Save user info
  $("uiSaveBtn")?.addEventListener("click", async () => {
    try {
      setMsg("uiMsg", "", false);

      const full_name = ($("uiFullName")?.value || "").trim();
      const affiliation = ($("uiAffiliation")?.value || "").trim();

      if (!full_name) return setMsg("uiMsg", "Please enter your full name.", true);
      if (!affiliation) return setMsg("uiMsg", "Please enter your affiliation.", true);

      const session = await getSessionOrNull(sb);
      if (!session) throw new Error("No active session. Please sign in again.");

      const btn = $("uiSaveBtn");
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Saving...";
      }

      await upsertUserInfo(sb, session, { full_name, affiliation });

      setMsg("uiMsg", "Saved. Now set your password.", false);
      showSetPasswordPanel();
    } catch (e) {
      console.error(e);
      setMsg("uiMsg", e?.message || "Failed to save your information.", true);
    } finally {
      const btn = $("uiSaveBtn");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Save and continue";
      }
    }
  });

  // Set password
  $("setPasswordBtn")?.addEventListener("click", async () => {
    try {
      setMsg("setPasswordMsg", "", false);

      const p1 = ($("newPassword")?.value || "").trim();
      const p2 = ($("confirmPassword")?.value || "").trim();

      if (!p1 || !p2) return setMsg("setPasswordMsg", "Enter and confirm your password.", true);
      if (p1 !== p2) return setMsg("setPasswordMsg", "Passwords do not match.", true);
      if (p1.length < 8) return setMsg("setPasswordMsg", "Use at least 8 characters.", true);

      const session = await getSessionOrNull(sb);
      if (!session) throw new Error("No active session. Please sign in again.");

      const btn = $("setPasswordBtn");
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Saving...";
      }

      await setPassword(sb, p1);
      await markPasswordSet(sb, session.user.id);

      setMsg(
        "setPasswordMsg",
        "Registration complete. Redirecting...",
        false
      );

      // Remove mode so refresh does not re-enter registration completion
      try {
        const u = new URL(window.location.href);
        u.searchParams.delete("mode");
        window.history.replaceState({}, "", u.toString());
      } catch (_) {
        // ignore
      }

      await applyAuthState();
    } catch (e) {
      console.error(e);
      setMsg("setPasswordMsg", e?.message || "Failed to set password.", true);
    } finally {
      const btn = $("setPasswordBtn");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Save password";
      }
    }
  });

  async function applyAuthState() {
    try {
      const session = await getSessionOrNull(sb);

      if (!session) {
        authedInitialized = false;

        if (requireRedirect) {
          redirectToIndex();
          return;
        }

        showGate("signin");
        return;
      }

      const uid = session.user.id;
      const row = await getDirectoryRow(sb, uid);

      const params = new URLSearchParams(window.location.search);
      const mode = (params.get("mode") || "").toLowerCase();
      const completingRegistration = mode === "complete";

      // Complete-registration mode (after email verification) OR missing/incomplete user info
      if (completingRegistration || !row || row.user_info_completed === false) {
        if (requireRedirect && !isIndexPage()) {
          // Keep all onboarding on index.html
          redirectToIndex();
          return;
        }

        show("authGate", true);
        show("appShell", false);
        showUserInfoPanel(row || null);
        return;
      }

      // Enforce activation gate
      if (row.is_active === false) {
        authedInitialized = false;

        if (requireRedirect && !isIndexPage()) {
          redirectToIndex();
          return;
        }

        show("authGate", true);
        show("appShell", false);
        hideAllPanels();
        setActiveTab("signin");
        setMsg("signinMsg", "Access pending or deactivated. Contact the instructor.", true);
        return;
      }

      // Enforce password setup gate
      if (row.password_set === false) {
        if (requireRedirect && !isIndexPage()) {
          redirectToIndex();
          return;
        }

        show("authGate", true);
        show("appShell", false);
        showSetPasswordPanel();
        return;
      }

      // NOTE: We intentionally do not auto-redirect to returnTo here.
      // After sign-in, users land on the hub (index) by default.

      // Authorized and completed
      showAppShellOnce();
    } catch (e) {
      console.error(e);
      authedInitialized = false;

      if (requireRedirect && !isIndexPage()) {
        redirectToIndex();
        return;
      }

      show("authGate", true);
      show("appShell", false);
      hideAllPanels();
      setActiveTab("signin");
      setMsg("signinMsg", e?.message || "Authorization check failed.", true);
    }
  }

  sb.auth.onAuthStateChange(() => {
    applyAuthState();
  });

  await applyAuthState();
}
