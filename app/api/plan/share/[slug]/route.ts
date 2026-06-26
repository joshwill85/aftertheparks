import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      error: "legacy_share_unavailable",
      message: "Legacy plan shares are view-only in the browser.",
    },
    { status: 410 }
  );
}
