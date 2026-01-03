// assets/js/config.js
// Single source of truth for project-wide constants.

export const SUPABASE_URL = "https://fzuslwrmhgaveulfewel.supabase.co";

export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6dXNsd3JtaGdhdmV1bGZld2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjM0NTQsImV4cCI6MjA4MjkzOTQ1NH0.SFZJsJ3SejZsNwVtW1CcyINrrPdsRtjoWKsgNK48pbM";

// This is what bootstrap.js expects to import.
export const SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY
};

export const EDG6973_PROJECT_ID = "9dc0a871-a9fd-4898-bf8e-2d3d8692fe6d";



export const SITE_BASE_PATH = "/csedmaecapstone/"; // must start and end with "/"

export function siteUrl(page = "index.html") {
  return new URL(SITE_BASE_PATH + page, window.location.origin).toString();
}

export function returnToParam() {
  // keep the path+query inside your project site
  const full = window.location.pathname + window.location.search;
  return encodeURIComponent(full);
}
