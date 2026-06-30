import { NextResponse } from "next/server";
import { buildLlmsText } from "@/lib/seo/llms";

export const revalidate = 86400;

export function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";

  return new NextResponse(buildLlmsText(baseUrl), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
