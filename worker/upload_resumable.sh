#!/bin/bash
# Resumable upload script for D1 database
# Tracks progress in upload_progress.txt and can be stopped/resumed

set -e

PROGRESS_FILE="upload_progress.txt"

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
    echo "sydney 0" > "$PROGRESS_FILE"
    echo "melbourne 0" >> "$PROGRESS_FILE"
    echo "perth 0" >> "$PROGRESS_FILE"
fi

# Function to get current batch for a city
get_batch() {
    city=$1
    grep "^$city " "$PROGRESS_FILE" | awk '{print $2}'
}

# Function to update progress
update_progress() {
    city=$1
    batch=$2
    # Update the line for this city
    sed -i.bak "s/^$city .*/$city $batch/" "$PROGRESS_FILE"
}

# Upload Sydney batches (001-012)
echo "=========================================="
echo "Uploading Sydney (12 batches)..."
echo "=========================================="
sydney_start=$(get_batch "sydney")
for i in $(seq -f "%03g" $((sydney_start + 1)) 12); do
    batch_file="sydney_batch_$i.sql"
    if [ ! -f "$batch_file" ]; then
        echo "✗ Missing $batch_file, skipping..."
        continue
    fi

    echo "=== Uploading $batch_file (batch $i/12) ==="
    if npx wrangler d1 execute street-names --remote --file="$batch_file" 2>&1 | grep -q "success"; then
        update_progress "sydney" "$i"
        echo "✓ Batch $i complete"
    else
        echo "✗ Batch $i failed!"
        exit 1
    fi
done

# Upload Melbourne batches (001-021)
echo ""
echo "=========================================="
echo "Uploading Melbourne (21 batches)..."
echo "=========================================="
melbourne_start=$(get_batch "melbourne")
for i in $(seq -f "%03g" $((melbourne_start + 1)) 21); do
    batch_file="melbourne_batch_$i.sql"
    if [ ! -f "$batch_file" ]; then
        echo "✗ Missing $batch_file, skipping..."
        continue
    fi

    echo "=== Uploading $batch_file (batch $i/21) ==="
    if npx wrangler d1 execute street-names --remote --file="$batch_file" 2>&1 | grep -q "success"; then
        update_progress "melbourne" "$i"
        echo "✓ Batch $i complete"
    else
        echo "✗ Batch $i failed!"
        exit 1
    fi
done

# Upload Perth batches (001-010)
echo ""
echo "=========================================="
echo "Uploading Perth (10 batches)..."
echo "=========================================="
perth_start=$(get_batch "perth")
for i in $(seq -f "%03g" $((perth_start + 1)) 10); do
    batch_file="perth_batch_$i.sql"
    if [ ! -f "$batch_file" ]; then
        echo "✗ Missing $batch_file, skipping..."
        continue
    fi

    echo "=== Uploading $batch_file (batch $i/10) ==="
    if npx wrangler d1 execute street-names --remote --file="$batch_file" 2>&1 | grep -q "success"; then
        update_progress "perth" "$i"
        echo "✓ Batch $i complete"
    else
        echo "✗ Batch $i failed!"
        exit 1
    fi
done

echo ""
echo "=========================================="
echo "✓ All uploads complete!"
echo "=========================================="
echo "Checking final database..."
npx wrangler d1 execute street-names --remote --command "SELECT city, COUNT(*) as segments, COUNT(DISTINCT name) as unique_names FROM street_segments GROUP BY city"
