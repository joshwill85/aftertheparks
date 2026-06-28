# Search Experience Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build fast, predictive, typo-tolerant global search across resorts, locations, scheduled activities, official offerings, movies, guides, categories, pages, prices, reservations, dayparts, and user-language concepts such as "horse", "free", "schedule", and resort nicknames.

**Architecture:** Keep the existing `/api/search` and `/search` product boundary, but replace the handmade substring scorer with normalized `SearchDocument` records indexed into one self-hosted Typesense collection. Typesense owns text relevance with `_text_match`; tied or similarly relevant results sort alphabetically with `titleSort`.

**Tech Stack:** Next.js 15, TypeScript, existing app data loaders, self-hosted Typesense 30.2, `typesense` Node client, Docker for local search, deterministic golden relevance tests in `tsx`, existing CSS/components.

---

## Product Rule

Search results are globally ranked by relevance. When results have the same Typesense text relevance, they are ordered alphabetically by `titleSort`. Filters narrow results. Document aliases make Disney-specific concepts searchable. We do not manually weight individual activities unless golden relevance tests prove the documents themselves are insufficient.

Use this for full search:

```ts
sort_by: "_text_match:desc,titleSort:asc"
```

Optional later, only if broad searches feel too score-noisy:

```ts
sort_by: "_text_match(buckets: 10):desc,titleSort:asc"
```

Do not start with buckets. Start with the stricter and simpler `_text_match:desc,titleSort:asc`.

## External Research

- Typesense exposes `_text_match` as the text relevance score and allows additional indexed fields, including string fields, to break ties. Its text scoring considers token overlap, typo/edit distance, proximity, `query_by` field order, and optional field weights.
- Typesense prioritizes exact field-value matches by default, supports prefix search, typo tolerance, filters, facets, highlighted matches, and string sorting when a string field is declared with `sort: true`.
- Typesense can run as a self-hosted service and keeps its index in memory while storing data on disk, so the search schema should stay compact. Only `titleSort` should be sortable for this feature.
- Bulk sync with a versioned collection and an alias avoids downtime during re-indexing. Do not write to Typesense on each user query.

Sources:

- [Typesense Ranking and Relevance](https://typesense.org/docs/guide/ranking-and-relevance.html)
- [Typesense Search API 30.2](https://typesense.org/docs/30.2/api/search.html)
- [Typesense Running in Production](https://typesense.org/docs/guide/running-in-production.html)
- [Typesense Syncing Data](https://typesense.org/docs/guide/syncing-data-into-typesense.html)

## Current State

Existing search files:

- `app/api/search/route.ts` exposes `q`, `resort`, `category`, `daypart`, `free`, and `reservation`.
- `lib/search/runSearch.ts` loads activities, official offerings, resorts, movies, guides, categories, and pages, then scores each category with custom functions.
- `lib/search/score.ts` uses exact, prefix, contains, and token hits, plus a few domain boosts.
- `lib/search/normalize.ts` normalizes and expands tokens.
- `lib/search/synonyms.ts` contains early query aliases and page hits.
- `components/atlas/SearchClient.tsx` already debounces after 2 characters and renders preview hits.
- `components/search/SearchHitRow.tsx` renders result rows.

Keep:

- The current API response shape during migration.
- Existing data loaders and public sanitization rules.
- Category/page/guide/movie/resort/activity/offering coverage.

Replace:

- Custom scoring formulas.
- Separate per-family ranking.
- Manual boosts such as `businessBoost`, `popularityScore`, and quality ranking.
- Hard grouping as the primary full-search result layout.

## Product Requirements

- Minimum character behavior:
  - `0-1` characters: do not call Typesense; show hardcoded popular suggestions and planning shortcuts.
  - `2-3` characters: use prefix search only; typo tolerance off.
  - `4+` characters: use prefix search with typo tolerance.
- Search must understand:
  - resort names, nicknames, abbreviations, areas, and tiers;
  - activity names, descriptions, locations, schedules, and dayparts;
  - official offerings not currently represented as dated activities;
  - movie titles, movie nights, locations, and tonight status;
  - guides, pages, and categories;
  - price and booking intent: "free", "included", "complimentary", "reservation", "walk up";
  - activity-language aliases: "horse" should find horse trail rides, pony rides, carriage rides, wagon rides, sleigh rides, and Tri-Circle-D Ranch where relevant;
  - typos such as `polynesain`, `carage`, `hores`, `schedle`, and `contemparary`.
- Full search results should be one global relevance-ranked list with kind badges.
- Autocomplete may be visually grouped because it is a suggestion surface, not the canonical result ordering.
- Search should feel instant:
  - autocomplete visible within 150 ms p95 after debounce on a normal connection;
  - submitted search API within 300 ms p95 excluding cold starts;
  - no layout shift while preview results update.

## Target File Structure

Create:

- `lib/search/schema.ts` - shared `SearchDocument`, `SearchFacet`, `SearchSuggestion`, provider request, and provider response types.
- `lib/search/documents.ts` - builds normalized `SearchDocument[]` from activities, offerings, resorts, movies, guides, categories, and pages.
- `lib/search/domainAliases.ts` - document-build aliases for horse, price, schedule, activities, and resort nicknames.
- `lib/search/providers/types.ts` - provider interface used by `runSearch`.
- `lib/search/typesense/client.ts` - Typesense client construction and env validation.
- `lib/search/typesense/schema.ts` - collection schema for `search_documents_v1`.
- `lib/search/typesense/searchParams.ts` - query, suggest, filter, and facet parameter builders.
- `lib/search/providers/typesense.ts` - provider adapter that calls Typesense and maps hits into app search hits.
- `app/api/search/suggest/route.ts` - autocomplete endpoint.
- `scripts/sync-typesense-index.ts` - builds and bulk-imports search documents into a versioned Typesense collection.
- `scripts/test-search-documents.ts` - document schema and alias tests.
- `scripts/test-search-relevance.ts` - golden query regression tests.
- `docs/search-operations.md` - local/prod Typesense, sync, and relevance review runbook.

Modify:

- `lib/search/runSearch.ts` - route search through the Typesense provider and hydrate existing response shapes.
- `lib/search/types.ts` - add suggestions, facets, highlights, and correction metadata.
- `lib/search/synonyms.ts` - preserve `PAGE_HITS`; move domain alias ownership to `domainAliases.ts`.
- `app/api/search/route.ts` - return facets, suggested queries, and globally sorted hits while preserving legacy arrays.
- `components/atlas/SearchClient.tsx` - call `/api/search/suggest`, render grouped autocomplete, keyboard navigation, highlighted matches, corrections, and filters.
- `components/search/SearchHitRow.tsx` - support highlights and kind badges in a global list.
- `src/styles/polish.css` - style the upgraded combobox and global result list.
- `package.json` - add Typesense dependency and scripts.

## Search Document Schema

Every searchable item becomes one flat document in a single collection:

```ts
export type SearchDocumentKind =
  | "activity"
  | "offering"
  | "resort"
  | "movie"
  | "guide"
  | "category"
  | "page";

export interface SearchDocument {
  id: string;
  objectID: string;
  kind: SearchDocumentKind;

  title: string;
  titleSort: string;
  subtitle?: string;
  description?: string;
  href: string;

  aliases: string[];
  keywords: string[];

  resortSlug?: string;
  resortName?: string;
  resortArea?: string;
  resortTier?: string;

  category?: string;
  categoryLabel?: string;
  locationLabel?: string;
  daypart?: string;
  scheduleText?: string;

  priceState?: "free" | "fee" | "unknown";
  reservationState?: "required" | "recommended" | "not_required" | "unknown";

  isHappeningNow?: boolean;
  isTonight?: boolean;

  sourceId: string;
}
```

Do not add these fields in the first pass:

```ts
businessBoost;
popularityScore;
qualityTier;
freshnessBadge;
```

Those are ranking knobs. Add them only if golden tests and real query data prove Typesense relevance plus aliases is insufficient.

## Typesense Collection

Create `lib/search/typesense/schema.ts`:

```ts
export const SEARCH_COLLECTION_ALIAS = "search_documents";
export const SEARCH_COLLECTION_VERSION = "search_documents_v1";

export const SEARCH_COLLECTION_SCHEMA = {
  name: SEARCH_COLLECTION_VERSION,
  fields: [
    { name: "id", type: "string" },
    { name: "kind", type: "string", facet: true },

    { name: "title", type: "string" },
    { name: "titleSort", type: "string", sort: true },

    { name: "subtitle", type: "string", optional: true },
    { name: "description", type: "string", optional: true },

    { name: "aliases", type: "string[]", optional: true },
    { name: "keywords", type: "string[]", optional: true },

    { name: "resortSlug", type: "string", facet: true, optional: true },
    { name: "resortName", type: "string", facet: true, optional: true },
    { name: "resortArea", type: "string", facet: true, optional: true },
    { name: "resortTier", type: "string", facet: true, optional: true },

    { name: "category", type: "string", facet: true, optional: true },
    { name: "categoryLabel", type: "string", facet: true, optional: true },
    { name: "locationLabel", type: "string", optional: true },
    { name: "daypart", type: "string", facet: true, optional: true },
    { name: "scheduleText", type: "string", optional: true },

    { name: "priceState", type: "string", facet: true, optional: true },
    { name: "reservationState", type: "string", facet: true, optional: true },

    { name: "isHappeningNow", type: "bool", facet: true, optional: true },
    { name: "isTonight", type: "bool", facet: true, optional: true },

    { name: "href", type: "string", index: false },
    { name: "sourceId", type: "string", index: false },
  ],
};
```

Use one collection named by alias:

```txt
search_documents -> search_documents_v1
```

Do not split activities, resorts, movies, guides, pages, and offerings into separate indexes. A single collection gives true global ranking and avoids manual merge/re-rank logic.

## Typesense Query Parameters

Create `lib/search/typesense/searchParams.ts`.

Full search:

```ts
export function buildTypesenseSearchParams(query: string, filters: SearchFilters) {
  return {
    q: query,
    query_by: [
      "title",
      "aliases",
      "categoryLabel",
      "resortName",
      "locationLabel",
      "keywords",
      "description",
      "scheduleText",
    ].join(","),
    text_match_type: "max_score",
    sort_by: "_text_match:desc,titleSort:asc",
    prioritize_exact_match: true,
    prioritize_num_matching_fields: true,
    prefix: query.length <= 24,
    num_typos: query.length >= 4 ? 2 : 0,
    min_len_1typo: 4,
    min_len_2typo: 7,
    facet_by: [
      "kind",
      "resortSlug",
      "resortName",
      "category",
      "categoryLabel",
      "priceState",
      "reservationState",
      "daypart",
    ].join(","),
    filter_by: buildTypesenseFilter(filters),
    per_page: 50,
    highlight_fields: "title,aliases,categoryLabel,resortName,locationLabel,description",
  };
}
```

Autocomplete:

```ts
export function buildTypesenseSuggestParams(query: string) {
  return {
    q: query,
    query_by: "title,aliases,resortName,categoryLabel,keywords",
    text_match_type: "max_score",
    sort_by: "_text_match:desc,titleSort:asc",
    prefix: true,
    num_typos: query.length >= 4 ? 1 : 0,
    min_len_1typo: 4,
    min_len_2typo: 7,
    per_page: 8,
    highlight_fields: "title,aliases,resortName,categoryLabel",
  };
}
```

Intentionally omitted:

- `query_by_weights`
- `businessBoost`
- `popularityScore`
- hand-built ranking formulas
- complex intent-based boosts

Field order in `query_by` is the only initial relevance hint beyond Typesense's own scoring.

## Domain Aliases

Create `lib/search/domainAliases.ts`, but keep it boring. Use aliases mostly at document-build time.

```ts
export const DOMAIN_ALIASES = {
  horse: [
    "horse",
    "horses",
    "pony",
    "ponies",
    "carriage",
    "carriage rides",
    "wagon",
    "wagon rides",
    "sleigh",
    "sleigh rides",
    "ranch",
    "trail ride",
    "horse trail ride",
    "horseback riding",
    "tri circle d",
  ],
  free: ["free", "included", "complimentary", "no cost"],
  schedule: ["schedule", "time", "times", "calendar", "today", "tonight", "now"],
  activities: {
    pool: ["pool", "pool games", "swim", "swimming"],
    campfire: ["campfire", "campfires", "marshmallow", "smores", "s'mores"],
    crafts: ["craft", "crafts", "painting", "coloring", "art"],
    movies: ["movie", "movies", "film", "cinema", "under the stars"],
    arcade: ["arcade", "games", "game room"],
    fitness: ["fitness", "yoga", "wellness", "run", "jogging"],
  },
  resorts: {
    poly: "Disney's Polynesian Village Resort",
    pofq: "Disney's Port Orleans Resort - French Quarter",
    por: "Disney's Port Orleans Resort - Riverside",
    gf: "Disney's Grand Floridian Resort & Spa",
    akl: "Disney's Animal Kingdom Lodge",
    okw: "Disney's Old Key West Resort",
    fw: "Disney's Fort Wilderness Resort",
  },
} as const;
```

Use Typesense synonyms only for true equivalences that should work everywhere:

- `poly` <-> `polynesian`
- `pofq` -> `port orleans french quarter`
- `por` -> `port orleans riverside`
- `gf` -> `grand floridian`
- `akl` -> `animal kingdom lodge`
- `okw` -> `old key west`

For broader concepts like `horse`, prefer document aliases instead of global synonyms. That gives control without scoring work.

## API Contracts

`GET /api/search/suggest?q=horse&limit=8`

```ts
export interface SearchSuggestResponse {
  query: string;
  suggestions: SearchSuggestion[];
  topHits: SearchHit[];
  facets: SearchFacet[];
}
```

`GET /api/search?q=horse&resort=...&category=...&free=true`

```ts
export interface EnhancedSearchResponse extends SearchResponse {
  suggestedQueries: SearchSuggestion[];
  facets: SearchFacet[];
  hits: SearchHit[];
}
```

Maintain current compatibility fields until all UI callers move to `hits`:

- `activities`
- `officialOfferings`
- `resorts`
- `guides`
- `movies`
- `categories`
- `pages`
- `topHits`

The internal source of truth is the globally sorted Typesense hit list.

## UI Plan

Search page:

- One global result list.
- Kind badges for Activity, Official offering, Resort, Guide, Movie, Category, and Page.
- Filter chips above results: All, Activities, Resorts, Free, Reservations, Tonight, plus returned facets.
- Highlighted matches from Typesense.
- Correction or relaxed-query messaging only if available.
- No hard grouping by type for submitted results.

Autocomplete:

- Grouped preview is acceptable:
  - Suggested searches
  - Best matches
  - Resorts
  - Activities
  - Quick jumps
- Keyboard navigation:
  - arrow-key navigation;
  - enter selects highlighted item;
  - escape closes;
  - `aria-activedescendant` and `role="option"` semantics.
- Stable max height and no layout jump.
- Matched text highlighting.

Keep the experience visually calm and dense. This is a utility search tool, not a marketing surface.

## Analytics

Capture privacy-safe events:

- `search_suggest_viewed`: query length bucket, suggestion count, top kind.
- `search_submitted`: normalized query hash, filters, result count.
- `search_result_clicked`: query hash, result kind, result position.
- `search_zero_result`: normalized query hash and filters.

Do not store raw personal text if the query contains obvious emails, phone numbers, or confirmation numbers. Hash queries in production analytics unless raw query storage is explicitly approved.

## Local Typesense

Run self-hosted Typesense locally:

```bash
docker run \
  -p 8108:8108 \
  -v ./typesense-data:/data \
  typesense/typesense:30.2 \
  --data-dir /data \
  --api-key=dev-api-key \
  --enable-cors
```

Environment variables:

```txt
TYPESENSE_HOST=localhost
TYPESENSE_PORT=8108
TYPESENSE_PROTOCOL=http
TYPESENSE_API_KEY=dev-api-key
TYPESENSE_SEARCH_COLLECTION=search_documents
```

## Task 1: Add Search Schema And Document Builder

**Files:**
- Create: `lib/search/schema.ts`
- Create: `lib/search/documents.ts`
- Create: `lib/search/domainAliases.ts`
- Modify: `lib/search/types.ts`
- Test: `scripts/test-search-documents.ts`

- [ ] **Step 1: Create shared schema**

Add `SearchDocument`, `SearchSuggestion`, `SearchFacet`, `SearchProviderRequest`, and `SearchProviderResponse` to `lib/search/schema.ts`. Include `titleSort` and exclude ranking knobs such as `businessBoost`, `popularityScore`, and `qualityTier`.

- [ ] **Step 2: Add domain aliases**

Create `lib/search/domainAliases.ts` with horse-family aliases, free/schedule aliases, activity aliases, and resort nickname mappings from the Domain Aliases section.

- [ ] **Step 3: Build documents from existing loaders**

Create `buildSearchDocuments(options)` in `lib/search/documents.ts`. It should use the same filtering, hiding, deduplication, official-offering collision, and public sanitization rules currently embedded in `lib/search/runSearch.ts`, then map each content family into `SearchDocument`.

- [ ] **Step 4: Add document tests**

Create `scripts/test-search-documents.ts` with assertions that:

- every document has `id`, `objectID`, `kind`, `title`, `titleSort`, `href`, `aliases`, `keywords`, and `sourceId`;
- `titleSort` is lowercase, accent-normalized, punctuation-normalized, and stable for alphabetic sorting;
- `horse` aliases are present on Fort Wilderness horse-related documents;
- resort nickname aliases are present on resort documents;
- resort documents include area and tier;
- activity/offering documents include price state, reservation state, category, and resort metadata;
- no paused activities or paused offerings are indexed.

- [ ] **Step 5: Run test**

Run: `npx tsx scripts/test-search-documents.ts`

Expected: all assertions pass.

- [ ] **Step 6: Commit**

Run: `git add lib/search/schema.ts lib/search/documents.ts lib/search/domainAliases.ts lib/search/types.ts scripts/test-search-documents.ts && git commit -m "feat: add normalized Typesense search documents"`

## Task 2: Add Typesense Client, Schema, And Parameter Builders

**Files:**
- Create: `lib/search/typesense/client.ts`
- Create: `lib/search/typesense/schema.ts`
- Create: `lib/search/typesense/searchParams.ts`
- Create: `lib/search/providers/types.ts`
- Modify: `package.json`
- Test: `scripts/test-typesense-params.ts`

- [ ] **Step 1: Add dependency**

Run: `npm install typesense`

- [ ] **Step 2: Create Typesense client**

Create `lib/search/typesense/client.ts` that reads `TYPESENSE_HOST`, `TYPESENSE_PORT`, `TYPESENSE_PROTOCOL`, `TYPESENSE_API_KEY`, and `TYPESENSE_SEARCH_COLLECTION`. It should export `createTypesenseClient()` and `getTypesenseCollectionName()`.

- [ ] **Step 3: Create collection schema**

Create `lib/search/typesense/schema.ts` with `SEARCH_COLLECTION_ALIAS`, `SEARCH_COLLECTION_VERSION`, and `SEARCH_COLLECTION_SCHEMA` exactly matching the Typesense Collection section.

- [ ] **Step 4: Create search parameter builders**

Create `buildTypesenseSearchParams(query, filters)`, `buildTypesenseSuggestParams(query)`, and `buildTypesenseFilter(filters)` in `lib/search/typesense/searchParams.ts`.

- [ ] **Step 5: Define provider interface**

Create `lib/search/providers/types.ts` with a `SearchProvider` interface exposing `search(request)` and `suggest(request)`.

- [ ] **Step 6: Add parameter tests**

Create `scripts/test-typesense-params.ts` with assertions that:

- full search uses `sort_by: "_text_match:desc,titleSort:asc"`;
- full search has no `query_by_weights`;
- 2-3 character queries use `num_typos: 0`;
- 4+ character queries use typo tolerance;
- `titleSort` is the only sortable custom string field in the collection schema;
- `buildTypesenseFilter({ free: true })` includes `priceState:=free`;
- `buildTypesenseFilter({ reservation: true })` includes required/recommended reservation states.

- [ ] **Step 7: Run test**

Run: `npx tsx scripts/test-typesense-params.ts`

Expected: all assertions pass.

- [ ] **Step 8: Commit**

Run: `git add package.json package-lock.json lib/search/typesense lib/search/providers/types.ts scripts/test-typesense-params.ts && git commit -m "feat: add Typesense search configuration"`

## Task 3: Add Versioned Index Sync

**Files:**
- Create: `scripts/sync-typesense-index.ts`
- Create: `docs/search-operations.md`
- Modify: `package.json`
- Test: local Typesense sync

- [ ] **Step 1: Create sync script**

Create `scripts/sync-typesense-index.ts` that:

1. Builds `SearchDocument[]`.
2. Creates a versioned collection, such as `search_documents_v1`.
3. Bulk imports documents.
4. Points alias `search_documents` to the versioned collection.
5. Leaves old collections in place for manual cleanup after verification.

- [ ] **Step 2: Add scripts**

Add:

```json
{
  "search:sync": "tsx scripts/sync-typesense-index.ts",
  "test:search": "tsx scripts/test-search-documents.ts && tsx scripts/test-typesense-params.ts && tsx scripts/test-search-relevance.ts"
}
```

- [ ] **Step 3: Document operations**

Create `docs/search-operations.md` with:

- local Docker command;
- required env vars;
- sync command;
- collection alias strategy;
- golden relevance test workflow;
- zero-result review process;
- rollback note: repoint `search_documents` alias to the previous versioned collection.

- [ ] **Step 4: Run local Typesense**

Run the Docker command from the Local Typesense section.

Expected: Typesense responds on `http://localhost:8108/health`.

- [ ] **Step 5: Run sync**

Run: `TYPESENSE_API_KEY=dev-api-key npm run search:sync`

Expected: collection is created, documents import successfully, and alias points to `search_documents_v1`.

- [ ] **Step 6: Commit**

Run: `git add scripts/sync-typesense-index.ts docs/search-operations.md package.json package-lock.json && git commit -m "feat: sync search documents to Typesense"`

## Task 4: Replace Current Scorer With Typesense Provider

**Files:**
- Create: `lib/search/providers/typesense.ts`
- Modify: `lib/search/runSearch.ts`
- Modify: `app/api/search/route.ts`
- Modify: `lib/search/types.ts`
- Test: `scripts/test-search-relevance.ts`

- [ ] **Step 1: Implement Typesense provider**

Create `lib/search/providers/typesense.ts`. It should call Typesense with `buildTypesenseSearchParams`, map returned documents into `SearchHit`, preserve highlight snippets, map facets into `SearchFacet[]`, and expose a globally sorted `hits` array.

- [ ] **Step 2: Hydrate legacy response arrays**

Modify `lib/search/runSearch.ts` so `hits` is source-of-truth. Hydrate `activities`, `officialOfferings`, `resorts`, `movies`, `guides`, `categories`, and `pages` from hit payloads for compatibility.

- [ ] **Step 3: Update API response**

Modify `app/api/search/route.ts` to return `hits`, `facets`, `suggestedQueries`, and all existing compatibility fields.

- [ ] **Step 4: Add golden relevance tests**

Create `scripts/test-search-relevance.ts` with cases:

- `horse`
- `hores`
- `carage`
- `free horse`
- `poly`
- `polynesain`
- `pool games`
- `schedule`
- `tonight movie`
- `pofq crafts`
- `sleigh`
- `tri circle d`
- `fort wilderness carriage`

Assertions:

- expected result appears in top 5;
- exact title matches appear before alias-only matches;
- alias-only matches appear before description-only matches;
- tied relevant results sort alphabetically by `titleSort`;
- broad queries do not collapse to a single content family.

- [ ] **Step 5: Run tests**

Run: `npm run test:search`

Expected: all assertions pass against local Typesense after `npm run search:sync`.

- [ ] **Step 6: Commit**

Run: `git add lib/search/providers/typesense.ts lib/search/runSearch.ts app/api/search/route.ts lib/search/types.ts scripts/test-search-relevance.ts && git commit -m "feat: serve search from Typesense"`

## Task 5: Add Predictive Suggest Endpoint

**Files:**
- Create: `app/api/search/suggest/route.ts`
- Modify: `lib/search/providers/typesense.ts`
- Modify: `lib/search/types.ts`
- Test: `scripts/test-search-relevance.ts`

- [ ] **Step 1: Add suggest endpoint**

Create `app/api/search/suggest/route.ts`.

Rules:

- `0-1` characters: return hardcoded popular suggestions; do not call Typesense.
- `2-3` characters: prefix search, typo tolerance off.
- `4+` characters: prefix search, typo tolerance on.

- [ ] **Step 2: Add provider suggest method**

Implement `suggest(request)` in `lib/search/providers/typesense.ts` using `buildTypesenseSuggestParams`.

- [ ] **Step 3: Add autocomplete tests**

Extend `scripts/test-search-relevance.ts` with assertions that:

- `ho` returns horse-related suggestions without broad full-search noise;
- `hores` returns or suggests horse-related results;
- `po` includes Polynesian and Port Orleans candidates;
- empty query returns only local popular suggestions and no provider-backed hits.

- [ ] **Step 4: Run tests**

Run: `npm run test:search`

Expected: all assertions pass.

- [ ] **Step 5: Commit**

Run: `git add app/api/search/suggest/route.ts lib/search/providers/typesense.ts lib/search/types.ts scripts/test-search-relevance.ts && git commit -m "feat: add Typesense predictive suggestions"`

## Task 6: Upgrade Search UI For Global Results

**Files:**
- Modify: `components/atlas/SearchClient.tsx`
- Modify: `components/search/SearchHitRow.tsx`
- Modify: `src/styles/polish.css`
- Test: visual/manual via dev server

- [ ] **Step 1: Use `/api/search/suggest` for preview**

Keep submitted searches on `/api/search`. Use abortable debounced fetches for suggestions.

- [ ] **Step 2: Add keyboard navigation**

Implement `activeDescendantId`, arrow up/down, enter, and escape behavior.

- [ ] **Step 3: Render grouped autocomplete**

Show suggested queries and top hits separately. Keep stable max height and no layout jump.

- [ ] **Step 4: Render full results as one global list**

Use `payload.hits` for submitted search results. Show kind badges, highlights, filter chips, and compatibility fallbacks only if `hits` is absent.

- [ ] **Step 5: Verify in browser**

Run: `npm run dev`

Manually test:

- `horse`
- `hores`
- `carage`
- `poly`
- `free`
- `tonight movie`
- `pofq schedule`

Expected: suggestions appear after 2 characters, typo results recover after 4+ characters, keyboard navigation works, and submitted results render as one relevance-first global list on mobile and desktop.

- [ ] **Step 6: Commit**

Run: `git add components/atlas/SearchClient.tsx components/search/SearchHitRow.tsx src/styles/polish.css && git commit -m "feat: upgrade search UI for global Typesense results"`

## Task 7: Add Search Analytics And Operations Guardrails

**Files:**
- Create: `lib/search/analytics.ts`
- Modify: `docs/search-operations.md`
- Modify: `app/api/search/route.ts`
- Modify: `app/api/search/suggest/route.ts`

- [ ] **Step 1: Add privacy-safe analytics helper**

Hash normalized queries by default. Strip obvious phone numbers, emails, and confirmation-like tokens before any logging.

- [ ] **Step 2: Track zero-result and click opportunities**

At minimum, log zero-result searches server-side. Add client click events only if an existing analytics sink is available.

- [ ] **Step 3: Extend operations docs**

Document how to review zero-result searches, update `domainAliases.ts`, re-run `npm run test:search`, and sync the index.

- [ ] **Step 4: Run validation**

Run: `npm run test:search && npm run lint`

Expected: search tests and lint pass.

- [ ] **Step 5: Commit**

Run: `git add lib/search/analytics.ts docs/search-operations.md app/api/search/route.ts app/api/search/suggest/route.ts && git commit -m "feat: add search analytics guardrails"`

## Release Checklist

- [ ] Local Typesense runs and `/health` returns healthy.
- [ ] `npm run search:sync` creates the versioned collection and alias.
- [ ] `npm run test:search` passes.
- [ ] `npm run validate:contracts` passes.
- [ ] Preview search results verified for golden queries.
- [ ] Mobile autocomplete verified at 390 px width.
- [ ] Desktop search verified at 1440 px width.
- [ ] Full result page verified as one global relevance-ranked list.
- [ ] Zero-result queries are logged or inspectable.
- [ ] Production `TYPESENSE_*` env vars are configured.
- [ ] Rollback by repointing `search_documents` alias is documented.

## Rollout

1. Build normalized documents and alias tests.
2. Add Typesense schema, parameter builders, and local Docker workflow.
3. Add versioned index sync and sync the first local collection.
4. Replace `/api/search` internals with the Typesense provider while preserving compatibility fields.
5. Add `/api/search/suggest` and wire autocomplete.
6. Convert full search UI to a single global list.
7. Watch zero-result and click-through data for one week.
8. Expand document aliases weekly from observed failed searches.

## Success Metrics

- Typo recovery: golden typo queries return expected top-5 results.
- Alphabetic tie-break: tied horse-family results sort by `titleSort`.
- Coverage: every public content family appears in at least one golden query.
- Zero-result rate: below 5% for queries with 4+ characters after alias tuning.
- Latency: autocomplete endpoint p95 below 150 ms after debounce; full search p95 below 300 ms.
- Engagement: result click-through improves over current baseline.
- Maintenance: adding a new domain concept requires changing `domainAliases.ts`, document mapping, and tests, not inventing a scoring formula.
