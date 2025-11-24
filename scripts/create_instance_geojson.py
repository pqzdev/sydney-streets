#!/usr/bin/env python3
"""
Create ultra-compact GeoJSON by grouping segments into street instances.
Each feature represents one instance (not one segment), dramatically reducing file size.
"""

import json
from collections import defaultdict

def create_instance_geojson(input_file, output_file):
    """
    Convert segment-based GeoJSON to instance-based GeoJSON.

    Instead of storing each segment separately, we group all segments
    belonging to the same street instance into a single MultiLineString feature.

    This reduces:
    - Number of features (e.g., 56 segments → 13 instances for Regent Street)
    - Duplicate properties (each instance has properties once, not per segment)
    - Overall file size by ~60-70%
    """
    print(f"Loading {input_file}...")
    with open(input_file, 'r') as f:
        data = json.load(f)

    features = data['features']
    print(f"Loaded {len(features)} segment features")

    # Group segments by (street name, instance ID)
    instances = defaultdict(lambda: {
        'coordinates': [],
        'properties': None
    })

    for feature in features:
        name = feature['properties'].get('name', '')
        if not name:
            continue

        instance_id = feature['properties'].get('_instanceId', 0)
        total_instances = feature['properties'].get('_totalInstances', 1)
        highway = feature['properties'].get('highway', '')

        key = (name, instance_id)

        # Add this segment's coordinates (round to 3 decimals = ~111m precision, good for city-scale)
        coords = feature['geometry']['coordinates']
        rounded_coords = [[round(lng, 3), round(lat, 3)] for lng, lat in coords]
        instances[key]['coordinates'].append(rounded_coords)

        # Store properties (same for all segments in this instance)
        # Note: _totalInstances removed to save space (can be calculated from data)
        if instances[key]['properties'] is None:
            instances[key]['properties'] = {
                'name': name,
                'id': instance_id  # Shorter property name
            }

    # Create new features (one per instance)
    instance_features = []

    for (name, instance_id), instance_data in instances.items():
        feature = {
            'type': 'Feature',
            'geometry': {
                'type': 'MultiLineString',
                'coordinates': instance_data['coordinates']
            },
            'properties': instance_data['properties']
        }
        instance_features.append(feature)

    # Create output GeoJSON
    output_data = {
        'type': 'FeatureCollection',
        'features': instance_features
    }

    print(f"Created {len(instance_features)} instance features (from {len(features)} segments)")

    # Save
    print(f"Saving to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(output_data, f, separators=(',', ':'))

    # Report
    import os
    input_size = os.path.getsize(input_file) / (1024 * 1024)
    output_size = os.path.getsize(output_file) / (1024 * 1024)
    reduction = (1 - output_size / input_size) * 100

    print(f"\n=== Results ===")
    print(f"Features: {len(features):,} segments → {len(instance_features):,} instances")
    print(f"File size: {input_size:.1f}MB → {output_size:.1f}MB ({reduction:.1f}% reduction)")
    print(f"Average segments per instance: {len(features)/len(instance_features):.1f}")


if __name__ == '__main__':
    import sys
    if len(sys.argv) != 3:
        print("Usage: python3 create_instance_geojson.py input.geojson output.geojson")
        print("Example: python3 create_instance_geojson.py data/sydney-roads-web.geojson data/sydney-instances.geojson")
        sys.exit(1)

    create_instance_geojson(sys.argv[1], sys.argv[2])
