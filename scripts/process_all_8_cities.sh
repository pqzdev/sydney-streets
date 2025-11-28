#!/bin/bash
# Process street counts for all 8 Australian capital cities

set -e

echo "================================================================"
echo "PROCESSING STREET COUNTS FOR ALL 8 CITIES"
echo "================================================================"
echo ""

CITIES="sydney melbourne brisbane perth adelaide canberra hobart darwin"

for CITY in $CITIES; do
    echo "================================================================"
    echo "Processing: $CITY"
    echo "================================================================"

    INPUT="data/cities/$CITY/streets.geojson"
    OUTPUT="data/cities/$CITY/counts.json"

    if [ ! -f "$INPUT" ]; then
        echo "ERROR: $INPUT not found"
        continue
    fi

    echo "Input:  $INPUT"
    echo "Output: $OUTPUT"
    echo ""

    python3 scripts/process_full_dataset.py "$INPUT" "$OUTPUT"

    echo ""
    echo "Completed: $CITY"
    echo ""
done

echo "================================================================"
echo "ALL CITIES PROCESSED"
echo "================================================================"
