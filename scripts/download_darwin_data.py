#!/usr/bin/env python3
"""
Download Darwin road data from OpenStreetMap using Overpass API.
"""
import json
import requests

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
# From app.js: [-12.7, 130.6] to [-12.2, 131.1]
BBOX = "-12.7,130.6,-12.2,131.1"

def download_darwin_roads():
    print("=" * 60)
    print("Downloading Darwin Roads from OpenStreetMap")
    print("=" * 60)
    print(f"Bounding box: {BBOX}")
    print("This may take several minutes...")
    print()

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

        print(f"✓ Downloaded {len(osm_data.get('elements', []))} roads")

        features = []
        for element in osm_data.get('elements', []):
            if element['type'] != 'way' or 'geometry' not in element:
                continue

            coords = [[node['lon'], node['lat']] for node in element['geometry']]
            tags = element.get('tags', {})

            features.append({
                'type': 'Feature',
                'geometry': {'type': 'LineString', 'coordinates': coords},
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
            })

        geojson = {'type': 'FeatureCollection', 'features': features}
        output_file = 'data/darwin-roads-osm.geojson'

        with open(output_file, 'w') as f:
            json.dump(geojson, f)

        print(f"✓ Saved {len(features)} roads to {output_file}")
        print(f"File size: {len(json.dumps(geojson)) / 1024 / 1024:.1f} MB")
        return geojson

    except Exception as e:
        print(f"✗ Error: {e}")
        return None

if __name__ == '__main__':
    download_darwin_roads()
