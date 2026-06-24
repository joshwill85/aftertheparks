# Technical PRD: Remove Temporary Site Password Gate / Restore Public Launch Mode

**Version:** 1.0  
**Date:** June 24, 2026  
**Product:** After the Parks — [https://aftertheparks.com](https://aftertheparks.com)  
**Companion to:** [2026-06-24-temporary-site-password-gate.md](./2026-06-24-temporary-site-password-gate.md)  
**Type:** Public launch / SEO restoration (reversible env switch)

---

## Goal

Provide a clean, safe, and reversible process to undo the temporary site password gate and restore the site to normal public visibility.

This PRD assumes the previous temporary gate used:

```txt
SITE_VISIBILITY_MODE=private
SITE_GATE_PASSWORD=123456
SITE_GATE_COOKIE_NAME=aftertheparks_site_gate
```

The goal is to make the site publicly accessible again without requiring a password, while also restoring normal SEO behavior.

---

# 1. Summary

When the site is ready for public access, the dev should switch the site from private mode to public mode.

The preferred first step is configuration-only:

```txt
SITE_VISIBILITY_MODE=public
```

This should immediately:

1. Disable the password gate.
2. Stop redirecting users to `/site-gate`.
3. Remove `noindex`, `nofollow`, and `noarchive` headers.
4. Restore the normal sitemap.
5. Restore normal `robots.txt`.
6. Allow all public pages and API routes to behave normally.

The gate code can remain in place temporarily as a safety switch, but it should be inactive when public mode is enabled.

---

# 2. Launch-mode behavior

## Private mode

When:

```txt
SITE_VISIBILITY_MODE=private
```

The site should:

```txt
Require password
Show /site-gate to unauthenticated visitors
Send X-Robots-Tag: noindex, nofollow, noarchive
Disable or empty sitemap.xml
Prevent normal public browsing
```

## Public mode

When:

```txt
SITE_VISIBILITY_MODE=public
```

The site should:

```txt
Allow all public pages without password
Stop redirecting to /site-gate
Remove X-Robots-Tag noindex headers
Restore sitemap.xml
Restore robots.txt
Allow search engines to crawl/index the site
Keep normal SEO metadata active
```

---

# 3. Functional requirements

## FR-1: Public mode disables the password gate

When `SITE_VISIBILITY_MODE=public`, the middleware must not block public routes.

### Acceptance criteria

1. Visiting `/` does not show `/site-gate`.
2. Visiting `/activities` does not show `/site-gate`.
3. Visiting `/resorts` does not show `/site-gate`.
4. Visiting `/plan` behaves according to the normal app logic.
5. Public API routes behave according to normal app rules.
6. Existing gate cookies are ignored.
7. Missing gate cookies do not matter.
8. No password prompt appears anywhere in normal browsing.
9. Users are not redirected to `/site-gate`.
10. The site works in a fresh incognito window without entering a password.

---

## FR-2: Remove noindex behavior

When public mode is enabled, the site must stop sending private-mode search-blocking directives.

### Acceptance criteria

1. Public pages do not include:

```html
<meta name="robots" content="noindex,nofollow,noarchive">
```

2. Public responses do not include:

```txt
X-Robots-Tag: noindex, nofollow, noarchive
```

3. Normal SEO metadata is restored.
4. Canonical tags remain correct.
5. Open Graph metadata remains correct.
6. The password page, if still deployed, may remain `noindex`.
7. Private-mode noindex behavior can still be re-enabled by setting `SITE_VISIBILITY_MODE=private`.

---

## FR-3: Restore sitemap

When public mode is enabled, `/sitemap.xml` should return the normal production sitemap.

### Acceptance criteria

1. `/sitemap.xml` returns HTTP 200.
2. The sitemap includes intended public pages.
3. The sitemap excludes temporary/private pages like `/site-gate`.
4. The sitemap excludes internal API routes.
5. The sitemap uses production URLs.
6. The sitemap can be fetched without password.
7. The sitemap does not include staging or preview URLs.
8. Search engines can crawl it normally.

---

## FR-4: Restore robots.txt

When public mode is enabled, `/robots.txt` should not block the entire site.

### Acceptance criteria

1. `/robots.txt` returns HTTP 200.
2. It does not contain:

```txt
Disallow: /
```

unless intentionally needed for a specific bot.

3. It points to the production sitemap if applicable:

```txt
Sitemap: https://aftertheparks.com/sitemap.xml
```

4. It allows major search engines to crawl public pages.
5. It does not expose private or internal routes unnecessarily.
6. It behaves normally without a gate cookie.

---

## FR-5: Password page behavior after public launch

The `/site-gate` page should not be part of the normal public user journey.

### Acceptance criteria

Choose one of the following acceptable behaviors:

### Option A — Keep route but hide from users

```txt
/site-gate remains deployed
/site-gate is noindex
/site-gate is not linked anywhere
/site-gate does not affect normal browsing
```

### Option B — Redirect route

```txt
/site-gate redirects to /
```

### Option C — Remove route later

```txt
/site-gate is removed after launch confidence
```

Recommended MVP approach:

```txt
Keep /site-gate for 1–2 weeks after public launch as an emergency switch, then remove it later if no longer needed.
```

---

## FR-6: Existing gate cookie cleanup

Existing users may have the gate cookie from private testing. Public mode should not depend on or break because of that cookie.

### Acceptance criteria

1. Users with an old gate cookie can browse normally.
2. Users without a gate cookie can browse normally.
3. The gate cookie is ignored in public mode.
4. Optional: public mode may expire the old cookie.
5. Cookie cleanup must not break other app cookies.
6. The app must not require users to clear browser storage.

Optional response header/cookie behavior:

```txt
Set-Cookie: aftertheparks_site_gate=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax
```

This is optional, not required.

---

# 4. Recommended implementation

## Step 1: Environment variable switch

Set production environment variable:

```txt
SITE_VISIBILITY_MODE=public
```

Redeploy if the platform requires redeploy for env var changes.

## Step 2: Middleware behavior

Middleware should begin with:

```txt
If SITE_VISIBILITY_MODE === "public":
  allow request
  do not redirect
  do not apply private-mode noindex headers
```

Pseudo-flow:

```txt
Read SITE_VISIBILITY_MODE

If public:
  continue request normally

If private:
  apply temporary site-gate logic
```

## Step 3: SEO restoration

Public mode should restore:

```txt
Normal metadata
Normal canonical URLs
Normal sitemap.xml
Normal robots.txt
Indexable public pages
```

## Step 4: Optional future cleanup

After public launch is stable, remove or archive:

```txt
/site-gate page
/api/site-gate-login route
SITE_GATE_PASSWORD env var
SITE_GATE_COOKIE_NAME env var
Private-mode code paths if no longer needed
```

However, do not remove the private-mode switch immediately if the team may need a fast re-lock option.

---

# 5. Public launch checklist

Before switching public:

1. Confirm homepage is ready.
2. Confirm activities pages are ready.
3. Confirm resort pages are ready.
4. Confirm My Plan behavior is acceptable or safely disabled.
5. Confirm analytics are working.
6. Confirm sitemap generation is correct.
7. Confirm robots.txt is correct.
8. Confirm no staging URLs are exposed.
9. Confirm no test copy is visible.
10. Confirm no password page is linked in the UI.
11. Confirm private API routes are still protected where needed.
12. Confirm production environment variables are correct.

---

# 6. Post-launch SEO checklist

After switching public:

1. Visit `https://aftertheparks.com/` in an incognito browser.
2. Confirm no password is required.
3. Fetch `/robots.txt`.
4. Fetch `/sitemap.xml`.
5. Confirm public pages do not send `noindex`.
6. Confirm public pages have correct titles and descriptions.
7. Submit or resubmit sitemap in Google Search Console.
8. Submit or resubmit sitemap in Bing Webmaster Tools if used.
9. Request indexing for the homepage.
10. Request indexing for key pages.
11. Check search console coverage after crawl data updates.

Key pages to verify:

```txt
/
/activities
/resorts
/plan
```

---

# 7. QA test plan

## Public access tests

1. Fresh browser opens `/` without password.
2. Fresh browser opens `/activities` without password.
3. Fresh browser opens `/resorts` without password.
4. Fresh browser opens `/plan` without password.
5. Incognito browser opens the site without password.
6. Mobile browser opens the site without password.
7. Desktop browser opens the site without password.
8. Existing tester with gate cookie can still browse.
9. User without gate cookie can still browse.
10. No redirect to `/site-gate` occurs.

## SEO tests

1. `/sitemap.xml` returns expected sitemap.
2. `/robots.txt` returns expected public robots file.
3. Homepage does not include noindex meta tag.
4. Activities pages do not include noindex meta tag.
5. Resort pages do not include noindex meta tag.
6. HTTP responses do not include private-mode `X-Robots-Tag`.
7. Canonical URLs are production URLs.
8. Sitemap excludes `/site-gate`.
9. Sitemap excludes API routes.
10. Sitemap excludes preview/staging URLs.

## Regression tests

1. Static assets load.
2. Images load.
3. CSS loads.
4. JavaScript loads.
5. Navigation works.
6. Save/My Plan feature behaves as currently intended.
7. API routes still enforce their normal access rules.
8. No password value appears in client code.
9. No private-mode banner appears.
10. No private-mode redirects occur.

---

# 8. Emergency rollback

If the site needs to be hidden again:

Set:

```txt
SITE_VISIBILITY_MODE=private
```

Confirm:

1. Public pages redirect to `/site-gate`.
2. Password is required.
3. `X-Robots-Tag: noindex, nofollow, noarchive` is restored.
4. Sitemap is disabled or empty.
5. Public browsing is blocked again.

This is why the private-mode code should remain available until the team is confident the public launch is stable.

---

# 9. Definition of done

This undo task is complete when:

1. `SITE_VISIBILITY_MODE=public` disables the password gate.
2. All intended public pages load without password.
3. No public page redirects to `/site-gate`.
4. No public page sends private-mode noindex headers.
5. Normal sitemap is restored.
6. Normal robots.txt is restored.
7. Existing gate cookies do not affect users.
8. Search engines are allowed to crawl intended public pages.
9. The site can still be re-locked by setting `SITE_VISIBILITY_MODE=private`.
10. QA confirms desktop, mobile, and incognito access work correctly.

---

# 10. Final recommendation

Keep the gate as a reversible environment-controlled feature until launch confidence is high.

Use this public launch switch:

```txt
SITE_VISIBILITY_MODE=public
```

Do not immediately delete the gate code. First confirm public launch behavior, SEO restoration, and indexing readiness. After the site has been stable for a while, the team can remove the temporary gate files and environment variables in a separate cleanup PR.

---

## Environment reference

**Launch switch (production):**

```txt
SITE_VISIBILITY_MODE=public
```

**Emergency re-lock:**

```txt
SITE_VISIBILITY_MODE=private
```

Set on Vercel (production) and redeploy or refresh env as required by the platform. No application code changes are needed for the switch itself.
