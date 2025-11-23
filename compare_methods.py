#!/usr/bin/env python3
"""
Compare different street counting methods
"""

import json
import math
import time
from collections import defaultdict
from scipy.spatial import KDTree
import numpy as np

def haversine_distance(coord1, coord2):
    """Calculate distance in meters between two [lng, lat] coordinates"""
    lon1, lat1 = coord1
    lon2, lat2 = coord2

    R = 6371000  # Earth radius in meters

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    return R * c

def extract_base_and_type(name):
    """Extract base name and road type from full street name"""
    name = name.strip()

    types = ['street', 'st', 'road', 'rd', 'avenue', 'ave', 'drive', 'dr',
             'lane', 'ln', 'court', 'ct', 'place', 'pl', 'way', 'crescent',
             'cres', 'terrace', 'tce', 'parade', 'highway', 'hwy', 'close',
             'boulevard', 'bvd', 'circuit', 'parkway']

    parts = name.lower().split()

    road_type = 'street'
    base_name = name.lower()

    if parts:
        last_word = parts[-1]
        if last_word in types:
            road_type = last_word
            base_name = ' '.join(parts[:-1])

    return base_name, road_type

# ============================================================================
# METHOD 1: Point-to-Point Distance (Current Best)
# ============================================================================

def method1_point_to_point(segments, threshold=30):
    """
    Check all points against all points
    """
    def sample_coords(coords, max_points=20):
        if len(coords) <= max_points:
            return coords
        sampled = [coords[0], coords[-1]]
        step = max(1, len(coords) // (max_points - 2))
        for i in range(step, len(coords) - 1, step):
            sampled.append(coords[i])
        return sampled

    def segments_connected(seg1_coords, seg2_coords):
        coords1 = sample_coords(seg1_coords)
        coords2 = sample_coords(seg2_coords)
        for c1 in coords1:
            for c2 in coords2:
                if haversine_distance(c1, c2) <= threshold:
                    return True
        return False

    n = len(segments)
    parent = list(range(n))

    def find(x):
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]

    def union(x, y):
        px, py = find(x), find(y)
        if px != py:
            parent[px] = py

    for i in range(n):
        for j in range(i + 1, n):
            if segments_connected(segments[i], segments[j]):
                union(i, j)

    components = defaultdict(list)
    for i in range(n):
        root = find(i)
        components[root].append(i)

    return list(components.values())

# ============================================================================
# METHOD 2: Grid-Based Flood Fill
# ============================================================================

def method2_grid_flood_fill(segments, grid_size=0.0002):
    """
    Use grid cells and flood fill to find connected regions
    grid_size: 0.0002 ≈ 20m, 0.0005 ≈ 50m, 0.001 ≈ 100m

    FIXED: Now uses Union-Find to ensure each segment belongs to only one component
    """
    # Map each segment to the grid cells it touches
    segment_to_cells = defaultdict(set)
    cell_to_segments = defaultdict(set)

    for seg_idx, coords in enumerate(segments):
        for coord in coords:
            lat, lng = coord[1], coord[0]
            cell_lat = round(lat / grid_size) * grid_size
            cell_lng = round(lng / grid_size) * grid_size
            cell_key = f"{cell_lat},{cell_lng}"
            segment_to_cells[seg_idx].add(cell_key)
            cell_to_segments[cell_key].add(seg_idx)

    # Use Union-Find to group segments that share grid cells or are in adjacent cells
    n = len(segments)
    parent = list(range(n))

    def find(x):
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]

    def union(x, y):
        px, py = find(x), find(y)
        if px != py:
            parent[px] = py

    # For each cell, get all segments in that cell and adjacent cells
    visited_cells = set()

    for cell in cell_to_segments.keys():
        if cell in visited_cells:
            continue

        # Get all cells in this flood-filled region
        region_cells = set()
        queue = [cell]
        visited_cells.add(cell)
        region_cells.add(cell)

        while queue:
            current_cell = queue.pop(0)
            lat, lng = map(float, current_cell.split(','))

            # Check 8 adjacent cells
            for dlat in [-grid_size, 0, grid_size]:
                for dlng in [-grid_size, 0, grid_size]:
                    adj_cell = f"{lat+dlat},{lng+dlng}"
                    if adj_cell in cell_to_segments and adj_cell not in visited_cells:
                        visited_cells.add(adj_cell)
                        queue.append(adj_cell)
                        region_cells.add(adj_cell)

        # Get all segments in this region
        region_segments = set()
        for region_cell in region_cells:
            region_segments.update(cell_to_segments[region_cell])

        # Union all segments in this region
        if region_segments:
            region_list = list(region_segments)
            for i in range(1, len(region_list)):
                union(region_list[0], region_list[i])

    # Build components from Union-Find
    components = defaultdict(list)
    for i in range(n):
        root = find(i)
        components[root].append(i)

    return list(components.values())

# ============================================================================
# METHOD 3: K-D Tree Nearest Neighbor
# ============================================================================

def method3_kdtree(segments, threshold=30):
    """
    Use K-D tree for fast spatial queries
    """
    # Build point cloud with segment IDs
    points = []
    point_to_segment = []

    for seg_idx, coords in enumerate(segments):
        # Sample points
        if len(coords) <= 20:
            sampled = coords
        else:
            sampled = [coords[0], coords[-1]]
            step = max(1, len(coords) // 18)
            for i in range(step, len(coords) - 1, step):
                sampled.append(coords[i])

        for coord in sampled:
            # Convert to Cartesian approximation for K-D tree
            # At Sydney's latitude, 1 degree ≈ 111km
            x = coord[0] * 111000 * math.cos(math.radians(coord[1]))
            y = coord[1] * 111000
            points.append([x, y])
            point_to_segment.append(seg_idx)

    points = np.array(points)
    tree = KDTree(points)

    # Find which segments are connected
    n = len(segments)
    parent = list(range(n))

    def find(x):
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]

    def union(x, y):
        px, py = find(x), find(y)
        if px != py:
            parent[px] = py

    # For each segment, find nearby points
    checked_pairs = set()

    for seg_idx, coords in enumerate(segments):
        # Get center point
        mid_idx = len(coords) // 2
        center = coords[mid_idx]
        x = center[0] * 111000 * math.cos(math.radians(center[1]))
        y = center[1] * 111000

        # Query nearby points
        indices = tree.query_ball_point([x, y], threshold * 2)  # Be generous

        for idx in indices:
            other_seg = point_to_segment[idx]
            if other_seg != seg_idx:
                pair = tuple(sorted([seg_idx, other_seg]))
                if pair not in checked_pairs:
                    checked_pairs.add(pair)
                    # Check actual distance
                    min_dist = float('inf')
                    for c1 in coords[:min(len(coords), 10)]:
                        for c2 in segments[other_seg][:min(len(segments[other_seg]), 10)]:
                            dist = haversine_distance(c1, c2)
                            min_dist = min(min_dist, dist)
                            if dist <= threshold:
                                union(seg_idx, other_seg)
                                break
                        if min_dist <= threshold:
                            break

    components = defaultdict(list)
    for i in range(n):
        root = find(i)
        components[root].append(i)

    return list(components.values())

# ============================================================================
# METHOD 4: Polygon Buffer Intersection
# ============================================================================

def method4_polygon_buffer(segments, buffer_distance=30):
    """
    Create buffer polygons around each segment and check for intersections
    Uses Shapely library for geometric operations
    buffer_distance: distance in meters to buffer around each segment
    """
    try:
        from shapely.geometry import LineString, Point
        from shapely.ops import unary_union
    except ImportError:
        print("Warning: Shapely not installed. Install with: pip install shapely")
        return [[i] for i in range(len(segments))]

    # Convert lat/lng coordinates to approximate meters
    # At Sydney's latitude (~-33.87°), 1 degree ≈ 111km latitude, ~93km longitude
    def lat_lng_to_meters(coord):
        lng, lat = coord
        x = lng * 93000  # meters
        y = lat * 111000  # meters
        return (x, y)

    # Create LineString geometries with buffers
    buffered_geometries = []
    for coords in segments:
        if len(coords) < 2:
            buffered_geometries.append(None)
            continue

        # Convert to meters
        meter_coords = [lat_lng_to_meters(c) for c in coords]
        line = LineString(meter_coords)
        buffered = line.buffer(buffer_distance)
        buffered_geometries.append(buffered)

    # Use Union-Find to group intersecting polygons
    n = len(segments)
    parent = list(range(n))

    def find(x):
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]

    def union(x, y):
        px, py = find(x), find(y)
        if px != py:
            parent[px] = py

    # Check all pairs for intersection
    for i in range(n):
        if buffered_geometries[i] is None:
            continue
        for j in range(i + 1, n):
            if buffered_geometries[j] is None:
                continue

            # Check if buffers intersect
            if buffered_geometries[i].intersects(buffered_geometries[j]):
                union(i, j)

    # Build components
    components = defaultdict(list)
    for i in range(n):
        root = find(i)
        components[root].append(i)

    return list(components.values())

# ============================================================================
# METHOD 5: Endpoint Distance Only
# ============================================================================

def method5_endpoint_only(segments, threshold=30, segments_with_props=None):
    """
    Only check segment endpoints (faster but less accurate)
    If segments_with_props provided, use adaptive threshold for highways/motorways
    """
    n = len(segments)
    parent = list(range(n))

    def find(x):
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]

    def union(x, y):
        px, py = find(x), find(y)
        if px != py:
            parent[px] = py

    # Get endpoints for each segment
    endpoints = []
    for coords in segments:
        endpoints.append((coords[0], coords[-1]))

    # Check if segments are major roads (highways/motorways)
    def is_major_road(seg_idx):
        if segments_with_props is None:
            return False
        highway_type = segments_with_props[seg_idx].get('properties', {}).get('highway', '')
        return highway_type in ['trunk', 'motorway', 'primary']

    # Check endpoint distances
    for i in range(n):
        for j in range(i + 1, n):
            ep_i = endpoints[i]
            ep_j = endpoints[j]

            # Use larger threshold for major roads
            current_threshold = threshold
            if segments_with_props:
                if is_major_road(i) or is_major_road(j):
                    current_threshold = 2000  # 2km for highways/motorways

            # Check all 4 combinations of endpoints
            min_dist = min(
                haversine_distance(ep_i[0], ep_j[0]),
                haversine_distance(ep_i[0], ep_j[1]),
                haversine_distance(ep_i[1], ep_j[0]),
                haversine_distance(ep_i[1], ep_j[1])
            )

            if min_dist <= current_threshold:
                union(i, j)

    components = defaultdict(list)
    for i in range(n):
        root = find(i)
        components[root].append(i)

    return list(components.values())

# ============================================================================
# METHOD 5: Centroid Grid (Simplest)
# ============================================================================

def method5_centroid_grid(segments, grid_size=0.001):
    """
    Simplest: just group by centroid grid cell
    """
    grid_to_segments = defaultdict(list)

    for seg_idx, coords in enumerate(segments):
        # Calculate centroid
        lat_sum = sum(c[1] for c in coords)
        lng_sum = sum(c[0] for c in coords)
        centroid_lat = lat_sum / len(coords)
        centroid_lng = lng_sum / len(coords)

        # Grid cell
        cell_lat = round(centroid_lat / grid_size) * grid_size
        cell_lng = round(centroid_lng / grid_size) * grid_size
        cell_key = f"{cell_lat},{cell_lng}"

        grid_to_segments[cell_key].append(seg_idx)

    return list(grid_to_segments.values())

# ============================================================================
# Main Comparison
# ============================================================================

def compare_methods(geojson_path, test_streets):
    """Compare all methods on test streets"""

    print(f"Loading data from {geojson_path}...")
    with open(geojson_path, 'r') as f:
        data = json.load(f)

    features = data['features']

    # Collect test streets
    streets_data = {}

    for street_name in test_streets:
        base_name, road_type = extract_base_and_type(street_name)
        key = f"{base_name}_{road_type}"

        segments = []
        for feature in features:
            name = feature['properties'].get('name', '')
            if not name:
                continue

            fb, ft = extract_base_and_type(name)
            fkey = f"{fb}_{ft}"

            if fkey == key:
                segments.append({
                    'coords': feature['geometry']['coordinates'],
                    'feature': feature
                })

        if segments:
            streets_data[street_name] = segments

    # Test each method
    results = {}

    methods = [
        ("Point-to-Point (30m)", lambda s: method1_point_to_point([seg['coords'] for seg in s], 30)),
        ("Point-to-Point (50m)", lambda s: method1_point_to_point([seg['coords'] for seg in s], 50)),
        ("Point-to-Point (100m)", lambda s: method1_point_to_point([seg['coords'] for seg in s], 100)),
        ("Grid 50m + Flood Fill", lambda s: method2_grid_flood_fill([seg['coords'] for seg in s], 0.0005)),
        ("Grid 100m + Flood Fill", lambda s: method2_grid_flood_fill([seg['coords'] for seg in s], 0.001)),
        ("Grid 200m + Flood Fill", lambda s: method2_grid_flood_fill([seg['coords'] for seg in s], 0.002)),
        ("Polygon Buffer (30m)", lambda s: method4_polygon_buffer([seg['coords'] for seg in s], 30)),
        ("Polygon Buffer (50m)", lambda s: method4_polygon_buffer([seg['coords'] for seg in s], 50)),
        ("Endpoint Only (30m)", lambda s: method5_endpoint_only([seg['coords'] for seg in s], 30)),
        ("Endpoint Only (100m)", lambda s: method5_endpoint_only([seg['coords'] for seg in s], 100)),
        ("Endpoint Adaptive", lambda s: method5_endpoint_only([seg['coords'] for seg in s], 30, s)),
    ]

    for street_name, segments in streets_data.items():
        print(f"\n{'='*60}")
        print(f"Testing: {street_name} ({len(segments)} segments)")
        print(f"{'='*60}")

        results[street_name] = {}

        for method_name, method_func in methods:
            print(f"\n{method_name}...", end=' ', flush=True)

            start_time = time.time()
            try:
                components = method_func(segments)
                elapsed = time.time() - start_time

                count = len(components)
                print(f"{count} instances in {elapsed:.3f}s")

                results[street_name][method_name] = {
                    'count': count,
                    'time': elapsed,
                    'components': components
                }
            except Exception as e:
                print(f"ERROR: {e}")
                results[street_name][method_name] = {
                    'count': 'ERROR',
                    'time': 0,
                    'components': []
                }

    # Print comparison table
    print("\n\n" + "="*80)
    print("COMPARISON TABLE")
    print("="*80)

    # Header
    print(f"\n{'Method':<30}", end='')
    for street in test_streets:
        if street in streets_data:
            print(f"{street[:15]:>15}", end='')
    print()

    print("-" * 80)

    # Rows
    for method_name, _ in methods:
        print(f"{method_name:<30}", end='')
        for street in test_streets:
            if street in streets_data and method_name in results[street]:
                count = results[street][method_name]['count']
                if isinstance(count, int):
                    print(f"{count:>15}", end='')
                else:
                    print(f"{count:>15}", end='')
        print()

    # Timing table
    print("\n\n" + "="*80)
    print("TIMING (seconds)")
    print("="*80)

    print(f"\n{'Method':<30}", end='')
    for street in test_streets:
        if street in streets_data:
            print(f"{street[:15]:>15}", end='')
    print()

    print("-" * 80)

    for method_name, _ in methods:
        print(f"{method_name:<30}", end='')
        for street in test_streets:
            if street in streets_data and method_name in results[street]:
                t = results[street][method_name]['time']
                print(f"{t:>14.3f}s", end='')
        print()

    # Save results
    output = {
        'streets': test_streets,
        'results': {}
    }

    for street in test_streets:
        if street in results:
            output['results'][street] = {}
            for method_name in results[street]:
                output['results'][street][method_name] = {
                    'count': results[street][method_name]['count'],
                    'time': results[street][method_name]['time']
                }

    with open('data/method_comparison.json', 'w') as f:
        json.dump(output, f, indent=2)

    print("\n\nResults saved to data/method_comparison.json")

    # Save detailed components for visualization
    detailed_output = {}
    for street_name in streets_data:
        detailed_output[street_name] = {}
        for method_name in results[street_name]:
            detailed_output[street_name][method_name] = {
                'count': results[street_name][method_name]['count'],
                'components': results[street_name][method_name]['components']
            }

    with open('data/method_comparison_detailed.json', 'w') as f:
        json.dump(detailed_output, f, indent=2)

    print("Detailed results saved to data/method_comparison_detailed.json")

    return results, streets_data

if __name__ == "__main__":
    test_streets = [
        "Victoria Street",
        "Regent Street",
        "Short Street",
        "Railway Terrace",
        "Princes Highway",
        "Park Street",
        "George Street",
        "Elizabeth Street",
        "William Street",
        "King Street",
        "Church Street",
        "Windsor Street",
        "Albert Street",
        "Parramatta Road",
        "Liverpool Road",
        "Victoria Road"
    ]

    results, streets_data = compare_methods(
        'data/sydney-roads-osm.geojson',
        test_streets
    )
