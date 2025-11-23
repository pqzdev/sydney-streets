#!/usr/bin/env python3
"""
Visualize the connected components for test streets
Creates a GeoJSON file with each component colored differently
"""

import json
import math
import random
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
    """Check if two segments are connected"""
    def sample_coords(coords, max_points=20):
        if len(coords) <= max_points:
            return coords

        sampled = [coords[0], coords[-1]]
        step = max(1, len(coords) // (max_points - 2))
        for i in range(step, len(coords) - 1, step):
            sampled.append(coords[i])

        return sampled

    coords1 = sample_coords(seg1_coords)
    coords2 = sample_coords(seg2_coords)

    for c1 in coords1:
        for c2 in coords2:
            if haversine_distance(c1, c2) <= threshold:
                return True

    return False

def find_connected_components(segments, threshold=30):
    """Find connected components using Union-Find"""
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
    for i in range(n):
        for j in range(i + 1, n):
            if segments_connected(segments[i], segments[j], threshold):
                union(i, j)

    # Group by component
    components = defaultdict(list)
    for i in range(n):
        root = find(i)
        components[root].append(i)

    return list(components.values())

def generate_color(index, total):
    """Generate distinct colors for each component"""
    # Use HSL to generate distinct hues
    hue = (index * 360 / total) % 360
    saturation = 70 + (index % 3) * 10
    lightness = 45 + (index % 2) * 10

    # Convert HSL to RGB
    c = (1 - abs(2 * lightness / 100 - 1)) * saturation / 100
    x = c * (1 - abs((hue / 60) % 2 - 1))
    m = lightness / 100 - c / 2

    if hue < 60:
        r, g, b = c, x, 0
    elif hue < 120:
        r, g, b = x, c, 0
    elif hue < 180:
        r, g, b = 0, c, x
    elif hue < 240:
        r, g, b = 0, x, c
    elif hue < 300:
        r, g, b = x, 0, c
    else:
        r, g, b = c, 0, x

    r = int((r + m) * 255)
    g = int((g + m) * 255)
    b = int((b + m) * 255)

    return f"#{r:02x}{g:02x}{b:02x}"

def visualize_street_components(geojson_path, street_name, output_path, threshold=30):
    """
    Create a visualization GeoJSON showing each connected component in a different color
    """
    print(f"Loading data from {geojson_path}...")
    with open(geojson_path, 'r') as f:
        data = json.load(f)

    features = data['features']

    base_name, road_type = extract_base_and_type(street_name)
    key = f"{base_name}_{road_type}"

    print(f"Finding segments for '{street_name}'...")

    # Collect all segments for this street
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

    if not segments:
        print(f"❌ No segments found for '{street_name}'")
        return

    print(f"Found {len(segments)} segments")
    print(f"Finding connected components...")

    # Extract coordinates for connectivity analysis
    coords_list = [seg['coords'] for seg in segments]

    # Find connected components
    components = find_connected_components(coords_list, threshold)

    print(f"Found {len(components)} unique instances")

    # Create output GeoJSON with colored components
    output_features = []

    for comp_idx, component in enumerate(components):
        color = generate_color(comp_idx, len(components))
        component_size = len(component)

        # Sort components by size for labeling
        component_rank = sorted(range(len(components)),
                               key=lambda i: len(components[i]),
                               reverse=True).index(comp_idx) + 1

        for seg_idx in component:
            segment = segments[seg_idx]

            # Create new feature with component info
            new_feature = {
                'type': 'Feature',
                'geometry': segment['feature']['geometry'],
                'properties': {
                    **segment['feature']['properties'],
                    'component_id': comp_idx,
                    'component_size': component_size,
                    'component_rank': component_rank,
                    'total_components': len(components),
                    'color': color,
                    'label': f"Instance #{component_rank} ({component_size} segments)"
                }
            }
            output_features.append(new_feature)

    # Create output GeoJSON
    output_data = {
        'type': 'FeatureCollection',
        'features': output_features,
        'properties': {
            'street_name': street_name,
            'total_segments': len(segments),
            'unique_instances': len(components),
            'threshold_meters': threshold
        }
    }

    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2)

    print(f"\n✓ Saved to {output_path}")
    print(f"\nComponent breakdown:")
    sorted_components = sorted(enumerate(components), key=lambda x: len(x[1]), reverse=True)
    for rank, (comp_idx, component) in enumerate(sorted_components[:10], 1):
        print(f"  #{rank}: {len(component)} segments")

    if len(components) > 10:
        print(f"  ... and {len(components) - 10} more instances")

if __name__ == "__main__":
    test_streets = [
        "Victoria Street",
        "Regent Street",
        "Short Street",
        "Railway Terrace",
        "Princes Highway"
    ]

    for street in test_streets:
        output_file = f"data/viz_{street.lower().replace(' ', '_')}.geojson"
        print("\n" + "="*60)
        visualize_street_components(
            'data/sydney-roads-osm.geojson',
            street,
            output_file,
            threshold=30
        )
