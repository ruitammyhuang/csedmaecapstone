// assets/js/pageBootstrap.js
import { bootstrapApp } from "./bootstrap.js";
import { preloadProtectedPage } from "./preloadProtectedPage.js";
import { initSprintPicker } from "./sprintPicker.js";

export async function initProtectedSprintPage({
  contentSelector = "#page-content",
  redirectTo = "signup_signin.html",
  enablePicker = true
} = {}) {
  // 1) Global shell
  await bootstrapApp();

  // 2) Protected preload (moves #page-content into the shell main)
  await preloadProtectedPage({ contentSelector, redirectTo });

  // 3) Optional sprint picker behavior
  if (enablePicker && document.querySelector(".sprint-picker-actions")) {
    initSprintPicker();
  }
}