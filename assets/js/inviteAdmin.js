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

async function isInstructorOrAdmin(projectId) {
  const sb = getSupabase();
  const { data: userData } = await sb.auth.getUser();
  const uid = userData?.user?.id;
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

export async function initInviteAdmin({ projectId }) {
  const panel = $("inviteAdminPanel");
  if (!panel) return;

  const allowed = await isInstructorOrAdmin(projectId);
  if (!allowed) return;

  panel.style.display = "block";

  $("sendInviteBtn")?.addEventListener("click", async () => {
    try {
      setMsg("", false);

      const email = ($("inviteEmail")?.value || "").trim().toLowerCase();
      const project_role = ($("inviteRole")?.value || "student").trim();

      if (!email) return setMsg("Enter an email address.", true);

      const btn = $("sendInviteBtn");
      btn.disabled = true;
      btn.textContent = "Sending...";

      const sb = getSupabase();

      const { data, error } = await sb.functions.invoke("send-project-invite", {
        body: { project_id: projectId, email, project_role }
      });

      if (error) throw error;
      if (data?.ok !== true) throw new Error(data?.message || "Invite failed.");

      setMsg("Invitation sent.", false);
      $("inviteEmail").value = "";
    } catch (e) {
      console.error(e);
      setMsg(e?.message || "Failed to send invitation.", true);
    } finally {
      const btn = $("sendInviteBtn");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Send invitation";
      }
    }
  });
}
