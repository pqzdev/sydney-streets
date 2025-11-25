#!/usr/bin/env python3
"""
Filter out non-street entries by name patterns (Trail, Offramp, Onramp, etc.)
"""
import json
import sys
from pathlib import Path

# Name suffixes to EXCLUDE
EXCLUDED_SUFFIXES = [
    ' Trail',
    ' Offramp',
    ' Onramp',
]

def filter_by_name(input_file, output_file=None):
    """
    Filter a GeoJSON file to remove features with excluded name patterns.

    Args:
        input_file: Path to input GeoJSON file
        output_file: Path to output file (defaults to input_file)
    """
    if output_file is None:
        output_file = input_file

    print(f"Loading {input_file}...")
    with open(input_file, 'r') as f:
        data = json.load(f)

    original_count = len(data['features'])
    print(f"Original feature count: {original_count:,}")

    # Count what we're removing
    from collections import Counter
    removed_patterns = Counter()

    # Filter features
    filtered_features = []
    for feature in data['features']:
        name = feature['properties'].get('name', '')

        # Check if name ends with any excluded suffix
        excluded = False
        for suffix in EXCLUDED_SUFFIXES:
            if name.endswith(suffix):
                removed_patterns[suffix.strip()] += 1
                excluded = True
                break

        if not excluded:
            filtered_features.append(feature)

    # Update data
    data['features'] = filtered_features

    # Save
    print(f"\nSaving filtered data to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(data, f)

    # Report
    removed_count = original_count - len(filtered_features)
    print(f"\n=== FILTERING COMPLETE ===")
    print(f"Kept: {len(filtered_features):,} features")
    print(f"Removed: {removed_count:,} features ({removed_count/original_count*100:.1f}%)")

    if removed_patterns:
        print(f"\nRemoved by pattern:")
        for pattern, count in removed_patterns.most_common():
            print(f"  {pattern:20s}: {count:6,}")

    file_size_mb = len(json.dumps(data)) / 1024 / 1024
    print(f"\nOutput file size: {file_size_mb:.1f} MB")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python filter_by_name.py <input.geojson> [output.geojson]")
        print("\nExample: python filter_by_name.py data/sydney-roads-osm.geojson")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else input_file

    filter_by_name(input_file, output_file)
