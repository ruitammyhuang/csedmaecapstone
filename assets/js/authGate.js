// assets/js/authGate.js

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

function setActiveTab(tab) {
  show("panelSignup", tab === "signup");
  show("panelSignin", tab === "signin");
  // panelSetPassword is controlled by auth state
}

async function ensureUserRow(session) {
  // Create (or update) your directory row after auth exists
  // This works well with your "users" table model.
  const sb = getSupabase();
  const uid = session.user.id;
  const email = session.user.email;

  // Upsert is safe; you can expand fields later (name, affiliation, etc.)
  const { error } = await sb
    .from("users")
    .upsert(
      { user_id: uid, email: email, is_active: true },
      { onConflict: "user_id" }
    );

  if (error) {
    // If your RLS prevents this upsert, you can instead create the row via an admin workflow later.
    // For now, surface the error.
    throw error;
  }
}

async function getDirectoryStatus(session) {
  const sb = getSupabase();
  const uid = session.user.id;

  const { data, error } = await sb
    .from("users")
    .select("is_active, password_set")
    .eq("user_id", uid)
    .maybeSingle();

  if (error) throw error;
  return data; // could be null if row doesn't exist
}

async function setPassword(newPassword) {
  const sb = getSupabase();
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

async function markPasswordSet() {
  const sb = getSupabase();
  const { data: sessionData, error: sessErr } = await sb.auth.getSession();
  if (sessErr) throw sessErr;
  const uid = sessionData?.session?.user?.id;
  if (!uid) throw new Error("No active session.");

  const { error } = await sb
    .from("users")
    .update({ password_set: true })
    .eq("user_id", uid);

  if (error) throw error;
}

export async function initAuthGate({ onAuthed }) {
  const sb = getSupabase();

  // Default tab
  setActiveTab("signup");

  $("tabSignup")?.addEventListener("click", () => setActiveTab("signup"));
  $("tabSignin")?.addEventListener("click", () => setActiveTab("signin"));

  $("signupSendLinkBtn")?.addEventListener("click", async () => {
    try {
      setMsg("signupMsg", "");
      const email = ($("signupEmail")?.value || "").trim();
      if (!email) return setMsg("signupMsg", "Please enter an email address.", true);

      const btn = $("signupSendLinkBtn");
      btn.disabled = true;
      btn.textContent = "Sending...";

      const redirectTo = window.location.origin + window.location.pathname;

      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo }
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

  $("signinBtn")?.addEventListener("click", async () => {
    try {
      setMsg("signinMsg", "");
      const email = ($("signinEmail")?.value || "").trim();
      const password = ($("signinPassword")?.value || "").trim();
      if (!email || !password) return setMsg("signinMsg", "Enter email and password.", true);

      const btn = $("signinBtn");
      btn.disabled = true;
      btn.textContent = "Signing in...";

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

  $("forgotBtn")?.addEventListener("click", async () => {
    try {
      setMsg("signinMsg", "");
      const email = ($("signinEmail")?.value || "").trim();
      if (!email) return setMsg("signinMsg", "Enter your email first.", true);

      const redirectTo = window.location.origin + window.location.pathname;

      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo
      });
      if (error) throw error;

      setMsg("signinMsg", "Password reset email sent. Check your inbox.", false);
    } catch (e) {
      console.error(e);
      setMsg("signinMsg", e?.message || "Could not send reset email.", true);
    }
  });

  $("setPasswordBtn")?.addEventListener("click", async () => {
    try {
      setMsg("setPasswordMsg", "");

      const p1 = ($("newPassword")?.value || "").trim();
      const p2 = ($("confirmPassword")?.value || "").trim();

      if (!p1 || !p2) return setMsg("setPasswordMsg", "Enter and confirm your password.", true);
      if (p1 !== p2) return setMsg("setPasswordMsg", "Passwords do not match.", true);
      if (p1.length < 8) return setMsg("setPasswordMsg", "Use at least 8 characters.", true);

      const btn = $("setPasswordBtn");
      btn.disabled = true;
      btn.textContent = "Saving...";

      await setPassword(p1);
      await markPasswordSet();

      setMsg("setPasswordMsg", "Password saved. You can now sign in with email and password next time.", false);

      // Continue into app
      if (typeof onAuthed === "function") onAuthed();
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
    const { data, error } = await sb.auth.getSession();
    if (error) {
      console.error(error);
      return;
    }

    const session = data?.session;
    if (!session) {
      // Not signed in: show gate
      show("authGate", true);
      show("appShell", false);
      show("panelSetPassword", false);
      return;
    }

    // Signed in: ensure directory row exists and check active status
    try {
      await ensureUserRow(session);

      const status = await getDirectoryStatus(session);
      if (!status) {
        show("authGate", true);
        show("appShell", false);
        setMsg("signupMsg", "Access pending. Contact the instructor.", true);
        return;
      }

      if (status.is_active === false) {
        show("authGate", true);
        show("appShell", false);
        setMsg("signupMsg", "Your access is deactivated. Contact the instructor.", true);
        return;
      }

      // If password not set yet, require set-password step
      if (status.password_set === false) {
        show("authGate", true);
        show("appShell", false);
        show("panelSetPassword", true);
        return;
      }

      // Fully authorized
      show("panelSetPassword", false);
      show("authGate", false);
      show("appShell", true);
      if (typeof onAuthed === "function") onAuthed();
    } catch (e) {
      console.error(e);
      show("authGate", true);
      show("appShell", false);
      setMsg("signupMsg", e?.message || "Authorization check failed.", true);
    }
  }

  sb.auth.onAuthStateChange(() => {
    applyAuthState();
  });

  await applyAuthState();
}
