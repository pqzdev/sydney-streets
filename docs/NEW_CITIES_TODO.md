# New Cities Data TODO

## Cities Added to UI
- Adelaide
- Canberra
- Hobart

## Data Processing Steps Required

For each city, follow these steps:

### 1. Download OSM Data
Use the new unified download script with official GCCSA boundaries:
```bash
python scripts/download_city_data.py adelaide
python scripts/download_city_data.py canberra
python scripts/download_city_data.py hobart
```

**Note:** The old city-specific download scripts (e.g., `download_adelaide_data.py`) are deprecated.
Use `download_city_data.py` instead, which uses official ABS GCCSA boundaries.
See [METROPOLITAN_BOUNDARIES.md](METROPOLITAN_BOUNDARIES.md) for details.

### 2. Process Full Dataset
Use the existing `process_full_dataset.py` script for each city:
```bash
python scripts/process_full_dataset.py --city adelaide
python scripts/process_full_dataset.py --city canberra
python scripts/process_full_dataset.py --city hobart
```

### 3. Add Instance IDs
```bash
python scripts/add_instance_ids.py --city adelaide
python scripts/add_instance_ids.py --city canberra
python scripts/add_instance_ids.py --city hobart
```

### 4. Generate SQL Batches for D1
```bash
python scripts/generate_sql_batches.py adelaide
python scripts/generate_sql_batches.py canberra
python scripts/generate_sql_batches.py hobart
```

### 5. Upload to Cloudflare D1
```bash
cd worker
./upload_batches.sh adelaide
./upload_batches.sh canberra
./upload_batches.sh hobart
```

## Official GCCSA Boundaries

All cities now use official GCCSA (Greater Capital City Statistical Area) boundaries from the
Australian Bureau of Statistics (ASGS Edition 3, 2021-2026).

**Adelaide (Greater Adelaide GCCSA):**
- GCCSA Bounds: [-35.3503, 138.4357] to [-34.5002, 139.0440]
- Center: [-34.9285, 138.6007]
- Code: 4GADE

**Canberra (Australian Capital Territory GCCSA):**
- GCCSA Bounds: [-35.9205, 148.7628] to [-35.1244, 149.3993]
- Center: [-35.2809, 149.1300]
- Code: 8ACTE

**Hobart (Greater Hobart GCCSA):**
- GCCSA Bounds: [-43.1213, 147.0267] to [-42.6554, 147.9369]
- Center: [-42.8821, 147.3272]
- Code: 6GHOB

For full details on the boundary system, see [METROPOLITAN_BOUNDARIES.md](METROPOLITAN_BOUNDARIES.md).

## Expected File Structure

After processing, each city should have:
```
data/cities/{city}/
  ├── streets.geojson   (ignored in git - served via API)
  └── counts.json       (committed to git)
```

## Status
- ✅ UI configuration added
- ✅ City selector updated
- ✅ App.js configurations added
- ⏳ OSM data download - TODO
- ⏳ Data processing - TODO
- ⏳ D1 upload - TODO
