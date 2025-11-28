#!/bin/bash
# Add instance IDs to all 8 cities

set -e

echo "================================================================"
echo "ADDING INSTANCE IDs FOR ALL 8 CITIES"
echo "================================================================"
echo ""

CITIES="sydney melbourne brisbane perth adelaide canberra hobart darwin"

for CITY in $CITIES; do
    echo "================================================================"
    echo "Processing: $CITY"
    echo "================================================================"

    INPUT="data/cities/$CITY/streets.geojson"
    OUTPUT="data/cities/$CITY/streets.geojson"  # Overwrite in place

    if [ ! -f "$INPUT" ]; then
        echo "ERROR: $INPUT not found"
        continue
    fi

    echo "File: $INPUT"
    echo ""

    python3 scripts/add_instance_ids.py "$INPUT" "$OUTPUT" "$CITY"

    echo ""
    echo "Completed: $CITY"
    echo ""
done

echo "================================================================"
echo "ALL CITIES PROCESSED"
echo "================================================================"
