#!/usr/bin/env python3
"""
Investigate specific street instances to understand clustering decisions.
"""

import json
import sys

def investigate_instances(geojson_file, street_name, instance_ids):
    """
    Show details about specific instances of a street.

    Args:
        geojson_file: Path to GeoJSON with instance IDs
        street_name: Name of street to investigate
        instance_ids: List of instance IDs to examine
    """
    print(f"Loading {geojson_file}...")
    with open(geojson_file, 'r') as f:
        data = json.load(f)

    features = data['features']

    # Find segments for this street
    street_features = [f for f in features if f['properties'].get('name') == street_name]

    if not street_features:
        print(f"No features found for '{street_name}'")
        return

    print(f"\nFound {len(street_features)} segments for '{street_name}'")
    print(f"Total instances: {street_features[0]['properties'].get('_totalInstances', '?')}")

    for instance_id in instance_ids:
        instance_segments = [f for f in street_features
                            if f['properties'].get('_instanceId') == instance_id]

        if not instance_segments:
            print(f"\nNo segments found for instance #{instance_id}")
            continue

        print(f"\n=== Instance #{instance_id} ({len(instance_segments)} segments) ===")

        # Get bounding box
        all_coords = []
        for seg in instance_segments:
            coords = seg['geometry']['coordinates']
            all_coords.extend(coords)

        lons = [c[0] for c in all_coords]
        lats = [c[1] for c in all_coords]

        min_lon, max_lon = min(lons), max(lons)
        min_lat, max_lat = min(lats), max(lats)
        center_lon = (min_lon + max_lon) / 2
        center_lat = (min_lat + max_lat) / 2

        print(f"Center: ({center_lat:.6f}, {center_lon:.6f})")
        print(f"Bounds: lat [{min_lat:.6f}, {max_lat:.6f}], lon [{min_lon:.6f}, {max_lon:.6f}]")

        # Calculate rough size in degrees
        width_deg = max_lon - min_lon
        height_deg = max_lat - min_lat
        width_m = width_deg * 111000  # Very rough approximation
        height_m = height_deg * 111000

        print(f"Size: ~{width_m:.0f}m x {height_m:.0f}m")

        # Show first and last coordinates
        first_seg = instance_segments[0]
        first_coords = first_seg['geometry']['coordinates']
        print(f"First segment: {len(first_coords)} points")
        print(f"  Start: ({first_coords[0][1]:.6f}, {first_coords[0][0]:.6f})")
        print(f"  End: ({first_coords[-1][1]:.6f}, {first_coords[-1][0]:.6f})")

    # Calculate distance between instances
    if len(instance_ids) == 2:
        inst1_segs = [f for f in street_features if f['properties'].get('_instanceId') == instance_ids[0]]
        inst2_segs = [f for f in street_features if f['properties'].get('_instanceId') == instance_ids[1]]

        if inst1_segs and inst2_segs:
            # Get center points
            inst1_coords = []
            inst2_coords = []

            for seg in inst1_segs:
                inst1_coords.extend(seg['geometry']['coordinates'])
            for seg in inst2_segs:
                inst2_coords.extend(seg['geometry']['coordinates'])

            inst1_center_lon = sum(c[0] for c in inst1_coords) / len(inst1_coords)
            inst1_center_lat = sum(c[1] for c in inst1_coords) / len(inst1_coords)

            inst2_center_lon = sum(c[0] for c in inst2_coords) / len(inst2_coords)
            inst2_center_lat = sum(c[1] for c in inst2_coords) / len(inst2_coords)

            # Calculate distance
            dlat = inst2_center_lat - inst1_center_lat
            dlon = inst2_center_lon - inst1_center_lon

            dist_deg = (dlat**2 + dlon**2)**0.5
            dist_m = dist_deg * 111000

            print(f"\n=== Distance between instances {instance_ids[0]} and {instance_ids[1]} ===")
            print(f"Center-to-center distance: ~{dist_m:.0f}m")
            print(f"Grid 200m threshold: 200m")
            print(f"Should be same instance? {dist_m < 200}")


if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: python3 investigate_instances.py <geojson> <street_name> <instance_id1> [instance_id2]")
        print("Example: python3 investigate_instances.py data/sydney-roads-web.geojson 'Regent Street' 11 12")
        sys.exit(1)

    geojson_file = sys.argv[1]
    street_name = sys.argv[2]
    instance_ids = [int(x) for x in sys.argv[3:]]

    investigate_instances(geojson_file, street_name, instance_ids)
