#!/usr/bin/env python3
"""
Filter out non-street highway types from existing GeoJSON files.
This removes paths, tracks, cycleways, etc. and keeps only actual streets.
"""
import json
import sys
from pathlib import Path

# Highway types to EXCLUDE (non-streets)
NON_STREET_TYPES = {
    'track',           # Unpaved tracks, fire trails
    'path',            # Walking/hiking paths
    'cycleway',        # Dedicated bike paths
    'footway',         # Pedestrian walkways
    'steps',           # Staircases
    'pedestrian',      # Pedestrian zones
    'service',         # Service roads (driveways, parking aisles)
    'busway',          # Bus-only roads
    'bridleway',       # Horse riding paths
    'corridor',        # Indoor corridors
    'construction',    # Roads under construction
    'proposed',        # Proposed roads
    'raceway',         # Race tracks
    'emergency_bay',   # Emergency stopping bays
    'escape',          # Escape lanes
    'services',        # Service areas
    'elevator',        # Elevators
    'no',              # Not a highway
}

def filter_geojson(input_file, output_file=None):
    """
    Filter a GeoJSON file to remove non-street features.

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
    removed_types = Counter()

    # Filter features
    filtered_features = []
    for feature in data['features']:
        highway_type = feature['properties'].get('highway', '')

        if highway_type in NON_STREET_TYPES:
            removed_types[highway_type] += 1
        else:
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

    if removed_types:
        print(f"\nRemoved highway types:")
        for hwy_type, count in removed_types.most_common():
            print(f"  {hwy_type:20s}: {count:6,}")

    file_size_mb = len(json.dumps(data)) / 1024 / 1024
    print(f"\nOutput file size: {file_size_mb:.1f} MB")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python filter_street_types.py <input.geojson> [output.geojson]")
        print("\nExample: python filter_street_types.py data/perth-roads-osm.geojson")
        print("         python filter_street_types.py data/sydney.geojson data/sydney-filtered.geojson")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else input_file

    filter_geojson(input_file, output_file)
