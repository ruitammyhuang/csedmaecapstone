// assets/js/authGate.js
// Flow:
// 1) User signs up via magic link (panelSignup) OR signs in with password (panelSignin)
// 2) If authenticated but no user record OR user_info_completed=false -> show panelUserInfo
// 3) Optional: If user_info_completed=true but password_set=false -> show panelSetPassword
// 4) If user is active + user_info_completed=true (+ password_set=true if you enforce it) -> show appShell

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
  show("panelSignup", tab === "signup");
  show("panelSignin", tab === "signin");
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

function showGate(tab = "signup") {
  show("authGate", true);
  show("appShell", false);
  setActiveTab(tab);
}

function showAppShell(onAuthed) {
  show("authGate", false);
  show("appShell", true);
  hideAllPanels();
  if (typeof onAuthed === "function") onAuthed();
}

function getRedirectTo() {
  // Works for GitHub Pages too, as long as redirect URLs are allowlisted in Supabase Auth settings.
  return window.location.origin + window.location.pathname;
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

  // Note: we do NOT set is_active=true here.
  // That value should be controlled by you (admin) if you want strict governance.
  // If you prefer auto-activate on completion, uncomment the next line:
  // payload.is_active = true;

  const { error } = await sb
    .from("users")
    .upsert(payload, { onConflict: "user_id" });

  if (error) throw error;
}

async function setPassword(sb, newPassword) {
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

async function markPasswordSet(sb, uid) {
  const { error } = await sb
    .from("users")
    .update({ password_set: true })
    .eq("user_id", uid);

  if (error) throw error;
}

export async function initAuthGate({ onAuthed } = {}) {
  const sb = getSupabase();

  // Default view if signed out
  showGate("signup");

  // Tabs
  $("tabSignup")?.addEventListener("click", () => showGate("signup"));
  $("tabSignin")?.addEventListener("click", () => showGate("signin"));

  // Sign up (magic link)
  $("signupSendLinkBtn")?.addEventListener("click", async () => {
    try {
      setMsg("signupMsg", "", false);
      const email = ($("signupEmail")?.value || "").trim();
      if (!email) return setMsg("signupMsg", "Please enter an email address.", true);

      const btn = $("signupSendLinkBtn");
      btn.disabled = true;
      btn.textContent = "Sending...";

      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: getRedirectTo() }
      });
      if (error) throw error;

      setMsg("signupMsg", "Sign-up link sent. Check your email.", false);
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
      btn.disabled = true;
      btn.textContent = "Signing in...";

      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;

      setMsg("signinMsg", "", false);
      // UI will update via auth state listener
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
        redirectTo: getRedirectTo()
      });
      if (error) throw error;

      setMsg("signinMsg", "Password reset email sent. Check your inbox.", false);
    } catch (e) {
      console.error(e);
      setMsg("signinMsg", e?.message || "Could not send reset email.", true);
    }
  });

  // Save user info (first-time completion)
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
      btn.disabled = true;
      btn.textContent = "Saving...";

      await upsertUserInfo(sb, session, { full_name, affiliation });

      setMsg("uiMsg", "Saved. Continuing...", false);

      // Re-evaluate routing after saving
      await applyAuthState();
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

  // Set password (optional step after user info completed)
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
      btn.disabled = true;
      btn.textContent = "Saving...";

      await setPassword(sb, p1);
      await markPasswordSet(sb, session.user.id);

      setMsg("setPasswordMsg", "Password saved. You can now sign in with email and password next time.", false);

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
        showGate("signup");
        return;
      }

      const uid = session.user.id;
      const row = await getDirectoryRow(sb, uid);

      // If no directory row yet OR info not completed -> require user info
      if (!row || row.user_info_completed === false) {
        show("authGate", true);
        show("appShell", false);
        showUserInfoPanel(row || null);
        return;
      }

      // If you want admin to activate users, keep this check.
      // If you want completion to auto-activate, you can set is_active=true in upsertUserInfo above.
      if (row.is_active === false) {
        show("authGate", true);
        show("appShell", false);
        hideAllPanels();
        setActiveTab("signup");
        setMsg("signupMsg", "Access pending or deactivated. Contact the instructor.", true);
        return;
      }

      // Optional: enforce password setup before allowing entry
      // If you do NOT want this step, comment out this block.
      if (row.password_set === false) {
        show("authGate", true);
        show("appShell", false);
        showSetPasswordPanel();
        return;
      }

      // Authorized and completed -> show landing page
      showAppShell(onAuthed);
    } catch (e) {
      console.error(e);
      show("authGate", true);
      show("appShell", false);
      hideAllPanels();
      setActiveTab("signup");
      setMsg("signupMsg", e?.message || "Authorization check failed.", true);
    }
  }

  // React to auth changes (magic link return, sign-in, sign-out)
  sb.auth.onAuthStateChange(() => {
    applyAuthState();
  });

  // Initial state
  await applyAuthState();
}
