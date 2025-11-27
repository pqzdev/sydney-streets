#!/usr/bin/env python3
"""
Convert ABS GCCSA boundaries to simplified GeoJSON format
Extracts boundary polygons for each capital city metropolitan area
"""
import geopandas as gpd
import json
from pathlib import Path

def convert_gccsa_to_geojson():
    """Convert GCCSA shapefile to simplified GeoJSON"""

    # Read the shapefile
    print("Reading GCCSA shapefile...")
    gdf = gpd.read_file('data/boundaries/GCCSA_2021_AUST_GDA2020.shp')

    # Print available columns
    print(f"\nColumns: {list(gdf.columns)}")
    print(f"\nTotal GCCSAs: {len(gdf)}")

    # Print GCCSA names
    print("\nGCCSA Names:")
    for idx, row in gdf.iterrows():
        print(f"  {row['GCC_NAME21']} (Code: {row['GCC_CODE21']})")

    # City name mapping from GCCSA names to our city identifiers
    city_mapping = {
        'Greater Sydney': 'sydney',
        'Greater Melbourne': 'melbourne',
        'Greater Brisbane': 'brisbane',
        'Greater Perth': 'perth',
        'Greater Adelaide': 'adelaide',
        'Greater Hobart': 'hobart',
        'Greater Darwin': 'darwin',
        'Australian Capital Territory': 'canberra'
    }

    # Extract boundaries for each city
    boundaries = {}

    for gccsa_name, city_id in city_mapping.items():
        # Find the GCCSA
        city_gdf = gdf[gdf['GCC_NAME21'] == gccsa_name]

        if len(city_gdf) == 0:
            print(f"\nWarning: Could not find GCCSA '{gccsa_name}'")
            continue

        # Get the geometry
        geom = city_gdf.iloc[0].geometry

        # Simplify the geometry to reduce file size (tolerance in degrees, ~100m)
        simplified_geom = geom.simplify(0.001, preserve_topology=True)

        # Convert to GeoJSON-like dict
        geojson_geom = json.loads(gpd.GeoSeries([simplified_geom]).to_json())['features'][0]['geometry']

        boundaries[city_id] = {
            'name': gccsa_name,
            'code': city_gdf.iloc[0]['GCC_CODE21'],
            'geometry': geojson_geom
        }

        print(f"\n{city_id}: {gccsa_name}")
        print(f"  Type: {geojson_geom['type']}")
        if geojson_geom['type'] == 'Polygon':
            print(f"  Coordinates: {len(geojson_geom['coordinates'][0])} points")
        elif geojson_geom['type'] == 'MultiPolygon':
            total_points = sum(len(poly[0]) for poly in geojson_geom['coordinates'])
            print(f"  Polygons: {len(geojson_geom['coordinates'])}, Total points: {total_points}")

    # Save individual city boundary files
    output_dir = Path('data/boundaries')
    output_dir.mkdir(exist_ok=True)

    for city_id, boundary in boundaries.items():
        output_file = output_dir / f'{city_id}_boundary.json'
        with open(output_file, 'w') as f:
            json.dump(boundary, f, indent=2)
        print(f"\nSaved {city_id} boundary to {output_file}")

    # Save combined file
    combined_file = output_dir / 'city_boundaries.json'
    with open(combined_file, 'w') as f:
        json.dump(boundaries, f, indent=2)
    print(f"\nSaved combined boundaries to {combined_file}")

    # Calculate bounding boxes for each city
    print("\n\nBounding boxes:")
    for city_id, boundary in boundaries.items():
        city_gdf = gdf[gdf['GCC_NAME21'] == boundary['name']]
        bounds = city_gdf.total_bounds
        print(f"{city_id}: [{bounds[1]:.4f}, {bounds[0]:.4f}] to [{bounds[3]:.4f}, {bounds[2]:.4f}]")
        print(f"  Latitude: {bounds[1]:.4f} to {bounds[3]:.4f}")
        print(f"  Longitude: {bounds[0]:.4f} to {bounds[2]:.4f}")

if __name__ == '__main__':
    convert_gccsa_to_geojson()
