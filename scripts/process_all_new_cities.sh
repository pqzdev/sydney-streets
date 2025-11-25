#!/bin/bash
# Automated pipeline for processing all 5 new cities
# This script waits for downloads, processes data, and uploads to D1

set -e
cd /Users/pqz/Code/sydney_streets

CITIES=("brisbane" "adelaide" "canberra" "hobart" "darwin")

echo "=================================================="
echo "Starting automated pipeline for 5 new cities"
echo "=================================================="
echo ""

# Step 1: Wait for all downloads to complete (check every 30 seconds)
echo "Step 1: Waiting for OSM downloads to complete..."
while true; do
    all_done=true
    for city in "${CITIES[@]}"; do
        if [ ! -f "data/${city}-roads-osm.geojson" ]; then
            all_done=false
            echo "  Still waiting for ${city}..."
        fi
    done

    if [ "$all_done" = true ]; then
        echo "✓ All downloads complete!"
        break
    fi

    sleep 30
done

# Step 2: Process each city (add instance IDs)
echo ""
echo "Step 2: Processing cities (adding instance IDs)..."
mkdir -p data/cities/brisbane data/cities/adelaide data/cities/canberra data/cities/hobart data/cities/darwin

for city in "${CITIES[@]}"; do
    echo "  Processing ${city}..."
    python3 scripts/add_instance_ids.py \
        "data/${city}-roads-osm.geojson" \
        "data/cities/${city}/streets.geojson"
    echo "  ✓ ${city} processed"
done

# Step 3: Generate SQL batches
echo ""
echo "Step 3: Generating SQL batches..."
for city in "${CITIES[@]}"; do
    echo "  Generating batches for ${city}..."
    python3 scripts/generate_sql_batches.py \
        "data/cities/${city}/streets.geojson" \
        "${city}" \
        "worker" \
        10000
    echo "  ✓ ${city} batches generated"
done

# Step 4: Upload to D1
echo ""
echo "Step 4: Uploading to D1 database..."
cd worker

# Create resumable upload progress for new cities
echo "brisbane 0" >> upload_progress.txt
echo "adelaide 0" >> upload_progress.txt
echo "canberra 0" >> upload_progress.txt
echo "hobart 0" >> upload_progress.txt
echo "darwin 0" >> upload_progress.txt

# Count batches for each city
BRISBANE_BATCHES=$(ls brisbane_batch_*.sql 2>/dev/null | wc -l)
ADELAIDE_BATCHES=$(ls adelaide_batch_*.sql 2>/dev/null | wc -l)
CANBERRA_BATCHES=$(ls canberra_batch_*.sql 2>/dev/null | wc -l)
HOBART_BATCHES=$(ls hobart_batch_*.sql 2>/dev/null | wc -l)
DARWIN_BATCHES=$(ls darwin_batch_*.sql 2>/dev/null | wc -l)

echo "  Brisbane: ${BRISBANE_BATCHES} batches"
echo "  Adelaide: ${ADELAIDE_BATCHES} batches"
echo "  Canberra: ${CANBERRA_BATCHES} batches"
echo "  Hobart: ${HOBART_BATCHES} batches"
echo "  Darwin: ${DARWIN_BATCHES} batches"

# Upload Brisbane
if [ $BRISBANE_BATCHES -gt 0 ]; then
    echo ""
    echo "Uploading Brisbane..."
    for i in $(seq -f "%03g" 1 $BRISBANE_BATCHES); do
        echo "  Batch $i/${BRISBANE_BATCHES}..."
        npx wrangler d1 execute street-names --remote --file="brisbane_batch_$i.sql" 2>&1 | grep -q "success" && echo "  ✓"
    done
fi

# Upload Adelaide
if [ $ADELAIDE_BATCHES -gt 0 ]; then
    echo ""
    echo "Uploading Adelaide..."
    for i in $(seq -f "%03g" 1 $ADELAIDE_BATCHES); do
        echo "  Batch $i/${ADELAIDE_BATCHES}..."
        npx wrangler d1 execute street-names --remote --file="adelaide_batch_$i.sql" 2>&1 | grep -q "success" && echo "  ✓"
    done
fi

# Upload Canberra
if [ $CANBERRA_BATCHES -gt 0 ]; then
    echo ""
    echo "Uploading Canberra..."
    for i in $(seq -f "%03g" 1 $CANBERRA_BATCHES); do
        echo "  Batch $i/${CANBERRA_BATCHES}..."
        npx wrangler d1 execute street-names --remote --file="canberra_batch_$i.sql" 2>&1 | grep -q "success" && echo "  ✓"
    done
fi

# Upload Hobart
if [ $HOBART_BATCHES -gt 0 ]; then
    echo ""
    echo "Uploading Hobart..."
    for i in $(seq -f "%03g" 1 $HOBART_BATCHES); do
        echo "  Batch $i/${HOBART_BATCHES}..."
        npx wrangler d1 execute street-names --remote --file="hobart_batch_$i.sql" 2>&1 | grep -q "success" && echo "  ✓"
    done
fi

# Upload Darwin
if [ $DARWIN_BATCHES -gt 0 ]; then
    echo ""
    echo "Uploading Darwin..."
    for i in $(seq -f "%03g" 1 $DARWIN_BATCHES); do
        echo "  Batch $i/${DARWIN_BATCHES}..."
        npx wrangler d1 execute street-names --remote --file="darwin_batch_$i.sql" 2>&1 | grep -q "success" && echo "  ✓"
    done
fi

echo ""
echo "=================================================="
echo "✓ All 5 cities processed and uploaded!"
echo "=================================================="

# Final database check
echo ""
echo "Final database statistics:"
npx wrangler d1 execute street-names --remote --command "SELECT city, COUNT(*) as segments, COUNT(DISTINCT name) as unique_names FROM street_segments GROUP BY city ORDER BY city"
