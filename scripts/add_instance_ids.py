#!/usr/bin/env python3
"""
Add instance/cluster IDs to GeoJSON features based on Grid 200m methodology.
This assigns each segment to its street instance for visualization.
"""

import json
from collections import defaultdict
import time

def method_grid_flood_fill(segments, grid_size):
    """Grid-based flood fill method for grouping connected segments."""
    if not segments:
        return []

    cell_to_segments = defaultdict(list)

    for seg_idx, coords in enumerate(segments):
        for coord in coords:
            lng, lat = coord[0], coord[1]
            cell_lat = round(lat / grid_size) * grid_size
            cell_lng = round(lng / grid_size) * grid_size
            cell_key = f"{cell_lat},{cell_lng}"
            if seg_idx not in cell_to_segments[cell_key]:
                cell_to_segments[cell_key].append(seg_idx)

    visited_cells = set()
    visited_segments = set()
    components = []

    for start_cell in cell_to_segments:
        if start_cell in visited_cells:
            continue

        queue = [start_cell]
        visited_cells.add(start_cell)
        component_segments = set()

        while queue:
            cell = queue.pop(0)

            for seg_idx in cell_to_segments[cell]:
                component_segments.add(seg_idx)

            lat_str, lng_str = cell.split(',')
            lat = float(lat_str)
            lng = float(lng_str)

            for dlat in [-grid_size, 0, grid_size]:
                for dlng in [-grid_size, 0, grid_size]:
                    if dlat == 0 and dlng == 0:
                        continue

                    adj_lat = round((lat + dlat) / grid_size) * grid_size
                    adj_lng = round((lng + dlng) / grid_size) * grid_size
                    adj_cell = f"{adj_lat},{adj_lng}"

                    if adj_cell in cell_to_segments and adj_cell not in visited_cells:
                        visited_cells.add(adj_cell)
                        queue.append(adj_cell)

        new_segments = component_segments - visited_segments
        if new_segments:
            components.append(list(new_segments))
            visited_segments.update(new_segments)

    return components


def add_instance_ids(input_file, output_file):
    """
    Add _instanceId property to each feature in the GeoJSON.

    Args:
        input_file: Path to input GeoJSON
        output_file: Path to output GeoJSON with instance IDs
    """
    print(f"Loading {input_file}...")
    with open(input_file, 'r') as f:
        data = json.load(f)

    features = data['features']
    print(f"Loaded {len(features)} features")

    # Group by street name
    street_features = defaultdict(list)
    for idx, feature in enumerate(features):
        name = feature['properties'].get('name', '')
        if name:
            street_features[name].append((idx, feature))

    print(f"Found {len(street_features)} unique street names")
    print("Assigning instance IDs...")

    grid_size = 200 / 111000  # 200m in degrees

    processed = 0
    for street_name, feature_list in street_features.items():
        # Extract segments for this street
        segments = []
        for idx, feature in feature_list:
            coords = feature['geometry']['coordinates']
            if coords:
                segments.append(coords)

        # Run clustering
        components = method_grid_flood_fill(segments, grid_size)

        # Check if highway (merge all components)
        is_highway = 'Highway' in street_name or 'Freeway' in street_name or 'Motorway' in street_name
        if is_highway and len(components) > 1:
            components = [sum(components, [])]  # Merge all into one

        # Assign instance IDs
        for instance_id, component in enumerate(components):
            for seg_idx in component:
                feature_idx, feature = feature_list[seg_idx]
                features[feature_idx]['properties']['_instanceId'] = instance_id
                features[feature_idx]['properties']['_totalInstances'] = len(components)

        processed += 1
        if processed % 1000 == 0:
            print(f"Processed {processed}/{len(street_features)} streets...")

    print(f"\nSaving to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(data, f, separators=(',', ':'))  # Compact JSON

    print("Done!")


if __name__ == '__main__':
    import sys
    if len(sys.argv) != 3:
        print("Usage: python3 add_instance_ids.py input.geojson output.geojson")
        sys.exit(1)

    add_instance_ids(sys.argv[1], sys.argv[2])
