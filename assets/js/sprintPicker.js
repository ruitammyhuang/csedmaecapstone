// assets/js/sprintPicker.js
export function initSprintPicker({
  pickerSelector = ".sprint-picker-actions",
  detailsSelector = "details.card.section",
  updateHash = true,
  openOnHash = true
} = {}) {
  function openOnly(targetId) {
    const all = Array.from(document.querySelectorAll(detailsSelector));
    const target = document.getElementById(targetId);
    if (!target) return;

    // Close everything else
    all.forEach((d) => {
      if (d !== target) d.open = false;
    });

    // Open target
    target.open = true;

    // Scroll to it (your CSS scroll-margin-top should handle sticky nav)
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Button clicks
  document.querySelectorAll(`${pickerSelector} [data-target]`).forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const id = btn.getAttribute("data-target");
      if (!id) return;

      openOnly(id);

      if (updateHash) {
        history.replaceState(null, "", `#${id}`);
      }
    });
  });

  // Initial open based on hash
  if (openOnHash) {
    const initialHash = (window.location.hash || "").replace("#", "");
    if (initialHash) openOnly(initialHash);
  }

  // Enforce "only one open" even when user clicks <summary>
  document.querySelectorAll(detailsSelector).forEach((d) => {
    d.addEventListener("toggle", () => {
      if (!d.open) return;
      document.querySelectorAll(detailsSelector).forEach((other) => {
        if (other !== d) other.open = false;
      });
    });
  });
}