import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { logSecurityEvent } from "@/lib/plan/security-log";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = createServiceClient();
  if (!client) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  logSecurityEvent("cleanup_job_started");

  const { data, error } = await client.rpc("cleanup_abandoned_guest_plans");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = (data?.[0] ?? {}) as {
    deleted_itineraries?: number;
    deleted_items?: number;
    pruned_rate_buckets?: number;
  };

  logSecurityEvent("cleanup_job_finished", {
    deletedItineraries: row.deleted_itineraries ?? 0,
    deletedItems: row.deleted_items ?? 0,
  });

  return NextResponse.json({ ok: true, ...row });
}
