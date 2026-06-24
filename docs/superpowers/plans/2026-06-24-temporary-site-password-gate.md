# Technical PRD: Temporary Site Password Gate

**Version:** 1.0  
**Date:** June 24, 2026  
**Product:** After the Parks — [https://aftertheparks.com](https://aftertheparks.com)  
**Type:** Launch-hold visibility gate (not permanent authentication)

---

## Goal

Temporarily prevent normal visitors and search engines from accessing the public site while the product is still being prepared.

This is not meant to be permanent authentication. It is a simple launch-hold gate.

---

## Decision

Add a site-wide password gate using a simple shared password.

The password must be stored as an environment variable, not hardcoded in source code.

Recommended env vars:

```txt
SITE_VISIBILITY_MODE=private
SITE_GATE_PASSWORD=123456
SITE_GATE_COOKIE_NAME=aftertheparks_site_gate
```

When ready to launch:

```txt
SITE_VISIBILITY_MODE=public
```

> **Note:** `123456` is acceptable as a temporary value in env config. The important requirement is that the value lives in environment variables so it can be changed without code edits.

---

## Scope

### Gate these routes

All normal public pages should require the password:

```txt
/
/activities
/resorts
/plan
/about
/faq
/api/*
/sitemap.xml
/robots.txt
```

### Allow these without password

Allow only required static/framework assets:

```txt
/_next/*
/favicon.ico
/*.png
/*.jpg
/*.jpeg
/*.svg
/*.webp
/*.ico
```

Also allow the password page itself:

```txt
/site-gate
/api/site-gate-login
```

---

## User experience

When a visitor opens the site and has not entered the password, show a simple page:

```txt
After the Parks is getting ready.

Enter the preview password to continue.
[ Password field ]
[ Enter ]
```

If the password is wrong:

```txt
That password did not work. Please try again.
```

If the password is correct:

1. Set a secure cookie.
2. Redirect the user back to the page they originally tried to visit.
3. Keep them unlocked for a reasonable period, such as 7 days.

---

## Cookie requirements

Set a cookie after successful password entry.

Recommended cookie settings:

```txt
httpOnly: true
secure: true in production
sameSite: lax
path: /
maxAge: 7 days
```

Cookie value can be a simple signed token or server-generated value. Do not store the raw password in the cookie.

---

## SEO protection

When `SITE_VISIBILITY_MODE=private`, every gated response should include:

```txt
X-Robots-Tag: noindex, nofollow, noarchive
```

The password page should also include:

```html
<meta name="robots" content="noindex,nofollow,noarchive">
```

The sitemap should be disabled or return an empty sitemap while private mode is on.

Recommended behavior:

```txt
/sitemap.xml → 404 or empty sitemap
```

The goal is to avoid continuing to advertise pages to search engines while the site is gated.

---

## Functional requirements

### FR-1: Site-wide gate

When private mode is enabled, any visitor without a valid gate cookie must be redirected to `/site-gate`.

Acceptance criteria:

1. Visiting `/` without cookie shows the password page.
2. Visiting `/activities` without cookie shows the password page.
3. Visiting `/resorts` without cookie shows the password page.
4. Visiting `/plan` without cookie shows the password page.
5. API routes are not publicly accessible without the cookie.
6. Static assets needed by the password page still load.

---

### FR-2: Password submit

The password form must validate against `SITE_GATE_PASSWORD`.

Acceptance criteria:

1. Correct password unlocks the site.
2. Wrong password shows a friendly error.
3. Password is not logged.
4. Password is not exposed in client-side code.
5. Password is not included in the URL.
6. Password is submitted via POST.

---

### FR-3: Return path

After successful unlock, the user should return to the page they originally requested.

Acceptance criteria:

1. Visiting `/activities` while locked stores the intended path.
2. Correct password redirects to `/activities`.
3. Invalid or unsafe redirect URLs are ignored.
4. Redirect only allows same-site relative paths.

---

### FR-4: Public/private switch

The gate must be controlled by environment variable.

Acceptance criteria:

1. `SITE_VISIBILITY_MODE=private` enables the gate.
2. `SITE_VISIBILITY_MODE=public` disables the gate.
3. No code change is needed to launch publicly.
4. Production defaults to private if the env var is missing or invalid.

---

### FR-5: Search engine hiding

Private mode should discourage indexing.

Acceptance criteria:

1. Gated pages include `X-Robots-Tag: noindex, nofollow, noarchive`.
2. Password page includes a noindex meta tag.
3. Sitemap is disabled or empty in private mode.
4. Public mode restores normal sitemap behavior.
5. Public mode removes noindex headers.

---

## Recommended implementation

If this is a Next.js site, implement with middleware.

Suggested files:

```txt
middleware.ts
app/site-gate/page.tsx
app/api/site-gate-login/route.ts
```

### Middleware behavior

Pseudo-flow:

```txt
If SITE_VISIBILITY_MODE is public:
  allow request

If request is for allowed static asset:
  allow request

If request is /site-gate or /api/site-gate-login:
  allow request

If valid gate cookie exists:
  allow request

Otherwise:
  redirect to /site-gate?next={requestedPath}
```

### Login route behavior

Pseudo-flow:

```txt
Read password from POST body
Compare to SITE_GATE_PASSWORD
If correct:
  set secure httpOnly cookie
  redirect to next path
If incorrect:
  return error
```

---

## Security notes

This is a temporary visibility gate, not a true user authentication system.

Known limitations:

1. `123456` is intentionally weak.
2. Anyone with the password can access the site.
3. This does not provide user accounts.
4. This does not protect admin tooling unless those routes are also gated.
5. This should be removed or replaced before a real public launch.

Do not use this as the future login system.

---

## Testing checklist

Test in production-like environment:

1. Fresh browser opens `/` and sees password page.
2. Fresh browser opens `/activities` and sees password page.
3. Correct password unlocks site.
4. User returns to original requested page.
5. Wrong password does not unlock site.
6. Refresh after unlock stays unlocked.
7. Incognito browser is locked again.
8. Static images, fonts, CSS, and JS load on password page.
9. `/sitemap.xml` is disabled or empty in private mode.
10. Gated pages send `X-Robots-Tag: noindex, nofollow, noarchive`.
11. Setting `SITE_VISIBILITY_MODE=public` disables the gate.
12. No password value appears in browser source, JavaScript bundle, logs, or URL.

---

## Definition of done

This task is complete when:

1. The full site is inaccessible without the shared password.
2. The password is controlled by environment variable.
3. The site can be switched public/private without code changes.
4. Search engines receive noindex signals during private mode.
5. Sitemap is disabled or empty during private mode.
6. Static assets still load correctly.
7. The user experience is simple and clean on desktop and mobile.

---

## Environment reference

Add to `.env.example`:

```txt
SITE_VISIBILITY_MODE=private
SITE_GATE_PASSWORD=123456
SITE_GATE_COOKIE_NAME=aftertheparks_site_gate
```

Set on Vercel (production, preview, development) before deploy. Switch `SITE_VISIBILITY_MODE=public` at launch without redeploying application code (env-only change + redeploy or env refresh).
