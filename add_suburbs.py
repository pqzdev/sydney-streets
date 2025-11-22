#!/usr/bin/env python3
"""
Add suburb information to OSM data using reverse geocoding
We'll sample points from the data and add suburb info via Nominatim API
"""
import json
import requests
from time import sleep
from collections import defaultdict

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

def add_suburbs_to_data():
    """Add suburb data to existing GeoJSON"""
    print("Loading existing OSM data...")

    with open('data/sydney-roads-osm.geojson', 'r') as f:
        data = json.load(f)

    features = data['features']
    print(f"Loaded {len(features)} features")

    # Create a cache of coordinates -> suburb to avoid duplicate API calls
    suburb_cache = {}

    # Group features by rounded coordinates to batch process
    print("\nGrouping features by location...")
    location_groups = defaultdict(list)

    for idx, feature in enumerate(features):
        coords = feature['geometry']['coordinates']
        if not coords:
            continue

        # Get middle point
        mid_idx = len(coords) // 2
        lat, lon = coords[mid_idx][1], coords[mid_idx][0]

        # Round to ~500m grid
        grid_lat = round(lat / 0.005) * 0.005
        grid_lon = round(lon / 0.005) * 0.005
        grid_key = f"{grid_lat},{grid_lon}"

        location_groups[grid_key].append(idx)

    print(f"Created {len(location_groups)} location groups")

    # Process each location group
    print("\nReverse geocoding locations (this will take a while due to rate limiting)...")
    processed = 0

    for grid_key, indices in location_groups.items():
        # Get suburb for this grid cell
        lat_str, lon_str = grid_key.split(',')
        lat, lon = float(lat_str), float(lon_str)

        if grid_key in suburb_cache:
            suburb, postcode = suburb_cache[grid_key]
        else:
            suburb, postcode = get_suburb_from_coords(lat, lon)
            suburb_cache[grid_key] = (suburb, postcode)

            # Rate limiting: Nominatim allows 1 request per second
            sleep(1)

        # Update all features in this grid cell
        for idx in indices:
            features[idx]['properties']['suburb'] = suburb
            features[idx]['properties']['postcode'] = postcode

        processed += 1
        if processed % 10 == 0:
            print(f"Processed {processed}/{len(location_groups)} locations...")

    # Save updated data
    print("\nSaving updated data...")
    output_file = 'data/sydney-roads-osm-with-suburbs.geojson'
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"Saved to {output_file}")

    # Show statistics
    suburbs_found = sum(1 for f in features if f['properties']['suburb'])
    print(f"\nStatistics:")
    print(f"  Features with suburb: {suburbs_found}/{len(features)} ({suburbs_found/len(features)*100:.1f}%)")

    # Show most common suburbs
    suburb_counts = defaultdict(int)
    for f in features:
        suburb = f['properties']['suburb']
        if suburb:
            suburb_counts[suburb] += 1

    print(f"\nMost common suburbs:")
    for suburb, count in sorted(suburb_counts.items(), key=lambda x: x[1], reverse=True)[:20]:
        print(f"  {suburb}: {count}")

if __name__ == "__main__":
    add_suburbs_to_data()
