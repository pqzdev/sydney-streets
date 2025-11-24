#!/bin/bash
# Upload all batches for a city to D1

CITY=$1
if [ -z "$CITY" ]; then
    echo "Usage: ./upload_batches.sh <city_name>"
    exit 1
fi

echo "Uploading $CITY batches to D1..."

for batch in ${CITY}_batch_*.sql; do
    if [ -f "$batch" ]; then
        echo "Uploading $batch..."
        npx wrangler d1 execute street-names --remote --file="$batch"
        if [ $? -ne 0 ]; then
            echo "Error uploading $batch"
            exit 1
        fi
        sleep 1
    fi
done

echo "Done uploading $CITY!"
