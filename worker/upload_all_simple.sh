#!/bin/bash
# Upload all SQL batches using actual filenames
set -e

echo "=== Uploading all SQL batches to D1 ==="
echo "Started: $(date)"
echo ""

count=0
total=$(ls *_batch_*.sql | wc -l | tr -d ' ')

for file in *_batch_*.sql; do
  count=$((count+1))
  echo "[${count}/${total}] Uploading $file..."
  npx wrangler d1 execute street-names --remote --file="$file" 2>&1 | grep -E "(rows_written|ERROR)" || echo "  ✓ Done"
done

echo ""
echo "=== Upload Complete! ==="
echo "Finished: $(date)"
echo "Uploaded $count batches to D1 database"
