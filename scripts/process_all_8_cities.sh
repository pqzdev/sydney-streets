#!/bin/bash
# Process all 8 Australian capital cities with readable IDs
set -e

cd /Users/pqz/Code/sydney_streets

CITIES=("sydney" "melbourne" "perth" "brisbane" "adelaide" "canberra" "hobart" "darwin")

echo "================================================================"
echo "Processing all 8 Australian capital cities with readable IDs"
echo "================================================================"
echo ""

# Step 1: Create city directories
echo "Step 1: Creating city directories..."
for city in "${CITIES[@]}"; do
    mkdir -p "data/cities/${city}"
    echo "  ✓ data/cities/${city}"
done
echo ""

# Step 2: Process each city (add instance IDs + readable IDs)
echo "Step 2: Processing cities (adding instance IDs and readable IDs)..."
for city in "${CITIES[@]}"; do
    city_cap="$(tr '[:lower:]' '[:upper:]' <<< ${city:0:1})${city:1}"
    echo "  Processing ${city_cap}..."

    python3 scripts/add_instance_ids.py \
        "data/${city}-roads-osm.geojson" \
        "data/cities/${city}/streets.geojson" \
        "${city_cap}" 2>&1 | grep -E "(Loading|City|Found|Sample IDs|Done)" || true

    echo "  ✓ ${city_cap} processed"
    echo ""
done

echo "Step 3: Creating counts.json files..."
for city in "${CITIES[@]}"; do
    city_cap="$(tr '[:lower:]' '[:upper:]' <<< ${city:0:1})${city:1}"
    echo "  ${city_cap}..."

    python3 -c "
import json
from collections import defaultdict

with open('data/cities/${city}/streets.geojson', 'r') as f:
    data = json.load(f)

# Count instances per street name
street_counts = defaultdict(int)
for feature in data['features']:
    name = feature['properties'].get('name', '')
    if name:
        street_counts[name] += 1

# Save counts
with open('data/cities/${city}/counts.json', 'w') as f:
    json.dump(dict(street_counts), f, indent=2)

print(f'  ✓ {city_cap}: {len(street_counts)} unique streets')
"
done
echo ""

# Step 4: Generate SQL batches
echo "Step 4: Generating SQL batches..."
cd worker
rm -f *_batch_*.sql  # Clear old batches

for city in "${CITIES[@]}"; do
    city_cap="$(tr '[:lower:]' '[:upper:]' <<< ${city:0:1})${city:1}"
    echo "  Generating batches for ${city_cap}..."

    python3 ../scripts/generate_sql_batches.py \
        "../data/cities/${city}/streets.geojson" \
        "${city}" \
        "." \
        10000 2>&1 | grep -E "(Loading|Processing|Generated|Creating)" || true

    batch_count=$(ls ${city}_batch_*.sql 2>/dev/null | wc -l)
    echo "  ✓ ${city_cap}: ${batch_count} batches"
done
cd ..
echo ""

echo "================================================================"
echo "✓ All 8 cities processed!"
echo "================================================================"
echo ""
echo "Summary:"
for city in "${CITIES[@]}"; do
    city_cap="$(tr '[:lower:]' '[:upper:]' <<< ${city:0:1})${city:1}"
    batch_count=$(ls worker/${city}_batch_*.sql 2>/dev/null | wc -l)
    file_size=$(du -h "data/cities/${city}/streets.geojson" 2>/dev/null | cut -f1)
    echo "  ${city_cap}: ${batch_count} batches, ${file_size} data"
done
echo ""
echo "Next steps:"
echo "  1. Clear existing database"
echo "  2. Upload all batches to D1"
echo "  3. Update frontend to use readable_id"
