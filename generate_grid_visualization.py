#!/usr/bin/env python3
"""
Generate GeoJSON showing grid cells for grid-based methods
"""

import json
from collections import defaultdict

def extract_base_and_type(name):
    """Extract base name and road type from full street name"""
    name = name.strip()
    types = ['street', 'st', 'road', 'rd', 'avenue', 'ave', 'drive', 'dr',
             'lane', 'ln', 'court', 'ct', 'place', 'pl', 'way', 'crescent',
             'cres', 'terrace', 'tce', 'parade', 'highway', 'hwy', 'close',
             'boulevard', 'bvd', 'circuit', 'parkway']
    parts = name.lower().split()
    road_type = 'street'
    base_name = name.lower()
    if parts:
        last_word = parts[-1]
        if last_word in types:
            road_type = last_word
            base_name = ' '.join(parts[:-1])
    return base_name, road_type

def generate_grid_cells(street_name, grid_size, geojson_path, output_path):
    """Generate grid cell polygons for a specific street"""

    print(f"Loading data from {geojson_path}...")
    with open(geojson_path, 'r') as f:
        data = json.load(f)

    features = data['features']
    base_name, road_type = extract_base_and_type(street_name)
    key = f"{base_name}_{road_type}"

    # Find all segments for this street
    segments = []
    for feature in features:
        name = feature['properties'].get('name', '')
        if not name:
            continue

        fb, ft = extract_base_and_type(name)
        fkey = f"{fb}_{ft}"

        if fkey == key:
            segments.append(feature)

    if not segments:
        print(f"No segments found for '{street_name}'")
        return

    print(f"Found {len(segments)} segments for {street_name}")

    # Build grid cells
    grid_cells = set()

    for feature in segments:
        coords = feature['geometry']['coordinates']
        for coord in coords:
            lat, lng = coord[1], coord[0]
            cell_lat = round(lat / grid_size) * grid_size
            cell_lng = round(lng / grid_size) * grid_size
            grid_cells.add((cell_lat, cell_lng))

    print(f"Generated {len(grid_cells)} grid cells")

    # Create GeoJSON features for grid cells (as polygons)
    output_features = []

    for cell_lat, cell_lng in grid_cells:
        # Create square polygon for this cell
        # The cell is centered at (cell_lat, cell_lng) with size grid_size
        polygon_coords = [[
            [cell_lng, cell_lat],
            [cell_lng + grid_size, cell_lat],
            [cell_lng + grid_size, cell_lat + grid_size],
            [cell_lng, cell_lat + grid_size],
            [cell_lng, cell_lat]  # Close the polygon
        ]]

        feature = {
            'type': 'Feature',
            'geometry': {
                'type': 'Polygon',
                'coordinates': polygon_coords
            },
            'properties': {
                'cell_lat': cell_lat,
                'cell_lng': cell_lng,
                'grid_size': grid_size
            }
        }
        output_features.append(feature)

    # Save output
    output_data = {
        'type': 'FeatureCollection',
        'features': output_features,
        'properties': {
            'street_name': street_name,
            'grid_size': grid_size,
            'grid_count': len(grid_cells)
        }
    }

    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2)

    print(f"Saved to {output_path}")

if __name__ == "__main__":
    test_streets = [
        "Victoria Street",
        "Princes Highway"
    ]

    grid_sizes = [
        (0.0005, "50m"),
        (0.001, "100m"),
        (0.002, "200m")
    ]

    for street in test_streets:
        for grid_size, size_name in grid_sizes:
            output_file = f"data/grid_{street.lower().replace(' ', '_')}_{size_name}.geojson"
            print(f"\n{'='*60}")
            print(f"Generating {size_name} grid for {street}")
            print(f"{'='*60}")
            generate_grid_cells(street, grid_size, 'data/sydney-roads-osm.geojson', output_file)
