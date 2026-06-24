# Product Requirements Document

## After the Parks — Lean Bot Protection, CAPTCHA, and Abuse Prevention Plan

**Version:** 2.0
**Date:** June 24, 2026
**Product area:** My Plan / Guest Itinerary
**Primary platforms:** Desktop web and mobile web
**Current decision:** No Resend, no email magic links, no Upstash rate limits, no Vercel WAF rate limiting
**Recommended active services:** Cloudflare Turnstile, Supabase Auth, Supabase Postgres, Supabase Row Level Security

---

# 1. Executive summary

After the Parks will let visitors save activities into **My Plan** without requiring login. This is the right user experience, but it creates abuse risk because bots could create anonymous users, plans, itinerary items, and public share links.

The lean protection plan is:

> **Use Cloudflare Turnstile only on expensive creation actions, rely on Supabase Auth’s built-in protections, enforce hard database quotas, and keep the experience frictionless for real users.**

This plan intentionally removes:

* Resend email.
* Email magic-link recovery.
* Upstash rate limiting.
* Vercel WAF rate limiting.

That makes the launch cheaper and simpler, but it also means:

* Same-device return is supported.
* Read-only sharing is supported.
* Cross-device editable recovery is not fully supported yet.
* Email capture is limited to optional, unverified interest capture unless a sending service is added later.
* Abuse protection is good enough for a lean MVP, but not as strong as a fully hardened production stack.

---

# 2. Product decision

## 2.1 Keep

The MVP protection stack will include:

```text
Cloudflare Turnstile
Supabase Anonymous Auth
Supabase built-in Auth rate limits
Supabase Postgres
Supabase Row Level Security
Database quotas
Idempotency keys
Server-side validation
Anonymous-user cleanup
Friendly failure states
Basic internal event logging
```

## 2.2 Remove for now

The MVP will not include:

```text
Resend
Transactional plan emails
Email magic links
Email-based plan recovery
Upstash Redis rate limiting
Vercel WAF rate limiting
Advanced edge rate limiting
Custom distributed rate-limit buckets
```

## 2.3 Resulting capability tradeoff

| Capability                      |                      MVP support |
| ------------------------------- | -------------------------------: |
| Save activity with no login     |                              Yes |
| Same-device return              |                              Yes |
| Read-only share link            |                              Yes |
| Owner edits on same device      |                              Yes |
| Owner edits from another device |       Not securely supported yet |
| Email capture                   | Optional unverified capture only |
| Email verification              |                               No |
| Magic-link recovery             |                               No |
| Advanced rate limiting          |                               No |
| Basic bot protection            |                              Yes |
| Database abuse guardrails       |                              Yes |

---

# 3. Goals

## 3.1 User goals

1. Save activities without logging in.
2. Avoid annoying CAPTCHA puzzles.
3. Return to the plan on the same device.
4. Share a read-only plan link with family.
5. Continue planning even if sync temporarily fails.
6. Never lose a saved item because a bot check failed.

## 3.2 Business goals

1. Protect against obvious bot abuse.
2. Avoid unnecessary paid services at MVP.
3. Keep implementation simple.
4. Preserve flexibility to add email, login, or advanced rate limits later.
5. Avoid infrastructure bloat from anonymous users and abandoned plans.
6. Avoid hurting Save conversion with security friction.

## 3.3 Engineering goals

1. Minimize moving parts.
2. Keep all security checks server-enforced.
3. Make limits configurable in environment variables.
4. Use database constraints wherever practical.
5. Make the system easy to strengthen later.
6. Avoid designs that need to be rewritten when accounts are added.

---

# 4. Non-goals

The lean MVP will not provide:

1. Verified email ownership.
2. Magic-link plan recovery.
3. Transactional email sending.
4. Marketing email automation.
5. Cross-device editable plan recovery.
6. Multiple editors.
7. True collaboration.
8. Advanced fraud scoring.
9. Distributed Redis-backed rate limits.
10. Edge WAF rules.
11. Admin abuse dashboards.
12. Permanent private edit links.
13. Password-based accounts.
14. Social login.
15. Device fingerprinting.

---

# 5. Core principle

The user experience should stay magical for real visitors.

The protection system should be almost invisible unless:

* A bot tries to create many anonymous users.
* A script creates many plans.
* A visitor tries to create too many share links.
* A user creates too many itinerary rows.
* A public share route is scanned or attacked.

The normal family planning flow should not feel like a security checkpoint.

---

# 6. Protection architecture

## 6.1 Lean MVP stack

```text
Browser
  ↓
Cloudflare Turnstile widget for protected actions
  ↓
Next.js server route / server action
  ↓
Server-side Turnstile verification
  ↓
Supabase Auth anonymous session
  ↓
Supabase Postgres with RLS
  ↓
Database quotas and constraints
  ↓
Cleanup jobs
```

## 6.2 What replaces Upstash and WAF for now

Since Upstash and WAF are removed, the MVP uses simpler controls:

| Removed layer         | Lean replacement                                    |
| --------------------- | --------------------------------------------------- |
| Upstash route buckets | Database counters, quotas, and Supabase Auth limits |
| Vercel WAF            | Server-side route checks and Supabase Auth limits   |
| Email magic links     | Same-device session only                            |
| Resend email          | No transactional email in MVP                       |

This is acceptable for a lean launch, but it is not as robust against distributed abuse as the full version.

---

# 7. Protected actions

## 7.1 Protection matrix

| Action                                      |     Turnstile |       Supabase Auth limit |    Database quota | Notes                                    |
| ------------------------------------------- | ------------: | ------------------------: | ----------------: | ---------------------------------------- |
| First Save creating anonymous user and plan |           Yes |                       Yes |               Yes | Most important protection point          |
| Subsequent Save after plan exists           | No by default |             Session-owned |               Yes | Keep smooth                              |
| Remove item                                 |            No |             Session-owned |        Not needed | Low risk                                 |
| Undo remove                                 |            No |             Session-owned |        Not needed | Low risk                                 |
| Rename plan                                 |            No |             Session-owned | Light write limit | Low/medium risk                          |
| Create read-only share link                 |           Yes |             Session-owned |               Yes | Creates public URL                       |
| Rotate share link                           |           Yes |             Session-owned |               Yes | Should be rare                           |
| Revoke share link                           |            No |             Session-owned |                No | Safety action; never block unnecessarily |
| Open public share link                      | No by default |                        No |  Token validation | Must remain frictionless                 |
| Copy shared plan into My Plan               |           Yes | May create anonymous user |               Yes | Creates records                          |
| Delete plan                                 |            No |             Session-owned |                No | Owner-only action                        |

---

# 8. First Save requirements

## 8.1 Requirement

The first Save is the most important protected moment because it may create:

* Anonymous Supabase user.
* Plan row.
* First itinerary item.
* Local and server synchronization state.

## 8.2 Required flow

```text
User taps Save
  ↓
Button immediately changes to Saved
  ↓
Item is written to local plan cache
  ↓
Cloudflare Turnstile token is generated
  ↓
Server validates Turnstile token
  ↓
Server creates anonymous Supabase session if needed
  ↓
Server creates itinerary if needed
  ↓
Server adds item idempotently
  ↓
My Plan preview opens
  ↓
Sync status changes to Saved
```

## 8.3 Acceptance criteria

1. The Save button visually updates within 100 milliseconds.
2. The user does not see a visible CAPTCHA challenge under normal conditions.
3. The first Save includes a fresh Turnstile token.
4. The Turnstile token is validated server-side.
5. The server refuses anonymous plan creation if the token is missing, invalid, expired, or already used.
6. The local item remains visible even if server sync fails.
7. The user receives friendly copy if sync fails.
8. No anonymous user is created on page load.
9. No itinerary is created on page load.
10. Retrying the first Save does not create duplicate plans.
11. Retrying the first Save does not create duplicate items.
12. The plan preview opens only because the user saved an item.
13. The preview does not open on page load, refresh, or passive restore.
14. The server logs the failure reason without logging raw Turnstile tokens.

Suggested failure copy:

```text
Saved on this device. We could not sync it just yet, but we will try again.
```

---

# 9. Subsequent Save requirements

## 9.1 Requirement

After an anonymous owner session and plan exist, normal Saves should not repeatedly require Turnstile.

## 9.2 Acceptance criteria

1. Subsequent Saves are authenticated through the current anonymous owner session.
2. Row Level Security or server ownership checks confirm the user owns the plan.
3. The Save operation uses an idempotency key.
4. Duplicate rapid-click saves create only one item.
5. The database prevents duplicate active occurrences in the same plan.
6. The plan item quota is enforced.
7. The user can save a normal family-planning number of items without friction.
8. A user cannot save unlimited items.
9. A user cannot mutate another visitor’s plan.
10. If the item quota is reached, the UI explains it clearly.

Suggested quota copy:

```text
Your plan has a lot of ideas already. Remove a few before adding more.
```

---

# 10. Share-link protection

## 10.1 Requirement

Creating or rotating a public read-only share link must require Turnstile because it creates a public URL and share record.

## 10.2 Acceptance criteria

1. Share creation requires an owner session.
2. Share creation requires a fresh Turnstile token.
3. Server-side token validation happens before a share token is generated.
4. If an active share link already exists, the system reuses it instead of creating another.
5. The initial MVP allows only one active share link per plan.
6. Rotating the share link requires Turnstile.
7. Revoking the share link does not require Turnstile.
8. Revoking the share link is always available to the owner.
9. The share token is cryptographically random.
10. Only a hash of the share token is stored.
11. Raw share tokens are not logged.
12. A public share link is always read-only.
13. A public share link never grants edit access.
14. Unknown or revoked share links show a generic unavailable page.
15. The public shared page contains no owner email, auth user ID, or private metadata.

Suggested share copy:

```text
Anyone with this link can view your live plan. Only you can edit it.
```

Suggested unavailable copy:

```text
This shared plan is not available anymore.
```

---

# 11. Public share-view requirements

## 11.1 Requirement

Public shared-plan viewing should remain frictionless.

## 11.2 Acceptance criteria

1. Opening a public read-only share link does not require CAPTCHA by default.
2. The route validates the share token format.
3. The route hashes the token and compares it to stored share-token hashes.
4. The route returns only sanitized public plan fields.
5. The route never performs mutations.
6. The route never returns owner identity details.
7. The route displays **View only**.
8. Shared viewers cannot add, remove, rename, or delete items from the original plan.
9. If the current session owns the plan, the page may show **Edit my plan**.
10. The public page remains read-only even for the owner; the edit button simply navigates to `/plan`.
11. Public share pages include `noindex`.
12. Public share pages use cautious metadata that does not reveal family/private details.

---

# 12. Copy shared plan requirements

## 12.1 Requirement

Copying items from a shared plan into a visitor’s own My Plan must be protected because it can create many records.

## 12.2 Required flow

```text
Visitor opens read-only shared plan
  ↓
Visitor clicks Add these ideas to My Plan
  ↓
Turnstile token is generated
  ↓
Server validates token
  ↓
Anonymous owner session is created if needed
  ↓
Items are copied into visitor’s own plan
  ↓
Duplicates are skipped
  ↓
Original plan remains unchanged
```

## 12.3 Acceptance criteria

1. Copy action requires Turnstile.
2. Server-side Turnstile validation happens before creating new records.
3. Copy action creates an anonymous owner session if needed.
4. Copy action creates a plan if needed.
5. Copy action respects active item quota.
6. Copy action has a maximum copied-item count per action.
7. Recommended maximum copied items per action is 50.
8. Duplicates are skipped.
9. The original shared plan is not modified.
10. The copied plan belongs to the current anonymous session.
11. The My Plan preview opens after copy because the user explicitly saved ideas.
12. The UI explains how many items were added and skipped.

Suggested copy:

```text
Added 5 ideas to My Plan.
```

If some were skipped:

```text
Added 5 ideas. Two were already in your plan.
```

---

# 13. Database quotas

## 13.1 Requirement

Because Upstash and WAF are not being used, database quotas become more important.

## 13.2 Initial quotas

| Resource                                 |           MVP limit |
| ---------------------------------------- | ------------------: |
| Active plans per anonymous user          |                   1 |
| Active items per plan                    |                 100 |
| Lifetime items per plan                  |                 250 |
| Active share links per plan              |                   1 |
| Share rotations per plan per day         |                   3 |
| Copied items per shared-plan copy action |                  50 |
| Plan title length                        |       80 characters |
| User note length, if added later         |      500 characters |
| Snapshot JSON size per item              | Strict server limit |
| Deleted items retained before cleanup    |             30 days |

## 13.3 Acceptance criteria

1. Quotas are enforced server-side.
2. Client-side checks may improve UX but are not trusted.
3. Quota failures do not create partial records.
4. Quota failures return friendly product copy.
5. Quota values are environment-configurable where practical.
6. Database constraints prevent duplicate active items.
7. Snapshot payload size is validated.
8. Soft-deleted rows do not count as active items.
9. Lifetime quota includes deleted items to prevent churn abuse.
10. Cleanup jobs eventually remove old deleted rows.

---

# 14. Supabase Auth protection

## 14.1 Requirement

Supabase Anonymous Auth must be protected by Turnstile on first creation and configured with available built-in rate limits.

## 14.2 Acceptance criteria

1. Anonymous sign-in is not called until the first Save or shared-plan copy.
2. Anonymous sign-in includes a CAPTCHA token when configured.
3. Supabase Auth CAPTCHA protection is enabled.
4. Supabase Auth rate-limit settings are reviewed before launch.
5. The anonymous sign-in flow fails closed if protection is missing or invalid.
6. A failure does not erase the local plan item.
7. Anonymous users are not created on passive page views.
8. Anonymous users are cleaned up when abandoned.
9. Auth errors are translated into friendly UI.
10. Internal logs avoid exposing auth tokens.

---

# 15. Row Level Security and authorization

## 15.1 Requirement

All private itinerary tables must use Row Level Security or equivalent server-side ownership enforcement.

## 15.2 Minimum policies

Owner can:

```text
Read own itinerary
Update own itinerary
Delete own itinerary
Read own itinerary items
Create own itinerary items
Update own itinerary items
Soft-delete own itinerary items
Create/revoke own share links
```

Public can:

```text
Read sanitized shared-plan data only through the public share resolver
```

Public cannot:

```text
Read itinerary table directly
Read itinerary_items table directly
Update any itinerary
Delete any itinerary
Create share links
Access owner metadata
Access raw share tokens
```

## 15.3 Acceptance criteria

1. A user cannot query another user’s itinerary by ID.
2. A user cannot update another user’s itinerary by ID.
3. A user cannot remove another user’s item by ID.
4. A public share token cannot be used against owner mutation endpoints.
5. The public share endpoint returns a sanitized DTO, not raw table rows.
6. Service-role credentials are never exposed to the browser.
7. RLS tests are included in the release checklist.
8. Authorization failures return generic safe errors.

---

# 16. Idempotency requirements

## 16.1 Requirement

All write operations that may be retried must be idempotent.

## 16.2 Protected operations

Use idempotency keys for:

```text
Create plan
Add item
Copy shared plan
Create share link
Rotate share link
Remove item
Undo remove
Rename plan
```

## 16.3 Acceptance criteria

1. Retried first Save creates only one plan.
2. Retried first Save creates only one item.
3. Rapid double-click Save creates only one item.
4. Browser retry after network failure does not duplicate records.
5. Shared-plan copy retry does not duplicate copied items.
6. Share-link creation retry returns the existing active link.
7. Idempotency records expire after a safe retention period.
8. Idempotency keys are scoped to the owner session and action.
9. An attacker cannot use someone else’s idempotency key to affect their plan.
10. Duplicate detection also uses database uniqueness, not only client logic.

---

# 17. Local fallback and sync

## 17.1 Requirement

Security checks must not cause perceived data loss.

## 17.2 Acceptance criteria

1. The browser saves the item locally immediately.
2. If Turnstile or Supabase fails, the local item remains in My Plan.
3. The item is marked as pending sync.
4. The user can keep browsing.
5. The system retries sync when appropriate.
6. The user can manually retry from `/plan`.
7. Local pending items are not included in public share links until synced.
8. The UI clearly distinguishes local-only and synced items.
9. Refreshing the page preserves local pending items.
10. Clearing browser storage removes unclaimed local items.
11. The UI honestly explains if an unclaimed local-only plan cannot be recovered.

Suggested pending-sync copy:

```text
Saved on this device. Syncing when we can.
```

Suggested unrecoverable copy:

```text
Plans that were not synced or saved to an account cannot be recovered after browser data is cleared.
```

---

# 18. Same-device return

## 18.1 Requirement

The user can return to the same device and see the plan without login.

## 18.2 Acceptance criteria

1. Local cache restores the plan count.
2. Supabase anonymous session restores server-backed ownership when still available.
3. `/plan` loads the server-backed plan when possible.
4. Pending local operations are replayed.
5. The My Plan preview does not automatically open on return.
6. The header count updates quietly.
7. If the local cache exists but the anonymous session is gone, the system attempts safe reattachment only if allowed by the current architecture.
8. If reattachment is not possible, the UI presents the local plan as device-only.
9. Public share links only include synced server items.
10. The user is not asked to solve CAPTCHA merely for opening an existing same-device plan.

---

# 19. Cross-device limitation

## 19.1 Requirement

The MVP must clearly acknowledge that cross-device editable recovery is not part of this lean plan.

## 19.2 Product behavior

Without email, magic links, or login, a user can open the plan on another device only by:

1. Opening the read-only share link, or
2. Copying the shared plan into a new plan on that device.

They cannot securely edit the same original plan from another device.

## 19.3 Acceptance criteria

1. The product does not promise cross-device editing in the MVP.
2. The public share page is view-only.
3. A nonowner can copy the shared plan into their own device-owned plan.
4. The original remains owned by the original anonymous session.
5. The UI avoids misleading phrases like “access anywhere” unless account/email recovery exists.
6. A future email/login upgrade can be added without changing itinerary ownership tables.

Suggested MVP copy:

```text
This plan is saved on this device. Share a view-only link, or copy the plan on another device.
```

Future-ready copy placeholder:

```text
Want to edit across devices? Account save is coming later.
```

---

# 20. Optional email capture without Resend

## 20.1 Requirement

If email capture is desired before adding email delivery, it must be positioned as optional interest capture, not plan recovery.

## 20.2 Allowed MVP email capture

Allowed:

```text
Join the update list
Get notified when account save is available
Get occasional After the Parks planning updates
```

Not allowed:

```text
Email me my plan
Recover my plan
Open this plan on any device
Secure magic link
Verify my email
```

## 20.3 Acceptance criteria

1. Email capture is optional.
2. Email capture is not required to save a plan.
3. Email capture does not claim to verify ownership.
4. Email capture does not grant edit rights.
5. Marketing consent is separate and clear.
6. If marketing emails will be sent later, consent language is explicit.
7. The email form should use Turnstile if it writes to the database.
8. Raw email is not sent to product analytics.
9. Email storage follows privacy-policy language.
10. The user can use the planner without entering email.

Suggested copy:

```text
Want to know when account save is ready?
Leave your email and we’ll let you know.
```

Do not say:

```text
Enter your email to recover this plan.
```

---

# 21. Cleanup requirements

## 21.1 Requirement

Anonymous-user and abandoned-plan cleanup is required because the lean plan does not use advanced external abuse tooling.

## 21.2 Recommended retention

| Resource                                   |                 Retention |
| ------------------------------------------ | ------------------------: |
| Anonymous user with no plan                |                    7 days |
| Anonymous plan with zero active items      |                    7 days |
| Anonymous plan with items but no activity  |                  180 days |
| Deleted itinerary items                    |                   30 days |
| Revoked share links                        |                   30 days |
| Failed operation logs                      |                30–90 days |
| Turnstile validation logs                  |                   30 days |
| Optional unverified email interest capture | Defined by privacy policy |

## 21.3 Acceptance criteria

1. Cleanup runs automatically on a schedule.
2. Cleanup is idempotent.
3. Cleanup does not delete active plans.
4. Cleanup does not delete recently updated plans.
5. Cleanup does not orphan itinerary items.
6. Cleanup logs summary counts.
7. Cleanup can be paused.
8. Cleanup is tested in staging.
9. Cleanup does not expose user data in logs.
10. Cleanup retention values are configurable.

---

# 22. Monitoring requirements

## 22.1 MVP logging

The MVP should log security-relevant events server-side.

Track:

```text
turnstile_validation_success
turnstile_validation_failure
anonymous_signin_attempt
anonymous_signin_success
anonymous_signin_failure
plan_create_success
plan_create_failure
plan_item_add_success
plan_item_add_failure
plan_quota_block
share_create_success
share_create_failure
share_rotate_success
share_rotate_failure
share_revoke_success
public_share_open
public_share_unknown_token
public_share_revoked_token
shared_plan_copy_success
shared_plan_copy_failure
cleanup_job_started
cleanup_job_finished
```

## 22.2 Do not log

Do not log:

```text
Raw Turnstile token
Raw share token
Supabase auth token
Full local storage payload
Private plan notes
Raw email, if optional email capture exists
```

## 22.3 Acceptance criteria

1. Logs identify action and outcome.
2. Logs include request ID.
3. Logs include safe error categories.
4. Logs do not include sensitive tokens.
5. Logs can distinguish user-impacting failures from bot blocks.
6. A basic alert or manual review process exists for repeated failures.
7. Database growth is reviewed after launch.
8. Anonymous user count is reviewed after launch.
9. Plan creation count is reviewed after launch.
10. Share-token unknown attempts are reviewed after launch.

---

# 23. User-facing copy

## 23.1 Approved copy

First Save success:

```text
Saved to My Plan ✨
```

Pending sync:

```text
Saved on this device. Syncing when we can.
```

Sync retry:

```text
We could not sync that just yet. Your plan is still saved here.
```

Quota reached:

```text
Your plan has a lot of ideas already. Remove a few before adding more.
```

Too many share actions:

```text
We could not create a new share link right now. Your existing plan is still safe.
```

Public link unavailable:

```text
This shared plan is not available anymore.
```

View-only label:

```text
View only
```

Same-device limitation:

```text
This plan is saved on this device.
```

Future account teaser:

```text
Account save is coming later.
```

## 23.2 Disallowed copy

Do not show users:

```text
CAPTCHA failed
Turnstile token invalid
Rate limit exceeded
Supabase error
Anonymous auth failed
Bot detected
WAF blocked
Invalid token hash
RLS denied
```

---

# 24. Security acceptance criteria

The lean MVP is secure enough to launch only when:

1. Turnstile is active on first Save.
2. Turnstile is active on share creation.
3. Turnstile is active on share rotation.
4. Turnstile is active on shared-plan copy.
5. Server-side Turnstile validation is implemented.
6. Missing or invalid Turnstile tokens prevent expensive resource creation.
7. Supabase CAPTCHA protection is enabled for anonymous auth.
8. Supabase Auth rate-limit settings are reviewed.
9. RLS is enabled on all private itinerary tables.
10. Public share resolver returns sanitized data only.
11. Public share links cannot mutate plans.
12. Public share links cannot grant edit access.
13. Share tokens are long, random, and stored only as hashes.
14. Item quotas are enforced server-side.
15. Duplicate saves are impossible or safely deduplicated.
16. Local fallback prevents perceived data loss.
17. Cleanup jobs remove abandoned anonymous resources.
18. Sensitive tokens are not logged.
19. The first Save remains smooth for real users.
20. The system is designed so Upstash/WAF/email can be added later without rewriting core ownership.

---

# 25. QA plan

## 25.1 First Save tests

* First Save online.
* First Save with missing Turnstile token.
* First Save with invalid Turnstile token.
* First Save with expired Turnstile token.
* First Save with reused Turnstile token.
* First Save while network is slow.
* First Save while Supabase Auth fails.
* First Save while server fails after local save.
* First Save rapid double click.
* First Save followed by immediate page refresh.

## 25.2 Subsequent Save tests

* Save second item.
* Save duplicate occurrence.
* Save overlapping item.
* Save untimed item.
* Save until quota reached.
* Remove item.
* Undo removal.
* Save from two tabs.
* Save while offline.
* Refresh with pending local item.

## 25.3 Share tests

* Create share link.
* Reuse existing share link.
* Rotate share link.
* Revoke share link.
* Open active link.
* Open revoked link.
* Open malformed link.
* Open unknown link.
* Confirm no edit controls for nonowner.
* Confirm owner can navigate to `/plan`.
* Confirm public response contains no owner metadata.

## 25.4 Shared-copy tests

* Copy shared plan with no existing plan.
* Copy shared plan with existing plan.
* Copy duplicate items.
* Copy more than item limit.
* Copy with invalid Turnstile token.
* Copy while Supabase anonymous auth fails.
* Confirm original plan is unchanged.

## 25.5 Security tests

* Nonowner tries to update another plan.
* Nonowner tries to delete another item.
* Public token used against owner mutation endpoint.
* Raw share token appears in logs.
* Raw Turnstile token appears in logs.
* Service-role key appears in client bundle.
* RLS disabled accidentally.
* Snapshot payload oversized.
* Malicious title/script payload.
* Cleanup job deletes wrong plan.

---

# 26. Rollout plan

## Phase 1: Foundation

* Add itinerary tables.
* Add RLS policies.
* Add local plan cache.
* Add idempotency.
* Add quotas.
* Add cleanup job.
* Add basic server logs.

## Phase 2: Turnstile integration

* Add Cloudflare Turnstile site key.
* Add server-side validation.
* Protect first Save.
* Protect shared-plan copy.
* Protect share creation.
* Protect share rotation.
* Add friendly failure states.

## Phase 3: Supabase Auth hardening

* Enable Supabase CAPTCHA protection.
* Review Supabase Auth rate limits.
* Confirm anonymous auth is not called on page load.
* Confirm anonymous users are created only on first Save or copy action.

## Phase 4: Public share hardening

* Add one active share link per plan.
* Store only token hash.
* Add public sanitized resolver.
* Add revoke.
* Add rotate.
* Add noindex.
* Add no edit access from public token.

## Phase 5: Monitoring and tuning

* Review anonymous user growth.
* Review plan growth.
* Review failed Turnstile validations.
* Review share-token unknown attempts.
* Tune quotas.
* Prepare future upgrade path for email/account save.

---

# 27. Future upgrade path

When ready, the next security and product upgrades should be added in this order:

## Upgrade 1: Email delivery and magic links

Add:

```text
Resend or Postmark
Supabase magic links
Email-based plan recovery
Verified ownership across devices
```

Benefit:

```text
Users can edit the same plan from another device.
```

## Upgrade 2: App-level rate limiting

Add:

```text
Upstash Rate Limit or similar
Per-email limits
Per-session limits
Per-IP logical buckets
Per-share copy limits
```

Benefit:

```text
Better control without requiring WAF.
```

## Upgrade 3: Edge WAF

Add:

```text
Vercel WAF or Cloudflare WAF
Path-based rate limits
Bot traffic controls
Attack-mode rules
```

Benefit:

```text
Blocks abuse before app code runs.
```

## Upgrade 4: Full accounts

Add:

```text
Email login
Social login if desired
Multiple plans
Saved trip history
Premium features
Family sharing
```

Benefit:

```text
Cross-device planning becomes a core product feature.
```

---

# 28. Final MVP recommendation

For the current stage, build this:

```text
Cloudflare Turnstile
  ↓
Supabase Anonymous Auth
  ↓
Supabase Postgres + RLS
  ↓
Database quotas
  ↓
Idempotent plan mutations
  ↓
Read-only share links
  ↓
Anonymous cleanup jobs
```

Do not build this yet:

```text
Resend
Magic links
Upstash
Vercel WAF
Full login
Cross-device editing
Permanent private edit links
```

This is the simplest responsible version.

It protects the expensive actions, keeps the real user experience easy, costs little to operate, and leaves the door open to stronger infrastructure later.
