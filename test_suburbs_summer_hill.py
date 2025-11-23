#!/usr/bin/env python3
"""
Test suburb enrichment on Summer Hill streets only
"""
import json
import requests
from time import sleep

def get_suburb_from_coords(lat, lon):
    """Get suburb name from coordinates using Nominatim"""
    url = "https://nominatim.openstreetmap.org/reverse"
    params = {
        'lat': lat,
        'lon': lon,
        'format': 'json',
        'addressdetails': 1,
        'zoom': 16  # Street level
    }
    headers = {
        'User-Agent': 'SydneyStreetsVisualization/1.0'
    }

    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        address = data.get('address', {})
        # Try to get suburb from various fields
        suburb = (address.get('suburb') or
                 address.get('town') or
                 address.get('city') or
                 address.get('municipality') or '')
        postcode = address.get('postcode', '')

        return suburb, postcode
    except Exception as e:
        print(f"Error geocoding {lat},{lon}: {e}")
        return '', ''

# Summer Hill bounding box (approximate)
SUMMER_HILL_BBOX = {
    'south': -33.900,
    'north': -33.885,
    'west': 151.130,
    'east': 151.145
}

print("Loading OSM data...")
with open('data/sydney-roads-osm.geojson', 'r') as f:
    data = json.load(f)

# Filter to Summer Hill area only
print("Filtering to Summer Hill area...")
summer_hill_features = []

for feature in data['features']:
    coords = feature['geometry']['coordinates']
    if not coords:
        continue

    # Check if any point is in Summer Hill bbox
    in_bbox = False
    for coord in coords:
        lon, lat = coord[0], coord[1]
        if (SUMMER_HILL_BBOX['south'] <= lat <= SUMMER_HILL_BBOX['north'] and
            SUMMER_HILL_BBOX['west'] <= lon <= SUMMER_HILL_BBOX['east']):
            in_bbox = True
            break

    if in_bbox:
        summer_hill_features.append(feature)

print(f"Found {len(summer_hill_features)} streets in Summer Hill area")

# Get unique street names
street_names = {}
for feature in summer_hill_features:
    name = feature['properties'].get('name', '')
    if name:
        if name not in street_names:
            street_names[name] = []
        street_names[name].append(feature)

print(f"Unique street names: {len(street_names)}")
print("\nProcessing streets (max 10 for test):")

count = 0
for name, features in list(street_names.items())[:10]:
    # Get coordinates from first feature
    coords = features[0]['geometry']['coordinates']
    mid_idx = len(coords) // 2
    lat, lon = coords[mid_idx][1], coords[mid_idx][0]

    print(f"\n{count + 1}. {name}")
    print(f"   Location: {lat:.5f}, {lon:.5f}")

    suburb, postcode = get_suburb_from_coords(lat, lon)
    print(f"   Result: {suburb}, {postcode}")

    # Update all features with this name
    for feature in features:
        feature['properties']['suburb'] = suburb
        feature['properties']['postcode'] = postcode

    count += 1
    sleep(1)  # Rate limiting

print(f"\n✅ Processed {count} unique street names")
print(f"✅ Updated {sum(len(f) for f in list(street_names.values())[:10])} street segments")

# Save test output
test_data = {
    "type": "FeatureCollection",
    "features": [f for features in list(street_names.values())[:10] for f in features]
}

output_file = 'data/test-summer-hill-with-suburbs.geojson'
with open(output_file, 'w') as f:
    json.dump(test_data, f, indent=2)

print(f"\nSaved test data to {output_file}")
