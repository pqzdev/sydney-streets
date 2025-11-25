#!/bin/bash
# Upload all filtered city data to D1

set -e

echo "========================================="
echo "Uploading Sydney (12 batches)..."
echo "========================================="
for i in {001..012}; do
    echo "=== Uploading sydney_batch_$i.sql ==="
    npx wrangler d1 execute street-names --remote --file="sydney_batch_$i.sql" 2>&1 | grep -E "(Executing|rows_written|size_after|✓)"
done

echo ""
echo "========================================="
echo "Uploading Melbourne (21 batches)..."
echo "========================================="
for i in {001..021}; do
    echo "=== Uploading melbourne_batch_$i.sql ==="
    npx wrangler d1 execute street-names --remote --file="melbourne_batch_$i.sql" 2>&1 | grep -E "(Executing|rows_written|size_after|✓)"
done

echo ""
echo "========================================="
echo "Uploading Perth (10 batches)..."
echo "========================================="
for i in {001..010}; do
    echo "=== Uploading perth_batch_$i.sql ==="
    npx wrangler d1 execute street-names --remote --file="perth_batch_$i.sql" 2>&1 | grep -E "(Executing|rows_written|size_after|✓)"
done

echo ""
echo "========================================="
echo "✓ All uploads complete!"
echo "========================================="
echo "Checking final database size..."
npx wrangler d1 execute street-names --remote --command "SELECT city, COUNT(*) as segments FROM street_segments GROUP BY city"
