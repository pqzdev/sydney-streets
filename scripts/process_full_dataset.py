#!/usr/bin/env python3
"""
Process the full Sydney roads dataset using Grid 200m + Highway-Aware method.
Generates street counts for use in the main visualization.
"""

import json
from collections import defaultdict
import time

def method_grid_flood_fill(segments, grid_size):
    """
    Grid-based flood fill method for grouping connected segments.

    Args:
        segments: List of coordinate arrays [[lng, lat], ...]
        grid_size: Grid cell size in degrees (e.g., 200m = 0.0018 degrees)

    Returns:
        List of component groups, each group is a list of segment indices
    """
    if not segments:
        return []

    # Map segments to grid cells
    cell_to_segments = defaultdict(list)

    for seg_idx, coords in enumerate(segments):
        # Add all cells that this segment touches
        for coord in coords:
            lng, lat = coord[0], coord[1]
            # Round to nearest grid cell
            cell_lat = round(lat / grid_size) * grid_size
            cell_lng = round(lng / grid_size) * grid_size
            cell_key = f"{cell_lat},{cell_lng}"
            if seg_idx not in cell_to_segments[cell_key]:
                cell_to_segments[cell_key].append(seg_idx)

    # Flood fill to find connected components
    visited_cells = set()
    components = []

    for start_cell in cell_to_segments:
        if start_cell in visited_cells:
            continue

        # BFS from this cell
        queue = [start_cell]
        visited_cells.add(start_cell)
        component_segments = set()

        while queue:
            cell = queue.pop(0)

            # Add all segments in this cell to the component
            for seg_idx in cell_to_segments[cell]:
                component_segments.add(seg_idx)

            # Check adjacent cells (8-connected neighborhood)
            lat_str, lng_str = cell.split(',')
            lat = float(lat_str)
            lng = float(lng_str)

            for dlat in [-grid_size, 0, grid_size]:
                for dlng in [-grid_size, 0, grid_size]:
                    if dlat == 0 and dlng == 0:
                        continue

                    # Round to avoid floating point precision issues
                    adj_lat = round((lat + dlat) / grid_size) * grid_size
                    adj_lng = round((lng + dlng) / grid_size) * grid_size
                    adj_cell = f"{adj_lat},{adj_lng}"

                    if adj_cell in cell_to_segments and adj_cell not in visited_cells:
                        visited_cells.add(adj_cell)
                        queue.append(adj_cell)

        # Add component if it has segments
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


def count_street_instances(street_name, features, grid_size_meters=200):
    """
    Count instances of a street using Grid + Highway-Aware method.

    Args:
        street_name: Name of the street to count
        features: List of GeoJSON features
        grid_size_meters: Grid cell size in meters (default 200m)

    Returns:
        Number of distinct instances
    """
    # Filter features for this street name
    street_features = [f for f in features if f['properties'].get('name') == street_name]

    if not street_features:
        return 0

    # Extract segments
    segments = []
    for feature in street_features:
        coords = feature['geometry']['coordinates']
        if coords:
            segments.append(coords)

    # Convert grid size from meters to degrees (approximately)
    # At Sydney's latitude, 1 degree ≈ 111km = 111000m
    grid_size = grid_size_meters / 111000

    # Run grid flood fill
    components = method_grid_flood_fill(segments, grid_size)

    # Check if this is a highway/freeway (Highway-Aware heuristic)
    is_highway = False
    if 'Highway' in street_name or 'Freeway' in street_name or 'Motorway' in street_name:
        is_highway = True

    # If it's a highway and we found multiple components, merge them all
    if is_highway and len(components) > 1:
        return 1

    return len(components)


def process_dataset(input_file, output_file):
    """
    Process the full dataset and generate street counts.

    Args:
        input_file: Path to GeoJSON file
        output_file: Path to output JSON file with counts
    """
    print(f"Loading {input_file}...")
    with open(input_file, 'r') as f:
        data = json.load(f)

    features = data['features']
    print(f"Loaded {len(features)} features")

    # Get all unique street names
    street_names = set()
    for feature in features:
        name = feature['properties'].get('name')
        if name:
            street_names.add(name)

    print(f"Found {len(street_names)} unique street names")

    # Count instances for each street
    street_counts = {}
    start_time = time.time()

    for i, street_name in enumerate(sorted(street_names)):
        count = count_street_instances(street_name, features, grid_size_meters=200)
        street_counts[street_name] = count

        if (i + 1) % 100 == 0:
            elapsed = time.time() - start_time
            avg_time = elapsed / (i + 1)
            remaining = avg_time * (len(street_names) - i - 1)
            print(f"Processed {i + 1}/{len(street_names)} streets ({elapsed:.1f}s elapsed, ~{remaining:.1f}s remaining)")

    total_time = time.time() - start_time
    print(f"\nCompleted in {total_time:.2f} seconds")
    print(f"Average time per street: {total_time / len(street_names):.4f} seconds")

    # Save results
    output_data = {
        'method': 'Grid 200m + Highway-Aware',
        'grid_size_meters': 200,
        'total_streets': len(street_names),
        'total_segments': len(features),
        'processing_time_seconds': total_time,
        'counts': street_counts
    }

    print(f"\nSaving results to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)

    # Print some statistics
    print("\n=== Top 20 Most Common Street Names ===")
    sorted_counts = sorted(street_counts.items(), key=lambda x: x[1], reverse=True)
    for name, count in sorted_counts[:20]:
        print(f"{name}: {count} instances")

    print("\n=== Highways/Freeways ===")
    highways = [(name, count) for name, count in street_counts.items()
                if 'Highway' in name or 'Freeway' in name or 'Motorway' in name]
    for name, count in sorted(highways, key=lambda x: x[1], reverse=True):
        print(f"{name}: {count} instance(s)")


if __name__ == '__main__':
    import sys

    if len(sys.argv) >= 3:
        input_file = sys.argv[1]
        output_file = sys.argv[2]
    else:
        input_file = 'data/sydney-roads-osm.geojson'
        output_file = 'data/street_counts_grid200.json'

    process_dataset(input_file, output_file)
