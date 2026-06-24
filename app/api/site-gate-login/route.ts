import { NextResponse } from "next/server";
import {
  getSiteGatePassword,
  isSitePrivate,
  SITE_GATE_COOKIE_NAME,
  SITE_GATE_MAX_AGE_SECONDS,
} from "@/lib/site-gate/config";
import { safeNextPath } from "@/lib/site-gate/paths";
import { createGateCookieValue, timingSafeEqualString } from "@/lib/site-gate/token";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSitePrivate()) {
    return NextResponse.json({ redirect: "/" });
  }

  const password = getSiteGatePassword();
  if (!password) {
    return NextResponse.json(
      { error: "Site gate is not configured." },
      { status: 503 }
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  let submitted = "";
  let next = "/";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    submitted = String(body.password ?? "");
    next = safeNextPath(body.next ?? "/");
  } else {
    const form = await request.formData();
    submitted = String(form.get("password") ?? "");
    next = safeNextPath(String(form.get("next") ?? "/"));
  }

  if (!timingSafeEqualString(submitted, password)) {
    return NextResponse.json(
      { error: "That password did not work. Please try again." },
      { status: 401 }
    );
  }

  const token = await createGateCookieValue(password);
  const response = NextResponse.json({ redirect: next });
  response.cookies.set(SITE_GATE_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SITE_GATE_MAX_AGE_SECONDS,
  });
  return response;
}
