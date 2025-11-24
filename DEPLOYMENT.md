# Deployment Guide: Backend API Architecture

This guide covers deploying the Street Names visualization with a Cloudflare Workers backend API.

## Architecture Overview

**Frontend**: Static HTML/JS hosted on Cloudflare Pages
**Backend**: Cloudflare Worker with D1 (SQLite) database
**Benefits**:
- No file size limits (25MB Cloudflare Pages limit removed)
- Full coordinate precision (no rounding)
- Viewport-based loading (only fetch visible streets)
- Scalable to any city size
- Fast search and filtering

## Prerequisites

1. Cloudflare account
2. Wrangler CLI: `npm install -g wrangler`
3. Logged in: `wrangler login`

## Step 1: Create D1 Database

```bash
cd worker
wrangler d1 create street-names
```

This will output a database ID. Copy it and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "street-names"
database_id = "YOUR_DATABASE_ID_HERE"  # Paste the ID here
```

## Step 2: Initialize Database Schema

```bash
# Local development database
wrangler d1 execute street-names --local --file=schema.sql

# Production database
wrangler d1 execute street-names --remote --file=schema.sql
```

## Step 3: Populate Database with Data

### Generate SQL INSERT statements

```bash
cd ..
python3 scripts/populate_d1_database.py data/sydney-roads-web.geojson sydney > worker/sydney.sql
python3 scripts/populate_d1_database.py data/melbourne-roads-web.geojson melbourne > worker/melbourne.sql
```

### Execute SQL (in batches due to D1 limits)

D1 has a limit on statement size, so we'll need to batch the inserts:

```bash
cd worker

# For local testing
wrangler d1 execute street-names --local --file=sydney.sql

# For production (may need to split into smaller files)
# Split file if needed:
split -l 5000 sydney.sql sydney_batch_

# Then execute each batch:
for file in sydney_batch_*; do
  echo "Executing $file..."
  wrangler d1 execute street-names --remote --file=$file
done
```

**Note**: If files are too large, you may need to use a smaller batch size or import via CSV:

```bash
# Alternative: Convert to CSV and use D1 import
# TODO: Create CSV conversion script if needed
```

## Step 4: Deploy Worker

```bash
cd worker
wrangler deploy
```

This will output your worker URL, e.g., `https://street-names-api.YOUR_SUBDOMAIN.workers.dev`

## Step 5: Update Frontend Configuration

Update the API endpoint in your frontend code (app.js):

```javascript
const API_BASE_URL = 'https://street-names-api.YOUR_SUBDOMAIN.workers.dev';
```

## Step 6: Deploy Frontend

```bash
cd ..
# Commit changes
git add .
git commit -m "Add backend API architecture"
git push

# Deploy to Cloudflare Pages
# Your Pages project will auto-deploy from git push
```

## API Endpoints

### Get streets by viewport bounds
```
GET /api/streets?city=sydney&bounds=minLat,minLng,maxLat,maxLng
```

### Get specific street by name
```
GET /api/streets?city=sydney&name=Regent%20Street
```

### Get street counts
```
GET /api/counts?city=sydney
```

### Search streets
```
GET /api/search?city=sydney&query=regent
```

## Development/Testing

Test worker locally:

```bash
cd worker
wrangler dev
```

This starts a local server at `http://localhost:8787`

Query examples:
```bash
# Get counts
curl "http://localhost:8787/api/counts?city=sydney"

# Get Regent Street
curl "http://localhost:8787/api/streets?city=sydney&name=Regent%20Street"

# Search
curl "http://localhost:8787/api/search?city=sydney&query=regent"
```

## Database Size Estimates

- Sydney: ~134,000 segments = ~13MB in D1
- Melbourne: ~226,000 segments = ~22MB in D1
- D1 free tier: 5GB storage, 5M reads/day (plenty for this use case)

## Troubleshooting

### SQL file too large
If D1 rejects the SQL file, split into smaller batches:
```bash
split -l 1000 sydney.sql sydney_batch_
```

### CORS errors
Ensure `ALLOWED_ORIGIN` in wrangler.toml matches your Pages domain:
```toml
[env.production]
vars = { ALLOWED_ORIGIN = "https://street-names.pages.dev" }
```

### Slow queries
- Ensure indexes are created (check schema.sql)
- Check query uses indexed columns (city, bounds, name)
- Use LIMIT on large result sets

## Next Steps

1. Update frontend to use new API endpoints
2. Add loading indicators for async data fetching
3. Implement viewport-based lazy loading
4. Add search autocomplete
5. Consider caching frequently accessed streets in browser
