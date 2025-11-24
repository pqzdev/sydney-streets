#!/usr/bin/env python3
"""
Download Greater Perth road data from OpenStreetMap using Overpass API.
Greater Perth: 30 LGAs covering ~6,300 km² metropolitan area.
Source: WA Metropolitan Region Scheme (Planning and Development Act 2005)
"""
import json
import requests
from time import sleep

# Overpass API endpoint
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Greater Perth bounding box: south,west,north,east
# North: Two Rocks (-31.4950), South: Singleton (-32.4490)
# West: Indian Ocean (115.50), East: The Lakes (116.3210)
# Buffer added for edge suburbs
BBOX = "-32.5,115.5,-31.4,116.4"

def download_perth_roads():
    """Download road data from OpenStreetMap for Greater Perth"""

    print("=" * 60)
    print("Downloading Greater Perth Roads from OpenStreetMap")
    print("=" * 60)
    print(f"Coverage: 30 LGAs, ~6,300 km²")
    print(f"Bounding box: {BBOX}")
    print("This may take several minutes...")
    print()

    # Overpass QL query for roads with names in Greater Perth
    query = f"""
    [out:json][timeout:300][bbox:{BBOX}];
    (
      way["highway"]["name"];
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
        output_file = 'data/perth-roads-osm.geojson'
        with open(output_file, 'w') as f:
            json.dump(geojson, f)

        file_size_mb = len(json.dumps(geojson)) / 1024 / 1024

        print()
        print("=" * 60)
        print("✓ SUCCESS")
        print("=" * 60)
        print(f"Saved {len(features)} roads to {output_file}")
        print(f"File size: {file_size_mb:.1f} MB")
        print()
        print("Next steps:")
        print("1. Normalize street names: python3 scripts/normalize_street_names.py")
        print("2. Simplify coordinates: python3 scripts/simplify_coordinates.py data/perth-roads-osm.geojson data/perth-roads-simplified.geojson 4")
        print("3. Generate counts: python3 scripts/process_full_dataset.py data/perth-roads-osm.geojson data/perth_street_counts_grid200.json")

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
    download_perth_roads()
