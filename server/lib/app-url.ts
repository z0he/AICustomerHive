// Canonical base URL for the AICRM app itself (the host that actually serves
// this application). Used wherever we hand a browser a URL that must reach the
// app — most importantly the marketing form embed snippet and the form-submit
// endpoint baked into the served embed JS.
//
// This is deliberately NOT the organization's customDomain/subdomain: those are
// the org's own marketing-website domains (where the embed snippet is pasted),
// and they do not serve the AICRM API. HubSpot works the same way — embeds
// always load from HubSpot's own domain (js.hsforms.net), never the customer's.
// The form ID in the embed URL is globally unique and identifies the org, so a
// single canonical host serves every tenant.
//
// Precedence:
//   1. PUBLIC_APP_URL   — explicit override (e.g. https://ai-crm.replit.app)
//   2. REPLIT_DOMAINS   — set automatically by Replit; first entry on a deploy
//                         is the live deployment domain
//   3. PUBLIC_URL       — generic fallback
//   4. http://localhost:5000 — local dev
export function getAppBaseUrl(): string {
  const explicit = process.env.PUBLIC_APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }

  const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0]?.trim();
  if (replitDomain) {
    return `https://${replitDomain}`;
  }

  return process.env.PUBLIC_URL?.trim() || 'http://localhost:5000';
}
