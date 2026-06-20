import { NextResponse } from "next/server";
import { createPlanShare } from "@/lib/data/activities";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createPlanShare(body.items ?? body);

    if (!result) {
      return NextResponse.json(
        { error: "Unable to create share link" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      shareSlug: result.shareSlug,
      url: `/plan/${result.shareSlug}`,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
