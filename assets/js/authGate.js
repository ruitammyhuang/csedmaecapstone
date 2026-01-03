// assets/js/authGate.js
// Supports two modes:
// 1) In-page gate (default): show authGate panel on the current page.
// 2) Redirect gate: if signed out, redirect to redirectTo with ?returnTo=...

import { getSupabase } from "./supabaseClient.js";
import { siteUrl, EDG6973_PROJECT_ID as PROJECT_ID } from "./config.js";

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

  // Prefer a stable, explicit step flag for the registration completion flow.
  // (We still accept the legacy `mode` param elsewhere for backward compatibility.)
  if (mode === "complete") u.searchParams.set("step", "complete_signup");
  else if (mode === "reset") u.searchParams.set("step", "reset_password");

  return u.toString();
}

// function getReturnToFromUrl() {
//   const u = new URL(window.location.href);
//   return u.searchParams.get("returnTo");
// }

function buildRedirectUrl(redirectTo, returnTo) {
  const u = new URL(redirectTo, window.location.origin);
  if (returnTo) u.searchParams.set("returnTo", returnTo);
  return u.toString();
}

function isIndexPage() {
  const path = (window.location.pathname || "").toLowerCase();
  return path.endsWith("/") || path.endsWith("/index.html") || path.endsWith("index.html");
}

function isAuthPage() {
  const path = (window.location.pathname || "").toLowerCase();
  return path.endsWith("/signup_signin.html") || path.endsWith("signup_signin.html");
}

function getGateStep() {
  const params = new URLSearchParams(window.location.search);

  // New preferred param
  const step = (params.get("step") || "").toLowerCase();
  if (step) return step;

  // Backward compatible param
  const mode = (params.get("mode") || "").toLowerCase();
  if (mode === "complete") return "complete_signup";
  if (mode === "reset") return "reset_password";

  return "";
}

function clearGateStepFromUrl() {
  try {
    const u = new URL(window.location.href);
    u.searchParams.delete("step");
    u.searchParams.delete("mode");
    window.history.replaceState({}, "", u.toString());
  } catch (_) {
    // ignore
  }
}


async function getSessionOrNull(sb) {
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  return data?.session || null;
}

// If the user arrives from a Supabase email link (PKCE flow), the URL may contain a `code`.
// In that case we must exchange it for a session before normal gating logic runs.
async function getSessionOrExchangeFromUrl(sb) {
  // First, try the normal session lookup
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  if (data?.session) return data.session;

  // If no session yet, try exchanging an auth code from the URL (PKCE)
  try {
    const u = new URL(window.location.href);
    const code = u.searchParams.get("code");
    if (!code) return null;

    const { data: exData, error: exErr } = await sb.auth.exchangeCodeForSession(window.location.href);
    if (exErr) throw exErr;

    // Clean up the URL so refresh/back doesn't re-run the exchange
    u.searchParams.delete("code");
    window.history.replaceState({}, "", u.toString());

    return exData?.session || null;
  } catch (e) {
    console.warn("exchangeCodeForSession failed:", e?.message || e);
    return null;
  }
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

async function getMembershipStatus(sb, uid) {
  const { data, error } = await sb
    .from("project_memberships")
    .select("role, is_active, approved_at, member_status")
    .eq("project_id", PROJECT_ID)
    .eq("user_id", uid)
    .maybeSingle();

  if (error) throw error;
  if (!data) return "none";

  // Prefer member_status if present
  const status = String(data.member_status || "").toLowerCase();
  if (status) return status;

  // Fallback legacy columns -> map into a status-like outcome
  const active = data.is_active === true;
  const approved = Boolean(data.approved_at);

  if (!active) return "revoked";
  if (approved) return "accepted";
  return "pending";
}

async function isInvitedEmail(sb, email) {
  const { data, error } = await sb
    .from("project_invites")
    .select("invite_status, is_active")
    .eq("project_id", PROJECT_ID)
    .eq("email", email)
    .maybeSingle();

  if (error) throw error;
  if (!data) return false;
  if (data.is_active === false) return false;

  // These EXACTLY match the member_status enum values
  const s = String(data.invite_status || "").toLowerCase();
  const okStatuses = new Set(["pending", "accepted"]);
  return okStatuses.has(s);
}

async function acceptInvites(sb) {
  try {
    await sb.rpc("accept_my_project_invites");
  } catch (e) {
    // Non-fatal: user can still proceed if already a member, etc.
    console.warn("accept_my_project_invites failed:", e?.message || e);
  }
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
  const NOT_AUTH_MSG = "This course site is invite-only. Your account is not authorized. Please contact the instructor for access.";

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
    // When we redirect to the hub, always land on the hub.
    // Do NOT carry returnTo when the target is the hub.
    const target = new URL(redirectTo, window.location.origin);
    const isHub = target.pathname.toLowerCase().endsWith("/index.html") || target.pathname.toLowerCase().endsWith("index.html");

    if (isHub) {
      window.location.href = target.toString();
      return;
    }

    // If redirecting somewhere else, preserve returnTo.
    const returnTo = window.location.pathname + window.location.search + window.location.hash;
    window.location.href = buildRedirectUrl(redirectTo, returnTo);
  }

  async function blockUnauthorizedAndSignOut(message) {
    const msg = message || NOT_AUTH_MSG;

    try {
      // Clear any onboarding flags so refresh doesn't re-enter the completion flow.
      clearGateStepFromUrl();

      // Best effort: ensure the user is signed out locally.
      await sb.auth.signOut({ scope: "local" });
    } catch (_) {
      // ignore
    }

    // If we are NOT already on the centralized auth page, redirect there with a step.
    if (!isAuthPage()) {
      window.location.replace(siteUrl("signup_signin.html?step=not_authorized"));
      return;
    }

    // If we are on the auth page, show a clear message.
    showGate("signin");
    setMsg("signinMsg", msg, true);
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

      // invite-only gate
      const invited = await isInvitedEmail(sb, email);
      if (!invited) {
        return setMsg(
          "signupMsg",
          "This course site is invite-only. Please contact the instructor for access.",
          true
        );
      }

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
          emailRedirectTo: siteUrl("signup_signin.html?step=complete_signup"),
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

      await acceptInvites(sb);

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

      // Make sure any pending invites are accepted right after profile completion
      await acceptInvites(sb);

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

      // Remove step/mode so refresh does not re-enter onboarding
      clearGateStepFromUrl();

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
      const session = await getSessionOrExchangeFromUrl(sb);

      if (!session) {
        authedInitialized = false;

        // If we intentionally landed here to show a not-authorized message, do that.
        const step = getGateStep();
        if (step === "not_authorized") {
          showGate("signin");
          setMsg("signinMsg", NOT_AUTH_MSG, true);
          return;
        }

        if (requireRedirect) {
          redirectToIndex();
          return;
        }

        showGate("signin");
        return;
      }

      const uid = session.user.id;
      const row = await getDirectoryRow(sb, uid);

      // Best effort: if there are pending invites for this user, accept them
      await acceptInvites(sb);

      const step = getGateStep();
      const completingRegistration = step === "complete_signup";
      const resettingPassword = step === "reset_password";

      // Password reset flow: go straight to password panel (do not force user info)
      if (resettingPassword) {
        if (requireRedirect && !isIndexPage()) {
          redirectToIndex();
          return;
        }

        show("authGate", true);
        show("appShell", false);
        showSetPasswordPanel();
        return;
      }

      // Complete-registration flow after email verification.
      // IMPORTANT: block uninvited users BEFORE showing any registration forms.
      if (completingRegistration) {
        // Keep completion on the auth page (signup_signin.html). Do not bounce to index.
        show("authGate", true);
        show("appShell", false);

        const email = (session.user.email || "").trim().toLowerCase();
        const invited = email ? await isInvitedEmail(sb, email) : false;

        if (!invited) {
          await blockUnauthorizedAndSignOut(
            "This course site is invite-only. Your email is not on the invitation list. Please contact the instructor for access."
          );
          return;
        }

        // Best effort: accept any pending invites once we know they're invited.
        await acceptInvites(sb);

        // If no directory row yet OR info not completed -> require user info
        if (!row || row.user_info_completed === false) {
          showUserInfoPanel(row || null);
          return;
        }

        // After user info exists, enforce membership approval.
        const status = await getMembershipStatus(sb, uid);

        // If explicitly revoked/expired, stop them here.
        // If pending/accepted/none, allow them to finish registration.
        // (Membership row may not exist yet until acceptInvites runs.)
        if (status === "revoked" || status === "expired") {
          await blockUnauthorizedAndSignOut(
            "Your access to this course site has been revoked or expired. Please contact the instructor."
          );
          return;
        }

        // If they still need to set a password, do it now.
        if (row.password_set === false) {
          showSetPasswordPanel();
          return;
        }

        // If they still need to set a password, do it now.
        if (row.password_set === false) {
          showSetPasswordPanel();
          return;
        }

        // Already completed; clear step and proceed.
        clearGateStepFromUrl();
        showAppShellOnce();
        return;
      }

      // Missing/incomplete user info (normal path)
      if (!row || row.user_info_completed === false) {
        if (requireRedirect && !isIndexPage()) {
          // Keep all onboarding on index.html
          redirectToIndex();
          return;
        }

        show("authGate", true);
        show("appShell", false);

        // If they're not invited, do not show onboarding forms.
        const email = (session.user.email || "").trim().toLowerCase();
        const invited = email ? await isInvitedEmail(sb, email) : false;
        if (!invited) {
          await blockUnauthorizedAndSignOut(
            "This course site is invite-only. Your email is not on the invitation list. Please contact the instructor for access."
          );
          return;
        }

        showUserInfoPanel(row || null);
        return;
      }

      // Enforce activation gate
      if (row.is_active === false) {
        authedInitialized = false;
        await blockUnauthorizedAndSignOut("Access pending or deactivated. Contact the instructor.");
        return;
      }

      // Enforce password setup gate
      if (row.password_set === false) {
        if (requireRedirect && !isIndexPage()) {
          redirectToIndex();
          return;
        }

        // If we got here, we are enforcing the password gate; don't keep any onboarding flags.
        clearGateStepFromUrl();

        show("authGate", true);
        show("appShell", false);
        showSetPasswordPanel();
        return;
      }

      // Membership approval gate (course/project-level authorization)
      const status = await getMembershipStatus(sb, uid);

      // Allow accepted and pending to load pages.
      // RLS will prevent pending users from reading/writing project data tables.
      // Block only revoked/expired/none (none = not enrolled / no membership row).
      if (status === "revoked" || status === "expired" || status === "none") {
        authedInitialized = false;
        await blockUnauthorizedAndSignOut(
          "You are not enrolled in this course site (or your access was revoked/expired). Please contact the instructor."
        );
        return;
      }

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
