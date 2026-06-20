import { NextResponse } from "next/server";
import { getPlanShare } from "@/lib/data/activities";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const plan = await getPlanShare(slug);

  if (!plan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    items: plan.payload,
    createdAt: plan.createdAt,
  });
}
