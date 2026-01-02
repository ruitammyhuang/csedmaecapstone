// assets/js/main.js

import { configureSupabase, sendMagicLink } from "./supabaseClient.js";

(function () {
  function setYear() {
    const el = document.getElementById("year");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  function initModals() {
    const triggers = document.querySelectorAll("[data-open-modal]");
    triggers.forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-open-modal");
        const dialog = document.getElementById(id);
        if (dialog && typeof dialog.showModal === "function") dialog.showModal();
      });
    });

    document.querySelectorAll("dialog.modal").forEach((dialog) => {
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) dialog.close();
      });
    });
  }

  function setAuthMessage(msg, isError) {
    const el = document.getElementById("authMsg");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = isError ? "#b91c1c" : "";
  }

  function initAuth() {
    // Configure Supabase once for the whole site.
    // Keep these values project-specific (do not reuse keys from another project).
    configureSupabase({
      url: "https://fzuslwrmhgaveulfewel.supabase.co",
      anonKey:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6dXNsd3JtaGdhdmV1bGZld2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjM0NTQsImV4cCI6MjA4MjkzOTQ1NH0.SFZJsJ3SejZsNwVtW1CcyINrrPdsRtjoWKsgNK48pbM"
    });

    const btn = document.getElementById("sendLinkBtn");
    const emailInput = document.getElementById("authEmail");

    if (!btn || !emailInput) return;

    btn.addEventListener("click", async () => {
      try {
        setAuthMessage("");
        const email = (emailInput.value || "").trim();
        if (!email) return setAuthMessage("Please enter an email address.", true);

        btn.disabled = true;
        btn.textContent = "Sending...";

        // Use the current page as the redirect target.
        await sendMagicLink(email, window.location.href);

        setAuthMessage("Magic link sent. Check your email.", false);
      } catch (e) {
        setAuthMessage(e?.message || "Failed to send link.", true);
      } finally {
        btn.disabled = false;
        btn.textContent = "Send magic link";
      }
    });
  }

  setYear();
  initModals();
  initAuth();
})();
