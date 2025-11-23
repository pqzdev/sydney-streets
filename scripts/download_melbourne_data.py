#!/usr/bin/env python3
"""
Download Greater Melbourne road data from OpenStreetMap using Overpass API
Greater Melbourne consists of 31 LGAs covering the metropolitan area
"""
import json
import requests
from time import sleep

# Greater Melbourne LGAs (31 municipalities)
GREATER_MELBOURNE_LGAS = [
    'Banyule', 'Bayside', 'Boroondara', 'Brimbank', 'Cardinia', 'Casey',
    'Darebin', 'Frankston', 'Glen Eira', 'Greater Dandenong', 'Hobsons Bay',
    'Hume', 'Kingston', 'Knox', 'Manningham', 'Maribyrnong', 'Maroondah',
    'Melbourne', 'Melton', 'Merri-bek', 'Monash', 'Moonee Valley',
    'Mornington Peninsula', 'Nillumbik', 'Port Phillip', 'Stonnington',
    'Whitehorse', 'Whittlesea', 'Wyndham', 'Yarra', 'Yarra Ranges'
]

# Overpass API endpoint
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Greater Melbourne bounding box: south,west,north,east
# Covers from Mornington Peninsula to Yarra Ranges, Cardinia to Melton
BBOX = "-38.5,144.5,-37.4,145.8"

def download_melbourne_roads():
    """Download road data from OpenStreetMap for Greater Melbourne"""

    print("Downloading Greater Melbourne roads from OpenStreetMap...")
    print("This may take several minutes due to the large area...")

    # Overpass QL query for roads with names in Greater Melbourne
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

        print(f"Downloaded {len(osm_data.get('elements', []))} roads from OpenStreetMap")

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
                    # LGA will be added later via spatial join if needed
                }
            }

            features.append(feature)

        # Create GeoJSON
        geojson = {
            'type': 'FeatureCollection',
            'features': features
        }

        # Save to file
        output_file = 'data/melbourne-roads-osm.geojson'
        with open(output_file, 'w') as f:
            json.dump(geojson, f)

        print(f"Saved {len(features)} roads to {output_file}")
        print(f"File size: {len(json.dumps(geojson)) / 1024 / 1024:.1f} MB")

        return geojson

    except requests.exceptions.Timeout:
        print("Request timed out. The Overpass API might be busy.")
        print("Please try again in a few minutes.")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Error downloading data: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None

if __name__ == '__main__':
    download_melbourne_roads()
    print("\nNext steps:")
    print("1. Process the data with Grid 200m: python3 scripts/process_melbourne_data.py")
    print("2. Update app.js with Melbourne configuration")
