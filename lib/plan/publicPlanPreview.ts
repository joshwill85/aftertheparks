import type { PublicPlanResponse } from "@/lib/plan/types";

export const PUBLIC_PLAN_PREVIEW_TOKEN = "local-preview-resort-day-ticket";

const PUBLIC_PLAN_PREVIEW: PublicPlanResponse = {
  title: "BoardWalk Arrival Night",
  timezone: "America/New_York",
  lastUpdatedAt: "2026-06-30T18:00:00.000Z",
  ownerSession: false,
  homeResortSlug: "boardwalk-inn",
  tripStartDate: "2026-07-04",
  tripEndDate: "2026-07-04",
  dates: [
    {
      date: "2026-07-04",
      items: [
        {
          title: "Poolside Activities",
          resortSlug: "boardwalk-inn",
          resortName: "Disney's BoardWalk Inn",
          location: "Luna Park Pool",
          startsAt: "2026-07-04T16:00:00-04:00",
          endsAt: "2026-07-04T17:00:00-04:00",
          category: "poolside",
          priceLabel: "Free",
          sourceVerifiedAt: "2026-06-29T00:00:00.000Z",
          sourceStatus: "current",
        },
        {
          title: "Campfire",
          resortSlug: "beach-club-resort",
          resortName: "Disney's Beach Club Resort",
          location: "Beach Club beach",
          startsAt: "2026-07-04T18:00:00-04:00",
          endsAt: "2026-07-04T18:30:00-04:00",
          category: "campfire",
          priceLabel: "Free",
          sourceVerifiedAt: "2026-06-29T00:00:00.000Z",
          sourceStatus: "current",
        },
        {
          title: "Movie Under the Stars",
          resortSlug: "yacht-club-resort",
          resortName: "Disney's Yacht Club Resort",
          location: "Outdoor movie lawn",
          startsAt: "2026-07-04T20:30:00-04:00",
          endsAt: "2026-07-04T22:00:00-04:00",
          category: "movies_under_stars",
          priceLabel: "Free",
          sourceVerifiedAt: "2026-06-29T00:00:00.000Z",
          sourceStatus: "changed",
        },
      ],
    },
  ],
};

export function getPublicPlanPreview(token: string): PublicPlanResponse | null {
  if (process.env.NODE_ENV === "production") return null;
  if (token !== PUBLIC_PLAN_PREVIEW_TOKEN) return null;
  return PUBLIC_PLAN_PREVIEW;
}
