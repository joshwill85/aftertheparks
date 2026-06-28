import { permanentRedirect } from "next/navigation";
import {
  BROWSE_PARAM_KEYS,
  buildBrowseHref,
} from "@/lib/explore/browseParams";

export default async function ActivitiesTodayRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const key of BROWSE_PARAM_KEYS) {
    const value = params[key];
    if (value) qs.set(key, value);
  }
  permanentRedirect(buildBrowseHref("/today", qs));
}
