#!/bin/bash
# Upload all 8 cities to D1 database in order
set -e

echo "=== Uploading all 8 cities to D1 ==="
echo "Total batches: 63"
echo "Started: $(date)"
echo ""

count=0

# Sydney (12 batches)
for i in {001..012}; do
  count=$((count+1))
  echo "[${count}/63] Uploading sydney_batch_${i}.sql..."
  npx wrangler d1 execute street-names --remote --file="sydney_batch_${i}.sql" 2>&1 | grep -E "(rows_written|ERROR)" || echo "  ✓ Done"
done

# Melbourne (21 batches)
for i in {001..021}; do
  count=$((count+1))
  echo "[${count}/63] Uploading melbourne_batch_${i}.sql..."
  npx wrangler d1 execute street-names --remote --file="melbourne_batch_${i}.sql" 2>&1 | grep -E "(rows_written|ERROR)" || echo "  ✓ Done"
done

# Perth (10 batches)
for i in {001..010}; do
  count=$((count+1))
  echo "[${count}/63] Uploading perth_batch_${i}.sql..."
  npx wrangler d1 execute street-names --remote --file="perth_batch_${i}.sql" 2>&1 | grep -E "(rows_written|ERROR)" || echo "  ✓ Done"
done

# Brisbane (9 batches)
for i in {001..009}; do
  count=$((count+1))
  echo "[${count}/63] Uploading brisbane_batch_${i}.sql..."
  npx wrangler d1 execute street-names --remote --file="brisbane_batch_${i}.sql" 2>&1 | grep -E "(rows_written|ERROR)" || echo "  ✓ Done"
done

# Adelaide (6 batches)
for i in {001..006}; do
  count=$((count+1))
  echo "[${count}/63] Uploading adelaide_batch_${i}.sql..."
  npx wrangler d1 execute street-names --remote --file="adelaide_batch_${i}.sql" 2>&1 | grep -E "(rows_written|ERROR)" || echo "  ✓ Done"
done

# Canberra (3 batches)
for i in {001..003}; do
  count=$((count+1))
  echo "[${count}/63] Uploading canberra_batch_${i}.sql..."
  npx wrangler d1 execute street-names --remote --file="canberra_batch_${i}.sql" 2>&1 | grep -E "(rows_written|ERROR)" || echo "  ✓ Done"
done

# Hobart (1 batch)
count=$((count+1))
echo "[${count}/63] Uploading hobart_batch_001.sql..."
npx wrangler d1 execute street-names --remote --file="hobart_batch_001.sql" 2>&1 | grep -E "(rows_written|ERROR)" || echo "  ✓ Done"

# Darwin (1 batch)
count=$((count+1))
echo "[${count}/63] Uploading darwin_batch_001.sql..."
npx wrangler d1 execute street-names --remote --file="darwin_batch_001.sql" 2>&1 | grep -E "(rows_written|ERROR)" || echo "  ✓ Done"

echo ""
echo "=== Upload Complete! ==="
echo "Finished: $(date)"
echo "Uploaded 63 batches to D1 database"
