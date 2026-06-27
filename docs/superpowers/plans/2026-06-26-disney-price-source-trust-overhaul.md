# Disney Price Source Trust Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make resort activity price labels and amounts match current Disney guest-facing sources, with Magical Resort Guide used only as source-backed price enrichment when it matches a Disney activity.

**Architecture:** Treat current Disney resort PDFs as the authority for dated resort-calendar activities, Disney official detail pages as the authority for evergreen offerings, and Magical Resort Guide as a secondary enrichment source for exact amounts. The Disney finder/index API remains useful for discovery and resort joins, but its `eec-price` facets are explicitly non-authoritative for resort recreation pricing because they conflict with guest-facing PDFs.

**Tech Stack:** Python ingest pipeline, JSON processed artifacts, TypeScript display mapping, Supabase-backed source metadata, local PDF layout snapshots, existing `scripts/test_pipeline_contracts.py`, `scripts/test-gold-v2-mapping.ts`, `scripts/test-official-offerings.ts`, and `scripts/validate-trust.mjs`.

---

## Source-Of-Truth Rules

These rules are implementation requirements, not guidance:

1. Current Disney resort recreation PDFs are the primary price source for dated resort-calendar activities.
2. Disney PDF `($)` title marker means the activity is `fee`.
3. When a Disney PDF includes the `($)` legend and a title lacks the marker, the activity is `free`, unless the activity body explicitly says fees apply.
4. If a Disney PDF says the activity is included/free/complimentary but an add-on is sold, the activity remains `free`; the paid item is represented as an optional price option.
5. Disney official detail pages are the primary price source for evergreen offerings that are not tied to a dated resort calendar.
6. Magical Resort Guide may add primary `amountCents`, `minAmountCents`, or `maxAmountCents` only after matching title, resort, and activity family to a Disney-sourced `fee` activity.
7. Magical Resort Guide must not turn a Disney-sourced `free` activity into `fee`. It may only add optional add-on price options when Disney also indicates optional purchase language.
8. Disney finder/index API `eec-price` facets must not set public `free`, `fee`, or amount fields for resort recreation rows.
9. Any price state or amount exposed publicly must carry source spans/provenance.
10. Rows that cannot satisfy these rules stay `unknown` rather than guessing.
11. Standard Disney Resort campfires are modeled as `free` when the Disney PDF/page lacks `($)` and/or says marshmallows are complimentary; any s'mores kit or supply purchase is modeled as an optional add-on.
12. Fort Wilderness / Chip 'n' Dale's Campfire Sing-A-Long is a special case: the activity remains `free`, while supply prices come from the Disney Chuck Wagon menu when available.
13. Third-party sources, including Magical Resort Guide or editorial reports, may support approximate optional add-on amounts only when clearly labeled by confidence and provenance. They cannot become guaranteed Disney prices unless Disney confirms them in a PDF, official page, or menu.

## Summer 2026 Campfire Matrix Input

Use the attached Summer 2026 matrix as planning input and audit scaffolding, not as a blanket public data source. Disney does not publish one official by-resort campfire price sheet, so these rows represent the best currently verified operating pattern and source scope, not a guaranteed contract price.

- Most Disney Resort campfires: roasting stick `Free`, marshmallows `Free`, optional Mickey S'mores Kit usually around `$7` plus tax.
- Fort Wilderness / Chip 'n' Dale's Campfire Sing-A-Long: activity `Free`; guests may bring supplies or buy from The Chuck Wagon. Disney's current Chuck Wagon menu lists a Fort S'Mores Kit at `$9.99`; individual supplies may also be sold separately.
- Disney resort schedules commonly say complimentary marshmallows and s'mores kits available for purchase.

Reviewed resort scope for the standard resort campfire pattern:

| Resort or shared campfire area | Roasting stick | Marshmallows | S'mores kit |
| --- | ---: | ---: | ---: |
| All-Star Movies | Free | Free | ~$7 |
| All-Star Music | Free | Free | ~$7 |
| All-Star Sports | Free | Free | ~$7 |
| Art of Animation | Free | Free | ~$7 |
| Pop Century | Free | Free | ~$7 |
| Caribbean Beach | Free | Free | ~$7 |
| Coronado Springs | Free | Free | ~$7 |
| Port Orleans - French Quarter | Free | Free | ~$7 |
| Port Orleans - Riverside | Free | Free | ~$7 |
| Contemporary / Bay Lake Tower | Free | Free | ~$7 |
| Grand Floridian / Villas | Free | Free | ~$7 |
| Polynesian Village / Villas & Bungalows / Island Tower | Free | Free | ~$7 |
| Wilderness Lodge / Boulder Ridge / Copper Creek | Free | Free | ~$7 |
| Animal Kingdom Lodge - Jambo House | Free | Free | ~$7 |
| Animal Kingdom Villas - Kidani Village | Free | Free | ~$7 |
| Beach Club / Beach Club Villas / Yacht Club | Free | Free | ~$7 |
| BoardWalk Inn / BoardWalk Villas | Free | Free | ~$7 |
| Old Key West | Free | Free | ~$7 |
| Riviera Resort | Free | Free | ~$7 |
| Saratoga Springs Resort & Spa | Free | Free | ~$7 |

Fort Wilderness is explicitly not part of the standard resort kit rule:

| Resort or shared campfire area | Roasting stick | Marshmallows | S'mores kit |
| --- | ---: | ---: | ---: |
| Fort Wilderness Cabins / Campsites - Chip 'n' Dale's Campfire Sing-A-Long | Approx. $0.60 each if purchased separately; kit includes sticks | Approx. $4.99 bag if purchased separately; bring-your-own allowed | $9.99 |

Implementation consequence:

- Treat the `$7` resort-wide kit amount as `secondary_verified` or `needs_disney_confirmation` unless a Disney PDF/page/menu confirms it for the relevant resort and period.
- Treat the Fort Wilderness `$9.99` kit amount as `disney_menu_verified` if fetched from Disney's Chuck Wagon menu.
- Treat Fort Wilderness separate supply prices, such as sticks and marshmallow bags, as approximate supporting notes unless Disney's live menu or a current on-site sign confirms the exact amount.
- Store the reviewed resort/shared-area scope in the matrix so the default `$7` optional add-on is never silently projected to an unreviewed resort or non-campfire activity.
- Never convert campfire activities to `Paid` because optional supplies are sold.

## File Structure

- Modify `scripts/ingest/source_manifest.py`: update current PDF URLs and editions after discovery confirms them.
- Modify `scripts/ingest/discover.py`: broaden live PDF discovery and produce a current PDF source report.
- Modify `scripts/ingest/fetch.py`: ensure current discovered URLs can be fetched locally by group without Supabase.
- Modify `scripts/ingest/layout_snapshot.py`: keep existing layout snapshot contract; add price marker assertions through tests rather than reshaping this file unless extraction proves insufficient.
- Modify `scripts/ingest/extract_v2.py`: extract PDF title marker price state, marker absence free evidence, body fee language, and optional add-on purchase language.
- Modify `scripts/ingest/promote_gold.py`: promote PDF price evidence and optional price options into Gold v2 rows.
- Modify `scripts/ingest/magical_resort_guide.py`: enrich Disney-matched fee rows with exact price amounts; prevent MRG from overriding Disney free state.
- Create `data/quality/campfire_price_matrix.json`: reviewed Summer 2026 optional-purchase matrix with source status, scoped to campfire add-ons.
- Modify `scripts/ingest/validate_v2.py`: fail rows that expose price without provenance.
- Modify `scripts/ingest/audit_coverage.py`: audit current PDF coverage and stale/mixed edition state.
- Modify `scripts/validate-trust.mjs`: enforce public price state/amount provenance and reject index-derived `eec-price` public pricing.
- Modify `lib/types/occurrence.ts`: reuse `ActivityPriceOption` with `priceBasis: "optional_add_on"` for paid add-ons inside free events; add optional confidence/source fields only if needed for public labeling.
- Modify `lib/data/goldActivities.ts`: preserve amount fields and optional add-ons when mapping Gold rows to occurrences.
- Modify `lib/displayActivity.ts`: keep public labels simple: `Free`, `Paid`, `Price unclear`.
- Modify `components/atlas/ActivityDetailClient.tsx`: show optional add-on prices separately from the activity’s primary free/paid label.
- Test `scripts/test_pipeline_contracts.py`: source discovery, PDF marker extraction, MRG enrichment, and optional add-on behavior.
- Test `scripts/test-gold-v2-mapping.ts`: Gold mapping and public display behavior.
- Test `scripts/test-official-offerings.ts`: evergreen offering pricing stays official-source-backed.
- Create `docs/price-source-trust.md`: document source precedence and known non-authoritative sources.

---

### Task 1: Lock The Price Source Policy In Tests

**Files:**
- Modify: `scripts/test_pipeline_contracts.py`
- Modify: `scripts/test-gold-v2-mapping.ts`
- Modify: `scripts/test-official-offerings.ts`

- [ ] **Step 1: Add PDF price authority contract tests**

Add tests to `scripts/test_pipeline_contracts.py` near the existing PDF extraction tests. Use synthetic PDF-layout candidate records so the tests are stable and fast.

```python
def test_pdf_title_fee_marker_sets_paid_price_state(self) -> None:
    candidates = extract_candidates_for_pdf(
        pdf_path=ANIMAL_KINGDOM_JAMBO_PDF,
        calendar_group_key="animal-kingdom-jambo",
        resort_slugs=("animal-kingdom-lodge",),
    )
    arcade = next(candidate for candidate in candidates if "Pumbaa" in candidate["title"]["value"])
    self.assertEqual("fee", arcade["claims"][0]["value"])
    self.assertTrue(any("($)" in span.get("text", "") for span in arcade["title"]["spans"]))


def test_pdf_missing_fee_marker_with_legend_sets_free_price_state(self) -> None:
    candidates = extract_candidates_for_pdf(
        pdf_path=ANIMAL_KINGDOM_JAMBO_PDF,
        calendar_group_key="animal-kingdom-jambo",
        resort_slugs=("animal-kingdom-lodge",),
    )
    movie = next(candidate for candidate in candidates if candidate["title"]["value"] == "Movie Under the Stars")
    fee_claim = next(claim for claim in movie["claims"] if claim["kind"] == "fee")
    self.assertEqual("free", fee_claim["value"])
    self.assertEqual("source_pdf_fee_marker_absent", fee_claim["evidence"][0]["field"])
```

- [ ] **Step 2: Add mixed free-with-add-on contract test**

Add this test to `scripts/test_pipeline_contracts.py`.

```python
def test_pdf_free_activity_with_optional_paid_add_on_remains_free(self) -> None:
    candidates = extract_candidates_for_pdf(
        pdf_path=ANIMAL_KINGDOM_JAMBO_PDF,
        calendar_group_key="animal-kingdom-jambo",
        resort_slugs=("animal-kingdom-lodge",),
    )
    campfire = next(candidate for candidate in candidates if candidate["title"]["value"] == "Campfire")
    fee_claim = next(claim for claim in campfire["claims"] if claim["kind"] == "fee")
    self.assertEqual("free", fee_claim["value"])
    self.assertIn("complimentary", campfire["description"]["value"].lower())
    self.assertIn("available for purchase", campfire["description"]["value"].lower())
```

- [ ] **Step 3: Add Gold mapping tests for optional add-ons**

Add to `scripts/test-gold-v2-mapping.ts`.

```ts
const freeCampfireWithAddOn: GoldActivityRow = {
  ...untimedPoolsideRow,
  id: "gold-akl-campfire",
  activity_catalog_id: "akl-campfire-catalog",
  calendar_group_key: "animal-kingdom-jambo",
  resort_slugs: ["animal-kingdom-lodge"],
  canonical_slug: "campfire",
  title: "Campfire",
  category: "campfire",
  description:
    "Enjoy the warm glow of the campfire with complimentary marshmallows. S'mores kits available for purchase.",
  price: {
    state: "free",
    options: [
      {
        optionName: "S'mores kit",
        priceBasis: "optional_add_on",
        notes: "Available for purchase",
      },
    ],
  },
  claims: {
    fee: {
      value: "free",
      evidence: [{ field: "source_pdf_fee_marker_absent", source: "pdf_layout" }],
    },
    walkability: { value: "unknown", evidence: [] },
    transportation: { value: "unknown", evidence: [] },
  },
};

const [campfireOccurrence] = mapGoldActivityRowToOccurrences(freeCampfireWithAddOn, {
  dateRangeDays: 1,
  referenceDate: new Date("2026-06-22T12:00:00-04:00"),
});
assert.equal(campfireOccurrence.price.state, "free");
assert.equal(campfireOccurrence.price.options?.[0]?.priceBasis, "optional_add_on");
assert.equal(toDisplayActivity(campfireOccurrence).costLabel, "Free");
```

- [ ] **Step 4: Add official offering test rejecting finder price facets**

Add to `scripts/test-official-offerings.ts`.

```ts
const finderPricedFreeOffering = mapOfficialOfferingRow({
  ...bikeRow,
  id: "offering-finder-priced-movie",
  program_key: "movies-under-the-stars",
  title: "Movies Under the Stars",
  price: { state: "fee", notes: "eec-price: above-two-hundred-dollars" },
  field_provenance: {
    ...bikeRow.field_provenance,
    price: [
      {
        page: 1,
        line: 0,
        text: "eec-price: above-two-hundred-dollars",
        source: "official_recreation_index_api",
      },
    ],
  },
});
assert.equal(
  finderPricedFreeOffering.price.state,
  "unknown",
  "Finder eec-price facets must not become public official-offering prices"
);
```

- [ ] **Step 5: Run tests and verify they fail**

Run:

```bash
python3 -m unittest scripts.test_pipeline_contracts.PipelineContractsTest
npx tsx scripts/test-gold-v2-mapping.ts
npx tsx scripts/test-official-offerings.ts
```

Expected: failures only on the newly added price authority, optional add-on, and finder facet rejection cases.

---

### Task 2: Discover And Cache Current Disney PDFs

**Files:**
- Modify: `scripts/ingest/discover.py`
- Modify: `scripts/ingest/source_manifest.py`
- Modify: `scripts/ingest/fetch.py`
- Test: `scripts/test_pipeline_contracts.py`

- [ ] **Step 1: Add discovery candidates for all calendar groups**

Update `RESORT_CODES` in `scripts/ingest/discover.py` to include the missing known codes.

```python
RESORT_CODES: dict[str, str] = {
    "All-Star-Movies": "all-star-movies",
    "All-Star-Music": "all-star-music",
    "All-Star-Sports": "all-star-sports",
    "DAAR": "art-of-animation",
    "POP": "pop-century",
    "CBR": "caribbean-beach",
    "CSR": "coronado-springs",
    "POFQ": "port-orleans-french-quarter",
    "PORS": "port-orleans-riverside",
    "DAKL": "animal-kingdom-jambo",
    "DAKL-Kidani": "animal-kingdom-kidani",
    "YB": "beach-yacht-club",
    "BW": "boardwalk",
    "CTR": "contemporary",
    "GF": "grand-floridian",
    "Polynesian": "polynesian",
    "WL": "wilderness-lodge",
    "OKWR": "old-key-west",
    "DRR": "riviera",
    "SSR": "saratoga-springs",
}
```

- [ ] **Step 2: Probe current quarters before old quarters**

Change `probe_cdn_candidates()` so it probes `0526`, `0626`, `0426`, `0326`, `0126` across `fy26-q3`, `fy26-q2`, and `fy26-q1`, in that order.

```python
def probe_cdn_candidates(group_key: str, months: list[str] | None = None) -> list[str]:
    months = months or ["0626", "0526", "0426", "0326", "0126"]
    folders = ("fy26-q3", "fy26-q2", "fy26-q1")
    codes = [code for code, group in RESORT_CODES.items() if group == group_key]
    urls: list[str] = []
    for code in codes:
        for folder in folders:
            for mmyy in months:
                urls.append(f"{CDN_COLLATERAL}/{folder}/{code}_Aframe_Recreation-{mmyy}.pdf")
                urls.append(f"{CDN_COLLATERAL}/{folder}/{code}_Aframe_Recreation_{mmyy}.pdf")
                urls.append(f"{CDN_COLLATERAL}/{folder}/{code}_Aframe_Recreation-{mmyy}_DIGITAL.pdf")
                urls.append(f"{CDN_COLLATERAL}/{folder}/{code}_Aframe_Recreation_{mmyy}_DIGITAL.pdf")
    return urls
```

- [ ] **Step 3: Add a discovery freshness report**

In `scripts/ingest/discover.py`, write `data/processed/current_pdf_discovery_report.json` with one row per calendar group.

```python
report = {
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "entries": entries,
    "summary": {
        "total": len(entries),
        "current_fy26_q3": sum(1 for e in entries if "/fy26-q3/" in str(e.get("discovered_url"))),
        "url_changed": sum(1 for e in entries if e.get("status") == "url_changed"),
        "missing": sum(1 for e in entries if e.get("status") in {"missing", "unreachable"}),
    },
}
(PROCESSED_DIR / "current_pdf_discovery_report.json").write_text(json.dumps(report, indent=2) + "\n")
```

- [ ] **Step 4: Add a test that AKL 0526 is discoverable**

Add to `scripts/test_pipeline_contracts.py`.

```python
def test_discovery_probe_includes_current_animal_kingdom_jambo_pdf(self) -> None:
    from scripts.ingest.discover import probe_cdn_candidates

    candidates = probe_cdn_candidates("animal-kingdom-jambo", ["0526"])
    self.assertIn(
        "https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q3/DAKL_Aframe_Recreation-0526.pdf",
        candidates,
    )
```

- [ ] **Step 5: Run discovery locally**

Run:

```bash
python3 scripts/ingest/discover.py --compare-db
```

Expected:

```text
Wrote data/processed/discovery_report.json
Wrote data/processed/current_pdf_discovery_report.json
```

- [ ] **Step 6: Update source manifest**

For each `url_changed` row in `data/processed/current_pdf_discovery_report.json`, update `scripts/ingest/source_manifest.py` so `pdf_url` and `pdf_edition` match the discovered current URL.

Example for AKL Jambo:

```python
ActivitySource(
  "animal-kingdom-jambo",
  ("animal-kingdom-lodge", "animal-kingdom-villas-jambo-house"),
  recreation_url("animal-kingdom-lodge"),
  f"{CDN_COLLATERAL}/fy26-q3/DAKL_Aframe_Recreation-0526_Jambo_DIGITAL.pdf",
  "fy26-q3-0526-jambo",
  "Jambo House calendar; Kidani Village has a separate calendar.",
),
```

- [ ] **Step 7: Fetch current PDFs locally**

Run:

```bash
python3 scripts/ingest/fetch.py --local-only --force
```

Expected: `data/raw/pdfs/` contains the newly discovered filenames and `data/processed/fetch_report.json` shows `fetched` or `unchanged` for every PDF-backed group.

---

### Task 3: Regenerate Layout Snapshots For Current PDFs

**Files:**
- Modify: `scripts/ingest/layout_snapshot.py` only if current PDFs reveal extraction gaps.
- Create/Update: `data/processed/layout_snapshots/*.layout.json`
- Test: `scripts/test_layout_snapshot.py`
- Test: `scripts/test_pipeline_contracts.py`

- [ ] **Step 1: Regenerate snapshots for all cached PDFs**

Run:

```bash
for pdf in data/raw/pdfs/*.pdf; do
  python3 scripts/ingest/layout_snapshot.py "$pdf"
done
```

Expected: each PDF produces or updates one file under `data/processed/layout_snapshots/`.

- [ ] **Step 2: Verify AKL current snapshot has title markers**

Run:

```bash
rg -n "PUMBAA|CAMPIRE|CAMPFIRE|MOVIE UNDER THE STARS|\\(\\$\\)|S'mores|complimentary" data/processed/layout_snapshots
```

Expected: the current AKL snapshot includes paid title markers for paid rows, no marker for Campfire/Movie Under the Stars, and body text for optional s’mores purchase language.

- [ ] **Step 3: Run snapshot tests**

Run:

```bash
python3 scripts/test_layout_snapshot.py
```

Expected: pass.

---

### Task 4: Extract PDF Price Truth

**Files:**
- Modify: `scripts/ingest/extract_v2.py`
- Modify: `scripts/ingest/contracts.py`
- Test: `scripts/test_pipeline_contracts.py`

- [ ] **Step 1: Add a price evidence helper**

Add to `scripts/ingest/extract_v2.py` near existing fee marker helpers.

```python
def _pdf_price_claim_for_title(
    *,
    title_text: str,
    body_lines: list[dict[str, Any]],
    fee_legend_spans: list[dict[str, Any]],
) -> dict[str, Any]:
    if _title_is_fee_based(title_text):
        return {
            "kind": "fee",
            "value": "fee",
            "evidence": [{"field": "source_pdf_fee_marker", "text": title_text}],
        }

    body_text = " ".join(_clean_text(str(line.get("text", ""))) for line in body_lines)
    lower = body_text.lower()
    if re.search(r"\bfees?\s+may\s+apply\b|\bavailable\s+for\s+purchase\b|\bto\s+reserve\b|\bcall\s+407-wdw-play\b", lower):
        if "complimentary" in lower and "available for purchase" in lower:
            return {
                "kind": "fee",
                "value": "free",
                "evidence": [{"field": "source_pdf_fee_marker_absent_with_optional_purchase", "text": body_text}],
            }
        return {
            "kind": "fee",
            "value": "fee",
            "evidence": [{"field": "source_pdf_body_fee_language", "text": body_text}],
        }

    if fee_legend_spans:
        return {
            "kind": "fee",
            "value": "free",
            "evidence": [{"field": "source_pdf_fee_marker_absent"}],
        }

    return {"kind": "fee", "value": "unknown", "evidence": []}
```

- [ ] **Step 2: Attach price claims to extracted candidates**

In the candidate assembly path in `scripts/ingest/extract_v2.py`, replace any raw `is_fee_based` claim construction with `_pdf_price_claim_for_title(...)`.

```python
fee_claim = _pdf_price_claim_for_title(
    title_text=raw_title,
    body_lines=description_lines,
    fee_legend_spans=_fee_legend_spans(snapshot),
)
claims = [fee_claim, *other_claims]
```

- [ ] **Step 3: Validate price claims require evidence**

Add to `scripts/ingest/contracts.py`.

```python
def validate_price_claim(record: dict[str, Any]) -> ValidationResult:
    result = ValidationResult()
    for claim in record.get("claims") or []:
        if claim.get("kind") != "fee":
            continue
        value = str(claim.get("value", "")).lower()
        evidence = claim.get("evidence") or []
        if value in {"free", "fee"} and not evidence:
            result.error("fee:missing_evidence")
    return result
```

Call it from `validate_public_record()`.

```python
result.merge(validate_price_claim(record))
```

- [ ] **Step 4: Run contract tests**

Run:

```bash
python3 -m unittest scripts.test_pipeline_contracts.PipelineContractsTest
```

Expected: pass.

---

### Task 5: Promote Price State, Amounts, And Optional Add-Ons To Gold

**Files:**
- Modify: `scripts/ingest/promote_gold.py`
- Modify: `lib/types/occurrence.ts`
- Modify: `lib/data/goldActivities.ts`
- Test: `scripts/test-gold-v2-mapping.ts`

- [ ] **Step 1: Convert PDF fee claim to Gold price state**

In `scripts/ingest/promote_gold.py`, replace the current one-line price assignment.

```python
fee_claim = next((claim for claim in public_record.get("claims", []) if claim.get("kind") == "fee"), {})
fee_value = str(fee_claim.get("value") or "unknown").lower()
price_state = fee_value if fee_value in {"free", "fee"} else "unknown"
price = {"state": price_state}
```

- [ ] **Step 2: Add optional add-on extraction from Disney PDF body**

In `scripts/ingest/promote_gold.py`, add:

```python
def _optional_price_options(description: str) -> list[dict[str, Any]]:
    lower = description.lower()
    options: list[dict[str, Any]] = []
    if "s'mores" in lower and "available for purchase" in lower:
        options.append({
            "optionName": "S'mores kit",
            "priceBasis": "optional_add_on",
            "notes": "Available for purchase",
        })
    if "smores" in lower and "available for purchase" in lower:
        options.append({
            "optionName": "S'mores kit",
            "priceBasis": "optional_add_on",
            "notes": "Available for purchase",
        })
    return options
```

Then attach options:

```python
options = _optional_price_options(public_record["description"]["value"])
if options:
    price["options"] = options
```

- [ ] **Step 3: Preserve price options in TypeScript mapping**

Confirm `lib/data/goldActivities.ts` maps both camelCase and snake_case options. If any field is missing, use this mapping.

```ts
function normalizePriceOptions(
  options?: GoldPriceOption[] | null
): ActivityPriceOption[] | undefined {
  if (!Array.isArray(options) || options.length === 0) return undefined;
  return options.map((option) => ({
    optionName: option.optionName ?? option.option_name,
    priceCentsMin: option.priceCentsMin ?? option.price_cents_min,
    priceCentsMax: option.priceCentsMax ?? option.price_cents_max,
    priceBasis: option.priceBasis ?? option.price_basis,
    dayOfWeek: option.dayOfWeek ?? option.day_of_week,
    notes: option.notes,
  }));
}
```

- [ ] **Step 4: Run Gold mapping tests**

Run:

```bash
npx tsx scripts/test-gold-v2-mapping.ts
```

Expected: pass.

---

### Task 6: Enrich Exact Price Amounts From Magical Resort Guide Without Overriding Disney

**Files:**
- Modify: `scripts/ingest/magical_resort_guide.py`
- Modify: `scripts/test_mrg_facts.py`
- Modify: `scripts/test_pipeline_contracts.py`

- [ ] **Step 1: Define MRG price enrichment guard**

Add to `scripts/ingest/magical_resort_guide.py`.

```python
def _can_enrich_price_from_mrg(record: dict[str, Any], fact: dict[str, Any]) -> bool:
    disney_state = str((record.get("price") or {}).get("state") or "unknown").lower()
    fact_state = str((fact.get("facts") or {}).get("price_state") or "unknown").lower()
    if disney_state == "fee" and fact_state == "fee":
        return True
    return False
```

- [ ] **Step 2: Prevent MRG from changing Disney free activity state**

In `_merge_price(record, fields)`, require `_can_enrich_price_from_mrg(...)` before setting `price["state"] = "fee"`. A Disney-free activity with a paid add-on is handled by Task 6A, not by primary MRG state merging.

```python
if state == "fee" and price.get("state") == "free":
    return
if state == "fee" and price.get("state") == "fee":
    price["state"] = "fee"
```

- [ ] **Step 3: Allow MRG to add exact amounts for Disney paid rows**

Still in `_merge_price(record, fields)`, preserve the existing amount merge when Disney state is already `fee`.

```python
if price.get("state") == "fee":
    if isinstance(price_min, int):
        price["minAmountCents"] = price_min
    if isinstance(price_max, int):
        price["maxAmountCents"] = price_max
    if fields.get("price_notes"):
        price["notes"] = fields["price_notes"]
```

- [ ] **Step 4: Add tests**

Add to `scripts/test_mrg_facts.py`.

```python
def test_mrg_adds_amount_to_disney_paid_activity_without_changing_source_state(self) -> None:
    record = {
        "title": "Arts & Crafts",
        "price": {"state": "fee"},
    }
    fields = {
        "price_state": "fee",
        "price_cents_min": 1700,
        "price_cents_max": 1700,
        "price_notes": "$17",
    }
    _merge_price(record, fields)
    self.assertEqual("fee", record["price"]["state"])
    self.assertEqual(1700, record["price"]["minAmountCents"])


def test_mrg_does_not_turn_disney_free_campfire_into_paid_event(self) -> None:
    record = {
        "title": "Campfire",
        "price": {"state": "free"},
    }
    fields = {
        "price_state": "fee",
        "price_cents_min": 800,
        "price_cents_max": 800,
        "price_notes": "$8 s'mores kit",
    }
    _merge_price(record, fields)
    self.assertEqual("free", record["price"]["state"])
```

- [ ] **Step 5: Run MRG tests**

Run:

```bash
python3 -m unittest scripts.test_mrg_facts
```

Expected: pass.

---

### Task 6A: Model Summer 2026 Campfire Optional Purchase Matrix

**Files:**
- Create: `data/quality/campfire_price_matrix.json`
- Modify: `scripts/ingest/promote_gold.py`
- Modify: `lib/types/occurrence.ts` if confidence/source fields do not already exist
- Modify: `lib/data/goldActivities.ts`
- Test: `scripts/test_pipeline_contracts.py`
- Test: `scripts/test-gold-v2-mapping.ts`

- [ ] **Step 1: Create a reviewed campfire add-on matrix**

Create `data/quality/campfire_price_matrix.json` as a deliberately small, reviewed enrichment file. It should not replace Disney PDF extraction; it only adds optional purchase detail after Disney has established the campfire activity itself is free.

```json
{
  "version": "2026-summer",
  "sourcePolicy": {
    "officialByResortPriceSheetExists": false,
    "notes": "Disney does not publish one official by-resort campfire price sheet. This matrix records the reviewed Summer 2026 operating pattern and must not override Disney PDFs, official pages, or menus."
  },
  "defaultResortCampfire": {
    "activityPriceState": "free",
    "resortScope": [
      "all-star-movies",
      "all-star-music",
      "all-star-sports",
      "art-of-animation",
      "pop-century",
      "caribbean-beach",
      "coronado-springs",
      "port-orleans-french-quarter",
      "port-orleans-riverside",
      "contemporary",
      "bay-lake-tower",
      "grand-floridian",
      "polynesian",
      "wilderness-lodge",
      "animal-kingdom-jambo",
      "animal-kingdom-kidani",
      "beach-yacht-club",
      "boardwalk",
      "old-key-west",
      "riviera",
      "saratoga-springs"
    ],
    "supplies": [
      {
        "optionName": "Roasting stick",
        "priceBasis": "included",
        "priceCentsMin": 0,
        "priceCentsMax": 0,
        "priceConfidence": "operating_pattern",
        "notes": "Most Disney Resort campfires provide roasting sticks for the complimentary activity."
      },
      {
        "optionName": "Marshmallows",
        "priceBasis": "included",
        "priceCentsMin": 0,
        "priceCentsMax": 0,
        "priceConfidence": "disney_pdf_language",
        "notes": "Use only when the resort PDF/page says marshmallows are complimentary."
      },
      {
        "optionName": "Mickey S'mores Kit",
        "priceBasis": "optional_add_on",
        "priceCentsMin": 700,
        "priceCentsMax": 700,
        "priceConfidence": "secondary_verified",
        "verificationStatus": "needs_disney_confirmation",
        "sourceUrl": "https://chipandco.com/cute-tour-humphreys-hideout-wilderness-lodge-631738/",
        "sourceLabel": "Chip and Company Wilderness Lodge report",
        "notes": "Usually around $7 plus tax; do not present as a guaranteed Disney-published price unless Disney confirms it for the resort and period."
      }
    ]
  },
  "fort-wilderness": {
    "activityPriceState": "free",
    "resortScope": ["fort-wilderness"],
    "supplies": [
      {
        "optionName": "Fort S'Mores Kit",
        "priceBasis": "optional_add_on",
        "priceCentsMin": 999,
        "priceCentsMax": 999,
        "priceConfidence": "disney_menu_verified",
        "sourceUrl": "https://disneyworld.disney.go.com/dining/cabins-at-fort-wilderness-resort/chuck-wagon-fresh-fixins-food-truck/menus/lunch-and-dinner/",
        "sourceLabel": "Disney Chuck Wagon menu"
      }
    ],
    "approximateSeparateSupplyNotes": [
      {
        "optionName": "Roasting stick",
        "approximatePrice": "$0.59-$0.63 each",
        "verificationStatus": "needs_disney_confirmation",
        "publishAsExactPrice": false
      },
      {
        "optionName": "Marshmallow bag",
        "approximatePrice": "$4.99",
        "verificationStatus": "needs_disney_confirmation",
        "publishAsExactPrice": false
      }
    ],
    "notes": "Guests may bring their own supplies or purchase from The Chuck Wagon. Individual supply prices are optional and should remain approximate unless confirmed from Disney."
  }
}
```

- [ ] **Step 2: Apply matrix only to Disney-backed free campfires**

In `scripts/ingest/promote_gold.py`, add a helper that:

- Matches only campfire-family rows.
- Requires `price.state == "free"` from Disney PDF/page evidence.
- Requires Disney body language such as `complimentary marshmallows`, `s'mores kits available for purchase`, or the Fort Wilderness campfire title/source.
- Requires the row's calendar group or resort slug to match the matrix `resortScope` before applying default resort campfire options.
- Adds optional supply options without changing the primary price state.
- Uses Fort Wilderness options only for Fort Wilderness calendar groups/resort slugs.
- Copies matrix source fields into the row's price provenance or an equivalent source-backed option field so amount validation can explain where every displayed amount came from.

- [ ] **Step 3: Preserve add-on confidence and source metadata**

If `ActivityPriceOption` lacks these fields, extend it with optional properties:

```ts
priceConfidence?: "disney_verified" | "disney_menu_verified" | "disney_pdf_language" | "secondary_verified" | "operating_pattern" | "unknown";
verificationStatus?: "verified" | "needs_disney_confirmation";
sourceUrl?: string;
sourceLabel?: string;
```

Then map these fields through `lib/data/goldActivities.ts`.

- [ ] **Step 4: Add tests for the matrix behavior**

Add tests covering:

- Animal Kingdom Lodge / standard campfire remains `price.state === "free"` and may expose a Mickey S'mores Kit optional add-on only with non-primary pricing.
- Fort Wilderness campfire remains `price.state === "free"` and exposes `Fort S'Mores Kit` at `999` cents with `priceConfidence === "disney_menu_verified"`.
- A campfire row without Disney complimentary/available-for-purchase evidence does not receive inferred add-on amounts from the matrix.
- No matrix add-on can change an activity's cost label from `Free` to `Paid`.

- [ ] **Step 5: Run focused tests**

Run:

```bash
python3 -m unittest scripts.test_pipeline_contracts.PipelineContractsTest
npx tsx scripts/test-gold-v2-mapping.ts
```

Expected: pass.

---

### Task 7: Render Mixed Pricing Honestly

**Files:**
- Modify: `components/atlas/ActivityDetailClient.tsx`
- Modify: `components/activity/ActivityOfferingCard.tsx`
- Modify: `lib/displayActivity.ts`
- Test: `scripts/test-gold-v2-mapping.ts`
- Test: `scripts/test-official-offerings.ts`

- [ ] **Step 1: Keep primary labels simple**

Do not introduce a new public chip for mixed pricing. Keep:

```ts
function costLabel(state: ActivityOccurrence["price"]["state"]): DisplayActivity["costLabel"] {
  if (state === "free") return "Free";
  if (state === "fee") return "Paid";
  return "Price unclear";
}
```

- [ ] **Step 2: Add optional purchase display on detail pages**

In `components/atlas/ActivityDetailClient.tsx`, render price options below the primary price fact. Show exact amounts plainly only when `priceConfidence` is Disney-backed; show secondary/operating-pattern amounts with softer copy such as `Usually around $7 plus tax` and keep the source/provenance available.

```tsx
const optionalPriceOptions =
  activity.price.options?.filter((option) => option.priceBasis === "optional_add_on") ?? [];
```

Render:

```tsx
{optionalPriceOptions.length > 0 && (
  <div className="activity-detail__optional-prices">
    <h2>Optional purchases</h2>
    <ul>
      {optionalPriceOptions.map((option) => (
        <li key={`${option.optionName}-${option.notes}`}>
          <span>{option.optionName}</span>
          {option.priceCentsMin != null ? (
            <span>{formatOptionalPrice(option)}</span>
          ) : (
            <span>{option.notes}</span>
          )}
        </li>
      ))}
    </ul>
  </div>
)}
```

- [ ] **Step 2A: Format confidence-aware optional add-on prices**

Add a helper near the existing price formatting code.

```ts
function formatOptionalPrice(option: ActivityPriceOption): string {
  const amount = formatCentsRange(option.priceCentsMin, option.priceCentsMax);
  if (option.priceConfidence === "secondary_verified" || option.verificationStatus === "needs_disney_confirmation") {
    return `Usually around ${amount} plus tax`;
  }
  return amount;
}
```

For Fort Wilderness, prefer exact Disney-menu wording:

```text
Fort S'Mores Kit: $9.99
```

- [ ] **Step 3: Avoid duplicate uncertainty badges**

Keep the existing `activityToEventCard()` behavior:

```ts
showTrust:
  display.trustState !== "verified" &&
  display.trustState !== "recently_updated" &&
  display.trustState !== "price_unclear" &&
  !display.timeUncertain,
```

- [ ] **Step 4: Run display tests**

Run:

```bash
npx tsx scripts/test-gold-v2-mapping.ts
npx tsx scripts/test-official-offerings.ts
```

Expected: pass.

---

### Task 8: Regenerate Gold Data And Official Offerings

**Files:**
- Update: `data/processed/activity_gold_v2_preview.json`
- Update: `data/processed/activity_review_queue_v2_preview.json`
- Update: `data/processed/official_recreation_offerings.json`
- Update: `data/golden/activities/*.json` if fixture promotion changes source-backed expected rows.

- [ ] **Step 1: Run local pipeline through validation**

Run:

```bash
python3 scripts/ingest/run_pipeline.py --local-only
```

Expected: extract, validate, MRG enrichment, promote Gold, and coverage audit pass.

- [ ] **Step 2: Generate official offerings**

Run:

```bash
python3 scripts/ingest/generate_official_recreation_offerings.py
```

Expected:

```text
{
  "programs": 40,
  "offerings": 224,
  "quarantine": 0
}
```

The exact offering count may increase only if current Disney sources include new official offerings. Any count change must be explained in `data/processed/discovery_report.json` or `data/processed/current_pdf_discovery_report.json`.

- [ ] **Step 3: Inspect price distribution**

Run:

```bash
jq '[.[] | .price.state] | group_by(.) | map({state: .[0], count:length})' data/processed/activity_gold_v2_preview.json
jq '[.offerings[] | .price.state] | group_by(.) | map({state: .[0], count:length})' data/processed/official_recreation_offerings.json
```

Expected: `free` is nonzero for both PDF calendar activities and official offerings, `fee` reflects Disney markers/body fee language, and remaining `unknown` rows have no Disney-supported price evidence.

---

### Task 9: Add Price Trust Audits

**Files:**
- Modify: `scripts/validate-trust.mjs`
- Modify: `scripts/validate-db-trust.mjs`
- Modify: `scripts/test-official-offerings.ts`
- Modify: `scripts/test-gold-v2-mapping.ts`

- [ ] **Step 1: Reject public prices sourced only from finder facets**

Add to `scripts/validate-trust.mjs`:

```js
function priceProvenanceUsesFinderOnly(provenance) {
  const spans = provenance?.price ?? [];
  return (
    spans.length > 0 &&
    spans.every((span) => String(span.source ?? "").includes("official_recreation_index_api"))
  );
}
```

Use in both activity and offering validation:

```js
if ((priceState === "free" || priceState === "fee") && priceProvenanceUsesFinderOnly(item.fieldProvenance)) {
  unsupportedPriceCount++;
  note(path, item, "finder eec-price is not a public price source");
}
```

- [ ] **Step 2: Require amount provenance**

Add:

```js
function hasPriceAmount(price) {
  return (
    price?.amountCents != null ||
    price?.minAmountCents != null ||
    price?.maxAmountCents != null ||
    (Array.isArray(price?.options) &&
      price.options.some((option) => option.priceCentsMin != null || option.priceCentsMax != null))
  );
}
```

Then:

```js
if (hasPriceAmount(item.price) && !hasUsableProvenance(item.fieldProvenance, "price")) {
  unsupportedPriceCount++;
  note(path, item, "price amount missing source span");
}
```

- [ ] **Step 3: Run trust validators**

Run:

```bash
node scripts/validate-trust.mjs
node scripts/validate-db-trust.mjs
```

Expected: both pass.

---

### Task 10: Document The Policy

**Files:**
- Create: `docs/price-source-trust.md`
- Modify: `README.md`

- [ ] **Step 1: Write the source policy doc**

Create `docs/price-source-trust.md` with:

```markdown
# Price Source Trust

Disney resort recreation PDFs are the primary source for dated resort-calendar activity pricing.

## Public Price Rules

- `($)` next to a Disney PDF activity title means `Paid`.
- A missing `($)` marker on a PDF that includes the fee legend means `Free`, unless the activity body says fees apply.
- A free activity with optional paid items remains `Free`; optional items are shown separately.
- Magical Resort Guide can enrich exact amounts only after the Disney activity is matched and already source-backed.
- Disney finder/index `eec-price` facets are not public price evidence for resort recreation pricing.

## Examples

- Campfire: `Free`; complimentary marshmallows/sticks stay part of the free activity when Disney says they are complimentary.
- Standard resort campfire optional kit: optional Mickey S'mores Kit may be shown as `Usually around $7 plus tax` only when backed by reviewed secondary evidence or Disney confirmation.
- Fort Wilderness / Chip 'n' Dale's Campfire Sing-A-Long: `Free`; optional Fort S'Mores Kit can show `$9.99` when sourced from the Disney Chuck Wagon menu.
- Movie Under the Stars: `Free`.
- Arts & Crafts ($): `Paid`.
- Arcade ($): `Paid`.
```

- [ ] **Step 2: Link it from README**

Add to `README.md` under ingest/source documentation:

```markdown
For price source precedence and mixed free/paid activity handling, see [Price Source Trust](docs/price-source-trust.md).
```

---

### Task 11: Final Verification

**Files:**
- No source file changes in this task.

- [ ] **Step 1: Run contract validation**

Run:

```bash
npm run validate:contracts
```

Expected: pass.

- [ ] **Step 2: Run trust validation**

Run:

```bash
npm run validate:trust
npm run validate:db-trust
```

Expected: pass.

- [ ] **Step 3: Run final price audit commands**

Run:

```bash
jq '[.[] | {title, price, source_url, source_pdf_edition}] | group_by(.price.state) | map({state: .[0].price.state, count: length})' data/processed/activity_gold_v2_preview.json
jq '[.offerings[] | {title, price, source_url}] | group_by(.price.state) | map({state: .[0].price.state, count: length})' data/processed/official_recreation_offerings.json
```

Expected: output has nonzero `free` and `fee` counts; remaining `unknown` rows are explainable from missing Disney evidence.

- [ ] **Step 4: Spot-check live examples**

Inspect these examples in the processed output:

```bash
rg -n '"title": "Campfire"|"title": "Movie Under the Stars"|"title": "Pumbaa' data/processed/activity_gold_v2_preview.json
rg -n '"S.mores kit"|"Mickey S.mores Kit"|"Fort S.Mores Kit"|"optional_add_on"|"priceConfidence"' data/processed/activity_gold_v2_preview.json
```

Expected:

```text
Campfire => price.state free
Movie Under the Stars => price.state free
Pumbaa’s Fun and Games Arcade => price.state fee
Standard resort Mickey S'mores Kit => optional_add_on, not primary paid state; $7 amount is secondary/needs Disney confirmation unless Disney-sourced
Fort Wilderness Fort S'Mores Kit => optional_add_on, $9.99, disney_menu_verified
```

- [ ] **Step 5: Spot-check source language against live/current Disney pages**

For any final public copy that mentions campfire kit amounts, verify the source class before release:

```bash
rg -n '"sourceLabel": "Disney Chuck Wagon menu"|"sourceUrl": "https://disneyworld.disney.go.com/dining/cabins-at-fort-wilderness-resort/chuck-wagon-fresh-fixins-food-truck/menus/lunch-and-dinner/"' data/processed/activity_gold_v2_preview.json
rg -n '"verificationStatus": "needs_disney_confirmation"|"priceConfidence": "secondary_verified"' data/processed/activity_gold_v2_preview.json
```

Expected: exact Fort Wilderness `$9.99` traces to Disney; standard resort `$7` kit amounts are not represented as guaranteed Disney-published prices unless their source spans prove it.

---

## Implementation Notes

- Use TDD for every behavior change. Add failing tests first, run them, then implement.
- Do not use Disney finder/index `eec-price` as public price evidence.
- Do not infer exact dollar amounts from `($)`. `($)` means paid, not an amount.
- Keep exact amount enrichment separate from price-state authority.
- Keep optional purchases separate from the primary activity label.
- Treat the Summer 2026 campfire matrix as reviewed enrichment data with confidence labels, not as a replacement for Disney source extraction.
- Fort Wilderness supply pricing is special-case menu pricing; do not project it across all resorts.
- Commit after each task passes its tests.

## Self-Review

- Spec coverage: current/live Disney URL discovery is covered by Tasks 2-3; PDF price authority is covered by Tasks 4-5; MRG amount enrichment is covered by Task 6; Summer 2026 campfire optional purchase modeling and Fort Wilderness special handling are covered by Task 6A; mixed free activity with paid add-ons is covered by Tasks 5, 6A, and 7; trust and accuracy gates are covered by Tasks 9 and 11.
- Placeholder scan: this plan contains no deferred implementation sections.
- Type consistency: the plan reuses existing `ActivityPriceOption` fields and uses `priceBasis: "optional_add_on"` instead of introducing a new price state; optional confidence/source fields are additive only if current types do not already support them.
