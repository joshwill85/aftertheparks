import assert from "node:assert/strict";
import {
  buildNoTicketFriendlyResortStats,
  filterResortsForSeoIntent,
} from "@/lib/resorts/seoFilters";
import type { ActivityOccurrence, ResortSummary } from "@/lib/types/occurrence";

const resorts: ResortSummary[] = [
  {
    id: "poly",
    slug: "poly",
    name: "Polynesian Village",
    category: "deluxe",
    area: "magic_kingdom",
    disneyUrl: "https://example.com/poly",
    activityCount: 2,
    offeringCount: 1,
  },
  {
    id: "akl",
    slug: "akl",
    name: "Animal Kingdom Lodge",
    category: "deluxe",
    area: "animal_kingdom",
    disneyUrl: "https://example.com/akl",
    activityCount: 1,
    offeringCount: 0,
  },
];

const baseActivity = {
  id: "base",
  activitySlug: "base",
  activityCatalogId: "base",
  title: "Base",
  summary: "",
  category: "arcades",
  section: "Resort Activities",
  daypart: "afternoon",
  price: { state: "free" },
  location: { label: "Lobby" },
  eligibility: { ages: ["all_ages"] },
  freshness: { lastVerified: "2026-06-27", sourceUrl: "https://example.com", badge: "verified" },
  status: "active",
} satisfies Partial<ActivityOccurrence>;

const activities = [
  {
    ...baseActivity,
    id: "poly-arcade",
    title: "Lobby Arcade",
    resort: { slug: "poly", name: "Polynesian Village", tier: "deluxe", area: "magic_kingdom" },
  },
  {
    ...baseActivity,
    id: "akl-park-party",
    title: "Park Fireworks Dessert Party",
    summary: "Requires valid theme park admission.",
    category: "fireworks",
    price: { state: "fee" },
    resort: { slug: "akl", name: "Animal Kingdom Lodge", tier: "deluxe", area: "animal_kingdom" },
    location: { label: "Inside Animal Kingdom Park" },
  },
] as ActivityOccurrence[];

const stats = buildNoTicketFriendlyResortStats(activities);
assert.equal(stats.get("poly"), 1, "Poly should have one no-ticket-friendly activity");
assert.equal(stats.has("akl"), false, "Ticket-required park activity should not qualify resort");

const filtered = filterResortsForSeoIntent(resorts, {
  noTicketFriendly: true,
  noTicketCounts: stats,
});
assert.deepEqual(
  filtered.map((resort) => resort.slug),
  ["poly"],
  "no_ticket_friendly resort filter should keep only resorts with current no-ticket options"
);

const all = filterResortsForSeoIntent(resorts, {
  noTicketFriendly: false,
  noTicketCounts: stats,
});
assert.deepEqual(
  all.map((resort) => resort.slug),
  ["akl", "poly"],
  "default resort directory should keep the full alphabetical resort list"
);

console.log("Resort SEO filter tests passed.");
