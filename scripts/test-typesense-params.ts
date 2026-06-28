import assert from "node:assert/strict";
import { SEARCH_COLLECTION_SCHEMA } from "@/lib/search/typesense/schema";
import {
  buildTypesenseFilter,
  buildTypesenseSearchParams,
  buildTypesenseSuggestParams,
} from "@/lib/search/typesense/searchParams";

const full = buildTypesenseSearchParams("horse", {});
assert.equal(full.sort_by, "_text_match:desc,titleSort:asc");
assert.equal(
  Object.prototype.hasOwnProperty.call(full, "query_by_weights"),
  false,
  "full search should not use query_by_weights"
);
assert.equal(full.text_match_type, "max_score");
assert.equal(full.prioritize_exact_match, true);
assert.equal(full.prioritize_num_matching_fields, true);

assert.equal(buildTypesenseSearchParams("ho", {}).num_typos, 0);
assert.equal(buildTypesenseSearchParams("hor", {}).num_typos, 0);
assert.equal(buildTypesenseSearchParams("horse", {}).num_typos, 2);
assert.equal(buildTypesenseSuggestParams("hors").num_typos, 1);
assert.equal(
  buildTypesenseSuggestParams("pool", {
    resort: "polynesian-village-resort",
    category: "poolside",
    free: true,
  }).filter_by,
  "resortSlug:=polynesian-village-resort && category:=poolside && priceState:=free",
  "suggest params should preserve filters for scoped autocomplete"
);

const sortableFields = SEARCH_COLLECTION_SCHEMA.fields.filter(
  (field) => "sort" in field && field.sort
);
assert.deepEqual(
  sortableFields.map((field) => field.name),
  ["titleSort"],
  "titleSort should be the only sortable custom string field"
);

assert.equal(buildTypesenseFilter({}), undefined);
assert.equal(buildTypesenseFilter({ free: true }), "priceState:=free");
assert.equal(
  buildTypesenseFilter({ reservation: true }),
  "reservationState:=[required,recommended]"
);
assert.equal(
  buildTypesenseFilter({
    resort: "polynesian-village-resort",
    category: "poolside",
    daypart: "evening",
    kind: "activity",
  }),
  "resortSlug:=polynesian-village-resort && category:=poolside && daypart:=evening && kind:=activity"
);

console.log("Typesense parameter tests passed.");
