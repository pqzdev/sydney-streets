#!/usr/bin/env python3
"""
Generate SQL batch files from GeoJSON for D1 database upload
"""

import sys
import json
import os

def escape_sql_string(s):
    """Escape single quotes for SQL"""
    return s.replace("'", "''")

def parse_street_name(full_name):
    """
    Parse a full street name into base name and type.
    E.g., "George Street" -> ("George", "Street")
          "Main Road" -> ("Main", "Road")
          "Broadway" -> ("Broadway", "")
    """
    # Common Australian street types
    street_types = [
        'Street', 'Road', 'Avenue', 'Drive', 'Lane', 'Way', 'Place', 'Circuit',
        'Crescent', 'Court', 'Close', 'Terrace', 'Parade', 'Boulevard', 'Highway',
        'Freeway', 'Motorway', 'Grove', 'Walk', 'Row', 'Square', 'Mews', 'Plaza',
        'Esplanade', 'Promenade', 'Parkway', 'Link', 'Loop', 'Rise', 'Chase',
        'View', 'Ridge', 'Glade', 'Glen', 'Dell', 'Vale', 'Gardens', 'Park',
        'Reserve', 'Green', 'Common', 'Mall', 'Arcade', 'Alley', 'Retreat',
        'Approach', 'Path', 'Track', 'Trail', 'Bend', 'Corner', 'End', 'Cove'
    ]

    for street_type in street_types:
        if full_name.endswith(' ' + street_type):
            base_name = full_name[:-len(street_type)-1].strip()
            return base_name, street_type

    # No type found, return full name as base
    return full_name, ''

def generate_inserts(geojson_file, city_name):
    """Generate SQL INSERT statements from GeoJSON file."""

    with open(geojson_file, 'r') as f:
        data = json.load(f)

    features = data['features']
    print(f"-- Loading {geojson_file}...", file=sys.stderr)
    print(f"-- Processing {len(features)} features for {city_name}", file=sys.stderr)

    statements = []
    for feature in features:
        # Get street name
        name = feature['properties'].get('name', 'Unnamed')
        if not name or name == 'Unnamed':
            continue

        name_escaped = escape_sql_string(name)

        # Parse into base name and type
        base_name, street_type = parse_street_name(name)
        base_name_escaped = escape_sql_string(base_name)
        street_type_escaped = escape_sql_string(street_type)

        # Get instance_id (from Grid 200m processing)
        instance_id = feature['properties'].get('_instanceId', 0)

        # Store full precision geometry as JSON string
        geometry = json.dumps(feature['geometry'])
        geom_escaped = escape_sql_string(geometry)

        # Calculate bounding box from geometry coordinates
        coords = feature['geometry']['coordinates']
        lons = [c[0] for c in coords]
        lats = [c[1] for c in coords]

        min_lat = min(lats)
        max_lat = max(lats)
        min_lng = min(lons)
        max_lng = max(lons)

        sql = f"INSERT INTO street_segments (city, name, base_name, street_type, instance_id, geometry, min_lat, max_lat, min_lng, max_lng) VALUES ('{city_name}', '{name_escaped}', '{base_name_escaped}', '{street_type_escaped}', {instance_id}, '{geom_escaped}', {min_lat}, {max_lat}, {min_lng}, {max_lng});"
        statements.append(sql)

    print(f"-- Generated {len(statements)} INSERT statements", file=sys.stderr)
    return statements

def write_batches(statements, output_dir, prefix, batch_size=10000):
    """Write SQL statements to batch files"""

    os.makedirs(output_dir, exist_ok=True)

    total_batches = (len(statements) + batch_size - 1) // batch_size
    print(f"-- Creating {total_batches} batch files in {output_dir}", file=sys.stderr)

    for i in range(0, len(statements), batch_size):
        batch = statements[i:i + batch_size]
        batch_num = i // batch_size + 1
        filename = os.path.join(output_dir, f"{prefix}_batch_{batch_num:03d}.sql")

        with open(filename, 'w') as f:
            f.write('\n'.join(batch))
            f.write('\n')

        print(f"-- Created {filename} ({len(batch)} statements)", file=sys.stderr)

    print(f"-- Done! Created {total_batches} batch files", file=sys.stderr)

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: python generate_sql_batches.py <geojson_file> <city_name> <output_dir> [batch_size]", file=sys.stderr)
        sys.exit(1)

    geojson_file = sys.argv[1]
    city_name = sys.argv[2]
    output_dir = sys.argv[3]
    batch_size = int(sys.argv[4]) if len(sys.argv) > 4 else 10000

    statements = generate_inserts(geojson_file, city_name)
    write_batches(statements, output_dir, city_name, batch_size)
