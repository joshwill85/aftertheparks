import { CATEGORY_META } from "@/lib/categories/meta";
import { NEARBY_TIER_META } from "@/lib/magic/nearby";
import { NO_TICKET_COLLECTIONS } from "@/lib/magic/collections";
import { PLAN_SECTION_META } from "@/lib/plan/sections";
import fs from "node:fs";
import {
  BROWSE_DAY_TABS,
  ICON_REGISTRY,
  SEARCH_KIND_ICON_KEYS,
  type IconKey,
} from "@/components/icons/iconRegistry";

const EMOJI_OR_SYMBOL_RE = /[\p{Extended_Pictographic}\u2190-\u21ff\u2600-\u27bf]/u;

function assertIconKey(value: unknown, label: string): asserts value is IconKey {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string icon key`);
  }
  if (EMOJI_OR_SYMBOL_RE.test(value)) {
    throw new Error(`${label} still uses an emoji/symbol icon: ${value}`);
  }
  if (!(value in ICON_REGISTRY)) {
    throw new Error(`${label} has no registered Resort Glyph: ${value}`);
  }
}

for (const [category, meta] of Object.entries(CATEGORY_META)) {
  assertIconKey(meta.iconKey, `CATEGORY_META.${category}.iconKey`);
}

const previewRows = JSON.parse(
  fs.readFileSync("data/processed/activity_gold_v2_preview.json", "utf8")
) as { category?: string }[];
const previewCategories = new Set(
  previewRows
    .map((row) => row.category)
    .filter((category): category is string => Boolean(category))
);

for (const category of previewCategories) {
  if (!(category in CATEGORY_META)) {
    throw new Error(
      `Processed activity category has no CATEGORY_META entry: ${category}`
    );
  }
}

for (const [section, meta] of Object.entries(PLAN_SECTION_META)) {
  assertIconKey(meta.iconKey, `PLAN_SECTION_META.${section}.iconKey`);
}

for (const collection of NO_TICKET_COLLECTIONS) {
  assertIconKey(collection.iconKey, `NO_TICKET_COLLECTIONS.${collection.id}.iconKey`);
}

for (const [tier, meta] of Object.entries(NEARBY_TIER_META)) {
  assertIconKey(meta.iconKey, `NEARBY_TIER_META.${tier}.iconKey`);
}

for (const tab of BROWSE_DAY_TABS) {
  assertIconKey(tab.iconKey, `BROWSE_DAY_TABS.${tab.href}.iconKey`);
}

for (const [kind, iconKey] of Object.entries(SEARCH_KIND_ICON_KEYS)) {
  assertIconKey(iconKey, `SEARCH_KIND_ICON_KEYS.${kind}`);
}

console.log("Icon registry coverage passed.");
