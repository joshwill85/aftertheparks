import { NextResponse } from "next/server";
import { parseCorrectionSubmission } from "@/lib/corrections";
import { submitCorrection } from "@/lib/data/activities";
import { guardRateLimit } from "@/lib/rate-limit/guard";

export async function POST(request: Request) {
  const limited = await guardRateLimit({
    request,
    scope: "corrections",
  });
  if (limited) return limited;

  try {
    const body = await request.json();
    const ok = await submitCorrection(parseCorrectionSubmission(body));
    if (!ok) {
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Invalid request",
      },
      { status: 400 }
    );
  }
}
