#!/usr/bin/env python3
"""
Test street counting algorithm on a handful of specific streets
"""

import json
import math
from collections import defaultdict

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

    # Common road types
    types = ['street', 'st', 'road', 'rd', 'avenue', 'ave', 'drive', 'dr',
             'lane', 'ln', 'court', 'ct', 'place', 'pl', 'way', 'crescent',
             'cres', 'terrace', 'tce', 'parade', 'highway', 'hwy', 'close',
             'boulevard', 'bvd', 'circuit', 'parkway']

    parts = name.lower().split()

    # Find road type (usually last word)
    road_type = 'street'  # default
    base_name = name.lower()

    if parts:
        last_word = parts[-1]
        if last_word in types:
            road_type = last_word
            base_name = ' '.join(parts[:-1])

    return base_name, road_type

def segments_connected(seg1_coords, seg2_coords, threshold=30):
    """
    Check if two segments are connected (any point within threshold distance)
    Optimized: sample points for long segments, but always check endpoints
    """
    # For efficiency, sample points (but always include endpoints)
    def sample_coords(coords, max_points=20):
        if len(coords) <= max_points:
            return coords

        # Always include first and last
        sampled = [coords[0], coords[-1]]

        # Sample evenly from middle
        step = max(1, len(coords) // (max_points - 2))
        for i in range(step, len(coords) - 1, step):
            sampled.append(coords[i])

        return sampled

    coords1 = sample_coords(seg1_coords)
    coords2 = sample_coords(seg2_coords)

    # Check if any point in seg1 is within threshold of any point in seg2
    for c1 in coords1:
        for c2 in coords2:
            if haversine_distance(c1, c2) <= threshold:
                return True

    return False

def find_connected_components(segments, threshold=30):
    """
    Find connected components using Union-Find algorithm
    Returns: list of lists, where each inner list contains segment indices in a component
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

    # Build connectivity graph
    total_comparisons = (n * (n - 1)) // 2
    print(f"    Checking connectivity ({total_comparisons} comparisons)...")

    comparisons_done = 0
    for i in range(n):
        for j in range(i + 1, n):
            comparisons_done += 1
            if comparisons_done % 1000 == 0 or comparisons_done == total_comparisons:
                print(f"      Progress: {comparisons_done}/{total_comparisons} comparisons", end='\r')

            if segments_connected(segments[i], segments[j], threshold):
                union(i, j)

    print()  # New line after progress

    # Group by component
    components = defaultdict(list)
    for i in range(n):
        root = find(i)
        components[root].append(i)

    return list(components.values())

def test_specific_streets(geojson_path, test_streets, threshold=30):
    """
    Test street counting on specific street names

    test_streets: list of full street names to test (e.g., ["Victoria Street", "Regent Street"])
    threshold: distance in meters to consider segments connected (default 30m)
    """
    print(f"Loading data from {geojson_path}...")
    with open(geojson_path, 'r') as f:
        data = json.load(f)

    features = data['features']
    print(f"Loaded {len(features)} features\n")

    # Normalize test street names to base_type format
    test_keys = set()
    for street in test_streets:
        base_name, road_type = extract_base_and_type(street)
        key = f"{base_name}_{road_type}"
        test_keys.add(key)

    print(f"Testing streets: {test_streets}\n")
    print("="*60)

    # Group by base name + road type, but only keep test streets
    streets_by_key = defaultdict(list)

    for feature in features:
        name = feature['properties'].get('name', '')
        if not name:
            continue

        base_name, road_type = extract_base_and_type(name)
        key = f"{base_name}_{road_type}"

        if key in test_keys:
            streets_by_key[key].append({
                'coords': feature['geometry']['coordinates'],
                'feature': feature
            })

    # Process each test street
    results = {}

    for street_name in test_streets:
        base_name, road_type = extract_base_and_type(street_name)
        key = f"{base_name}_{road_type}"

        if key not in streets_by_key:
            print(f"\n❌ '{street_name}' - NOT FOUND in dataset")
            continue

        segments = streets_by_key[key]
        print(f"\n✓ '{street_name.title()}'")
        print(f"  Total segments in dataset: {len(segments)}")

        # Extract just coordinates for connectivity analysis
        coords_list = [seg['coords'] for seg in segments]

        # Find connected components
        components = find_connected_components(coords_list, threshold)

        results[key] = {
            'name': street_name.title(),
            'segments': len(segments),
            'unique_instances': len(components),
            'component_sizes': [len(c) for c in components]
        }

        print(f"  Unique street instances: {len(components)}")
        print(f"  Component sizes: {sorted([len(c) for c in components], reverse=True)}")

    # Summary
    print("\n" + "="*60)
    print("SUMMARY:")
    print("="*60)
    for street_name in test_streets:
        base_name, road_type = extract_base_and_type(street_name)
        key = f"{base_name}_{road_type}"

        if key in results:
            r = results[key]
            print(f"{r['name']}: {r['unique_instances']} instances ({r['segments']} total segments)")
        else:
            print(f"{street_name.title()}: NOT FOUND")

    print(f"\nThreshold used: {threshold}m")

    return results

if __name__ == "__main__":
    test_streets = [
        "Victoria Street",
        "Regent Street",
        "Short Street",
        "Railway Terrace",
        "Princes Highway"
    ]

    results = test_specific_streets(
        'data/sydney-roads-osm.geojson',
        test_streets,
        threshold=30
    )
