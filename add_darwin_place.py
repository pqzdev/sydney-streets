#!/usr/bin/env python3
"""
One-off script to add "Darwin Place" in Canberra to the dataset.
This is a highway=service road that was filtered out during initial data collection.
"""

import requests
import json
import sqlite3
import os
from shapely.geometry import LineString, mapping, shape
from shapely.ops import linemerge

def download_darwin_place():
    """Download Darwin Place geometry from Overpass API"""
    overpass_url = "http://overpass-api.de/api/interpreter"

    # Query specifically for "Darwin Place" in Canberra area
    query = """
    [out:json][timeout:60];
    area["name"="Canberra"]["boundary"="administrative"]->.searchArea;
    (
      way["highway"]["name"="Darwin Place"](area.searchArea);
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

def insert_into_database(db_path):
    """Insert Darwin Place into the D1 database"""
    print(f"Downloading data...")
    data = download_darwin_place()

    if not data.get('elements'):
        print("Error: No elements found for Darwin Place")
        return

    print(f"Found {len(data['elements'])} way(s)")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    city = 'canberra'
    street_name = 'Darwin Place'

    # Get next instance_id for this street name in this city
    cursor.execute("""
        SELECT COALESCE(MAX(instance_id), 0) + 1
        FROM street_segments
        WHERE city = ? AND name = ?
    """, (city, street_name))
    instance_id = cursor.fetchone()[0]

    # Get next segment_id
    cursor.execute("SELECT COALESCE(MAX(segment_id), 0) + 1 FROM street_segments")
    segment_id = cursor.fetchone()[0]

    # Generate readable_id
    readable_id = f"{street_name.lower().replace(' ', '_')}_{instance_id}"

    segments_added = 0

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

        # Extract base name and street type
        base_name = 'Darwin'
        street_type = 'Place'

        # Store as GeoJSON LineString
        geometry_json = json.dumps(mapping(geom))

        cursor.execute("""
            INSERT INTO street_segments (
                segment_id, city, name, base_name, street_type,
                instance_id, readable_id, geometry,
                min_lat, max_lat, min_lng, max_lng
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            segment_id, city, street_name, base_name, street_type,
            instance_id, readable_id, geometry_json,
            min_lat, max_lat, min_lng, max_lng
        ))

        segment_id += 1
        segments_added += 1
        print(f"  Added segment {segments_added} for {street_name}")

    conn.commit()
    conn.close()

    print(f"\n✓ Successfully added {segments_added} segment(s) for Darwin Place")
    print(f"  City: {city}")
    print(f"  Street: {street_name}")
    print(f"  Instance ID: {instance_id}")
    print(f"  Readable ID: {readable_id}")

if __name__ == '__main__':
    # Path to local D1 database
    db_path = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/fb7cb89f5b79b10ca5f1b6f73d1b09b9e8d1cf8c2b9c1f7b2e5d3a4f6c8b9a0e.sqlite'

    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        print("Please check the path or run wrangler dev first to create the local DB")
        exit(1)

    insert_into_database(db_path)
    print("\nYou can now test with: http://localhost:8787/api/streets?city=canberra&name=Darwin+Place")
