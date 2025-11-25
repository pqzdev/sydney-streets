#!/usr/bin/env python3
"""
Download Greater Sydney road data from OpenStreetMap using Overpass API
This will include suburb names which we can use for filtering
"""
import json
import requests
from time import sleep

# Greater Sydney LGAs as defined in our SCOPE.md
GREATER_SYDNEY_LGAS = [
    'Bayside', 'Burwood', 'Canada Bay', 'Inner West', 'Randwick', 'Strathfield',
    'Sydney', 'Waverley', 'Woollahra', 'Blacktown', 'Cumberland', 'Parramatta',
    'The Hills Shire', 'The Hills', 'Camden', 'Campbelltown', 'Blue Mountains',
    'Fairfield', 'Hawkesbury', 'Liverpool', 'Penrith', 'Wollondilly', 'Hornsby',
    'Hunters Hill', 'Ku-ring-gai', 'Lane Cove', 'Mosman', 'North Sydney',
    'Northern Beaches', 'Ryde', 'Willoughby', 'Canterbury-Bankstown',
    'Georges River', 'Sutherland'
]

# Overpass API endpoint
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Greater Sydney bounding box: south,west,north,east
BBOX = "-34.3,150.5,-33.4,151.7"

def download_osm_roads():
    """Download road data from OpenStreetMap"""
    
    print("Downloading Greater Sydney roads from OpenStreetMap...")
    print("This may take a few minutes...")
    
    # Overpass QL query for roads with names in Greater Sydney
    # Exclude non-street types: track, path, cycleway, footway, steps, pedestrian, service, busway
    query = f"""
    [out:json][timeout:180][bbox:{BBOX}];
    (
      way["highway"]["name"]["highway"!="track"]["highway"!="path"]["highway"!="cycleway"]["highway"!="footway"]["highway"!="steps"]["highway"!="pedestrian"]["highway"!="service"]["highway"!="busway"];
    );
    out geom;
    """
    
    try:
        response = requests.post(OVERPASS_URL, data={'data': query}, timeout=200)
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
            
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": coords
                },
                "properties": {
                    "name": tags.get('name', ''),
                    "highway": tags.get('highway', ''),
                    "suburb": tags.get('addr:suburb', ''),
                    "postcode": tags.get('addr:postcode', ''),
                    "surface": tags.get('surface', ''),
                    "lanes": tags.get('lanes', ''),
                    "maxspeed": tags.get('maxspeed', ''),
                    "osm_id": element.get('id', '')
                }
            }
            
            features.append(feature)
        
        # Create GeoJSON
        geojson = {
            "type": "FeatureCollection",
            "features": features
        }
        
        # Save full dataset
        output_file = "data/sydney-roads-osm.geojson"
        with open(output_file, 'w') as f:
            json.dump(geojson, f, indent=2)
        
        print(f"Saved {len(features)} road features to {output_file}")
        print(f"File size: {len(json.dumps(geojson)) / 1024 / 1024:.2f} MB")
        
        # Create sample
        sample_geojson = {
            "type": "FeatureCollection",
            "features": features[:1000]
        }
        
        sample_file = "data/sydney-roads-sample.geojson"
        with open(sample_file, 'w') as f:
            json.dump(sample_geojson, f, indent=2)
        
        print(f"Created sample file with 1000 roads: {sample_file}")
        
        # Show some statistics
        names = [f['properties']['name'] for f in features if f['properties']['name']]
        unique_names = set(names)
        print(f"\nStatistics:")
        print(f"  Total roads: {len(features)}")
        print(f"  Named roads: {len(names)}")
        print(f"  Unique names: {len(unique_names)}")
        
        # Count most common base names
        base_names = {}
        for name in names:
            # Remove suffixes
            base = name
            for suffix in ['Street', 'Road', 'Avenue', 'Drive', 'Lane', 'Way', 'Place', 'Circuit', 'Crescent', 'Court']:
                base = base.replace(f' {suffix}', '')
            
            base_names[base] = base_names.get(base, 0) + 1
        
        print(f"\nMost common street names:")
        for name, count in sorted(base_names.items(), key=lambda x: x[1], reverse=True)[:10]:
            print(f"  {name}: {count}")
        
    except Exception as e:
        print(f"Error: {e}")
        raise

if __name__ == "__main__":
    download_osm_roads()
