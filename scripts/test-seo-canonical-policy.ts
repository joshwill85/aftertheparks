import assert from "node:assert/strict";
import {
  canonicalPolicyForParams,
  strategicFilterKeyForParams,
} from "@/lib/seo/canonicalPolicy";

assert.equal(
  strategicFilterKeyForParams({ free: "true" }),
  "free=true",
  "single-value filters should produce stable strategic keys"
);
assert.equal(
  strategicFilterKeyForParams({ free: "true", resort: "polynesian-village-resort" }),
  undefined,
  "multi-filter combinations should not be strategic canonical keys"
);

assert.deepEqual(
  canonicalPolicyForParams("/activities", { free: "true" }),
  {
    canonical: "/activities?free=true",
    index: true,
    strategicFilterKey: "free=true",
  },
  "approved activity filters should be self-canonical and indexable"
);
assert.deepEqual(
  canonicalPolicyForParams("/activities", { q: "pool", resort: "polynesian-village-resort" }),
  {
    canonical: "/activities",
    index: false,
    strategicFilterKey: undefined,
  },
  "non-strategic activity filters should canonicalize to the parent and noindex"
);
assert.deepEqual(
  canonicalPolicyForParams("/today", { weather: "indoor" }),
  {
    canonical: "/today?weather=indoor",
    index: true,
    strategicFilterKey: "weather=indoor",
  },
  "approved today filters should be indexable"
);
assert.deepEqual(
  canonicalPolicyForParams("/tonight", { near: "my-resort" }),
  {
    canonical: "/tonight",
    index: false,
    strategicFilterKey: undefined,
  },
  "bare near-my-resort filters should not become indexable canonical pages"
);
assert.deepEqual(
  canonicalPolicyForParams("/resorts", { no_ticket_friendly: "true" }),
  {
    canonical: "/resorts?no_ticket_friendly=true",
    index: true,
    strategicFilterKey: "no_ticket_friendly=true",
  },
  "approved no-ticket-friendly resort view should be indexable"
);

console.log("SEO canonical policy tests passed.");
