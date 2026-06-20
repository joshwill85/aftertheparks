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
