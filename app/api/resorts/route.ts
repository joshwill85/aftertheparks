import { NextResponse } from "next/server";
import { getResorts } from "@/lib/data/activities";

export const dynamic = "force-dynamic";

export async function GET() {
  const resorts = await getResorts();
  return NextResponse.json({ resorts, count: resorts.length });
}
