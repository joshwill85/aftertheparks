import { NextRequest } from "next/server";
import { publicActivitiesResponse } from "@/lib/api/publicActivities";
import { privateNoStoreJson } from "@/lib/cache/http";
import { getTodayActivities, getTonightActivities } from "@/lib/data/activities";
import {
  buildRestDayPlan,
  type RestDayVibe,
  type RestDayWho,
} from "@/lib/plan/restDay";

export const dynamic = "force-dynamic";

const VALID_VIBES: RestDayVibe[] = ["relaxed", "active", "evening"];
const VALID_WHO: RestDayWho[] = ["little_kids", "family", "couple"];

export async function POST(request: NextRequest) {
  let body: { resort?: string; vibe?: string; who?: string };
  try {
    body = await request.json();
  } catch {
    return privateNoStoreJson({ error: "Invalid JSON" }, { status: 400 });
  }

  const resort = body.resort?.trim();
  if (!resort) {
    return privateNoStoreJson({ error: "resort is required" }, { status: 400 });
  }

  const vibe = VALID_VIBES.includes(body.vibe as RestDayVibe)
    ? (body.vibe as RestDayVibe)
    : "relaxed";
  const who = VALID_WHO.includes(body.who as RestDayWho)
    ? (body.who as RestDayWho)
    : "family";

  const [today, tonight] = await Promise.all([
    getTodayActivities({ resort }),
    getTonightActivities({ resort }),
  ]);

  const activities = buildRestDayPlan(today, tonight, { vibe, who });

  return privateNoStoreJson({
    ...publicActivitiesResponse(activities),
    resort,
    vibe,
    who,
  });
}
