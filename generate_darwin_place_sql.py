#!/usr/bin/env python3
"""
Generate SQL INSERT statements for Darwin Place in Canberra.
These can be executed on the production D1 database via wrangler d1 execute.
"""

import requests
import json
from shapely.geometry import LineString, mapping

def download_darwin_place():
    """Download Darwin Place geometry from Overpass API"""
    overpass_url = "http://overpass-api.de/api/interpreter"

    # Query for Darwin Place near Canberra coordinates
    query = """
    [out:json][timeout:60];
    (
      way["highway"]["name"="Darwin Place"](-35.5,148.9,-35.0,149.3);
    );
    out geom;
    """

    print("Downloading Darwin Place from OpenStreetMap...")
    response = requests.post(overpass_url, data={'data': query})

    if response.status_code != 200:
        raise Exception(f"Overpass API request failed: {response.status_code}")

    return response.json()

def process_geometry(element):
    """Convert OSM way to LineString geometry"""
    if 'geometry' not in element:
        return None

    coords = [(node['lon'], node['lat']) for node in element['geometry']]

    if len(coords) < 2:
        return None

    return LineString(coords)

def generate_sql():
    """Generate SQL INSERT statements"""
    print("Downloading data...")
    data = download_darwin_place()

    if not data.get('elements'):
        print("Error: No elements found for Darwin Place")
        print("The road might not exist or have a different name in OSM")
        return

    print(f"Found {len(data['elements'])} way(s)\n")

    city = 'canberra'
    street_name = 'Darwin Place'
    base_name = 'Darwin'
    street_type = 'Place'

    # We'll use instance_id=1
    instance_id = 1
    readable_id = f"{street_name.lower().replace(' ', '_')}_{instance_id}"

    sql_statements = []

    segment_num = 0
    for element in data['elements']:
        if element['type'] != 'way':
            continue

        geom = process_geometry(element)
        if not geom:
            continue

        # Calculate bounding box
        coords = list(geom.coords)
        lats = [lat for lon, lat in coords]
        lngs = [lon for lon, lat in coords]

        min_lat, max_lat = min(lats), max(lats)
        min_lng, max_lng = min(lngs), max(lngs)

        # Store as GeoJSON LineString
        geometry_json = json.dumps(mapping(geom))

        # Escape single quotes in JSON for SQL
        geometry_json_escaped = geometry_json.replace("'", "''")

        # Note: id column is auto-increment, so we don't specify it
        sql = f"""INSERT INTO street_segments (
    city, name, base_name, street_type,
    instance_id, readable_id, geometry,
    min_lat, max_lat, min_lng, max_lng
) VALUES (
    '{city}',
    '{street_name}',
    '{base_name}',
    '{street_type}',
    {instance_id},
    '{readable_id}',
    '{geometry_json_escaped}',
    {min_lat},
    {max_lat},
    {min_lng},
    {max_lng}
);"""

        sql_statements.append(sql)
        segment_num += 1

    if segment_num == 0:
        print("No valid geometries found")
        return

    # Write to file
    output_file = 'darwin_place_insert.sql'
    with open(output_file, 'w') as f:
        f.write('\n\n'.join(sql_statements))

    print(f"✓ Generated SQL for {segment_num} segment(s)")
    print(f"✓ Saved to {output_file}\n")
    print("To execute on your D1 database:")
    print("  cd worker && npx wrangler d1 execute street-names --remote --file=../darwin_place_insert.sql")

if __name__ == '__main__':
    generate_sql()
