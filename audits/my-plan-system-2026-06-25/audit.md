# My Plan System Forensic Audit

Date: 2026-06-25
Scope: saving, editing, sharing, local/server persistence, movement/reordering, plan details, UX storytelling, accessibility, and abuse controls.

## Evidence Captured

Local app: `http://localhost:3001` via `npm run dev`.

Runtime capture used fresh desktop and mobile browser contexts after authenticating through the local site gate. Supabase anonymous auth sync could not complete in this local run because captcha protection rejected anonymous sign-in without a captcha token, so the captured saved plan state is local-only.

Screenshots:

- `screenshots/desktop-01-empty-plan.png`
- `screenshots/desktop-02-today-before-save.png`
- `screenshots/desktop-03-after-save-preview.png`
- `screenshots/desktop-03-after-save-preview-viewport.png`
- `screenshots/desktop-04-plan-with-item-viewport-retry.png`
- `screenshots/desktop-04-plan-with-item-full-retry.png`
- `screenshots/mobile-01-empty-plan.png`
- `screenshots/mobile-02-today-before-save.png`
- `screenshots/mobile-03-after-save-preview.png`
- `screenshots/mobile-03-after-save-preview-viewport.png`
- `screenshots/mobile-04-plan-with-item.png`
- `screenshots/mobile-04-plan-with-item-viewport.png`

Verification run:

- `npx tsc --noEmit`: passed.
- `npm run lint`: passed, with Next's `next lint` deprecation notice.

## Flow Health

1. Empty `/plan`: healthy.
   Clear, inviting, guest-first empty state with useful routes back into discovery.

2. Browse and save from `/today`: mixed.
   Save response is immediate and visually satisfying, but server sync failed in the local captcha/auth configuration and fell back to local-only persistence.

3. Save preview: strong UX, accessibility and mobile layout risks.
   Desktop preview feels polished and story-like. Mobile preview can clip the email prompt and its controls. Dialog labelling is incomplete.

4. Populated `/plan`: promising but under-detailed.
   The daybook, passport, sections, sync badge, and share block are good foundations. The item card omits several details the PRD expects: location, category, price/reservation signal, source verification date, and source link.

5. Share creation and public view: code-level risks remain.
   The newer `/p/[shareToken]` design has good security primitives: hash-only token storage, sanitized DTO, `noindex`, `Referrer-Policy: no-referrer`, and `no-store`. Existing share reuse, legacy share routes, and missing rate-limit wiring need cleanup before this feels trustworthy.

## Critical Findings

### P0: Browser Turnstile never executes, blocking durable first-save sync when Supabase captcha is enabled

Evidence:

- `lib/turnstile/config.ts:1-5` makes `isTurnstileConfigured()` require both `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and server-only `TURNSTILE_SECRET_KEY`.
- `lib/turnstile/browser.ts:33-35` returns `null` when that helper is false.
- `components/atlas/PlanProvider.tsx:193-199` sends that token into `ensureAnonymousSession()`.
- Runtime capture logged `anonymous-auth-failed captcha protection: request disallowed (no captcha_token found)`.

Impact:

The first save still feels successful locally, but the anonymous owner and server-backed plan may never be created. That breaks durable sync, sharing, cross-device recovery, and the core "no silent data loss" promise.

Fix:

Split Turnstile config into client and server helpers:

- Client: configured when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` exists.
- Server: configured when both site key and secret exist, or at minimum secret exists for verification.

Then add an explicit sync state for "secure sync unavailable" when Turnstile cannot produce a token but Supabase requires captcha.

### P0: Concurrent first saves can create multiple active itineraries for one owner

Evidence:

- `supabase/migrations/20260624120000_guest_itinerary.sql:28-31` creates a non-unique active owner index.
- `lib/plan/server.ts:173-180` performs read-then-insert in `getOrCreateItinerary()` without a transaction or unique conflict target.

Impact:

Two first-save requests racing can create two active plans. Later reads choose the most recently updated plan, so items saved into the other active plan become effectively hidden. This violates "one active plan" and can look like data loss.

Fix:

Add a partial unique index on active, non-deleted owner plans and move get-or-create into a transactional SQL RPC or upsert-style flow.

### P0: Local-only legacy items are not migrated after first server save

Evidence:

- `components/atlas/PlanProvider.tsx:210-225` sets `planId` before calling `migrateLocalItemsToServer()`.
- `lib/plan/migrate.ts:31-35` exits immediately when `cache.planId` exists.
- `lib/plan/sync-client.ts:166-173` later allows server state to replace local items when there are no pending operations.

Impact:

If a visitor already has local-only items, the next server-backed save can sync only the new item, leave older local items unsynced, then overwrite them from server state later.

Fix:

Change migration to accept the newly created target plan id and migrate all local items not already represented by the first server result. Add a regression test for "local item A, first online save B, reload returns A+B."

### P0: Notes and reorder feel editable but are local-only

Evidence:

- `components/atlas/PlanProvider.tsx:344-352` updates notes only in local cache.
- `components/atlas/PlanProvider.tsx:357-360` reorders only local cache.
- `lib/plan/sync-client.ts:122-140` replays only add/remove operations.
- `lib/plan/server.ts` has no item-note or reorder mutation.

Impact:

Users can add notes and drag items, but those edits do not survive authoritative server merge and do not appear in live shared plans. This is the most dangerous kind of product bug: the UI says "saved" through behavior, while the system only remembers it locally.

Fix:

Either remove/hide these edit affordances until they are durable, or implement `PATCH /api/plan/items/[itemId]` for notes and a reorder endpoint that writes `sort_order`, queues pending operations, and updates shared views.

### P1: Existing live share links cannot be recovered after reload

Evidence:

- `lib/plan/server.ts:492-501` returns `{ reused: true }` for an existing active share.
- `app/api/plan/share/route.ts:60-62` returns only `{ reused: true }`, no URL.
- `components/atlas/PlanProvider.tsx:405-408` can only return the existing URL if `shareUrl` is already in current React state.

Impact:

Because only the token hash is stored, the server cannot reconstruct the raw URL. After reload, pressing "Share plan" on a plan that already has an active share returns no usable link and shows a generic failure. Replace/revoke controls are also hidden because `shareUrl` is null.

Fix:

Make the state explicit:

- If the raw token is unavailable, show "A share link already exists" with "Replace link" and "Revoke link."
- Optionally store the raw token only in local browser storage for convenience, but do not depend on it.
- Do not return a silent reused response that the client cannot act on.

### P1: Legacy snapshot share routes still auto-import and can overwrite a viewer's local plan

Evidence:

- `app/plan/[shareId]/page.tsx:13-23` still renders legacy shares.
- `components/atlas/PlanShareClient.tsx:12-17` immediately calls `savePlanItems(items)` and redirects to `/plan`.
- `lib/data/activities.ts:698-731` uses short `saved_plans.share_slug` snapshot links.
- `supabase/migrations/20260620230000_prd_enrichment_and_plans.sql:235-239` allows public read and public insert on `saved_plans`.

Impact:

Old share links do not behave like view-only plans. They import into the viewer's plan without consent and can replace existing local items. They are stale snapshots, not live plans.

Fix:

Retire or redirect `/plan/[shareId]` and `/api/plan/share/[slug]`. If old links must continue, render them read-only and require an explicit "Add these ideas" action that merges nonduplicates.

### P1: Save-state dedupe uses activity id in the UI, blocking valid multiple occurrences

Evidence:

- `components/activity/ActivityCard.tsx:30` passes `activity.activityCatalogId`.
- `components/tonight/NightActivityCard.tsx:25` passes `activity.activityCatalogId`.
- `components/atlas/ActivityDetailClient.tsx:91-92` checks `activity.activityCatalogId`.
- `components/atlas/PlanProvider.tsx:385-391` treats matching `activityCatalogId` as already saved.

Impact:

Saving one occurrence of an activity can mark every occurrence of that activity as saved. This conflicts with multi-date plans and repeated resort events.

Fix:

Use occurrence-level saved checks in cards and details: `sourceOccurrenceId ?? activity.id` first, with catalog-level fallback only for truly untimed offerings.

### P1: Mobile plan preview clips the email prompt controls

Evidence:

- `components/plan/PlanPreview.tsx:244-246` caps the mobile sheet at `65vh`.
- `src/styles/polish.css:1618-1622` gives the preview shadow only; no scroll behavior.
- `components/explore/FilterSheet.tsx:111` shows the local pattern to copy: `max-h`, `overflow-y-auto`, `overscroll-contain`.
- Screenshot: `mobile-03-after-save-preview-viewport.png`.

Impact:

On a 390x844 viewport, the email prompt extends below the visible sheet. The dismiss and submit controls can be hard to reach or invisible.

Fix:

Give the preview an internal scroll region or make the email prompt collapsible on mobile. Keep "View My Plan" and "Keep browsing" pinned above the fold.

### P1: Public "live" plan is not live after initial render

Evidence:

- `components/plan/PublicPlanClient.tsx:17-19` stores the server response in state once and never refetches.
- The public API supports fresh reads at `app/api/shared-plan/[token]/route.ts:12-40`, but the page does not use it after mount.

Impact:

The page says "Changes appear here as the day evolves," but an already-open viewer will not see edits until reload.

Fix:

Either soften the copy to "Refresh to see the latest" or add periodic revalidation / focus revalidation with a small "Updated just now" status.

## Important Findings

### P2: Preview dialog has a broken accessible name

Evidence:

- `components/plan/PlanPreview.tsx:240-242` uses `aria-labelledby="plan-preview-title"`.
- `components/plan/PlanPreview.tsx:140-143` renders the title without that id.

Impact:

Screen readers may announce an unnamed dialog.

Fix:

Add `id="plan-preview-title"` to the visible preview title or use `aria-label`.

### P2: Unknown end times create false overlap warnings

Evidence:

- `lib/plan/conflicts.ts:13-15` assumes a missing end time means one hour.

Impact:

The PRD says unknown-end events should only trigger conflicts when overlap is reliable. A made-up one-hour duration can produce false warnings.

Fix:

Only calculate overlap when both end times are known or when a trusted duration exists in the saved snapshot.

### P2: Reorder affordance implies scheduling movement without changing time

Evidence:

- `components/plan/PlanTimeline.tsx:70-82` allows dragging in the flat item array.
- `components/plan/PlanItem.tsx:221-231` labels the handle "Drag to reorder."
- Server fetch still orders by `starts_at`, `sort_order`, and `created_at` in `lib/plan/server.ts:188-195`, but `sort_order` is never written.

Impact:

For timed activities, dragging can look like moving a plan item in time, but the official source time cannot change. After server reload, the order may reset.

Fix:

For the initial release, remove drag from timed official items or make it a local "priority within section" feature with durable `sort_order`. Future "move" should present only real alternate occurrence slots from source data.

### P2: Plan item cards lack key detail and source context

Evidence:

- `components/plan/PlanItem.tsx:65-107` shows title, resort, time, and limited status.
- Public item DTO includes category, price, verification status, and location in `lib/plan/types.ts:13-23`, but owner UI does not expose all of it.

Impact:

Users cannot confidently answer "Where is this?", "Is it free?", "Do I need to reserve?", or "How trustworthy is this time?" from the plan page.

Fix:

Add a compact detail row and an expandable "Why this is here" / "Source details" section: location, date, time range, category, price/reservation, source verified date, and source link.

### P2: Undo can race with server remove

Evidence:

- `components/atlas/PlanProvider.tsx:289-299` applies the captured post-remove `next` cache after the server remove returns.
- `components/atlas/PlanProvider.tsx:308-340` re-adds via a separate add operation.
- `lib/plan/server.ts:271-293` returns an existing duplicate if the original has not been removed yet.

Impact:

If a user clicks Undo before the remove finishes, add can resolve to the soon-to-be-deleted original item, and the delayed remove can overwrite the local undone state.

Fix:

Model undo as cancellation of a pending remove while still local, or create a server restore operation. Do not let a delayed remove response overwrite newer local state.

### P2: Plan-specific rate-limit scopes are defined but unused

Evidence:

- `lib/rate-limit/guard.ts:29-88` defines plan email, mutation, share, copy, and public-share-read scopes.
- `rg` found no route calls to `guardRateLimit()` for plan endpoints.

Impact:

The codebase suggests route-level abuse controls exist, but plan APIs currently rely on Turnstile and quotas. That is weaker for public share reads, email collection, and repeated mutations.

Fix:

Wire `guardRateLimit()` into `app/api/plan/*` and `app/api/shared-plan/[token]/route.ts`, using both user and IP dimensions where available.

### P2: Multi-row mutations are not transactional

Evidence:

- `lib/plan/server.ts:296-339` inserts an item, updates itinerary version, then records the operation separately.
- `lib/plan/server.ts:366-377` removes an item, updates version, then records separately.
- `lib/plan/server.ts:513-529` revokes active share and inserts a new share separately.

Impact:

Partial failures can leave item changes without idempotency records, stale versions, or temporarily missing share links.

Fix:

Move add/remove/rename/share-rotate into SQL RPCs or server-side transaction boundaries.

### P2: Analytics instrumentation is incomplete and one event is dropped

Evidence:

- `components/plan/PlanPreview.tsx:69` emits `plan_interest_submitted`.
- `lib/plan/analytics.ts:1-25` does not allow that event name.
- PRD events such as `plan_email_prompt_shown`, `plan_overlap_displayed`, `plan_share_opened`, and `plan_schedule_change_displayed` are allowlisted but not fired.

Impact:

The product will under-measure important funnel steps and risk spots.

Fix:

Rename the emitted event or add it to the allowlist, then instrument prompt shown, overlap displayed, public share opened, and schedule warnings.

## Strengths To Preserve

- Guest-first save behavior is fast and optimistic.
- Local IndexedDB cache plus pending operations is the right foundation for offline resilience.
- BroadcastChannel support gives same-device multi-tab sync.
- Live share architecture uses hash-only token storage and sanitized public DTOs.
- Public share headers include no-referrer and no-store through `next.config.ts`.
- The visual language has a strong story: passport stamps, day sections, "first spark" preview copy, and "live plan" framing.
- Delete flow is placed under settings and explains shared-link revocation.

## Magical Storytelling Opportunities

1. Turn the plan into a day narrative.
   Add a current-time marker, "next up", "room to breathe", travel gaps, and "after this, you might want..." suggestions grounded in real time and location.

2. Make saved details feel trustworthy.
   Each item should carry a small source story: "Verified Jun 24 from the official recreation calendar", "Time needs confirmation", or "Outdoor schedule can shift."

3. Make moving explicit.
   Do not let drag imply changing official time. For timed events, offer "Find another time" only when real alternate occurrences exist. For untimed ideas, allow moving between "Morning idea", "Afternoon idea", and "Anytime" only as user intent, not source truth.

4. Make sharing feel ceremonial but safe.
   Before share creation, show: "Anyone with this link can view your live plan. Only you can edit it." After creation, show copy status, link health, last copied time, and clear replace/revoke actions.

5. Give shared viewers a clean fork story.
   "Add these ideas to My Plan" should show added/skipped counts and then highlight the copied items in the viewer's own preview.

## Recommended Fix Order

1. Fix client Turnstile config and add a regression test for first save syncing with captcha enabled.
2. Add a unique active-plan constraint and transactional get-or-create.
3. Fix local-item migration after first server save.
4. Make notes/reorder durable or remove the affordances.
5. Fix share reuse after reload and expose replace/revoke for existing active shares.
6. Retire legacy snapshot share routes.
7. Change saved-state checks to occurrence-level identity.
8. Fix mobile preview overflow and dialog accessible name.
9. Wire plan rate limits and transactional mutations.
10. Add item detail/source rows and live public refresh.

## Evidence Limits

- Email claim/cross-device recovery could not be audited as a live flow because no `/plan/find` or `/auth/confirm` implementation exists.
- Server-backed sharing could not be fully exercised in the local runtime because anonymous auth sync failed under captcha protection.
- Screenshot accessibility findings are risk-based; full WCAG verification still needs keyboard, focus-return, screen-reader, zoom, contrast, and reduced-motion testing.
