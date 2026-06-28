import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildActivityFaqItems,
  buildResortFaqItems,
  validateSeoFaqItems,
} from "@/lib/seo/faqs";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

const sampleActivity: ActivityOccurrence = {
  id: "sample-activity",
  activitySlug: "movies-under-the-stars",
  activityCatalogId: "movies",
  resort: {
    slug: "polynesian-village-resort",
    name: "Disney's Polynesian Village Resort",
    tier: "Deluxe",
    area: "magic_kingdom",
  },
  title: "Movies Under the Stars",
  summary: "Outdoor movie night at the resort.",
  category: "movies_under_stars",
  section: "Evening",
  daypart: "evening",
  price: { state: "free" },
  location: { label: "Great Ceremonial House lawn" },
  eligibility: { ages: ["all_ages"], reservation: { required: false } },
  freshness: {
    lastVerified: "2026-06-27",
    sourceUrl: "https://disneyworld.disney.go.com/",
    badge: "verified",
  },
  enrichment: {
    reservationRequired: false,
    weatherDependency: "Outdoor and weather dependent.",
    resortGuestOnly: false,
  },
  validFrom: "2026-06-01",
  validUntil: "2026-06-30",
  status: "active",
};

const activityFaqs = buildActivityFaqItems(sampleActivity, 3);
assert.ok(activityFaqs.length >= 4, "activity pages should get useful FAQ items");
assert.deepEqual(validateSeoFaqItems(activityFaqs), []);
assert.match(
  activityFaqs.map((item) => `${item.question} ${item.answer}`).join(" "),
  /free|cost/i,
  "activity FAQ should answer cost intent"
);
assert.match(
  activityFaqs.map((item) => `${item.question} ${item.answer}`).join(" "),
  /confirm|official|source/i,
  "activity FAQ should preserve source/freshness caveats"
);
assert.match(
  activityFaqs.map((item) => `${item.question} ${item.answer}`).join(" "),
  /weather|outdoor/i,
  "activity FAQ should include weather caveats when available"
);

const resortFaqs = buildResortFaqItems(
  {
    id: "poly",
    slug: "polynesian-village-resort",
    name: "Disney's Polynesian Village Resort",
    category: "deluxe",
    area: "magic_kingdom",
    disneyUrl: "https://disneyworld.disney.go.com/",
    activityCount: 12,
    offeringCount: 4,
  },
  {
    scheduledCount: 12,
    offeringCount: 4,
    todayCount: 3,
    tonightCount: 2,
    sourceCount: 5,
  }
);
assert.ok(resortFaqs.length >= 4, "resort pages should get useful FAQ items");
assert.deepEqual(validateSeoFaqItems(resortFaqs), []);
assert.match(
  resortFaqs.map((item) => `${item.question} ${item.answer}`).join(" "),
  /today|tonight/i,
  "resort FAQ should route users into current today/tonight views"
);
assert.match(
  resortFaqs.map((item) => `${item.question} ${item.answer}`).join(" "),
  /Do not use Disney Springs as a free way/i,
  "resort FAQ should warn against Disney Springs as a free transfer route"
);
assert.match(
  resortFaqs.map((item) => `${item.question} ${item.answer}`).join(" "),
  /resort stay|dining\/experience reservation|confirmed/i,
  "resort FAQ should advise a resort stay or confirmed dining/experience reservation"
);

for (const [file, label] of [
  ["components/atlas/ActivityDetailClient.tsx", "activity detail client"],
  ["app/activities/[slug]/page.tsx", "activity fallback page"],
  ["app/resorts/[slug]/page.tsx", "resort detail page"],
] as const) {
  const source = readFileSync(file, "utf8");
  assert.match(source, /SeoFaq/, `${label} should render visible SEO FAQ content`);
  assert.match(source, /Common questions|title="FAQ"/, `${label} should label the FAQ module`);
}

for (const file of ["app/activities/[slug]/page.tsx", "app/resorts/[slug]/page.tsx"]) {
  const source = readFileSync(file, "utf8");
  assert.match(
    source,
    /buildFaqPageJsonLd/,
    `${file} should emit FAQ schema from the same visible FAQ items`
  );
}

console.log("SEO FAQ content tests passed.");
