# Metropolitan Area Boundaries

## Overview

This project now uses **official GCCSA (Greater Capital City Statistical Area) boundaries** from the Australian Bureau of Statistics instead of simple rectangular latitude/longitude boxes.

## What are GCCSAs?

Greater Capital City Statistical Areas (GCCSAs) are the official statistical boundaries defined by the Australian Bureau of Statistics (ABS) as part of the Australian Statistical Geography Standard (ASGS).

- **Edition**: ASGS Edition 3 (valid July 2021 - June 2026)
- **Purpose**: Represent the functional area of each capital city, including populations who regularly socialize, shop, or work within the city
- **Structure**: Built from Statistical Areas Level 4 (SA4s) which represent labour markets
- **License**: Creative Commons Attribution 4.0 International

## Why Use GCCSAs?

### Previous Approach (Rectangle Boundaries)
```javascript
// Old approach - simple rectangle
bounds: [[-34.3, 150.35], [-33.25, 151.5]]
```

**Problems:**
- Includes large areas outside the actual metropolitan region
- Arbitrary boundaries not based on any official definition
- Inconsistent between cities
- Includes rural/regional areas that shouldn't be counted

### New Approach (GCCSA Polygon Boundaries)
```javascript
// New approach - official GCCSA polygon boundary
bounds: [[-34.3312, 149.9719], [-32.9961, 151.6306]], // Bounding box for initial map view
boundaryFile: 'data/boundaries/sydney_boundary.json'  // Actual GCCSA polygon
```

The app now:
1. **Uses bounding boxes** for initial map positioning (fast)
2. **Loads actual polygon boundaries** from GeoJSON files
3. **Displays the polygon** on the map (toggle with "Metro Boundary" button)
4. **Can filter streets** by polygon boundary (not just bbox)

**Benefits:**
- Based on official ABS definitions used for census and statistics
- Accurately represents the functional metropolitan area using **polygon geometry**
- Consistent methodology across all Australian cities
- Excludes non-metropolitan areas appropriately (even if within bbox)
- Can be cited and referenced in reports/publications
- **Visual boundary overlay** shows exact GCCSA extent

## Implementation

### Boundary Files

All boundary data is stored in `data/boundaries/`:

```
data/boundaries/
├── GCCSA_2021_AUST_GDA2020.shp      # Original ABS shapefile
├── city_boundaries.json              # Combined boundaries for all cities
├── sydney_boundary.json              # Individual city boundaries
├── melbourne_boundary.json
├── brisbane_boundary.json
├── perth_boundary.json
├── adelaide_boundary.json
├── canberra_boundary.json
├── hobart_boundary.json
└── darwin_boundary.json
```

### Boundary Structure

Each city boundary file contains:
```json
{
  "name": "Greater Sydney",
  "code": "1GSYD",
  "geometry": {
    "type": "MultiPolygon",
    "coordinates": [...]
  }
}
```

### Using Boundaries in the Web App

The app loads GCCSA polygon boundaries and can display them on the map:

```javascript
// Boundaries are loaded automatically when the app starts
await loadCityBoundary();

// Toggle boundary visibility
toggleCityBoundary(true);  // Show
toggleCityBoundary(false); // Hide
```

**User Interface:**
- Click the "Metro Boundary" button on the map to toggle the GCCSA polygon overlay
- The boundary is shown as a red dashed line with semi-transparent fill
- Button turns red when boundary is visible

### Using Boundaries in Python Scripts

The `boundary_utils.py` module provides helper functions:

```python
from boundary_utils import (
    load_city_boundary,
    is_point_in_metro_area,
    get_metro_bounds,
    filter_geojson_by_boundary
)

# Check if a point is in the metro area
if is_point_in_metro_area(lat, lon, 'sydney'):
    print("Point is in Greater Sydney")

# Get bounding box
min_lon, min_lat, max_lon, max_lat = get_metro_bounds('sydney')

# Filter GeoJSON data to metro boundary (polygon-based filtering)
filtered_data = filter_geojson_by_boundary(geojson, 'sydney')
```

### Downloading City Data

Use the new unified download script:

```bash
# Download with GCCSA boundary filtering
python3 scripts/download_city_data.py sydney

# Download with bbox only (no polygon filtering)
python3 scripts/download_city_data.py sydney --no-filter
```

## GCCSA Bounding Boxes

Updated bounding boxes based on official GCCSA boundaries:

| City | GCCSA Name | Latitude Range | Longitude Range |
|------|------------|----------------|-----------------|
| Sydney | Greater Sydney | -34.3312 to -32.9961 | 149.9719 to 151.6306 |
| Melbourne | Greater Melbourne | -38.5030 to -37.1751 | 144.3336 to 145.8784 |
| Brisbane | Greater Brisbane | -28.3639 to -26.4523 | 152.0734 to 153.5467 |
| Perth | Greater Perth | -32.8019 to -31.4551 | 115.4495 to 116.4151 |
| Adelaide | Greater Adelaide | -35.3503 to -34.5002 | 138.4357 to 139.0440 |
| Canberra | Australian Capital Territory | -35.9205 to -35.1244 | 148.7628 to 149.3993 |
| Hobart | Greater Hobart | -43.1213 to -42.6554 | 147.0267 to 147.9369 |
| Darwin | Greater Darwin | -12.8619 to -12.0009 | 130.8151 to 131.3967 |

## Comparison: Old vs New Boundaries

### Sydney
- **Old**: [-34.3, 150.35] to [-33.25, 151.5]
- **New**: [-34.3312, 149.9719] to [-32.9961, 151.6306]
- **Change**: Extended west (Blue Mountains now included per GCCSA), tightened south/east

### Melbourne
- **Old**: [-38.5, 144.5] to [-37.4, 145.8]
- **New**: [-38.5030, 144.3336] to [-37.1751, 145.8784]
- **Change**: Extended west and slightly adjusted other bounds

### Brisbane
- **Old**: [-27.8, 152.6] to [-27.1, 153.3]
- **New**: [-28.3639, 152.0734] to [-26.4523, 153.5467]
- **Change**: Significantly expanded north and south to match GCCSA

### Perth
- **Old**: [-32.5, 115.5] to [-31.4, 116.4]
- **New**: [-32.8019, 115.4495] to [-31.4551, 116.4151]
- **Change**: Extended south and west slightly

### Adelaide
- **Old**: [-35.2, 138.4] to [-34.6, 138.8]
- **New**: [-35.3503, 138.4357] to [-34.5002, 139.0440]
- **Change**: Extended south and significantly east

### Canberra
- **Old**: [-35.5, 148.9] to [-35.1, 149.3]
- **New**: [-35.9205, 148.7628] to [-35.1244, 149.3993]
- **Change**: Significantly extended south and east to cover full ACT

### Hobart
- **Old**: [-43.0, 147.1] to [-42.7, 147.5]
- **New**: [-43.1213, 147.0267] to [-42.6554, 147.9369]
- **Change**: Extended in all directions, particularly east

### Darwin
- **Old**: [-12.7, 130.6] to [-12.2, 131.1]
- **New**: [-12.8619, 130.8151] to [-12.0009, 131.3967]
- **Change**: Extended south and significantly east

## Data Source

**Source**: Australian Bureau of Statistics
**Dataset**: ASGS Edition 3 - Greater Capital City Statistical Areas
**Download**: https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs-edition-3/jul2021-jun2026/access-and-downloads/digital-boundary-files
**File**: GCCSA_2021_AUST_SHP_GDA2020.zip (21.5 MB)
**Coordinate System**: GDA2020 (Geographic, latitude/longitude)
**Date**: July 20, 2021

## Scripts

### Convert Boundaries
```bash
python3 scripts/convert_gccsa_boundaries.py
```
Converts the ABS shapefile to simplified GeoJSON format for each city.

### Test Boundaries
```bash
python3 scripts/boundary_utils.py
```
Tests boundary loading and point-in-polygon checks for all cities.

### Download City Data
```bash
python3 scripts/download_city_data.py <city>
```
Downloads OSM data using GCCSA boundaries.

## References

1. [ABS - Greater Capital City Statistical Areas](https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs-edition-3/jul2021-jun2026/main-structure-and-greater-capital-city-statistical-areas/greater-capital-city-statistical-areas)
2. [ASGS Edition 3 Digital Boundary Files](https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs-edition-3/jul2021-jun2026/access-and-downloads/digital-boundary-files)
3. [Geoscape Administrative Boundaries](https://data.gov.au/data/dataset/geoscape-administrative-boundaries)

## Future Work

- [ ] Consider using SA4 (Statistical Area Level 4) boundaries for even finer control
- [ ] Add boundary visualization overlay on the map
- [ ] Allow users to toggle between GCCSA and custom boundaries
- [ ] Update existing datasets to use new boundary definitions
