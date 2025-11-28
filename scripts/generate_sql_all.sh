#!/bin/bash
# Generate SQL batches for all 8 cities

set -e

echo "================================================================"
echo "GENERATING SQL BATCHES FOR ALL 8 CITIES"
echo "================================================================"
echo ""

CITIES="sydney melbourne brisbane perth adelaide canberra hobart darwin"

for CITY in $CITIES; do
    echo "================================================================"
    echo "Processing: $CITY"
    echo "================================================================"

    GEOJSON="data/cities/$CITY/streets.geojson"
    OUTPUT_DIR="worker"

    if [ ! -f "$GEOJSON" ]; then
        echo "ERROR: $GEOJSON not found"
        continue
    fi

    python3 scripts/generate_sql_batches.py "$GEOJSON" "$CITY" "$OUTPUT_DIR"

    echo ""
    echo "Completed: $CITY"
    echo ""
done

echo "================================================================"
echo "ALL SQL BATCHES GENERATED"
echo "================================================================"
echo ""
echo "SQL batches are in: worker/sql_batches/"
echo ""
echo "Next step: Upload to D1"
echo "cd worker && ./upload_all_8_cities.sh"
