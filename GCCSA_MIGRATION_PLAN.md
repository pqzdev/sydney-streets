# GCCSA Migration Plan - Complete Implementation

## Objective
Migrate all 8 Australian capital cities to use official ABS GCCSA polygon boundaries for all data processing, storage, and display.

## Current Status
- ✅ GCCSA polygon boundaries downloaded and converted (all 8 cities)
- ✅ Boundary utilities implemented (Python)
- ✅ Web app can load and display boundaries
- ⚠️  Existing street data may include areas outside GCCSA
- ⚠️  Street counts not filtered by GCCSA
- ⚠️  D1 database contains unfiltered data

## Cities to Process
All 8 Australian capital cities:
1. Sydney
2. Melbourne
3. Brisbane
4. Perth
5. Adelaide
6. Canberra
7. Hobart
8. Darwin

## Implementation Steps

### Phase 1: Data Filtering (Python)
**Goal:** Filter existing streets.geojson files to only include streets within GCCSA boundaries

For each city:
1. Load existing `data/cities/{city}/streets.geojson`
2. Load GCCSA polygon boundary
3. Filter streets using polygon intersection
4. Save filtered data (backup original first)
5. Log statistics (before/after street counts)

**Script:** Create `scripts/filter_all_cities_by_gccsa.py`

### Phase 2: Street Counts Processing
**Goal:** Recalculate street name counts using GCCSA-filtered data

For each city:
1. Run `process_full_dataset.py --city {city}`
2. Generate `counts.json` with GCCSA-filtered streets
3. Verify Top 12 street names are accurate

**Existing script:** `scripts/process_full_dataset.py`

### Phase 3: Instance IDs
**Goal:** Add unique instance IDs to each street segment

For each city:
1. Run `add_instance_ids.py --city {city}`
2. Generate instance IDs for all segments

**Existing script:** `scripts/add_instance_ids.py`

### Phase 4: SQL Batch Generation
**Goal:** Generate SQL batches for D1 database upload

For each city:
1. Run `generate_sql_batches.py {city}`
2. Create batched SQL files in `worker/sql_batches/{city}/`
3. Verify batch sizes are within D1 limits

**Existing script:** `scripts/generate_sql_batches.py`

### Phase 5: D1 Upload
**Goal:** Upload GCCSA-filtered data to Cloudflare D1

For each city:
1. Clear existing city data from D1 (or truncate table)
2. Upload new SQL batches
3. Verify upload success
4. Test API queries

**Scripts:**
- `worker/upload_batches.sh`
- Manual D1 operations via wrangler

### Phase 6: UI Enhancements
**Goal:** Make GCCSA boundaries visible and add ABS reference

1. Add ABS reference link to sidebar (next to OSM credit)
2. Make boundary toggle more prominent
3. Consider showing boundary by default
4. Add tooltip explaining GCCSA

**Files to modify:**
- `index.html` - Add ABS link
- `app.js` - Boundary display settings

### Phase 7: Verification
**Goal:** Ensure all 8 cities work correctly

For each city:
1. Load city in web app
2. Verify street counts are reasonable
3. Toggle boundary overlay
4. Search for Top 12 streets
5. Verify streets are within GCCSA boundary

## Estimated Timeline
- Phase 1 (Filtering): ~30 minutes (all 8 cities)
- Phase 2 (Counts): ~20 minutes
- Phase 3 (Instance IDs): ~15 minutes
- Phase 4 (SQL Batches): ~20 minutes
- Phase 5 (D1 Upload): ~30 minutes
- Phase 6 (UI): ~10 minutes
- Phase 7 (Verification): ~20 minutes

**Total: ~2.5 hours** (mostly automated)

## Success Criteria
- ✅ All 8 cities have GCCSA-filtered street data
- ✅ Street counts reflect only GCCSA-bounded streets
- ✅ D1 database contains only GCCSA streets
- ✅ Web app displays GCCSA boundaries
- ✅ ABS reference link visible in UI
- ✅ All cities load and display correctly

## Rollback Plan
- Original data backed up before filtering
- Can restore from `data/cities/{city}/streets.geojson.backup`
- D1 can be re-uploaded from original data

## Notes
- Keep original streets.geojson as .backup files
- Log all filtering statistics
- Test with Sydney first, then roll out to all cities
- Monitor D1 storage usage
