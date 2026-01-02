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
        if (dialog && typeof dialog.showModal === "function") {
          dialog.showModal();
        }
      });
    });

    document.querySelectorAll("dialog.modal").forEach((dialog) => {
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) dialog.close();
      });
    });
  }

  setYear();
  initModals();
})();
