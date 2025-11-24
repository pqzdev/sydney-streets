#!/usr/bin/env python3
"""
Generate SQL INSERT statements to populate D1 database from GeoJSON files.
Output can be piped to wrangler d1 execute.
"""

import json
import sys

def generate_inserts(geojson_file, city_name):
    """
    Generate SQL INSERT statements from GeoJSON file.

    Args:
        geojson_file: Path to GeoJSON with instance IDs
        city_name: Name of the city (e.g., 'sydney', 'melbourne')
    """
    print(f"-- Loading {geojson_file}...", file=sys.stderr)
    with open(geojson_file, 'r') as f:
        data = json.load(f)

    features = data['features']
    print(f"-- Processing {len(features)} features for {city_name}", file=sys.stderr)

    # SQL statements
    statements = []

    for feature in features:
        name = feature['properties'].get('name', '')
        if not name:
            continue

        instance_id = feature['properties'].get('_instanceId', 0)

        # Store full precision geometry as JSON string
        geometry = json.dumps(feature['geometry'])

        # Calculate bounding box
        coords = feature['geometry']['coordinates']
        lons = [c[0] for c in coords]
        lats = [c[1] for c in coords]

        min_lat = min(lats)
        max_lat = max(lats)
        min_lng = min(lons)
        max_lng = max(lons)

        # Escape single quotes in strings
        name_escaped = name.replace("'", "''")
        geom_escaped = geometry.replace("'", "''")

        sql = f"INSERT INTO street_segments (city, name, instance_id, geometry, min_lat, max_lat, min_lng, max_lng) VALUES ('{city_name}', '{name_escaped}', {instance_id}, '{geom_escaped}', {min_lat}, {max_lat}, {min_lng}, {max_lng});"
        statements.append(sql)

    print(f"-- Generated {len(statements)} INSERT statements", file=sys.stderr)

    # Output SQL (to stdout)
    for stmt in statements:
        print(stmt)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: python3 populate_d1_database.py <geojson_file> <city_name>", file=sys.stderr)
        print("Example: python3 populate_d1_database.py data/sydney-roads-web.geojson sydney > sydney.sql", file=sys.stderr)
        sys.exit(1)

    geojson_file = sys.argv[1]
    city_name = sys.argv[2]

    generate_inserts(geojson_file, city_name)
