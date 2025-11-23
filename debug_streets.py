#!/usr/bin/env python3
"""
Debug specific streets to understand the issues
"""

import json
import math

def haversine_distance(coord1, coord2):
    """Calculate distance in meters between two [lng, lat] coordinates"""
    lon1, lat1 = coord1
    lon2, lat2 = coord2
    R = 6371000
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

def debug_street(geojson_path, street_name):
    """Debug a specific street to see what's happening"""

    print(f"Loading data from {geojson_path}...")
    with open(geojson_path, 'r') as f:
        data = json.load(f)

    features = data['features']

    base_name, road_type = extract_base_and_type(street_name)
    key = f"{base_name}_{road_type}"

    # Find all segments
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
                'properties': feature['properties']
            })

    if not segments:
        print(f"No segments found for '{street_name}'")
        return

    print(f"\n{'='*80}")
    print(f"DEBUGGING: {street_name}")
    print(f"{'='*80}")
    print(f"Total segments: {len(segments)}")

    # Calculate centroid of each segment
    print(f"\nSegment details:")
    for i, seg in enumerate(segments[:20]):  # Show first 20
        coords = seg['coords']

        # Calculate centroid
        lat_sum = sum(c[1] for c in coords)
        lng_sum = sum(c[0] for c in coords)
        centroid_lat = lat_sum / len(coords)
        centroid_lng = lng_sum / len(coords)

        # Get endpoints
        start = coords[0]
        end = coords[-1]

        # Get highway type if available
        highway_type = seg['properties'].get('highway', 'unknown')

        print(f"\n  Segment {i+1}:")
        print(f"    Centroid: ({centroid_lat:.6f}, {centroid_lng:.6f})")
        print(f"    Start: ({start[1]:.6f}, {start[0]:.6f})")
        print(f"    End: ({end[1]:.6f}, {end[0]:.6f})")
        print(f"    Highway type: {highway_type}")
        print(f"    Points in segment: {len(coords)}")

    if len(segments) > 20:
        print(f"\n  ... and {len(segments) - 20} more segments")

    # Find gaps between segments
    print(f"\n{'='*80}")
    print(f"ANALYZING GAPS BETWEEN SEGMENTS")
    print(f"{'='*80}")

    # Calculate minimum distance between each pair of segments
    large_gaps = []

    for i in range(len(segments)):
        for j in range(i + 1, len(segments)):
            # Get all endpoints
            seg_i_coords = segments[i]['coords']
            seg_j_coords = segments[j]['coords']

            # Calculate minimum distance between any two points
            min_dist = float('inf')
            closest_points = None

            # Check endpoints first (faster)
            endpoints_i = [seg_i_coords[0], seg_i_coords[-1]]
            endpoints_j = [seg_j_coords[0], seg_j_coords[-1]]

            for ei in endpoints_i:
                for ej in endpoints_j:
                    dist = haversine_distance(ei, ej)
                    if dist < min_dist:
                        min_dist = dist
                        closest_points = (ei, ej)

            # If gap is > 100m, record it
            if min_dist > 100:
                large_gaps.append({
                    'seg_i': i,
                    'seg_j': j,
                    'distance': min_dist,
                    'points': closest_points
                })

    # Sort by distance
    large_gaps.sort(key=lambda x: x['distance'])

    if large_gaps:
        print(f"\nFound {len(large_gaps)} segment pairs with gaps > 100m:")
        for gap in large_gaps[:10]:  # Show first 10
            print(f"  Segment {gap['seg_i']+1} <-> Segment {gap['seg_j']+1}: {gap['distance']:.1f}m gap")
    else:
        print(f"\nNo gaps > 100m found between segments")

    # Check unique highway types
    highway_types = set()
    for seg in segments:
        highway_types.add(seg['properties'].get('highway', 'unknown'))

    print(f"\nHighway types in this street: {highway_types}")

if __name__ == "__main__":
    print("\n" + "="*80)
    print("DEBUGGING VICTORIA STREET")
    print("="*80)
    debug_street('data/sydney-roads-osm.geojson', 'Victoria Street')

    print("\n\n" + "="*80)
    print("DEBUGGING PRINCES HIGHWAY")
    print("="*80)
    debug_street('data/sydney-roads-osm.geojson', 'Princes Highway')
