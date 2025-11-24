#!/usr/bin/env python3
"""
Simplify GeoJSON coordinates by rounding to specified precision.
This reduces file size and makes lines less wiggly on the map.
"""

import json
import sys

def round_coordinate(coord, precision):
    """Round a coordinate to specified decimal places."""
    if isinstance(coord, list):
        return [round_coordinate(c, precision) for c in coord]
    else:
        return round(coord, precision)

def simplify_geometry(geometry, precision):
    """Simplify geometry coordinates."""
    if geometry['type'] == 'LineString':
        geometry['coordinates'] = [
            [round(lng, precision), round(lat, precision)]
            for lng, lat in geometry['coordinates']
        ]
    elif geometry['type'] == 'MultiLineString':
        geometry['coordinates'] = [
            [[round(lng, precision), round(lat, precision)] for lng, lat in line]
            for line in geometry['coordinates']
        ]
    return geometry

def simplify_geojson(input_file, output_file, precision=4):
    """
    Simplify GeoJSON file by rounding coordinates.

    Args:
        input_file: Path to input GeoJSON
        output_file: Path to output GeoJSON
        precision: Number of decimal places (4 = ~10m, 5 = ~1m)
    """
    print(f"Loading {input_file}...")
    with open(input_file, 'r') as f:
        data = json.load(f)

    print(f"Simplifying {len(data['features'])} features to {precision} decimal places...")

    for feature in data['features']:
        if 'geometry' in feature and feature['geometry']:
            simplify_geometry(feature['geometry'], precision)

    print(f"Saving to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(data, f, separators=(',', ':'))

    print("Done!")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python3 simplify_coordinates.py <input.geojson> <output.geojson> [precision]")
        print("  precision: decimal places (default 4 = ~10m, 5 = ~1m)")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]
    precision = int(sys.argv[3]) if len(sys.argv) > 3 else 4

    simplify_geojson(input_file, output_file, precision)
