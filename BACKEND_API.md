# Backend API Architecture

## Why Backend API?

The original approach of loading entire GeoJSON files hit Cloudflare Pages' 25MB file size limit:
- Sydney: 43.4MB (segment-based) → 24.4MB (instance-based, 3 decimal precision) ✅
- Melbourne: 72.1MB (segment-based) → 39.6MB (instance-based, 3 decimal precision) ❌

Reducing coordinate precision from 4 decimals (~11m) to 3 decimals (~111m) was necessary to fit Sydney under the limit, but this degrades visualization quality.

**Backend API solves all these problems:**
1. No file size limits
2. Full coordinate precision (5+ decimals)
3. Load only visible streets (viewport-based queries)
4. Faster initial page load
5. Scalable to any city size

## Architecture

```
Frontend (Cloudflare Pages)
    ↓
Cloudflare Worker API
    ↓
D1 Database (SQLite)
```

## Database Schema

```sql
CREATE TABLE street_segments (
  id INTEGER PRIMARY KEY,
  city TEXT NOT NULL,
  name TEXT NOT NULL,
  instance_id INTEGER NOT NULL,
  geometry TEXT NOT NULL,  -- GeoJSON LineString (full precision)
  min_lat REAL,
  max_lat REAL,
  min_lng REAL,
  max_lng REAL
);

-- Spatial index for viewport queries
CREATE INDEX idx_bounds ON street_segments(city, min_lat, max_lat, min_lng, max_lng);

-- Index for name lookups
CREATE INDEX idx_name ON street_segments(city, name);
```

## API Endpoints

### 1. Get streets by viewport bounds
**Endpoint**: `GET /api/streets?city=sydney&bounds=minLat,minLng,maxLat,maxLng`

**Use case**: Load only streets visible in current map view

**Response**:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Regent Street",
        "id": 0
      },
      "geometry": {
        "type": "MultiLineString",
        "coordinates": [[[lng, lat], ...], ...]
      }
    }
  ]
}
```

### 2. Get specific street by name
**Endpoint**: `GET /api/streets?city=sydney&name=Regent Street`

**Use case**: Load all instances of a street when user searches/selects it

### 3. Get street counts
**Endpoint**: `GET /api/counts?city=sydney`

**Use case**: Populate sidebar with street counts (Top 10 list)

**Response**:
```json
{
  "method": "Grid 200m + Highway-Aware",
  "total_streets": 37815,
  "counts": {
    "William Street": 56,
    "George Street": 48,
    ...
  }
}
```

### 4. Search streets
**Endpoint**: `GET /api/search?city=sydney&query=regent`

**Use case**: Autocomplete search box

**Response**:
```json
{
  "results": [
    {"name": "Regent Street", "count": 13},
    {"name": "Regents Park Road", "count": 1}
  ]
}
```

## Frontend Changes Needed

### 1. Update data loading

**Before** (load entire file):
```javascript
const response = await fetch('data/sydney-roads-web.geojson');
const data = await response.json();
```

**After** (load on demand):
```javascript
const API_BASE = 'https://street-names-api.YOUR_SUBDOMAIN.workers.dev';

// Load counts for sidebar
const countsResponse = await fetch(`${API_BASE}/api/counts?city=sydney`);
const counts = await countsResponse.json();

// Load streets for current viewport
map.on('moveend', async () => {
  const bounds = map.getBounds();
  const boundsStr = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;

  const response = await fetch(`${API_BASE}/api/streets?city=sydney&bounds=${boundsStr}`);
  const data = await response.json();

  // Update map layer with new data
  updateMapLayer(data);
});
```

### 2. Add viewport-based loading

Only fetch streets within the current map bounds. As user pans/zooms, fetch new data.

### 3. Add loading indicators

Show spinners while fetching data from API.

### 4. Add search autocomplete

Use `/api/search` endpoint for instant street name suggestions.

## Benefits Summary

| Aspect | Before (Static GeoJSON) | After (Backend API) |
|--------|------------------------|---------------------|
| File size limit | 25MB (Cloudflare Pages) | None (D1 has 5GB free tier) |
| Sydney data size | 24.4MB (compressed precision) | ~13MB in database (full precision) |
| Melbourne data size | 39.6MB ❌ (too large) | ~22MB in database ✅ |
| Coordinate precision | 3 decimals (~111m) | 5+ decimals (~1m) |
| Initial load time | Load entire city (slow) | Load counts only (fast) |
| Viewport load | All streets loaded | Only visible streets |
| Search | Client-side filter (slow) | Database query (fast) |
| Scalability | Limited by file size | Unlimited |

## Cost

Cloudflare Free Tier:
- D1: 5GB storage, 5M reads/day
- Workers: 100k requests/day
- Pages: Unlimited

This should be more than sufficient for a personal project.

## Implementation Status

✅ Worker API created ([worker/src/index.js](worker/src/index.js))
✅ Database schema defined ([worker/schema.sql](worker/schema.sql))
✅ Population script created ([scripts/populate_d1_database.py](scripts/populate_d1_database.py))
✅ Deployment guide created ([DEPLOYMENT.md](DEPLOYMENT.md))
⏳ Frontend updates needed (viewport-based loading)
⏳ Database population
⏳ Worker deployment
⏳ Frontend deployment

## Next Steps

1. Follow [DEPLOYMENT.md](DEPLOYMENT.md) to set up D1 database and deploy Worker
2. Update frontend (app.js) to use new API endpoints
3. Test locally with `wrangler dev`
4. Deploy to production
