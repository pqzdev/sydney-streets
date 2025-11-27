#!/usr/bin/env python3
"""
Utility functions for working with GCCSA metropolitan boundaries
Provides point-in-polygon checking and boundary queries
"""
import json
from pathlib import Path
from shapely.geometry import shape, Point

# Cache for loaded boundaries
_boundary_cache = {}

def load_city_boundary(city_name):
    """
    Load the boundary geometry for a city

    Args:
        city_name: City identifier (e.g., 'sydney', 'melbourne')

    Returns:
        shapely.geometry: The boundary polygon/multipolygon
    """
    if city_name in _boundary_cache:
        return _boundary_cache[city_name]

    boundary_file = Path(__file__).parent.parent / 'data' / 'boundaries' / f'{city_name}_boundary.json'

    if not boundary_file.exists():
        raise FileNotFoundError(f"Boundary file not found for {city_name}: {boundary_file}")

    with open(boundary_file, 'r') as f:
        data = json.load(f)

    geom = shape(data['geometry'])
    _boundary_cache[city_name] = geom

    return geom

def is_point_in_metro_area(lat, lon, city_name):
    """
    Check if a point is within the metropolitan area boundary

    Args:
        lat: Latitude
        lon: Longitude
        city_name: City identifier (e.g., 'sydney', 'melbourne')

    Returns:
        bool: True if point is within the metro area
    """
    boundary = load_city_boundary(city_name)
    point = Point(lon, lat)  # Note: shapely uses (x, y) = (lon, lat)
    return boundary.contains(point)

def get_metro_bounds(city_name):
    """
    Get the bounding box for a city's metropolitan area

    Args:
        city_name: City identifier

    Returns:
        tuple: (min_lon, min_lat, max_lon, max_lat)
    """
    boundary = load_city_boundary(city_name)
    return boundary.bounds

def get_overpass_query_with_boundary(city_name, include_bbox=True):
    """
    Generate an Overpass QL query that uses the city boundary for filtering

    Args:
        city_name: City identifier
        include_bbox: Whether to include a bounding box filter (for efficiency)

    Returns:
        str: Overpass QL query string
    """
    boundary = load_city_boundary(city_name)

    # Get bounding box for initial filter
    min_lon, min_lat, max_lon, max_lat = boundary.bounds
    bbox = f"{min_lat},{min_lon},{max_lat},{max_lon}"

    # For simple bbox-based queries (faster but less accurate)
    if include_bbox:
        query = f"""
    [out:json][timeout:300][bbox:{bbox}];
    (
      way["highway"]["name"]["highway"!="track"]["highway"!="path"]["highway"!="cycleway"]["highway"!="footway"]["highway"!="steps"]["highway"!="pedestrian"]["highway"!="service"]["highway"!="busway"];
    );
    out geom;
    """
        return query

    # For polygon-based queries (more accurate but slower and complex)
    # Note: Overpass doesn't easily support complex multipolygons
    # Better to use bbox and filter results in Python
    return None

def filter_geojson_by_boundary(geojson_data, city_name):
    """
    Filter a GeoJSON FeatureCollection to only include features within the metro boundary

    Args:
        geojson_data: GeoJSON dict with FeatureCollection
        city_name: City identifier

    Returns:
        dict: Filtered GeoJSON FeatureCollection
    """
    boundary = load_city_boundary(city_name)

    filtered_features = []

    for feature in geojson_data.get('features', []):
        geom = shape(feature['geometry'])

        # Check if the geometry intersects with the boundary
        # Using intersects rather than contains to include streets that cross the boundary
        if boundary.intersects(geom):
            filtered_features.append(feature)

    return {
        'type': 'FeatureCollection',
        'features': filtered_features
    }

def get_all_cities():
    """Get list of all cities with boundary data"""
    boundaries_dir = Path(__file__).parent.parent / 'data' / 'boundaries'

    if not boundaries_dir.exists():
        return []

    cities = []
    for boundary_file in boundaries_dir.glob('*_boundary.json'):
        city_name = boundary_file.stem.replace('_boundary', '')
        cities.append(city_name)

    return sorted(cities)

if __name__ == '__main__':
    # Test the utilities
    print("Available cities:", get_all_cities())

    for city in get_all_cities():
        bounds = get_metro_bounds(city)
        print(f"\n{city.upper()}:")
        print(f"  Bounds: [{bounds[1]:.4f}, {bounds[0]:.4f}] to [{bounds[3]:.4f}, {bounds[2]:.4f}]")

        # Test a point (city center should be inside)
        if city == 'sydney':
            test_lat, test_lon = -33.8688, 151.2093
        elif city == 'melbourne':
            test_lat, test_lon = -37.8136, 144.9631
        elif city == 'brisbane':
            test_lat, test_lon = -27.4705, 153.0260
        elif city == 'perth':
            test_lat, test_lon = -31.9523, 115.8613
        elif city == 'adelaide':
            test_lat, test_lon = -34.9285, 138.6007
        elif city == 'canberra':
            test_lat, test_lon = -35.2809, 149.1300
        elif city == 'hobart':
            test_lat, test_lon = -42.8821, 147.3272
        elif city == 'darwin':
            test_lat, test_lon = -12.4634, 130.8456
        else:
            continue

        is_inside = is_point_in_metro_area(test_lat, test_lon, city)
        print(f"  City center ({test_lat:.4f}, {test_lon:.4f}) inside: {is_inside}")
