#!/usr/bin/env python3
"""
Download NSW road data for Greater Sydney using the NSW Spatial Services API
Since the API doesn't have LGA data, we'll download all urban roads and filter by coordinates
"""
import json
import requests
from time import sleep

# API endpoint for RoadNameExtent
BASE_URL = "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Transport_Theme/FeatureServer/6/query"

# Greater Sydney approximate bounding box
SYDNEY_BOUNDS = {
    'west': 150.5,
    'south': -34.3,
    'east': 151.7,
    'north': -33.4
}

def is_in_sydney(coordinates):
    """Check if any coordinate is within Greater Sydney bounds"""
    for coord in coordinates:
        lon, lat = coord[0], coord[1]
        if (SYDNEY_BOUNDS['west'] <= lon <= SYDNEY_BOUNDS['east'] and 
            SYDNEY_BOUNDS['south'] <= lat <= SYDNEY_BOUNDS['north']):
            return True
    return False

def download_roads():
    """Download road data in chunks"""
    all_features = []
    offset = 0
    chunk_size = 2000
    
    print("Downloading NSW road data (will filter to Greater Sydney)...")
    print("This will take several minutes as we download in chunks of 2000...")
    
    while offset < 50000:  # Limit to first 50k roads to avoid huge downloads
        params = {
            'where': "urbanity='U'",  # Urban roads only
            'outFields': 'roadnamestring,roadnameoid,functionhierarchy,urbanity',
            'returnGeometry': 'true',
            'f': 'geojson',
            'resultOffset': offset,
            'resultRecordCount': chunk_size
        }
        
        print(f"  Fetching records {offset} to {offset + chunk_size}...")
        
        try:
            response = requests.get(BASE_URL, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if 'features' not in data or len(data['features']) == 0:
                print(f"  No more records. Total downloaded: {len(all_features)}")
                break
            
            features = data['features']
            
            # Filter to Greater Sydney area
            sydney_features = [f for f in features if is_in_sydney(f['geometry']['coordinates'])]
            all_features.extend(sydney_features)
            
            print(f"    Got {len(features)} features, {len(sydney_features)} in Sydney area (total: {len(all_features)})")
            
            if len(features) < chunk_size:
                # Last chunk
                break
            
            offset += chunk_size
            sleep(0.5)  # Be nice to the API
            
        except Exception as e:
            print(f"  Error: {e}")
            if offset > 0:
                print("  Saving what we have so far...")
                break
            else:
                raise
    
    # Create GeoJSON output
    geojson = {
        "type": "FeatureCollection",
        "features": all_features
    }
    
    output_file = "data/sydney-roads.geojson"
    with open(output_file, 'w') as f:
        json.dump(geojson, f, indent=2)
    
    print(f"\nSaved {len(all_features)} Greater Sydney road features to {output_file}")
    print(f"File size: {len(json.dumps(geojson)) / 1024 / 1024:.2f} MB")
    
    # Create a sample file with first 500 for testing
    sample_geojson = {
        "type": "FeatureCollection",
        "features": all_features[:500]
    }
    
    sample_file = "data/sydney-roads-sample.geojson"
    with open(sample_file, 'w') as f:
        json.dump(sample_geojson, f, indent=2)
    
    print(f"Created sample file with 500 roads: {sample_file}")

if __name__ == "__main__":
    download_roads()
