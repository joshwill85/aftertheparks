# After the Parks

Walt Disney World resort activity guides and planning — [aftertheparks.com](https://aftertheparks.com).

## Stack

- **Frontend**: Static site on Vercel
- **Data**: Supabase (ResortGuide project)
- **DNS / Security**: Cloudflare

## Development

```bash
# Activity ingest pipeline
cd scripts/ingest
pip install -r requirements.txt
python run_pipeline.py --local-only
```

## Domains

| Domain | Platform |
|--------|----------|
| aftertheparks.com | Vercel (origin) + Cloudflare (proxy) |
| www.aftertheparks.com | Redirects to apex |
