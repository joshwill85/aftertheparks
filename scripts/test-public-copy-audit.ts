import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDisplaySummary } from "@/lib/activityDisplay";

const root = process.cwd();

const publicCopyFiles = [
  "app/activities/page.tsx",
  "app/corrections/CorrectionsClient.tsx",
  "app/page.tsx",
  "app/plan/page.tsx",
  "app/privacy/page.tsx",
  "app/resorts/page.tsx",
  "app/search/page.tsx",
  "app/source-and-accuracy-policy/page.tsx",
  "app/terms/page.tsx",
  "app/tonight/page.tsx",
  "app/disney-world-resort-activity-calendars/page.tsx",
  "app/disney-world-resort-activity-calendars/[season]/page.tsx",
  "app/guides/page.tsx",
  "app/guides/[slug]/page.tsx",
  "app/resorts/[slug]/page.tsx",
  "app/sitemap.ts",
  "app/today/page.tsx",
  "app/weather/page.tsx",
  "app/activities/[slug]/page.tsx",
  "components/atlas/ActivityDetailClient.tsx",
  "components/atlas/SearchClient.tsx",
  "components/events/EventCard.tsx",
  "components/home/HomeHero.tsx",
  "components/home/QuickFinder.tsx",
  "components/home/RestDayBuilder.tsx",
  "components/explore/ExploreLayout.tsx",
  "components/explore/FilterRail.tsx",
  "components/layout/SiteFooter.tsx",
  "components/layout/SiteHeader.tsx",
  "components/magic/NoTicketMagic.tsx",
  "components/plan/PlanEmptyState.tsx",
  "components/planning/TrustInline.tsx",
  "components/resort/ResortActivityConstellation.tsx",
  "components/resort/ResortCard.tsx",
  "components/weather/EventWeatherSignal.tsx",
  "components/weather/WeatherIconButton.tsx",
  "components/weather/WeatherStatusStrip.tsx",
  "lib/planning/activityFacts.ts",
  "lib/planning/decisionSummary.ts",
  "lib/planning/presetDefinitions.ts",
  "lib/seo/comparisonPages.ts",
  "lib/seo/faqs.ts",
  "lib/seo/llms.ts",
  "lib/seo/seasonalCalendarPages.ts",
  "lib/seo/transportation.ts",
  "lib/weather/guidance.ts",
];

const bannedPublicPhrases = [
  "Research dossier",
  "Official-source facts",
  "After the Parks data facts",
  "Community sentiment use",
  "Competitor gap analysis",
  "Bad-fit exclusions",
  "Deep-link plan",
  "Anti-thin-content checks",
  "Kill rule",
  "Would this page still help if search engines sent zero traffic",
  "This guide should not dead-end as an article",
  "Use live resort and activity data to evaluate this part of the plan before committing time, transportation, or money",
  "Ask like a concierge",
  "Pocket map companion",
  "starlight wins",
  "Your rest day is waiting",
  "Browse tonight",
  "Weather that helps you choose your window",
  "Shape of the day",
  "Microclimates",
  "The property is not always one forecast",
  "Forecast chapters",
  "The detailed read",
  "Plan this one",
  "Source status",
  "More at ",
  "Good schedule depth",
  "Easy wins",
  "Worth lingering",
  "Resort-day ready",
  "Campfire energy",
  "Source-backed planning links",
  "Source-backed",
  "source-backed",
  "Current matching rows",
  "Ranked resorts 0",
  "Crawlable summaries",
  "Activity Constellation",
  "Planning posture",
  "planning posture",
  "Outdoor window",
  "Research-gated guide cluster",
  "Guide standard",
  "Source standard",
  "Transportation standard",
  "Category 1",
  "Booking Required Source-backed reservation requirement is present",
  "No resorts have enough current source-backed data",
  "currently uses {activities.length} matching rows",
  "Do not use Disney Springs as a free way to get to Disney resort hotels",
  "Do not use Disney Springs as a free way to reach resort hotels",
  "Do not use Disney Springs as a free way to get to Disney resort hotels",
  "Good to go",
];

for (const file of publicCopyFiles) {
  const body = readFileSync(join(root, file), "utf8");
  for (const phrase of bannedPublicPhrases) {
    assert.equal(
      body.includes(phrase),
      false,
      `${file} should not expose public audit phrase: ${phrase}`
    );
  }
}

const requiredPublicPhrasesByFile: Record<string, string[]> = {
  "components/home/HomeHero.tsx": [
    "Disney resort activities, today and tonight",
    "Find something fun to do outside the parks.",
    "Search current Disney resort movies, campfires, crafts, pool games, fitness, and free activities",
  ],
  "components/home/QuickFinder.tsx": [
    "Find activities",
    "See tonight's movies and campfires",
  ],
  "app/page.tsx": [
    "How current is this?",
    "Schedules can change, so confirm with the resort before you go.",
    "Quick evening options with current times, locations, and weather notes.",
    "Current resort activities",
    "Free and low-cost activities from Disney resort calendars.",
    "Choose your resort",
    "See today's schedule, tonight's options, free activities, and source freshness for the resort where you are staying.",
  ],
  "components/home/RestDayBuilder.tsx": [
    "Build an easy resort day",
    "Pick your resort, your group, and your pace. Then choose a few activities you can actually fit into the day.",
  ],
  "components/magic/NoTicketMagic.tsx": [
    "No park ticket needed",
    "Find Disney-feeling activities and resort ideas that do not require entering a theme park. Confirm resort access before you go.",
  ],
  "app/today/page.tsx": [
    "Today at Disney World Resorts",
    "Activities still available today, sorted by start time.",
  ],
  "app/tonight/page.tsx": [
    "Tonight at Disney World Resorts",
    "Low-effort movies, campfires, games, and activities after the parks.",
  ],
  "app/activities/page.tsx": [
    "Browse current Disney resort activities by resort, time, category, cost, and weather fit.",
  ],
  "app/weather/page.tsx": [
    "Is it a good time for resort activities?",
    "Check rain, heat, and storm risk by resort area before you head out.",
    "Today's weather pattern",
    "Weather by resort area",
    "Weather can differ across Disney World.",
    "Area-by-area forecast",
    "Outdoor plans right now",
  ],
  "app/plan/page.tsx": [
    "Save activities and build one easy resort-day plan.",
    "Add your resort and trip dates. Then save movies, campfires, crafts, meals, pool breaks, and backups in one place.",
  ],
  "components/atlas/PlanPageClient.tsx": [
    "Add an activity",
  ],
  "components/plan/PlanEmptyState.tsx": [
    "No saved activities yet.",
    "Start with tonight's options, all activities, or your resort page.",
    "See tonight",
    "Browse activities",
    "Choose my resort",
  ],
  "components/atlas/SearchClient.tsx": [
    "What are you looking for?",
    "campfire tonight, Polynesian movie, pool games, arcade, rainy day, free activities",
    "Try a resort, activity type, movie title, category, or time of day.",
    "Search by what you need",
  ],
  "app/search/page.tsx": [
    "Search After the Parks",
    "Search activities, resorts, movies, guides, and categories.",
  ],
  "app/about/content.ts": [
    "I built After the Parks to make Disney resort days easier.",
    "After the Parks turns scattered Disney resort calendars into a simple way to find what is happening today, tonight, and during your stay.",
  ],
  "components/explore/FilterRail.tsx": [
    "Helpful filters",
    "Cost",
    "Weather",
    "Getting there",
    "Category",
  ],
  "components/events/EventCard.tsx": [
    "Outdoor plans OK",
  ],
  "components/atlas/ActivityDetailClient.tsx": [
    "Add this to your plan",
    "Source",
    "See more at",
  ],
  "components/resort/ResortCard.tsx": [
    "Many current listings",
    "Good for quick plans",
    "Good for a resort day",
    "Strong no-park-day option",
    "Campfire-friendly",
    "Best for:",
  ],
  "app/resorts/page.tsx": [
    "Disney World Resort Activity Calendars",
    "Choose your resort to see today's activities, tonight's options, free activities, weather notes, and source freshness.",
  ],
  "app/source-and-accuracy-policy/page.tsx": [
    "How we check resort activity listings and show what might change.",
    "We use official Disney resort recreation calendars and official Disney web pages when available.",
    "A verified listing means we found the activity in an official source or a directly reviewable source record.",
    "Disney Springs transportation note",
    "See something wrong?",
    "If a listing looks stale, incomplete, or confusing, send a correction.",
  ],
  "app/corrections/CorrectionsClient.tsx": [
    "Send a correction or note",
    "See outdated, missing, or confusing activity info? Send it here. We read every message.",
    "Include the resort, activity name, date, time, and what looks wrong.",
    "Send correction",
    "We may not be able to reply to every message, but corrections help keep the site useful.",
  ],
  "app/privacy/page.tsx": [
    "What we collect, why we collect it, and how we use it.",
    "We may store a protected version of your email instead of the email itself when the feature supports it.",
  ],
  "app/terms/page.tsx": [
    "After the Parks is independent and not affiliated with Disney.",
    "Activity times, prices, access, transportation, and availability can change.",
  ],
  "components/layout/SiteHeader.tsx": [
    "Today",
    "Tonight",
    "Activities",
    "Resorts",
    "Guides",
    "Weather",
    "Calendar",
    "My Plan",
    "Search",
  ],
  "components/layout/SiteFooter.tsx": [
    "Calendar",
    "Independent planning guide. Not affiliated with Disney. Confirm schedules, access, transportation, and pricing with the official source before you go.",
  ],
};

for (const [file, phrases] of Object.entries(requiredPublicPhrasesByFile)) {
  const body = readFileSync(join(root, file), "utf8");
  for (const phrase of phrases) {
    assert.equal(
      body.includes(phrase),
      true,
      `${file} should include required public copy: ${phrase}`
    );
  }
}

const dataQualityFiles = [
  "data/processed/activity_gold_v2_preview.json",
  "data/processed/activities_ingest.json",
  "data/processed/fort_wilderness_visual_sources.json",
  "scripts/ingest/fort_wilderness_visual_sources.py",
  "supabase/migrations/20260620210000_create_resort_activities.sql",
  "supabase/migrations/20260620220100_bootstrap_activity_editions.sql",
];

const brokenDataPhrases = [
  "Where:S$",
  "complimentary kits available for purchase. marshmallows",
  "ages I2",
  "Each Friday morning at 10:30 AM; arrive by 10:15 AM",
  "Booking Required Source-backed reservation requirement is present",
  "Paid$49",
  "Paid$90-$99",
];

for (const file of dataQualityFiles) {
  const body = readFileSync(join(root, file), "utf8");
  for (const phrase of brokenDataPhrases) {
    assert.equal(
      body.includes(phrase),
      false,
      `${file} should not contain broken audit data phrase: ${phrase}`
    );
  }
}

assert.equal(
  getDisplaySummary({
    category: "campfire",
    description:
      "Enjoy the warm glow of the campfire with complimentary kits available for purchase. marshmallows.",
  }),
  "Campfire is free. S'mores kits may be available for purchase."
);

assert.equal(
  getDisplaySummary({
    category: "arts_crafts",
    description: "This experience is recommended for Guests ages I2 and up.",
  }),
  "This experience is recommended for Guests ages 12 and up."
);

console.log("Public copy audit passed.");
