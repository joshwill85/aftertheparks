import assert from "node:assert/strict";
import {
  buildActivityEventJsonLd,
  buildBreadcrumbJsonLd,
  buildGuideArticleJsonLd,
  buildFaqPageJsonLd,
  buildItemListJsonLd,
  buildOrganizationJsonLd,
  buildResortAccommodationJsonLd,
  buildWebsiteJsonLd,
} from "@/lib/seo/jsonLd";
import type { SeoFaqItem } from "@/lib/seo/faqs";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

const baseUrl = "https://aftertheparks.com";

const organization = buildOrganizationJsonLd(baseUrl);
assert.equal(organization["@type"], "Organization");
assert.equal(organization.name, "After the Parks");
assert.equal(organization.url, baseUrl);
assert.match(
  organization.description,
  /independent Walt Disney World resort activity planner/i,
  "organization schema should describe the site accurately"
);

const website = buildWebsiteJsonLd(baseUrl);
assert.equal(website["@type"], "WebSite");
assert.equal(website.url, baseUrl);
assert.equal(website.potentialAction["@type"], "SearchAction");
assert.equal(
  website.potentialAction.target,
  `${baseUrl}/search?q={search_term_string}`,
  "website schema should expose the public search route"
);

const breadcrumbs = buildBreadcrumbJsonLd(baseUrl, [
  { name: "Guides", path: "/guides" },
  { name: "Rainy Day Disney Resort Activities", path: "/guides/rainy-day-disney-resort-activities" },
]);
assert.equal(breadcrumbs["@type"], "BreadcrumbList");
assert.equal(breadcrumbs.itemListElement.length, 2);
assert.equal(breadcrumbs.itemListElement[1].position, 2);
assert.equal(
  breadcrumbs.itemListElement[1].item,
  `${baseUrl}/guides/rainy-day-disney-resort-activities`
);

const article = buildGuideArticleJsonLd(baseUrl, {
  slug: "rainy-day-disney-resort-activities",
  title: "Rainy Day Disney Resort Activities",
  description: "Indoor and covered Walt Disney World resort activity planning.",
  dateModified: "2026-06-27",
});
assert.equal(article["@type"], "Article");
assert.equal(article.headline, "Rainy Day Disney Resort Activities");
assert.equal(article.author.name, "After the Parks");
assert.equal(article.reviewedBy.name, "After the Parks");
assert.equal(article.publisher.name, "After the Parks");
assert.equal(article.mainEntityOfPage, `${baseUrl}/guides/rainy-day-disney-resort-activities`);
assert.equal(article.dateModified, "2026-06-27");

const itemList = buildItemListJsonLd(
  baseUrl,
  "Rainy day planning paths",
  [
    {
      name: "Indoor activities",
      path: "/activities?weather=indoor",
      description: "Current indoor activity filter",
    },
    { name: "Tonight", path: "/tonight", description: "Tonight's activities" },
  ],
  {
    dateModified: "2026-06-27",
    currentScheduleWindow: "June 27-July 4, 2026",
    sourceSummary: "Official Disney resort recreation sources checked first.",
  }
);
assert.equal(itemList["@type"], "ItemList");
assert.equal(itemList.name, "Rainy day planning paths");
assert.equal(itemList.dateModified, "2026-06-27");
assert.equal(itemList.temporalCoverage, "June 27-July 4, 2026");
assert.equal(itemList.description, "Official Disney resort recreation sources checked first.");
assert.equal(itemList.itemListElement.length, 2);
assert.equal(itemList.itemListElement[0].position, 1);
assert.equal(itemList.itemListElement[0].url, `${baseUrl}/activities?weather=indoor`);
assert.equal(itemList.itemListElement[0].description, "Current indoor activity filter");

const resortAccommodation = buildResortAccommodationJsonLd(baseUrl, {
  slug: "polynesian-village-resort",
  name: "Disney's Polynesian Village Resort",
  description:
    "Current After the Parks recreation calendar for Disney's Polynesian Village Resort.",
  dateModified: "2026-06-27T12:00:00-04:00",
  sourceUrl:
    "https://disneyworld.disney.go.com/resorts/polynesian-village-resort/recreation/",
});
assert.equal(resortAccommodation["@type"], "TouristAccommodation");
assert.equal(resortAccommodation.name, "Disney's Polynesian Village Resort");
assert.equal(resortAccommodation.url, `${baseUrl}/resorts/polynesian-village-resort`);
assert.equal(
  resortAccommodation.mainEntityOfPage,
  `${baseUrl}/resorts/polynesian-village-resort`
);
assert.equal(resortAccommodation.dateModified, "2026-06-27T12:00:00-04:00");
assert.equal(resortAccommodation.isPartOf.name, "Walt Disney World Resort");
assert.equal(
  resortAccommodation.subjectOf.url,
  "https://disneyworld.disney.go.com/resorts/polynesian-village-resort/recreation/"
);
assert.equal(
  "owner" in resortAccommodation,
  false,
  "resort entity schema must not imply After the Parks or Disney ownership"
);

const faqItems: SeoFaqItem[] = [
  {
    question: "Is Movies Under the Stars free?",
    answer:
      "Movies Under the Stars is currently tracked as free in After the Parks data, but guests should confirm current eligibility and access with the resort before planning around it.",
  },
  {
    question: "Can Movies Under the Stars be affected by weather?",
    answer:
      "Movies Under the Stars is outdoors and can be affected by rain, lightning, wind, or operations, so guests should confirm the current resort source before heading out.",
  },
];
const faqSchema = buildFaqPageJsonLd(baseUrl, "/activities/movies-under-the-stars", faqItems);
assert.equal(faqSchema["@type"], "FAQPage");
assert.equal(faqSchema.mainEntityOfPage, `${baseUrl}/activities/movies-under-the-stars`);
assert.equal(faqSchema.mainEntity.length, 2);
assert.equal(faqSchema.mainEntity[0]["@type"], "Question");
assert.equal(faqSchema.mainEntity[0].acceptedAnswer["@type"], "Answer");
assert.equal(faqSchema.mainEntity[0].name, faqItems[0].question);
assert.equal(faqSchema.mainEntity[0].acceptedAnswer.text, faqItems[0].answer);

const occurrence: ActivityOccurrence = {
  id: "poly-movie-2026-06-27",
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
  section: "Evening Entertainment",
  startDateTime: "2026-06-27T20:30:00-04:00",
  endDateTime: "2026-06-27T22:00:00-04:00",
  daypart: "evening",
  price: { state: "free" },
  location: { label: "Great Ceremonial House Lawn" },
  eligibility: { ages: ["all_ages"] },
  freshness: {
    lastVerified: "2026-06-27T12:00:00-04:00",
    sourceUrl: "https://disneyworld.disney.go.com/resorts/polynesian-village-resort/recreation/",
    badge: "verified",
  },
  status: "active",
};
const event = buildActivityEventJsonLd(baseUrl, occurrence);
assert.ok(event, "dated activity occurrence should produce Event schema");
const eventSchema = event as Record<string, any>;
assert.equal(eventSchema["@type"], "Event");
assert.equal(eventSchema.name, "Movies Under the Stars");
assert.equal(eventSchema.startDate, "2026-06-27T20:30:00-04:00");
assert.equal(eventSchema.endDate, "2026-06-27T22:00:00-04:00");
assert.equal(eventSchema.eventStatus, "https://schema.org/EventScheduled");
assert.equal(eventSchema.isAccessibleForFree, true);
assert.equal(eventSchema.url, `${baseUrl}/activities/movies-under-the-stars`);
assert.equal(eventSchema.location.name, "Great Ceremonial House Lawn");
assert.equal(eventSchema.location.containedInPlace.name, "Disney's Polynesian Village Resort");
assert.equal(eventSchema.organizer["@type"], "TouristAccommodation");
assert.equal(eventSchema.organizer.name, "Disney's Polynesian Village Resort");
assert.equal(eventSchema.offers.price, "0");
assert.equal(eventSchema.subjectOf.url, occurrence.freshness.sourceUrl);
assert.equal(eventSchema.subjectOf.dateModified, occurrence.freshness.lastVerified);
assert.equal(
  buildActivityEventJsonLd(baseUrl, { ...occurrence, startDateTime: undefined }),
  undefined,
  "undated activity occurrence must not produce Event schema"
);

console.log("SEO schema tests passed.");
