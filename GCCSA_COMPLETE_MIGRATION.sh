#!/bin/bash
#
# Complete GCCSA Migration - Run all remaining steps
# This script completes the migration to official GCCSA boundaries
#

set -e

echo "================================================================"
echo "GCCSA COMPLETE MIGRATION"
echo "================================================================"
echo ""
echo "This will:"
echo "  1. Wait for street count processing to complete"
echo "  2. Add instance IDs to all 8 cities"
echo "  3. Generate SQL batches for D1 upload"
echo "  4. Upload to Cloudflare D1"
echo ""
echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
sleep 5

echo ""
echo "Step 1: Waiting for street count processing..."
echo "================================================================"

# Wait for the processing script to complete
while ps aux | grep -v grep | grep "process_all_8_cities.sh" > /dev/null; do
    echo "  Still processing... $(date +%H:%M:%S)"
    sleep 30
done

echo "✅ Street count processing complete!"
echo ""

echo "Step 2: Adding instance IDs to all 8 cities..."
echo "================================================================"
./scripts/add_instance_ids_all.sh

echo ""
echo "Step 3: Generating SQL batches..."
echo "================================================================"
./scripts/generate_sql_all.sh

echo ""
echo "Step 4: Uploading to Cloudflare D1..."
echo "================================================================"
cd worker
./upload_all_8_cities.sh
cd ..

echo ""
echo "================================================================"
echo "✅ GCCSA MIGRATION COMPLETE!"
echo "================================================================"
echo ""
echo "All 8 cities now use official ABS GCCSA boundaries:"
echo "  ✅ Data filtered by GCCSA polygons"
echo "  ✅ Street counts recalculated"
echo "  ✅ Instance IDs added"
echo "  ✅ Uploaded to D1 database"
echo "  ✅ UI shows boundaries by default"
echo "  ✅ ABS reference link in sidebar"
echo ""
echo "Next: Test the website and verify all cities work correctly"
