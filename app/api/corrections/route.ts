import { NextResponse } from "next/server";
import { submitCorrection } from "@/lib/data/activities";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ok = await submitCorrection(
      body.activityCatalogId ?? null,
      body.field,
      body.suggestedValue
    );
    if (!ok) {
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
