import { NextResponse } from "next/server";
import {
  validateWeatherGuidanceBatchOptions,
  validateWeatherGuidanceBatchRequest,
} from "@/lib/weather/apiValidation";
import { loadWeatherByOccurrence } from "@/lib/weather/serverGuidance";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const occurrences = validateWeatherGuidanceBatchRequest(body);
  const options = validateWeatherGuidanceBatchOptions(body);
  const now = new Date();
  const weatherById = await loadWeatherByOccurrence({
    occurrences,
    now,
    includeNearTerm: options.includeNearTerm,
    includePrecipMap: options.includePrecipMap,
  });

  return NextResponse.json({ weatherById });
}
