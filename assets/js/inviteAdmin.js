// assets/js/inviteAdmin.js
import { getSupabase } from "./supabaseClient.js";

function $(id) {
  return document.getElementById(id);
}

function show(id, yes) {
  const el = $(id);
  if (el) el.style.display = yes ? "block" : "none";
}

function setMsg(msg, isError) {
  const el = $("inviteMsg");
  if (!el) return;
  el.textContent = msg || "";
  el.style.color = isError ? "#b91c1c" : "";
}

function disableBtn(btn, disabled, label) {
  if (!btn) return;
  btn.disabled = disabled;
  if (label) btn.textContent = label;
}

async function getUidOrNull(sb) {
  const { data: userData, error } = await sb.auth.getUser();
  if (error) return null;
  return userData?.user?.id || null;
}

async function getSessionOrNull(sb) {
  const { data, error } = await sb.auth.getSession();
  if (error) return null;
  return data?.session || null;
}

async function isInstructorOrAdmin(projectId) {
  const sb = getSupabase();

  // Must have a session; Edge Functions require JWT anyway
  const session = await getSessionOrNull(sb);
  if (!session) return { allowed: false, reason: "not_signed_in" };

  const uid = await getUidOrNull(sb);
  if (!uid) return { allowed: false, reason: "no_user" };

  // IMPORTANT: column is "role" (enum project_role)
  const { data, error } = await sb
    .from("project_memberships")
    .select("role, is_active")
    .eq("project_id", projectId)
    .eq("user_id", uid)
    .maybeSingle();

  if (error) return { allowed: false, reason: error.message || "membership_query_failed" };
  if (!data) return { allowed: false, reason: "no_membership" };
  if (data.is_active === false) return { allowed: false, reason: "membership_inactive" };

  const ok = data.role === "admin" || data.role === "instructor";
  return { allowed: ok, reason: ok ? "" : "not_admin_or_instructor" };
}

function renderAllowedState(allowed) {
  // Always show exactly one state
  show("inviteAdminPanel", allowed);
  show("inviteNotAuthorized", !allowed);

  // Clear any previous invite message when switching states
  if (!allowed) setMsg("", false);
}

function assertIdsExist() {
  const missing = [];
  if (!$("inviteAdminPanel")) missing.push("#inviteAdminPanel");
  if (!$("inviteNotAuthorized")) missing.push("#inviteNotAuthorized");
  if (!$("sendInviteBtn")) missing.push("#sendInviteBtn");
  if (!$("inviteEmail")) missing.push("#inviteEmail");
  if (!$("inviteRole")) missing.push("#inviteRole");
  if (!$("inviteMsg")) missing.push("#inviteMsg");

  return missing;
}

export async function initInviteAdmin({ projectId }) {
  const sb = getSupabase();

  // Start hidden until we decide
  show("inviteAdminPanel", false);
  show("inviteNotAuthorized", false);
  setMsg("", false);

  // Basic DOM validation so “nothing happens” becomes an actionable error
  const missing = assertIdsExist();
  if (missing.length) {
    // If the page is missing expected elements, show "not authorized" area and print the issue.
    show("inviteNotAuthorized", true);
    const el = $("inviteNotAuthorized");
    if (el) {
      el.innerHTML = `
        <div class="callout">
          <div class="callout-title">Invite page setup issue</div>
          <p class="muted">Missing required elements: ${missing.join(", ")}</p>
        </div>
      `;
    }
    return;
  }

  async function evaluateAndRender() {
    const result = await isInstructorOrAdmin(projectId);

    // If not signed in, treat as not authorized (you can customize the message in HTML)
    renderAllowedState(result.allowed);

    // Optional: write a helpful reason to the "not authorized" panel (only if it exists)
    if (!result.allowed) {
      const reasonEl = $("notAuthReason");
      if (reasonEl) {
        const map = {
          not_signed_in: "You are not signed in on this page.",
          no_membership: "You do not have an active membership in this project.",
          membership_inactive: "Your membership is inactive.",
          not_admin_or_instructor: "You are signed in, but your role is not admin or instructor."
        };
        reasonEl.textContent = map[result.reason] || "You are not authorized to send invites.";
      }
    }
  }

  // Bind click handler once
  const btn = $("sendInviteBtn");
  if (!btn.dataset.bound) {
    btn.dataset.bound = "1";

    btn.addEventListener("click", async () => {
      try {
        setMsg("", false);

        // Confirm session exists (prevents 401 Missing authorization header)
        const session = await getSessionOrNull(sb);
        if (!session) {
          setMsg("You are not signed in on this page. Please sign in and try again.", true);
          await evaluateAndRender();
          return;
        }

        const emailEl = $("inviteEmail");
        const roleEl = $("inviteRole");

        const email = (emailEl.value || "").trim().toLowerCase();
        const project_role = (roleEl.value || "student").trim();

        if (!email) return setMsg("Enter an email address.", true);

        disableBtn(btn, true, "Sending...");

        const { data, error } = await sb.functions.invoke("send-project-invite", {
          body: { project_id: projectId, email, project_role }
        });
        
        if (error) {
          // Supabase puts useful details here
          const status = error.status ?? "unknown";
          const msg =
            error.context?.body?.message ||
            error.context?.body?.error ||
            error.message ||
            "Edge Function error";
          throw new Error(`Invite failed (${status}): ${msg}`);
        }
        
        if (data?.ok !== true) {
          throw new Error(data?.message || "Invite failed (no ok:true returned).");
        }

        setMsg("Invitation sent.", false);
        emailEl.value = "";
      } catch (e) {
        console.error("Invite error:", e);
        setMsg(e?.message || "Failed to send invitation.", true);
      } finally {
        disableBtn(btn, false, "Send invitation");
      }
    });
  }

  // Evaluate once now
  await evaluateAndRender();

  // Re-evaluate whenever auth changes (fixes “still see not authorized” after signing in)
  sb.auth.onAuthStateChange(() => {
    evaluateAndRender();
  });
}
