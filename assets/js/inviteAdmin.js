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

async function isInstructorOrAdmin(projectId) {
  const sb = getSupabase();

  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr) return false;

  const uid = userData?.user?.id;
  if (!uid) return false;

  // IMPORTANT: in your DB, the column is named "role" (type project_role), not "project_role"
  const { data, error } = await sb
    .from("project_memberships")
    .select("role, is_active")
    .eq("project_id", projectId)
    .eq("user_id", uid)
    .maybeSingle();

  if (error || !data) return false;
  if (data.is_active === false) return false;

  return data.role === "admin" || data.role === "instructor";
}

export async function initInviteAdmin({ projectId }) {
  // Always start by hiding both, then show exactly one.
  show("inviteAdminPanel", false);
  show("inviteNotAuthorized", false);

  const allowed = await isInstructorOrAdmin(projectId);

  if (!allowed) {
    show("inviteNotAuthorized", true);
    return;
  }

  show("inviteAdminPanel", true);

  // Avoid double-binding if initInviteAdmin runs twice
  const btn = $("sendInviteBtn");
  if (!btn || btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";

  btn.addEventListener("click", async () => {
    try {
      setMsg("", false);

      const email = ($("inviteEmail")?.value || "").trim().toLowerCase();
      const project_role = ($("inviteRole")?.value || "student").trim();

      if (!email) return setMsg("Enter an email address.", true);

      btn.disabled = true;
      btn.textContent = "Sending...";

      const sb = getSupabase();
      const { data, error } = await sb.functions.invoke("send-project-invite", {
        body: { project_id: projectId, email, project_role }
      });

      if (error) throw error;
      if (data?.ok !== true) throw new Error(data?.message || "Invite failed.");

      setMsg("Invitation sent.", false);
      const emailEl = $("inviteEmail");
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
