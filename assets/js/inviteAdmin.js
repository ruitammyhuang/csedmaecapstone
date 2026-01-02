// assets/js/inviteAdmin.js
import { getSupabase } from "./supabaseClient.js";

function $(id) {
  return document.getElementById(id);
}

function setMsg(msg, isError) {
  const el = $("inviteMsg");
  if (!el) return;
  el.textContent = msg || "";
  el.style.color = isError ? "#b91c1c" : "";
}

async function getUid() {
  const sb = getSupabase();
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  return data?.session?.user?.id || null;
}

async function isInstructorOrAdmin(projectId) {
  const sb = getSupabase();
  const uid = await getUid();
  if (!uid) return false;

  const { data, error } = await sb
    .from("project_memberships")
    .select("project_role, is_active")
    .eq("project_id", projectId)
    .eq("user_id", uid)
    .maybeSingle();

  if (error || !data) return false;
  if (data.is_active === false) return false;

  return data.project_role === "admin" || data.project_role === "instructor";
}

function requireEls(ids) {
  const missing = ids.filter((id) => !$(id));
  if (missing.length) {
    throw new Error("Invite UI is missing required elements: " + missing.join(", "));
  }
}

async function sendInvite({ projectId, email, project_role }) {
  const sb = getSupabase();

  // This calls your Edge Function "send-project-invite"
  const { data, error } = await sb.functions.invoke("send-project-invite", {
    body: { project_id: projectId, email, project_role }
  });

  // Supabase client puts function execution issues in `error`
  if (error) {
    // Often error.message is generic; try to surface helpful info when present
    throw new Error(error.message || "Edge function call failed.");
  }

  // Your function should return a JSON shape. We handle several common patterns.
  if (data?.ok === true) return;

  // If you return { ok:false, message:"..." }
  if (data?.ok === false) throw new Error(data.message || "Invite failed.");

  // If you return { error:"..." }
  if (data?.error) throw new Error(data.error);

  // Fallback
  throw new Error("Invite failed. Unexpected response from server.");
}

/**
 * initInviteAdmin
 * - projectId: required
 * - panelId: optional; if provided, will show/hide that container
 *   (useful when invite UI is embedded on a page)
 */
export async function initInviteAdmin({ projectId, panelId } = {}) {
  if (!projectId) throw new Error("initInviteAdmin: projectId is required.");

  // If the page uses a dedicated panel container, control its visibility.
  // If not, proceed without it (for separate invite.html).
  const panel = panelId ? $(panelId) : null;

  // Ensure the form elements exist (both index.html embedded panel and invite.html use these IDs)
  requireEls(["inviteEmail", "inviteRole", "sendInviteBtn", "inviteMsg"]);

  // Permission check
  const allowed = await isInstructorOrAdmin(projectId);
  if (!allowed) {
    if (panel) panel.style.display = "none";
    // On a dedicated invite page, show a clear message
    setMsg("Not authorized to send invites for this project.", true);

    // Disable inputs to prevent confusion
    $("inviteEmail").disabled = true;
    $("inviteRole").disabled = true;
    $("sendInviteBtn").disabled = true;
    return;
  }

  if (panel) panel.style.display = "block";

  // Avoid double-binding if init is called multiple times
  const btn = $("sendInviteBtn");
  if (btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";

  btn.addEventListener("click", async () => {
    try {
      setMsg("", false);

      const emailEl = $("inviteEmail");
      const roleEl = $("inviteRole");

      const email = (emailEl?.value || "").trim().toLowerCase();
      const project_role = (roleEl?.value || "student").trim();

      if (!email) return setMsg("Enter an email address.", true);

      btn.disabled = true;
      const oldText = btn.textContent;
      btn.textContent = "Sending...";

      await sendInvite({ projectId, email, project_role });

      setMsg("Invitation sent.", false);
      if (emailEl) emailEl.value = "";
    } catch (e) {
      console.error(e);
      setMsg(e?.message || "Failed to send invitation.", true);
    } finally {
      btn.disabled = false;
      btn.textContent = "Send invitation";
    }
  });
}
