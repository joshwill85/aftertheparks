import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import {
  isPublicCacheTagName,
  PUBLIC_CACHE_TAGS,
} from "@/lib/cache/tags";
import { privateNoStoreHeaders } from "@/lib/cache/http";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401, headers: privateNoStoreHeaders() }
  );
}

export async function POST(request: Request) {
  const secret = process.env.CACHE_REVALIDATION_SECRET;
  if (!secret) return unauthorized();

  const auth = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-revalidate-secret");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
  if (bearer !== secret && headerSecret !== secret) {
    return unauthorized();
  }

  const body = await request.json().catch(() => ({}));
  const tag = typeof body.tag === "string" ? body.tag : "";
  if (!isPublicCacheTagName(tag)) {
    return NextResponse.json(
      { error: "Unsupported cache tag" },
      { status: 400, headers: privateNoStoreHeaders() }
    );
  }

  revalidateTag(PUBLIC_CACHE_TAGS[tag]);

  return NextResponse.json(
    { ok: true, tag },
    { headers: privateNoStoreHeaders() }
  );
}
