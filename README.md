# After the Parks

Independent Walt Disney World resort activity planner — [aftertheparks.com](https://aftertheparks.com).

## Stack

- **Frontend**: Next.js 15 PWA on Vercel
- **Data**: Supabase (ResortGuide project)
- **DNS / Security**: Cloudflare

## Development

```bash
# Install dependencies
npm install

# Copy env template and add Supabase keys
cp .env.example .env.local

# Run dev server
npm run dev

# Production build
npm run build
```

### Environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (client + BFF) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only writes (share links, corrections) |
| `NEXT_PUBLIC_EASTER_EGGS` | Enable lore easter eggs (`true`/`false`) |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL |

### Activity ingest pipeline

```bash
cd scripts/ingest
pip install -r requirements.txt
python run_pipeline.py --local-only
```

The ingest pipeline is fail-closed: strict legacy validation, source-backed v2 fixture validation, Magical Resort Guide fact enrichment, Gold v2 promotion, and the required coverage audit must pass before publish. Production publish runs the hard cutover audit, so incomplete Gold v2 coverage cannot silently publish legacy parser output. Current v2 artifacts are written to `data/processed/activity_gold_v2_preview.json`, `data/processed/activity_review_queue_v2_preview.json`, `data/processed/activity_review_decisions_v2.json`, and `data/processed/magical_resort_guide_facts.json`.

Magical Resort Guide is used only as third-party factual enrichment for existing activities. It can widen matched Gold rows with exact venues, price details/options, reservation and age/access facts, program-family metadata, and the current schedule-validity window while preserving the official Disney source URL and hash as the source of record.

For controlled Gold v2 UI verification, run with `ACTIVITY_DATA_PIPELINE=gold-v2-preview` to read the local Gold preview artifact, or `ACTIVITY_DATA_PIPELINE=gold-v2` to read `v_public_activity_gold` from Supabase.

After the Gold v2 migrations are applied, `npm run publish:gold-v2` publishes the generated Gold preview to Supabase. It upserts source documents, stable activity catalog identities, and `public_activity_gold` rows, then fails if `check_activity_pipeline_v2_health()` reports any issue.

Use `npm run validate:contracts` for the current partial v2 path. Use `npm run validate:cutover` before making Gold v2 the default; it fails until every PDF-backed source group and legacy activity count is covered by source-backed Gold records.

Use `npm run review:activities` to list quarantined v2 candidates. Reviewer approvals can clear parser warnings only; they do not override missing source spans, fixture drift, or unsupported public claims.

### Enrichment seed

After applying migrations, seed editorial summaries:

```bash
npm run seed:enrichment
```

## Routes

| Path | Description |
|------|-------------|
| `/` | Homepage with daypart hero |
| `/today` | Rest-of-day timeline |
| `/tonight` | Evening activities + movies |
| `/activities` | Explore with filters |
| `/resorts` | All 31 resorts |
| `/plan` | Saved itinerary (offline) |
| `/calendar` | Month view |
| `/search` | Full-text search |

## Domains

| Domain | Platform |
|--------|----------|
| aftertheparks.com | Vercel (origin) + Cloudflare (proxy) |
| www.aftertheparks.com | Redirects to apex |

## Legal

Not affiliated with The Walt Disney Company. See `docs/easter-eggs.md` for lore feature review status.
