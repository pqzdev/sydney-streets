#!/usr/bin/env python3
"""
Download Greater Brisbane road data from OpenStreetMap using Overpass API.
Greater Brisbane: Metropolitan area covering Brisbane City and surrounding LGAs.
"""
import json
import requests
from time import sleep

# Overpass API endpoint
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Greater Brisbane bounding box: south,west,north,east
# From docs/NEW_CITIES_TODO.md: [-27.8, 152.6] to [-27.1, 153.3]
BBOX = "-27.8,152.6,-27.1,153.3"

def download_brisbane_roads():
    """Download road data from OpenStreetMap for Greater Brisbane"""

    print("=" * 60)
    print("Downloading Greater Brisbane Roads from OpenStreetMap")
    print("=" * 60)
    print(f"Bounding box: {BBOX}")
    print("This may take several minutes...")
    print()

    # Overpass QL query for roads with names in Greater Brisbane
    # Exclude non-street types: track, path, cycleway, footway, steps, pedestrian, service, busway
    query = f"""
    [out:json][timeout:300][bbox:{BBOX}];
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

        # Save to file
        output_file = 'data/brisbane-roads-osm.geojson'
        with open(output_file, 'w') as f:
            json.dump(geojson, f)

        file_size_mb = len(json.dumps(geojson)) / 1024 / 1024

        print()
        print("=" * 60)
        print("✓ SUCCESS")
        print("=" * 60)
        print(f"Saved {len(features)} roads to {output_file}")
        print(f"File size: {file_size_mb:.1f} MB")

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

if __name__ == '__main__':
    download_brisbane_roads()
