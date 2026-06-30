import { privateNoStoreJson } from "@/lib/cache/http";
export const dynamic = "force-dynamic";

export async function GET() {
  return privateNoStoreJson(
    {
      error: "legacy_share_unavailable",
      message: "Legacy plan shares are view-only in the browser.",
    },
    { status: 410 }
  );
}
