#!/usr/bin/env python3
"""
Add instance/cluster IDs to GeoJSON features based on Grid 200m methodology.
This assigns each segment to its street instance for visualization.
"""

import json
from collections import defaultdict
import time
import re

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

        if component_segments:
            components.append(list(component_segments))

    # Post-process: merge components that share endpoints
    components = merge_components_by_endpoints(segments, components)

    return components


def merge_components_by_endpoints(segments, components):
    """
    Merge components that share any endpoint coordinates.
    This handles the case where segments connect but fall in different grid cells.
    """
    if len(components) <= 1:
        return components

    # Build endpoint -> component mapping
    endpoint_to_components = defaultdict(set)

    for comp_idx, component in enumerate(components):
        for seg_idx in component:
            coords = segments[seg_idx]
            if coords:
                # Get first and last point
                start = tuple(coords[0])  # (lng, lat)
                end = tuple(coords[-1])
                endpoint_to_components[start].add(comp_idx)
                endpoint_to_components[end].add(comp_idx)

    # Find components that need to be merged (share endpoints)
    # Use union-find to group connected components
    parent = list(range(len(components)))

    def find(x):
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]

    def union(x, y):
        px, py = find(x), find(y)
        if px != py:
            parent[px] = py

    # Union components that share endpoints
    for endpoint, comp_indices in endpoint_to_components.items():
        if len(comp_indices) > 1:
            comp_list = list(comp_indices)
            for i in range(len(comp_list) - 1):
                union(comp_list[i], comp_list[i + 1])

    # Group segments by their merged component
    merged = defaultdict(list)
    for comp_idx, component in enumerate(components):
        root = find(comp_idx)
        merged[root].extend(component)

    return list(merged.values())


def sanitize_for_id(text):
    """Convert street name to ID-safe format."""
    # Replace spaces and special chars with underscores
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '_', text)
    return text.strip('_')


def detect_city_from_path(input_file):
    """Detect city name from file path."""
    import os
    filename = os.path.basename(input_file).lower()

    cities = ['sydney', 'melbourne', 'perth', 'brisbane', 'adelaide',
              'canberra', 'hobart', 'darwin']

    for city in cities:
        if city in filename:
            return city.capitalize()

    # Check parent directory
    parent = os.path.basename(os.path.dirname(input_file)).lower()
    for city in cities:
        if city in parent:
            return city.capitalize()

    return 'Unknown'


def add_instance_ids(input_file, output_file, city_name=None):
    """
    Add _instanceId and _readableId properties to each feature in the GeoJSON.

    Args:
        input_file: Path to input GeoJSON
        output_file: Path to output GeoJSON with instance IDs
        city_name: City name (auto-detected if not provided)
    """
    print(f"Loading {input_file}...")
    with open(input_file, 'r') as f:
        data = json.load(f)

    features = data['features']
    print(f"Loaded {len(features)} features")

    # Detect city if not provided
    if not city_name:
        city_name = detect_city_from_path(input_file)
    print(f"City: {city_name}")

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

        # Create sanitized street name for IDs
        safe_street_name = sanitize_for_id(street_name)

        # Assign instance IDs
        for instance_num, component in enumerate(components, start=1):
            # Create readable ID: Melbourne_Sydney_Road_03
            readable_id = f"{city_name}_{safe_street_name}_{instance_num:02d}"

            for seg_idx in component:
                feature_idx, feature = feature_list[seg_idx]
                # Keep numeric _instanceId for backwards compatibility (0-indexed)
                features[feature_idx]['properties']['_instanceId'] = instance_num - 1
                features[feature_idx]['properties']['_totalInstances'] = len(components)
                # Add new readable ID
                features[feature_idx]['properties']['_readableId'] = readable_id
                features[feature_idx]['properties']['_instanceNum'] = instance_num

        processed += 1
        if processed % 1000 == 0:
            print(f"Processed {processed}/{len(street_features)} streets...")

    print(f"\nSaving to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(data, f, separators=(',', ':'))  # Compact JSON

    print("Done!")

    # Show sample IDs
    sample_ids = set()
    for feature in features[:100]:
        if '_readableId' in feature['properties']:
            sample_ids.add(feature['properties']['_readableId'])
            if len(sample_ids) >= 5:
                break

    if sample_ids:
        print("\nSample IDs:")
        for rid in sorted(sample_ids)[:5]:
            print(f"  {rid}")


if __name__ == '__main__':
    import sys
    if len(sys.argv) < 3:
        print("Usage: python3 add_instance_ids.py input.geojson output.geojson [city_name]")
        sys.exit(1)

    city = sys.argv[3] if len(sys.argv) > 3 else None
    add_instance_ids(sys.argv[1], sys.argv[2], city)
