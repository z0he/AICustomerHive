# AICRM — Broken Features & Fix List (living doc)

Started 2026-06-10. Single source of truth for what's broken / missing while Zohe does the
manual point-and-click audit. Supersedes `QA_PASS_2026-06-05.md` for *tracking* (that doc was a
code-read and missed type-level bugs — see Contacts below). Tick the checkboxes as you test.

Severity: 🔴 broken · 🟡 partial/stub · 💸 cost · 🎙️ voice-gap · 💤 missing feature

---

## 0. Voice coverage (the core-aim reality check)

Voice agent = **23 tools, only 4 write — all contacts.** Everything else is read-only or absent.

| Area | Voice write? | Voice read? | Notes |
|------|:---:|:---:|------|
| Contacts | ✅ create/update/delete/log-activity | ✅ search/count/details | the ONLY area voice can mutate |
| Contact owner | ❌ | ✅ contacts_without_owner | `assign_contact_owner` planned, never built |
| Campaigns | ❌ | ✅ list_campaigns | **cannot create a campaign by voice** |
| Automations/workflows | ❌ | ❌ | no tool at all |
| Tasks | ❌ | ✅ upcoming_tasks | cannot create a task by voice |
| Calendar events | ❌ | ✅ upcoming_calendar_events | cannot create an event by voice |
| Email send / templates | ❌ | ✅ email_activity_summary | |
| Marketing forms | ❌ | ✅ recent_form_submissions | |
| Segments | ❌ | ❌ | |
| Org analytics | — | ✅ get_org_summary + breakdowns | read-only reporting |

**Implication:** point-and-click must work for everything outside contacts. Voice roadmap gap =
campaign / automation / task / event creation tools (each needs a new tool file in `server/agent/tools/`).

---

## 1. 🔴 Confirmed bugs

| # | Symptom | Root cause | Where | Status |
|---|---------|-----------|-------|--------|
| 1 | Create campaign: toast fires, campaign never appears | `createCampaign` dropped the injected `organizationId` → saved with null org → org-filtered list can't see it | `server/storage/db-storage.ts` | ✅ FIXED `f1e3b48` (Zohe confirmed working live 2026-06-10) |
| 2 | Lead Mgmt: add note / assign owner does nothing | invalidated `["/api/leads", id]` but dialog query key is `` `/api/leads/${id}` `` → no refetch | `client/src/pages/LeadManagement.tsx` | ✅ FIXED `6adcdd8` (needs retest — different flow from #3) |
| 3 | **Edit contact → set owner → "Failed to update contact"** | owner is a free-text `<Input>`, server writes it to `ownerId` (a **UUID FK**) → invalid UUID → 500 | client `EditContactModal.tsx:483/415` ↔ server `routes/contacts.ts:415` | ⛔ TO FIX — see decision §4 |
| 4 | **Add contact note does nothing / no notes show** | notes endpoints `parseInt` the id (legacy numeric lead/customer scheme) but contacts use **UUID** ids → 400/404 | server `routes/contacts.ts` GET+POST `/:id/notes` (513, 572) | ⛔ TO FIX — treat `:id` as the unified UUID like the PATCH handler does |

> Note on #3/#4: QA_PASS marked Contacts "✅ works." It was a code-read and missed both because it
> didn't trace data **types** end-to-end. These only show up on a real click-through.

---

## 2. Dashboard cleanup (Zohe: "leave for now, add to list")

- 🎙️ **Two mics shown** — the new agent + the old voice flow both render. Pick one.
- 🟡 **Sample/placeholder voice commands** shown that don't reflect real capability.
- 🟡 Username always shows **"User"** — reads `userData?.user?.name`; should be `userData?.name` (`Dashboard.tsx:577`).
- 💸 **OpenAI probe on every dashboard load** — POSTs "test configuration" to `/api/voice/interpret` each mount just to detect a key (`Dashboard.tsx:473-499`). Replace with a cheap `GET /api/voice/config` boolean.
- 🟡 Two dead **mock queries** (`notifications` :74, `recentCampaigns` :161 — "Summer Sale 2023") render nowhere. Remove or wire.
- 🟡 **"Add task"** button is a "Coming soon" stub (`:695`).

---

## 3. Quick-win dead/stub buttons (from QA code-read — verify by clicking)

- [ ] Journey: **Export** + **Refresh** buttons dead; time-range doesn't refilter top cards (`CustomerJourney.tsx:214/218/203`)
- [ ] Campaign Detail: **Settings** button dead (`CampaignDetail.tsx:161`)
- [ ] Segments: no **edit** UI (PUT endpoint exists, unused); **delete** has no confirm dialog
- [ ] Data Quality: **"Fix Duplicates"** is a labelled no-op (`data-quality.ts:115`) — implement or relabel
- [ ] Analytics: **mock fallback** data renders when API empty; **Export** is a toast-only placeholder
- [ ] Settings: **Appearance tab** saves nothing (Save disabled, "Coming soon" toasts)
- [ ] Email: duplicate `POST /api/config/mailgun` route registered twice (`routes.ts:2018,2094`)
- [ ] Contacts: **owner filter** dropdown is hardcoded "John Doe / Jane Smith / unassigned" placeholders

---

## 4. Decisions parked (audit first, then build)

- **Contact owner → real team-member dropdown** (DECIDED 2026-06-10, deferred). Owner becomes a Select
  populated from the org's users, submitting a UUID. Needs: a team-members endpoint + UI change in
  EditContactModal + the Contacts owner filter + the Lead owner picker. Until then, bug #3 stands.

---

## 5. 💤 Real HubSpot-leaving gaps (features, not bugs)

- 💤 **#1 Gmail inbound / email logging** — Email page is outbound-only (Mailgun). No way to log mail you send from your own Gmail against a contact.
- 💤 **#3 Meetings booking widget + Google Calendar two-way sync** — Calendar is internal-only; no OAuth/googleapis.
- 💤 **Live Stripe billing** — test-mode only.

---

## Manual test log (Zohe fills as she clicks)

| Page | Verdict | Notes |
|------|---------|-------|
| Dashboard | 🟡 | two mics, sample commands, etc. |
| Contacts — list/search/delete | | |
| Contacts — edit owner | 🔴 | bug #3 |
| Contacts — add note | 🔴 | bug #4 |
| Campaigns — create | ✅ | fixed (#1) |
| Lead Mgmt — note/owner | ? | retest after #2 |
| Automation | | |
| Email | | |
| Marketing Forms — edit | | fixed live earlier |
| Calendar | | |
| Customer Data — import/export | | |
| Data Quality | | |
| Analytics | | |
| Settings | | |
| Scheduled Emails / Admin | | |
