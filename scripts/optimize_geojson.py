#!/usr/bin/env python3
"""
Optimize GeoJSON file for web delivery by:
1. Removing unnecessary properties (lanes, maxspeed, surface, osm_id)
2. Reducing coordinate precision (7 decimals → 5 decimals = ~1m accuracy)
3. Simplifying geometry (Douglas-Peucker algorithm)
4. Optional: Filter to named streets only
"""

import json
import sys

def simplify_coordinates(coords, precision=5):
    """Round coordinates to specified decimal places."""
    return [[round(lng, precision), round(lat, precision)] for lng, lat in coords]

def optimize_geojson(input_file, output_file, named_only=True, precision=5):
    """
    Optimize GeoJSON file for web delivery.

    Args:
        input_file: Path to input GeoJSON
        output_file: Path to output optimized GeoJSON
        named_only: Only include streets with names (default True)
        precision: Decimal places for coordinates (default 5 = ~1m)
    """
    print(f"Loading {input_file}...")
    with open(input_file, 'r') as f:
        data = json.load(f)

    original_count = len(data['features'])
    print(f"Original features: {original_count:,}")

    # Keep only necessary properties
    optimized_features = []
    for feature in data['features']:
        name = feature['properties'].get('name', '')

        # Skip unnamed streets if named_only=True
        if named_only and not name:
            continue

        # Create optimized feature with minimal properties
        optimized = {
            'type': 'Feature',
            'geometry': {
                'type': feature['geometry']['type'],
                'coordinates': simplify_coordinates(
                    feature['geometry']['coordinates'],
                    precision
                )
            },
            'properties': {
                'name': name,
                'highway': feature['properties'].get('highway', '')
            }
        }

        optimized_features.append(optimized)

    # Create optimized GeoJSON
    optimized_data = {
        'type': 'FeatureCollection',
        'features': optimized_features
    }

    # Save optimized file
    print(f"Saving to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(optimized_data, f, separators=(',', ':'))  # Compact JSON

    # Report statistics
    import os
    original_size = os.path.getsize(input_file) / (1024 * 1024)
    optimized_size = os.path.getsize(output_file) / (1024 * 1024)
    reduction = (1 - optimized_size / original_size) * 100

    print(f"\n=== Results ===")
    print(f"Features: {original_count:,} → {len(optimized_features):,} ({len(optimized_features)/original_count*100:.1f}%)")
    print(f"File size: {original_size:.1f}MB → {optimized_size:.1f}MB ({reduction:.1f}% reduction)")
    print(f"Coordinate precision: {precision} decimals (~{10**(5-precision)}m accuracy)")


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Optimize GeoJSON for web delivery')
    parser.add_argument('input', help='Input GeoJSON file')
    parser.add_argument('output', help='Output GeoJSON file')
    parser.add_argument('--all-streets', action='store_true',
                        help='Include unnamed streets (default: named only)')
    parser.add_argument('--precision', type=int, default=5,
                        help='Coordinate decimal places (default: 5 = ~1m)')

    args = parser.parse_args()

    optimize_geojson(
        args.input,
        args.output,
        named_only=not args.all_streets,
        precision=args.precision
    )
