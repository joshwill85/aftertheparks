import type { PlanItem } from "@/lib/types/occurrence";
import { generateIcs } from "@/lib/plan/ics";

function planSummary(items: PlanItem[]): string {
  const lines = items.map((item) => `• ${item.title} (${item.resortName})`);
  return `Our After the Parks resort plan:\n\n${lines.join("\n")}`;
}

export async function sharePlanLink(
  url: string,
  items: PlanItem[]
): Promise<"shared" | "copied" | "failed"> {
  const title = "After the Parks — Resort Plan";
  const text = planSummary(items);

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return "failed";
      }
    }
  }

  const payload = `${text}\n\n${url}`;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(payload);
    return "copied";
  }

  return "failed";
}

export async function sharePlanCalendar(
  items: PlanItem[]
): Promise<"shared" | "downloaded" | "failed"> {
  const filename = "after-the-parks-plan.ics";
  const ics = generateIcs(items);
  const file = new File([ics], filename, {
    type: "text/calendar;charset=utf-8",
  });

  if (
    typeof navigator !== "undefined" &&
    navigator.share &&
    navigator.canShare?.({ files: [file] })
  ) {
    try {
      await navigator.share({
        title: "After the Parks Plan",
        text: "Add these resort activities to your calendar.",
        files: [file],
      });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return "failed";
      }
    }
  }

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}

export function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.share);
}
