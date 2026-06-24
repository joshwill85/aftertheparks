# Product Requirements Document

## After the Parks — “My Plan” Guest Itinerary

**Version:** 1.0
**Date:** June 24, 2026
**Status:** Ready for design and engineering
**Primary platform:** Responsive desktop and mobile web
**Implementation assumption:** Next.js App Router with Supabase Auth/Postgres. The product architecture remains valid if the underlying vendors change.

---

## 1. Executive decision

Build **My Plan** as a guest-first itinerary that requires no registration before use.

The system will:

| Area                   | Product decision                                                              |
| ---------------------- | ----------------------------------------------------------------------------- |
| First interaction      | A plan is created only after the user clicks **Save**                         |
| Popup behavior         | The compact My Plan panel opens only after an explicit save                   |
| Initial identity       | A behind-the-scenes anonymous authenticated user                              |
| Immediate reliability  | Optimistic local save plus durable server synchronization                     |
| Same-device return     | Restored automatically from the session and local cache                       |
| Cross-device return    | Verified email plus one-time magic-link access                                |
| Public sharing         | An unguessable, permanently read-only share link                              |
| Editing later          | Only through the owner’s authenticated session, never through the public link |
| Future accounts        | Add account UI later without migrating itinerary ownership                    |
| Overlapping activities | Allowed, with gentle warnings rather than blocking                            |
| Plan structure         | One active plan in the initial UI, supporting multiple dates                  |
| Shared-plan behavior   | The read-only view stays current as the owner edits                           |
| Marketing email        | Separate, optional, unchecked consent                                         |

### Core product model

```text
Browse
  ↓
Save an activity
  ↓
Create anonymous owner + plan
  ↓
Save locally immediately and synchronize to the server
  ↓
Open compact My Plan preview
  ↓
Offer: “Keep this plan on every device”
  ↓
Verify email
  ↓
Owner can securely recall and edit the plan from any device
```

A public share link follows a separate path:

```text
Owner’s editable plan
  ↓
Create read-only share link
  ↓
Friends and family can view
  ↓
They cannot edit the original
  ↓
They may add a copy to their own plan
```

**Do not implement reusable private edit links.** A public URL should never turn into an editing credential. The owner should regain editing access by verifying their email.

Supabase anonymous users have a stable user ID and authenticated database role, but they cannot recover that identity after clearing browser data or moving to another device unless an identity such as email is linked. Supabase supports linking an email identity to the existing anonymous user, which is what makes this architecture both guest-friendly now and account-ready later. ([Supabase][1])

---

# 2. Product context

After the Parks already has:

* A top-level **My Plan** navigation destination.
* An empty-plan experience inviting users to save activities.
* **Save** controls on scheduled activity cards.
* Timed activities and untimed recreation offerings.
* A brand promise centered on building a low-stress rest day from “sunshine to starlight.” ([After the Parks][2])

The new feature should feel like the natural completion of the existing product, not a separate planning application.

The experience should remain:

* Lightweight.
* Reassuring.
* Easy to understand.
* Useful without an account.
* Rich enough to encourage return visits and sharing.
* Safe enough that a public link never jeopardizes the original plan.

No software system is literally unbreakable. This PRD therefore defines “unbreakable” as:

1. No silent data loss.
2. Graceful behavior during connectivity or service failures.
3. Idempotent mutations that do not duplicate items.
4. Secure ownership boundaries.
5. Recoverability across devices after email verification.
6. Automated monitoring, backups, cleanup, and regression tests.

---

# 3. Product vision

> **My Plan turns scattered resort activities into a living, low-stress day that follows the guest from device to device.**

It should feel less like operating a calendar and more like watching a day come together.

The product must combine:

* The ease of a guest shopping cart.
* The security model of a private document.
* The sharing behavior of a view-only wishlist.
* The warmth and motion of the After the Parks brand.

---

# 4. Goals

## 4.1 Primary goals

1. Let a visitor save an activity without registering.
2. Create and persist the plan only when the first save occurs.
3. Let the same visitor return on the same device automatically.
4. Let the visitor secure the plan with a verified email.
5. Let an email-verified owner open and edit the plan on another device.
6. Let the owner share a view-only, live version of the plan.
7. Permit overlapping events while making conflicts clear.
8. Preserve plan data when the network or backend is temporarily unavailable.
9. Build on an ownership model that can become a full account system later.
10. Capture email without using deceptive or forced consent.

## 4.2 Secondary goals

* Encourage users to save a second and third activity.
* Make shared plans useful enough to drive organic discovery.
* Surface schedule changes without unexpectedly rewriting the user’s plan.
* Establish clean analytics for saves, email capture, return visits, and sharing.

## 4.3 Non-goals for the initial release

The following are deliberately excluded:

* Real-time multi-user collaboration.
* Multiple editors on one plan.
* Custom activities or personal calendar events.
* Drag-and-drop timeline scheduling.
* Editing the published time of an official activity.
* Comments or chat.
* Multiple named itineraries in the primary UI.
* Password-based accounts.
* Social login.
* Native mobile applications.
* Push notifications.
* Calendar export.
* Trip booking or reservations.
* Publicly searchable plans.
* AI itinerary generation.

The schema should accommodate several of these later without requiring ownership or data-model replacement.

---

# 5. Users and jobs to be done

| User                   | Job                                                                        |
| ---------------------- | -------------------------------------------------------------------------- |
| Guest planner          | “Let me quickly collect activities without making an account.”             |
| Returning owner        | “Bring my plan back and let me change it.”                                 |
| Cross-device owner     | “Let me open the same editable plan from my phone or laptop.”              |
| Shared viewer          | “Let me see what the family is planning without accidentally changing it.” |
| Inspired viewer        | “Let me add these ideas to my own plan.”                                   |
| Future registered user | “Let my existing plan become part of my account without starting over.”    |

---

# 6. Product principles

## 6.1 Action before identity

The user must receive value before being asked for an email.

The first **Save** works with no form, registration prompt, password, or marketing interruption.

## 6.2 Email is recovery, not a toll gate

Email provides:

* Cross-device access.
* Recovery after browser data is cleared.
* A path into future account features.

A user who declines email can still use the plan on the current device.

## 6.3 Public sharing and ownership are separate

The public URL grants view access only.

It must never grant:

* Update access.
* Delete access.
* Owner identity access.
* Email access.
* Private account access.

## 6.4 Local speed, server durability

The interface responds immediately using a local copy. The server remains the durable source of truth when connectivity is available.

## 6.5 Never block a reasonable choice

Overlapping events are allowed. The product explains the overlap without deciding for the user.

## 6.6 No whole-document overwrites

Every add, remove, rename, and share action is an independent, idempotent mutation. Two devices should not replace the entire itinerary with whichever device saves last.

## 6.7 Magic comes from responsiveness and relevance

The interface should feel alive through:

* Fast feedback.
* Subtle movement.
* Current-time context.
* “Happening now” and “Starting soon” states.
* Schedule-change awareness.
* Warm, changing microcopy.

It should not depend on heavy animation or novelty effects.

---

# 7. Information architecture

## 7.1 Routes

| Route                   | Purpose                                   | Access           |
| ----------------------- | ----------------------------------------- | ---------------- |
| `/plan`                 | Owner’s editable plan                     | Owner session    |
| `/plan/find`            | Request an email access link              | Public           |
| `/auth/confirm`         | Exchange one-time email token for session | Public callback  |
| `/p/[shareToken]`       | Read-only shared plan                     | Anyone with link |
| Existing activity pages | Add or remove plan items                  | Public/owner     |

There should be **no** route shaped like:

```text
/plan/edit/[permanentSecret]
```

## 7.2 Plan ownership states

```text
NO_PLAN
  ↓ first Save
LOCAL_PENDING
  ↓ anonymous auth and server save succeed
GUEST_SYNCED
  ↓ email submitted
EMAIL_VERIFICATION_PENDING
  ↓ link verified
EMAIL_CLAIMED
```

Failure states:

```text
LOCAL_PENDING_OFFLINE
SYNC_RETRYING
EMAIL_LINK_EXPIRED
SHARE_REVOKED
SOURCE_ACTIVITY_CHANGED
SOURCE_ACTIVITY_UNAVAILABLE
```

---

# 8. Core user journeys

## 8.1 First save

1. User clicks **Save** on an activity.
2. The Save button changes immediately to **Saved**.
3. The activity is placed in the local plan cache.
4. An anonymous authenticated identity is created if one does not exist.
5. A plan and item are written to the server.
6. The compact My Plan preview opens.
7. The preview displays:

   * The activity just saved.
   * Total saved count.
   * A short confirmation.
   * **View My Plan**.
   * **Keep browsing**.
   * A nonblocking email recovery prompt.
8. The user may close the preview and continue browsing.

Suggested copy:

> **Saved to My Plan ✨**
> Your rest day has its first little spark.

Email module:

> **Keep it wherever you go**
> Email yourself a secure link so your plan follows you to any device.

## 8.2 Subsequent save

1. The user saves another activity.
2. The button updates immediately.
3. The same plan is updated.
4. The compact plan preview opens and highlights the newly added item.
5. The count updates without stacking multiple notifications.

Suggested copy:

> **Your day is taking shape.**
> Three activities are waiting in My Plan.

## 8.3 Same-device return

1. User returns to After the Parks.
2. My Plan does not automatically pop open.
3. The header shows the saved count.
4. `/plan` restores the latest synchronized plan.
5. Unsynchronized local operations are replayed.
6. The plan is available without requiring email.

## 8.4 Cross-device return

1. The owner opens After the Parks on a new device.
2. They select **Find My Plan**.
3. They enter their verified email.
4. The site displays the same generic confirmation regardless of whether the address exists.
5. A one-time magic link is sent.
6. The user opens the link.
7. The new device receives an authenticated owner session.
8. `/plan` opens in editable mode.

Supabase magic links are one-time-use passwordless login links and can establish an authenticated session without adding password management to the product. ([Supabase][3])

## 8.5 Sharing

1. Owner selects **Share** from `/plan`.
2. The product explains:

> Anyone with this link can view your plan. Only you can edit it.

3. A read-only share record is created.
4. Mobile uses the operating system share sheet where supported.
5. Desktop or unsupported browsers receive a copy-link action.
6. The shared view displays the latest version of the owner’s plan.
7. The owner can later revoke or replace the link.

The Web Share API is not universally supported, so clipboard copying must remain a first-class fallback. ([MDN Web Docs][4])

## 8.6 Owner editing after sharing

The share URL remains read-only.

The owner edits by:

* Opening `/plan` from an already recognized device, or
* Requesting a magic link using the verified email.

When an authenticated owner opens their own public link, the page may show:

> **Edit my plan**

That button takes them to `/plan`. It does not change the permissions of the public page.

## 8.7 Shared viewer creates a personal version

A shared viewer may select:

> **Add these ideas to My Plan**

The system:

1. Creates an anonymous owner if needed.
2. Adds nonduplicate items to the viewer’s plan.
3. Does not mutate the original.
4. Opens the viewer’s compact plan preview because this action is explicitly a save.
5. Clearly states how many items were added and skipped.

---

# 9. Functional requirements and acceptance criteria

## FR-1: Save controls

### Requirement

Every supported activity occurrence or offering must have a consistent Save control.

### Acceptance criteria

1. Clicking **Save** updates the visible state within 100 milliseconds.
2. The new state is **Saved**, with an accessible selected state such as `aria-pressed="true"`.
3. The plan count increments exactly once.
4. Multiple rapid clicks do not create duplicate items.
5. The same occurrence saved from two different pages appears only once.
6. Saving an overlapping item is allowed.
7. Saving an untimed activity is allowed.
8. Removing a saved item changes the control back to **Save**.
9. Removing an item does not open the compact My Plan preview.
10. A short undo action is available after removal.
11. Save state remains synchronized across supported pages and browser tabs.
12. A failed network request does not revert the visible Save state without explanation.

---

## FR-2: My Plan preview behavior

### Requirement

The compact My Plan interface may open automatically only in direct response to a successful or locally accepted save action.

### Acceptance criteria

The preview **does open** after:

* Clicking Save on an activity.
* Adding shared-plan items to the user’s plan.

The preview **does not open** after:

* Initial page load.
* Session restoration.
* Browser refresh.
* Browser back or forward.
* Background synchronization.
* Opening an email link.
* Opening a public share link.
* Removing an item.
* A schedule-change check.
* Merely navigating to another page.
* Automatic plan restoration.

Additional criteria:

1. Desktop uses a compact right-side panel.
2. Mobile uses a compact bottom sheet.
3. The newly saved activity is visible without scrolling.
4. The user can close it with an explicit close control.
5. Escape closes it on desktop.
6. Mobile browser back closes the sheet before navigating away where technically supported.
7. Repeated saves update the existing preview rather than stacking panels.
8. The panel does not obscure the entire desktop browsing experience.
9. Save confirmation is also announced through an accessible status message.
10. Reduced-motion users receive an immediate transition without decorative movement.

---

## FR-3: Initial plan creation

### Requirement

No plan, database row, or anonymous auth user should be created merely because someone visited the site.

### Acceptance criteria

1. The first Save initiates plan creation.
2. Only one anonymous identity is created for a continuous guest session.
3. Only one active plan is selected in the initial user interface.
4. The plan may contain activities from multiple dates.
5. Plan creation and the first item addition occur transactionally or through an idempotent server operation.
6. Retrying the operation creates neither a second plan nor a second item.
7. The plan receives a nonsequential UUID.
8. A local plan exists even if initial server creation cannot complete.
9. The interface distinguishes:

   * Synchronized.
   * Saved on this device.
   * Synchronizing.
10. The user is never shown a technical authentication error.

---

## FR-4: Local persistence and synchronization

### Requirement

The plan must be immediately usable locally and durably synchronized to the server.

### Acceptance criteria

1. A local plan snapshot is written before or alongside the network request.
2. The local cache contains no email address, auth token, or marketing consent.
3. Pending mutations are stored as individual operations.
4. Pending operations include a unique idempotency key.
5. The system retries pending operations after connectivity returns.
6. A page refresh does not discard pending operations.
7. Multiple browser tabs receive plan changes within two seconds.
8. Server data is authoritative once synchronization succeeds.
9. Unsynchronized local operations are replayed on top of the server version.
10. The client never uploads an entire stale plan over a newer server plan.
11. The user sees “Saved on this device—syncing when you’re back online” during offline operation.
12. Once synchronization completes, the status changes without requiring user action.
13. A local-only plan can be attached to a replacement anonymous session if the auth session is lost but local data remains.
14. If both browser data and the unclaimed anonymous session are lost, the interface honestly explains that the unclaimed plan cannot be recovered.
15. An email-claimed plan remains recoverable even if all browser data is cleared.

---

## FR-5: Editable plan page

### Requirement

`/plan` is the owner’s canonical editing experience.

### Acceptance criteria

1. Items are grouped by calendar date.
2. Timed items are sorted chronologically.
3. Untimed ideas appear in a separate “Anytime ideas” section.
4. Orlando activity dates use the `America/New_York` time zone and handle daylight-saving changes correctly.
5. Each item displays:

   * Title.
   * Resort.
   * Location when available.
   * Date.
   * Start and end time when available.
   * Category.
   * Price or reservation signal when available.
   * Source verification information.
6. The plan supports past, current, future, and untimed items.
7. The user may rename the plan.
8. The user may remove an item.
9. Removed items provide a short undo period.
10. Changes autosave.
11. Official source times cannot be manually altered in the initial release.
12. The empty state returns only when the plan has no active items.
13. A plan with local unsynchronized changes remains editable.
14. The page displays a quiet save/sync status.
15. The page does not require the user to click a general Save button after every edit.

---

## FR-6: Overlapping activities

### Requirement

Overlaps must be permitted and explained.

### Acceptance criteria

1. No database constraint prevents overlapping date ranges.
2. Saving an overlap does not trigger a blocking modal.
3. Both events remain in the plan.
4. Each affected event receives a subtle overlap indicator.
5. The indicator states the amount of overlap when determinable.
6. The language is neutral, not error-oriented.

Suggested copy:

> **Two good options at the same time**
> These overlap by 30 minutes. Keep both and decide later.

7. Overlap information is available to screen readers.
8. Untimed activities do not trigger conflicts.
9. An event with an unknown end time only triggers a conflict when a reliable overlap can be determined.
10. Removing one activity removes the conflict indicator from the remaining activity.

---

## FR-7: Email capture and plan claiming

### Requirement

Email capture must enable recovery and cross-device use without blocking initial plan creation.

### Acceptance criteria

1. Email is not requested before the first successful Save.
2. Email entry appears inline in the plan preview or through an explicit plan action.
3. It does not appear as an unrelated full-screen interruption.
4. The user can dismiss it and continue using the plan.
5. Dismissing the prompt suppresses it for the remainder of that browsing session.
6. Sharing remains available without providing an email.
7. The copy clearly explains the benefit:

> Email yourself a secure link so you can open and edit this plan on any device.

8. Submitting an email sends a verification or claim link.
9. The email is not considered verified until the link or one-time code is completed.
10. Successful verification attaches the email identity to the existing anonymous owner.
11. The itinerary ID and items remain unchanged during a normal claim.
12. The confirmation page returns the owner to `/plan`.
13. The plan becomes recoverable by email from another device.
14. The response to an email-link request is generic to prevent account enumeration.
15. Email requests are rate-limited.
16. Expired links offer a one-step way to request a fresh link.
17. The owner is never required to establish a password.
18. The interface may call this “Save to email” or “Keep on every device”; it should not prematurely introduce account-management terminology.

---

## FR-8: Existing-email conflict handling

### Requirement

Future account conflicts must never destroy the guest plan.

### Acceptance criteria

If a submitted email already belongs to an existing identity:

1. The user is asked to verify that identity through a magic link.
2. The anonymous plan remains intact until verification succeeds.
3. A server-side claim record proves that the current anonymous owner authorized the transfer.
4. The plan is merged into the verified owner only after successful authentication.
5. Existing items are never deleted.
6. Duplicate occurrences are skipped.
7. Unique guest-plan items are preserved.
8. The anonymous plan is archived only after the server confirms the merge.
9. A merge failure leaves both source plans unchanged.
10. The merge operation is retryable and idempotent.

---

## FR-9: Marketing consent

### Requirement

Plan-access email and marketing permission must remain separate.

### Acceptance criteria

1. Entering an email for plan recovery does not automatically subscribe the user to marketing.
2. Marketing uses a separate unchecked checkbox.
3. Suggested copy:

> Send me occasional After the Parks planning ideas and activity updates.

4. The marketing checkbox is never preselected.
5. The user can obtain cross-device plan access without granting marketing permission.
6. Consent records include:

   * Email or user identity.
   * Consent purpose.
   * Consent language version.
   * Date and time.
   * Source surface.
   * Withdrawal date where applicable.
7. Marketing emails include an unsubscribe mechanism.
8. Plan-access emails remain primarily transactional.
9. Email addresses are not sent to product analytics tools.

FTC guidance distinguishes transactional or relationship messages from primarily commercial messages, while direct-marketing guidance recommends specific opt-in consent for promotional email. Keeping the recovery email and marketing checkbox separate is therefore the safest product pattern. ([Federal Trade Commission][5])

---

## FR-10: Read-only share links

### Requirement

Owners can create a public, view-only version of the plan.

### Acceptance criteria

1. No share link exists until the owner explicitly selects Share.
2. The public token is generated with cryptographically secure randomness.
3. The token contains no user ID, email, plan ID, name, or date.
4. Only a hash of the token is stored in the database.
5. The public route returns a deliberately limited response object.
6. The shared view requires no login.
7. The page is visibly labeled **View only**.
8. The shared page contains no add, remove, rename, or delete controls for the original plan.
9. A nonowner cannot mutate the plan by calling private APIs directly.
10. The link displays the current plan, including edits made after the link was shared.
11. The page displays “Last updated” information.
12. The owner can disable the link.
13. The owner can replace it with a new link.
14. Replacing the link immediately invalidates the previous token.
15. A revoked or unknown link displays a generic unavailable state.
16. The public page receives `noindex` and `nofollow` directives.
17. The page uses a restrictive referrer policy so the token is not leaked to outgoing sites.
18. Server and analytics logs redact the raw token.
19. Public metadata uses generic copy rather than exposing a family name or full itinerary.
20. Private owner data is never included in the page source.
21. Free-form private notes are not included in the initial shared view.
22. The share page is rendered server-side and is not statically cached indefinitely.
23. Browser or CDN caching must not prevent prompt link revocation.
24. The owner sees a clear explanation before sharing:

> Anyone with this link can view your live plan. Only you can edit it.

Sensitive URL credentials should be long, random, time- or use-controlled where appropriate, stored securely, and protected from leakage through logs or browser behavior. ([OWASP Cheat Sheet Series][6])

---

## FR-11: Shared-view owner recognition

### Requirement

The public page may recognize the owner without changing its public permissions.

### Acceptance criteria

1. If the current session owns the plan, show **Edit my plan**.
2. The edit action goes to `/plan`.
3. The public endpoint itself remains read-only.
4. An unrecognized visitor never sees owner-only data.
5. An owner without a recognized session sees:

> This is the view-only link. Use your saved email link to edit the original.

6. The page may link to **Find My Plan**.
7. Entering an email always produces a generic response.

---

## FR-12: Copying a shared plan

### Requirement

A shared viewer may use the plan as inspiration without editing the original.

### Acceptance criteria

1. The CTA is **Add these ideas to My Plan**.
2. It never says **Edit this plan** to a nonowner.
3. If the viewer has no plan, a new guest plan is created.
4. If the viewer has an active plan, unique shared items are added to it.
5. Exact duplicate occurrences are skipped.
6. The original plan remains unchanged.
7. Owner identifiers and share metadata are not copied.
8. Any private fields are excluded.
9. The result explains how many activities were added.
10. The compact My Plan preview opens after the copy because the user initiated a save.
11. The new owner may independently remove or share copied items.

---

## FR-13: Source snapshots and schedule changes

### Requirement

Saved activities must retain their meaning even when source schedules change.

### Acceptance criteria

1. Every saved item stores:

   * Source activity ID.
   * Source occurrence ID when available.
   * A display snapshot from the time of saving.
   * Source verification date.
   * Source update version or timestamp.
2. Opening the plan compares the saved reference to the current source.
3. A changed time or location is marked **Schedule changed**.
4. A removed occurrence is marked **May no longer be available**.
5. Changed or unavailable items are not silently deleted.
6. The saved details remain available for context.
7. Current details are displayed clearly when known.
8. The user can remove the stale item.
9. The official source remains accessible.
10. Shared viewers see the same freshness warning.
11. Schedule checks failing because of a service outage do not incorrectly label all items unavailable.
12. Past activities remain in the plan until the owner removes them.

Suggested copy:

> **A little changed since you saved this.**
> The activity now begins at 8:00 PM. It was 7:30 PM when you added it.

---

## FR-14: Plan deletion

### Requirement

The owner can permanently delete a plan.

### Acceptance criteria

1. Delete is available from plan settings, not as a prominent primary action.
2. A confirmation explains that shared links will stop working.
3. Deleting the plan immediately revokes active shares.
4. The local cache is cleared.
5. Pending operations for the plan are removed.
6. A deleted plan cannot be restored through a public link.
7. Deletion is soft initially to permit operational recovery, followed by scheduled permanent removal.
8. Deleted plans are excluded from normal queries.
9. The event is recorded in an audit log without recording the plan’s activity content in analytics.

---

# 10. Experience requirements

## 10.1 Desktop

The plan preview should be a right-side panel approximately 360–420 pixels wide.

It should:

* Preserve most of the activity page.
* Highlight the saved item.
* Show the current plan count.
* Offer a direct path to `/plan`.
* Remain easy to dismiss.
* Avoid full-page navigation after each save.

## 10.2 Mobile web

The plan preview should be a bottom sheet occupying roughly 40–65% of the viewport.

It should:

* Place the close control within easy thumb reach.
* Keep **View My Plan** visible.
* Avoid a tiny drag handle as the only close mechanism.
* Respect device safe-area insets.
* Prevent background content from accidentally activating while modal.
* Restore focus appropriately when closed.

## 10.3 Header state

Before any save:

```text
My Plan
```

After save:

```text
My Plan · 3
```

The count:

* Restores without opening the panel.
* Updates across tabs.
* Does not count deleted or duplicate items.
* Remains visible on mobile navigation.

## 10.4 Full plan layout

Recommended hierarchy:

```text
My Plan
Rest Day Magic

Wednesday, July 15
  Morning
  Afternoon
  Evening

Thursday, July 16
  Morning
  Afternoon
  Evening

Anytime ideas
```

The plan should be a readable agenda, not a tightly gridded calendar. A vertical timeline is appropriate for timed activities, but it must accommodate overlaps without squeezing cards into unreadable columns.

---

# 11. “Alive and magical” design requirements

Magic must come after clarity.

## 11.1 Save motion

On Save:

1. Button softly transforms from **Save** to **Saved**.
2. A small star or light trail may move toward the My Plan count.
3. Plan count increments.
4. The preview enters with a short, gentle transition.

Requirements:

* Total motion should generally remain under 600 milliseconds.
* Do not use full-screen confetti.
* Do not play sound.
* Do not delay the actual state update for animation.
* Respect `prefers-reduced-motion`.

## 11.2 Living timeline

Where data permits, show:

* **Happening now**
* **Starts in 45 min**
* **Tonight**
* **Tomorrow**
* **Schedule changed**
* **Recently verified**
* A current-time marker on today’s timeline

These states should be calculated from real data, not decorative simulation.

## 11.3 Dynamic but controlled copy

Examples:

First item:

> Your day has its first little spark.

Several items:

> Your rest day is taking shape.

Overlapping choices:

> Two good options at the same time.

Shared page:

> A live look at the plan. Changes appear here as the day evolves.

Offline:

> Saved on this device. We’ll reconnect the magic when you’re online.

## 11.4 Accessibility

The experience must meet WCAG 2.2 AA.

Important requirements include:

* Visible keyboard focus.
* Keyboard-operable Save and plan controls.
* Minimum target sizing.
* Programmatically announced save and synchronization messages.
* Sufficient contrast.
* Reduced-motion support.
* No information communicated through color alone.

WCAG 2.2 includes minimum target-size and status-message criteria that are directly relevant to Save buttons, sheets, and asynchronous confirmation states. ([W3C][7])

---

# 12. Technical architecture

## 12.1 Recommended layers

```text
Browser UI
├── Plan state store
├── Local persisted snapshot
├── Pending-operation queue
└── Cross-tab synchronization

Next.js server layer
├── Auth/session handling
├── Plan mutation endpoints
├── Email-claim flow
├── Public share resolver
└── Sanitized response DTOs

Supabase
├── Anonymous and email identities
├── PostgreSQL itinerary data
├── Row Level Security
└── Scheduled retention/cleanup jobs

Transactional email provider
└── Verification and magic-link delivery
```

## 12.2 Client plan store

Use a small purpose-built state store, such as a React reducer or lightweight persisted store.

It must manage:

* Canonical server items.
* Optimistic items.
* Pending operations.
* Synchronization state.
* Active plan metadata.
* Saved occurrence IDs.
* Cross-tab messages.

`localStorage` is sufficient for the initial amount of plan data, provided it is treated as a cache and operation queue rather than the authoritative database.

## 12.3 Server mutation pattern

All meaningful mutations should use thin server endpoints or server actions rather than allowing scattered components to write directly.

Each operation includes:

```ts
{
  operationId: string;
  type: "add_item" | "remove_item" | "rename_plan";
  planId?: string;
  payload: object;
}
```

The database records processed operation IDs or otherwise guarantees idempotency.

## 12.4 Rendering

Owner-specific plan pages must use dynamic rendering.

Supabase specifically warns that static Next.js rendering can accidentally cache user metadata across anonymous users; authenticated plan pages should therefore never be statically shared between sessions. ([Supabase][1])

---

# 13. Data model

## 13.1 `itineraries`

| Field             | Type                | Notes                           |
| ----------------- | ------------------- | ------------------------------- |
| `id`              | UUID                | Primary key                     |
| `owner_user_id`   | UUID                | References auth user            |
| `title`           | Text                | Default “My Rest Day Plan”      |
| `timezone`        | Text                | Default `America/New_York`      |
| `trip_start_date` | Date, nullable      | Derived or user-selected later  |
| `trip_end_date`   | Date, nullable      | Supports multi-day plans        |
| `status`          | Enum                | `active`, `archived`, `deleted` |
| `version`         | Big integer         | Incremented on mutation         |
| `created_at`      | Timestamp           | Server generated                |
| `updated_at`      | Timestamp           | Server generated                |
| `last_opened_at`  | Timestamp           | Retention and analytics         |
| `deleted_at`      | Timestamp, nullable | Soft delete                     |

Do not embed the owner’s email in this table. Ownership should remain attached to the auth identity.

## 13.2 `itinerary_items`

| Field                  | Type                | Notes                                               |
| ---------------------- | ------------------- | --------------------------------------------------- |
| `id`                   | UUID                | Primary key                                         |
| `itinerary_id`         | UUID                | Parent plan                                         |
| `source_type`          | Text                | `scheduled_occurrence`, `offering`, future `custom` |
| `source_activity_id`   | Text, nullable      | Stable activity reference                           |
| `source_occurrence_id` | Text, nullable      | Stable dated occurrence                             |
| `title`                | Text                | Saved snapshot                                      |
| `resort_id`            | Text, nullable      | Normalized resort                                   |
| `resort_name`          | Text                | Saved snapshot                                      |
| `location`             | Text, nullable      | Saved snapshot                                      |
| `starts_at`            | Timestamp, nullable | UTC                                                 |
| `ends_at`              | Timestamp, nullable | UTC                                                 |
| `all_day`              | Boolean             | Default false                                       |
| `category`             | Text, nullable      | Activity category                                   |
| `price_label`          | Text, nullable      | Free, paid, unclear                                 |
| `source_url`           | Text, nullable      | Official source                                     |
| `source_verified_at`   | Timestamp, nullable | Freshness                                           |
| `saved_source_version` | Text, nullable      | Change comparison                                   |
| `snapshot_json`        | JSONB               | Additional display fields                           |
| `user_note`            | Text, nullable      | Reserved for future UI                              |
| `sort_order`           | Integer, nullable   | Reserved for future manual ordering                 |
| `deleted_at`           | Timestamp, nullable | Soft removal                                        |
| `created_at`           | Timestamp           | Server generated                                    |
| `updated_at`           | Timestamp           | Server generated                                    |

Recommended unique constraint:

```text
(itinerary_id, source_occurrence_id)
WHERE source_occurrence_id IS NOT NULL
AND deleted_at IS NULL
```

## 13.3 `itinerary_shares`

| Field              | Type                | Notes                                    |
| ------------------ | ------------------- | ---------------------------------------- |
| `id`               | UUID                | Primary key                              |
| `itinerary_id`     | UUID                | Parent plan                              |
| `token_hash`       | Text                | Hash only                                |
| `status`           | Enum                | `active`, `revoked`                      |
| `created_at`       | Timestamp           |                                          |
| `revoked_at`       | Timestamp, nullable |                                          |
| `last_accessed_at` | Timestamp, nullable |                                          |
| `view_count`       | Integer             | Approximate; exclude bots where possible |

## 13.4 `processed_plan_operations`

| Field              | Type           | Notes                |
| ------------------ | -------------- | -------------------- |
| `operation_id`     | UUID           | Idempotency key      |
| `owner_user_id`    | UUID           |                      |
| `operation_type`   | Text           |                      |
| `processed_at`     | Timestamp      |                      |
| `result_reference` | UUID, nullable | Created item or plan |

Entries may be expired after an operationally safe period.

## 13.5 `email_marketing_consents`

| Field             | Type                | Notes                         |
| ----------------- | ------------------- | ----------------------------- |
| `id`              | UUID                |                               |
| `user_id`         | UUID, nullable      |                               |
| `email`           | Text                | Normalized                    |
| `status`          | Enum                | `subscribed`, `unsubscribed`  |
| `consent_version` | Text                | Exact copy version            |
| `source`          | Text                | Plan preview, plan page, etc. |
| `consented_at`    | Timestamp           |                               |
| `withdrawn_at`    | Timestamp, nullable |                               |

---

# 14. API requirements

Suggested endpoints:

```text
GET    /api/plan
POST   /api/plan/items
DELETE /api/plan/items/[itemId]
PATCH  /api/plan
POST   /api/plan/claim-email
POST   /api/plan/share
DELETE /api/plan/share
POST   /api/plan/share/rotate
GET    /api/shared-plan/[token]
POST   /api/shared-plan/[token]/copy
DELETE /api/plan
```

## 14.1 Mutation requirements

Every mutation must:

1. Authenticate the current anonymous or permanent user.
2. Validate request shape.
3. Enforce ownership.
4. Accept an idempotency key.
5. Use a database transaction where multiple rows change.
6. Return the canonical changed entity.
7. Return the new plan version.
8. Avoid returning auth metadata.
9. Produce structured, token-redacted logs.

## 14.2 Public endpoint response

The public response should contain only:

```ts
{
  title: string;
  timezone: string;
  lastUpdatedAt: string;
  dates: Array<{
    date: string;
    items: Array<{
      title: string;
      resortName: string;
      location?: string;
      startsAt?: string;
      endsAt?: string;
      category?: string;
      priceLabel?: string;
      sourceVerifiedAt?: string;
      sourceStatus: "current" | "changed" | "unavailable";
    }>;
  }>;
}
```

It must not contain:

* Owner user ID.
* Email.
* Auth metadata.
* Token hash.
* Internal operation IDs.
* Private notes.
* Deleted items.
* Marketing consent.

---

# 15. Authentication and authorization

## 15.1 Anonymous ownership

On the first save:

1. Call the anonymous sign-in method.
2. Receive an authenticated user identity.
3. Create the itinerary owned by that identity.
4. Apply the same ownership checks used for permanent users.

Anonymous Supabase users use the authenticated database role, so Row Level Security must check row ownership rather than assuming every authenticated request is a permanent account. ([Supabase][1])

## 15.2 Row Level Security

Enable RLS on all itinerary-related tables.

Minimum rules:

```text
Owner may select itinerary where owner_user_id = auth.uid()
Owner may update itinerary where owner_user_id = auth.uid()
Owner may delete itinerary where owner_user_id = auth.uid()

Owner may access item only when parent itinerary owner_user_id = auth.uid()
Owner may manage share records only for owned itineraries
```

Do not create a general public-select policy on itinerary tables.

The public share endpoint should use a tightly scoped server-side resolver that:

1. Hashes the incoming token.
2. Finds an active share.
3. Retrieves approved public fields.
4. Returns a sanitized response.

Supabase recommends RLS for exposed tables and least-privilege access policies. ([Supabase][8])

## 15.3 Session security

* Use HTTPS everywhere.
* Use the framework’s supported secure session-cookie implementation.
* Do not place auth tokens in share URLs.
* Do not expose the server service-role key to the browser.
* Rotate sessions following sensitive identity changes.
* Use PKCE-compatible email confirmation.
* Restrict permitted email callback URLs.
* Redact all URL tokens from logging and error reporting.

---

# 16. Abuse prevention

Anonymous authentication can be abused to create large numbers of database users. Supabase recommends CAPTCHA or Turnstile protection and notes that anonymous-user cleanup is not automatic. ([Supabase][1])

Requirements:

1. Use invisible Turnstile or equivalent during anonymous-user creation.
2. Do not show a visible puzzle during ordinary legitimate saves.
3. Apply IP and device-level rate limits to:

   * Anonymous identity creation.
   * Plan creation.
   * Share creation.
   * Shared-plan copy.
   * Email link requests.
4. Limit one active share token per plan in the initial release.
5. Limit reasonable plan size, initially 100 active items.
6. Reject malformed or oversized snapshot payloads.
7. Sanitize user-controlled plan titles.
8. Add an automated anonymous-user cleanup process.
9. Preserve anonymous users that still own recently active plans.

Recommended retention:

* Unclaimed anonymous plan inactive for 180 days: eligible for deletion.
* Pending email claims: expire after 24 hours.
* Revoked share records: retain operational metadata for 30 days, then purge.
* Claimed plans: retain until the user deletes them or the privacy policy specifies otherwise.

---

# 17. Reliability requirements

## 17.1 Service-level objectives

| Measurement                        | Target                                       |
| ---------------------------------- | -------------------------------------------- |
| Visible Save-button response       | Under 100 ms                                 |
| Online add-item API latency        | p95 under 750 ms                             |
| Plan-page server response          | p95 under 1.5 seconds                        |
| Claimed-plan restore success       | At least 99.9%                               |
| Duplicate-item rate                | Under 0.1%                                   |
| Silent data-loss incidents         | Zero                                         |
| Public-link unauthorized mutations | Zero                                         |
| Email-link request API success     | At least 99.5%, excluding provider rejection |

## 17.2 Failure behavior

| Failure                       | Required experience                                          |
| ----------------------------- | ------------------------------------------------------------ |
| User offline                  | Save locally and queue synchronization                       |
| Plan API unavailable          | Preserve local changes and retry                             |
| Anonymous auth unavailable    | Preserve local plan and retry identity creation              |
| Email provider unavailable    | Plan remains editable on current device; offer resend later  |
| Share creation unavailable    | Plan remains safe; do not expose an incomplete URL           |
| Public page unavailable       | Show a friendly retry state                                  |
| Source-data check fails       | Keep saved snapshot; do not label it cancelled               |
| Duplicate mutation            | Return existing canonical item                               |
| Multiple tabs                 | Synchronize through browser messaging                        |
| Two devices edit concurrently | Apply item-level operations; never overwrite the entire plan |

## 17.3 Operational safeguards

* Database migrations must be version-controlled.
* Migrations should be additive before destructive.
* Enable production database backups and point-in-time recovery where available.
* Place the feature behind a release flag.
* Maintain separate development, staging, and production environments.
* Add synthetic tests for save, restore, email claim, share, revoke, and copy.
* Alert on elevated save failures, auth failures, and email-link failures.
* Include a kill switch for public share creation without disabling existing owner plans.

---

# 18. Performance requirements

The itinerary feature must not noticeably slow activity browsing.

Targets should align with current Core Web Vitals guidance:

* LCP at or below 2.5 seconds.
* INP at or below 200 milliseconds.
* CLS at or below 0.1 at the 75th percentile. ([web.dev][9])

Additional requirements:

1. Do not load the full plan-management bundle before it is needed.
2. Prefetch `/plan` after the first save.
3. Keep decorative animation GPU-friendly.
4. Reserve space for the plan count to prevent layout shift.
5. Avoid re-fetching the complete activity catalog after a save.
6. Use server rendering for the initial owner plan.
7. Lazy-load nonessential shared-page enhancements.
8. Measure mobile and desktop separately.

---

# 19. Analytics

## 19.1 Required events

```text
plan_save_clicked
plan_item_saved_local
plan_item_synced
plan_item_sync_failed
plan_item_removed
plan_item_undo
plan_preview_opened
plan_preview_closed
plan_page_opened
plan_overlap_displayed
plan_email_prompt_shown
plan_email_submitted
plan_email_verified
plan_magic_link_requested
plan_cross_device_restored
plan_share_created
plan_share_copied
plan_share_opened
plan_share_revoked
plan_share_rotated
shared_plan_items_added
plan_schedule_change_displayed
plan_deleted
```

## 19.2 Analytics rules

* Never include email addresses.
* Never include auth tokens.
* Never include share tokens.
* Never include free-form plan titles.
* Use internal event-category identifiers rather than full plan contents.
* Distinguish owner opens, public opens, and automated preview-bot opens where possible.
* Track local save and server synchronization separately.

## 19.3 Product metrics

Primary funnel:

```text
Activity viewed
→ First save
→ Second save
→ Email submitted
→ Email verified
→ Plan returned to
→ Plan shared
```

Initial business hypotheses, to be refined from observed behavior:

| Metric                                        | Initial target     |
| --------------------------------------------- | ------------------ |
| Visitors who save at least one activity       | Establish baseline |
| First savers who save a second item           | 35%+               |
| Users with two or more items who submit email | 25%+               |
| Submitted emails that verify                  | 70%+               |
| Plan owners who return within 30 days         | 15%+               |
| Plan owners who create a share link           | 10%+               |
| Shared viewers who add an item to their plan  | 5%+                |

Guardrail metrics:

* Save-error rate.
* Email complaint rate.
* Plan-loss reports.
* Public-link abuse.
* Performance regression.
* Accessibility defects.
* Revoked-link serving delay.

---

# 20. Email requirements

## 20.1 Verification email

Suggested subject:

> Your After the Parks plan is ready ✨

Suggested body:

> Open your plan to keep building your rest day from any device.

Primary CTA:

> **Open My Plan**

Requirements:

* Avoid including family names or detailed plan contents in the subject.
* Explain that the link is one-time.
* Explain its expiration.
* Use a verified sending domain.
* Configure SPF, DKIM, and DMARC.
* Include a plain-text version.
* Make the CTA accessible.
* Link directly to the auth confirmation route.
* Do not mix significant promotional content into the recovery email.

## 20.2 Return-access email

Suggested subject:

> Your secure After the Parks plan link

Body:

> Use this one-time link to open and edit your saved plan.

## 20.3 Generic response

After submitting an email:

> If a plan is connected to that address, a secure link is on its way.

This prevents disclosing whether an address is registered.

---

# 21. Browser and device support

Support:

* Current and previous two major versions of Chrome.
* Current and previous two major versions of Safari.
* Current and previous two major versions of Edge.
* Current and previous two major versions of Firefox.
* iOS Safari.
* Android Chrome.
* Desktop and tablet touch input.
* Viewports from 320 CSS pixels upward.

Graceful degradation:

* No Web Share API → copy link.
* No decorative animation support → immediate state update.
* Browser storage unavailable → server session still works where possible.
* Cookies unavailable → local-only plan with a clear cross-device limitation.
* JavaScript initialization failure → existing activity browsing remains usable.

---

# 22. QA and test plan

## 22.1 Save tests

* First save online.
* First save offline.
* Duplicate rapid clicks.
* Same activity saved from two pages.
* Timed activity.
* Untimed activity.
* Overlapping activity.
* Save followed by immediate page navigation.
* Save during slow network.
* Remove and undo.
* Refresh with pending operation.

## 22.2 Persistence tests

* Return in same tab.
* Return in new tab.
* Return after browser restart.
* Return after auth-token refresh.
* Local cache exists but auth session is missing.
* Auth session exists but local cache is missing.
* Server data newer than local cache.
* Local pending mutation newer than server.
* Simultaneous changes in two tabs.
* Simultaneous changes on two devices.

## 22.3 Email tests

* New email claim.
* Verification opened on the same device.
* Verification opened on another device.
* Expired link.
* Reused link.
* Rate-limited request.
* Existing email conflict.
* Failed email delivery.
* User requests a replacement link.
* Marketing checkbox unchecked.
* Marketing checkbox checked and recorded.

## 22.4 Share tests

* Create link.
* Open incognito.
* Open on mobile.
* Owner opens link.
* Nonowner opens link.
* Direct mutation request from nonowner.
* Revoke link.
* Rotate link.
* Old link after rotation.
* Deleted plan.
* Generic social preview.
* Copy-link fallback.
* Native share success and cancellation.
* Shared viewer adds items.
* Duplicate items skipped.

## 22.5 Schedule tests

* Unchanged occurrence.
* Time changed.
* Location changed.
* End time added.
* Occurrence removed.
* Source unavailable.
* Source check times out.
* Activity becomes past.
* Daylight-saving boundary.

## 22.6 Accessibility tests

* Keyboard-only save and remove.
* Screen-reader Save state.
* Screen-reader status announcements.
* Focus when desktop panel opens and closes.
* Focus when mobile sheet opens and closes.
* Zoom to 200%.
* High contrast.
* Reduced motion.
* Touch-target sizing.
* Error identification and recovery.

## 22.7 Security tests

* RLS owner isolation.
* Public token brute-force resistance.
* Token redaction in logs.
* Service-role key absent from client bundles.
* Cross-site scripting in plan titles.
* CSRF protection for cookie-authenticated mutations.
* Rate-limit enforcement.
* Revoked token behavior.
* Email enumeration resistance.
* Existing-account merge authorization.
* Static-cache cross-user leakage.
* Deleted-plan access.

---

# 23. Release plan

## Phase A: Foundation

* Database schema.
* Anonymous Auth configuration.
* RLS policies.
* Plan operation API.
* Local state and synchronization queue.
* Feature flag.
* Logging and monitoring.

## Phase B: Core guest plan

* Save and Saved controls.
* First-save plan creation.
* Desktop plan preview.
* Mobile bottom sheet.
* `/plan` timeline.
* Remove and undo.
* Overlap detection.
* Same-device restoration.

## Phase C: Email and cross-device

* Inline email prompt.
* Email verification.
* Anonymous-to-email identity linking.
* Find My Plan.
* Magic-link sign-in.
* Existing-email merge safety.
* Marketing-consent separation.

## Phase D: Read-only sharing

* Share-token creation.
* Public sanitized view.
* Native share and copy fallback.
* Owner recognition.
* Revoke and rotate.
* Add shared items to My Plan.

## Phase E: Freshness and polish

* Source-change detection.
* “Now” and “Soon” states.
* Refined motion and copy.
* Performance optimization.
* Accessibility audit.
* Fault-injection testing.
* Production rollout.

---

# 24. Risks and mitigations

| Risk                                 | Mitigation                                                |
| ------------------------------------ | --------------------------------------------------------- |
| User assumes public link is editable | Label it “View only” throughout                           |
| Reusable edit URL is forwarded       | Do not create reusable edit URLs                          |
| User loses anonymous session         | Offer email claiming after first save                     |
| Email prompt reduces saves           | Place it after value is delivered and make it dismissible |
| Anonymous-user database abuse        | Invisible Turnstile, limits, cleanup                      |
| Backend outage loses a save          | Local operation queue and eventual sync                   |
| Two devices overwrite each other     | Item-level mutations and plan versioning                  |
| Share token leaks through logs       | Token hashing, path redaction, no-referrer policy         |
| Public view exposes identity         | Generic metadata and no owner fields                      |
| Schedule changes invalidate plan     | Preserve snapshot and show freshness state                |
| Marketing consent is unclear         | Separate unchecked opt-in                                 |
| Future login requires migration      | Use auth user ID as owner from the first save             |
| Static rendering leaks another plan  | Dynamic owner rendering and cache isolation               |
| Feature becomes too complex          | Enforce the initial non-goals                             |

---

# 25. Definition of done

The initial release is complete only when:

1. Every P0 acceptance criterion passes.
2. First Save works with no registration.
3. My Plan automatically opens only after a Save.
4. Offline Save survives refresh and later synchronizes.
5. Same-device return works after browser restart.
6. Verified-email cross-device return works.
7. Public links are demonstrably read-only.
8. Revoked links stop working promptly.
9. RLS tests prove one owner cannot read or modify another owner’s plan.
10. Duplicate operations do not produce duplicate items.
11. Overlapping activities remain saveable.
12. Timed and untimed items display correctly.
13. Marketing permission remains separate from plan recovery.
14. Raw tokens and email addresses are absent from analytics and logs.
15. WCAG 2.2 AA testing passes.
16. Core Web Vitals show no material regression.
17. Production monitoring and alerts are active.
18. Anonymous-user cleanup is scheduled.
19. Database backups are confirmed.
20. A rollback path is tested.
21. Privacy policy and email language have been reviewed.
22. No open severity-one or severity-two defects remain.

---

# 26. Final product recommendation

The most durable initial product is:

> **A locally responsive, server-backed anonymous itinerary that becomes cross-device through verified email, shares through a permanently read-only live link, and later becomes a user account without changing ownership or moving data.**

The key simplifications are equally important:

* One active plan in the initial UI.
* No password.
* No permanent edit link.
* No collaborative editing.
* No whole-plan overwrites.
* No forced email.
* No blocked overlaps.
* No marketing consent bundled with plan access.

This is the smallest architecture that fully supports saving, returning, cross-device editing, secure sharing, email capture, and future accounts without painting the product into a corner.

[1]: https://supabase.com/docs/guides/auth/auth-anonymous "Anonymous Sign-Ins | Supabase Docs"
[2]: https://aftertheparks.com/ "After the Parks"
[3]: https://supabase.com/docs/guides/auth/auth-email-passwordless "Passwordless email logins | Supabase Docs"
[4]: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share?utm_source=chatgpt.com "Navigator: share() method - Web APIs | MDN"
[5]: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business?utm_source=chatgpt.com "CAN-SPAM Act: A Compliance Guide for Business"
[6]: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html?utm_source=chatgpt.com "Forgot Password - OWASP Cheat Sheet Series"
[7]: https://www.w3.org/WAI/WCAG22/quickref/?utm_source=chatgpt.com "How to Meet WCAG (Quick Reference)"
[8]: https://supabase.com/docs/guides/api/securing-your-api?utm_source=chatgpt.com "Securing your API | Supabase Docs"
[9]: https://web.dev/articles/vitals?utm_source=chatgpt.com "Web Vitals | Articles"
