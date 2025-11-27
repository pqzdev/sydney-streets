#!/usr/bin/env python3
"""
Download road data from OpenStreetMap using GCCSA (Greater Capital City Statistical Area) boundaries
Uses official ABS metropolitan area definitions instead of rectangular bounding boxes
"""
import json
import requests
import argparse
from pathlib import Path
from boundary_utils import get_metro_bounds, filter_geojson_by_boundary, get_all_cities

# Overpass API endpoint
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

def download_city_roads(city_name, filter_boundary=True):
    """
    Download road data from OpenStreetMap for a city's metropolitan area

    Args:
        city_name: City identifier (e.g., 'sydney', 'melbourne')
        filter_boundary: If True, filter results to only include roads within GCCSA boundary
    """

    print("=" * 60)
    print(f"Downloading {city_name.upper()} Roads from OpenStreetMap")
    print("=" * 60)
    print(f"Using official GCCSA (Greater Capital City Statistical Area) boundary")

    # Get bounding box for initial query (more efficient than full polygon)
    min_lon, min_lat, max_lon, max_lat = get_metro_bounds(city_name)
    bbox = f"{min_lat},{min_lon},{max_lat},{max_lon}"

    print(f"Initial bounding box: {bbox}")
    if filter_boundary:
        print(f"Will filter results to GCCSA polygon boundary")
    print("This may take several minutes...")
    print()

    # Overpass QL query for roads with names
    # Exclude non-street types: track, path, cycleway, footway, steps, pedestrian, service, busway
    query = f"""
    [out:json][timeout:300][bbox:{bbox}];
    (
      way["highway"]["name"]["highway"!="track"]["highway"!="path"]["highway"!="cycleway"]["highway"!="footway"]["highway"!="steps"]["highway"!="pedestrian"]["highway"!="service"]["highway"!="busway"];
    );
    out geom;
    """

    try:
        print("Sending request to Overpass API...")
        response = requests.post(OVERPASS_URL, data={'data': query}, timeout=350)
        response.raise_for_status()
        osm_data = response.json()

        print(f"✓ Downloaded {len(osm_data.get('elements', []))} roads from OpenStreetMap")

        # Convert to GeoJSON
        features = []

        for element in osm_data.get('elements', []):
            if element['type'] != 'way' or 'geometry' not in element:
                continue

            # Extract coordinates
            coords = [[node['lon'], node['lat']] for node in element['geometry']]

            # Get tags
            tags = element.get('tags', {})

            # Create feature
            feature = {
                'type': 'Feature',
                'geometry': {
                    'type': 'LineString',
                    'coordinates': coords
                },
                'properties': {
                    'name': tags.get('name', ''),
                    'highway': tags.get('highway', ''),
                    'surface': tags.get('surface', ''),
                    'lanes': tags.get('lanes', ''),
                    'maxspeed': tags.get('maxspeed', ''),
                    'oneway': tags.get('oneway', ''),
                    'suburb': tags.get('addr:suburb', tags.get('suburb', '')),
                    'postcode': tags.get('addr:postcode', ''),
                }
            }

            features.append(feature)

        # Create GeoJSON
        geojson = {
            'type': 'FeatureCollection',
            'features': features
        }

        # Filter by GCCSA boundary if requested
        if filter_boundary:
            print(f"Filtering to GCCSA boundary...")
            original_count = len(features)
            geojson = filter_geojson_by_boundary(geojson, city_name)
            filtered_count = len(geojson['features'])
            removed = original_count - filtered_count
            print(f"✓ Filtered: {filtered_count} roads within boundary ({removed} outside removed)")

        # Save to file
        output_file = f'data/{city_name}-roads-osm.geojson'
        with open(output_file, 'w') as f:
            json.dump(geojson, f)

        file_size_mb = len(json.dumps(geojson)) / 1024 / 1024

        print()
        print("=" * 60)
        print("✓ SUCCESS")
        print("=" * 60)
        print(f"Saved {len(geojson['features'])} roads to {output_file}")
        print(f"File size: {file_size_mb:.1f} MB")
        print()
        print("Next steps:")
        print(f"1. Process full dataset: python3 scripts/process_full_dataset.py --city {city_name}")
        print(f"2. Add instance IDs: python3 scripts/add_instance_ids.py --city {city_name}")
        print(f"3. Generate SQL batches: python3 scripts/generate_sql_batches.py {city_name}")

        return geojson

    except requests.exceptions.Timeout:
        print("✗ Request timed out. The Overpass API might be busy.")
        print("  Please try again in a few minutes.")
        return None
    except requests.exceptions.RequestException as e:
        print(f"✗ Error downloading data: {e}")
        return None
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    parser = argparse.ArgumentParser(
        description='Download OSM road data using official GCCSA metropolitan boundaries'
    )
    parser.add_argument(
        'city',
        choices=get_all_cities(),
        help='City to download data for'
    )
    parser.add_argument(
        '--no-filter',
        action='store_true',
        help='Skip filtering by GCCSA boundary (use bbox only)'
    )

    args = parser.parse_args()

    download_city_roads(args.city, filter_boundary=not args.no_filter)

if __name__ == '__main__':
    main()
