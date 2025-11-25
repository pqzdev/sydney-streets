# New Cities Data TODO

## Cities Added to UI
- Adelaide
- Canberra
- Hobart

## Data Processing Steps Required

For each city, follow these steps:

### 1. Download OSM Data
Create a download script similar to `scripts/download_perth_data.py`:
```bash
python scripts/download_adelaide_data.py
python scripts/download_canberra_data.py
python scripts/download_hobart_data.py
```

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

## City Bounding Boxes (for OSM downloads)

**Adelaide:**
- Bounds: [-35.2, 138.4] to [-34.6, 138.8]
- Center: [-34.9285, 138.6007]

**Canberra:**
- Bounds: [-35.5, 148.9] to [-35.1, 149.3]
- Center: [-35.2809, 149.1300]

**Hobart:**
- Bounds: [-43.0, 147.1] to [-42.7, 147.5]
- Center: [-42.8821, 147.3272]

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
