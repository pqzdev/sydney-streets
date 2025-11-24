#!/bin/bash
# Upload all city data to D1 in parallel batches

set -e

echo "=== Starting D1 Data Upload ==="
echo "This will upload Sydney (14 batches), Melbourne (23 batches), and Perth (10 batches)"
echo ""

# Function to upload a single batch
upload_batch() {
    local file=$1
    echo "Uploading $file..."
    npx wrangler d1 execute street-names --remote --file="$file" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ $file"
    else
        echo "✗ $file FAILED"
        return 1
    fi
}

# Upload Sydney
echo "=== Sydney (14 batches) ==="
for i in $(seq -f "%03g" 1 14); do
    upload_batch "sydney_batch_$i.sql"
done

# Upload Melbourne
echo ""
echo "=== Melbourne (23 batches) ==="
for i in $(seq -f "%03g" 1 23); do
    upload_batch "melbourne_batch_$i.sql"
done

# Upload Perth
echo ""
echo "=== Perth (10 batches) ==="
for i in $(seq -f "%03g" 1 10); do
    upload_batch "perth_batch_$i.sql"
done

echo ""
echo "=== Upload Complete! ==="
npx wrangler d1 execute street-names --remote --command "SELECT city, COUNT(*) as segments, COUNT(DISTINCT name) as unique_names FROM street_segments GROUP BY city"
