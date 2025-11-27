# Metropolitan Boundaries Implementation Summary

## What Changed

The project now uses **official GCCSA (Greater Capital City Statistical Area) boundaries** from the Australian Bureau of Statistics instead of arbitrary rectangular lat/lng boxes.

## Quick Start

### Download city data with proper boundaries:
```bash
python3 scripts/download_city_data.py sydney
python3 scripts/download_city_data.py melbourne
# ... etc for all cities
```

### Use boundary utilities in Python:
```python
from boundary_utils import is_point_in_metro_area, get_metro_bounds

# Check if point is in metro area
if is_point_in_metro_area(-33.8688, 151.2093, 'sydney'):
    print("Point is in Greater Sydney")

# Get bounding box
min_lon, min_lat, max_lon, max_lat = get_metro_bounds('sydney')
```

## Files Changed/Created

### New Files:
- `data/boundaries/GCCSA_2021_AUST_GDA2020.*` - Official ABS shapefiles
- `data/boundaries/city_boundaries.json` - Combined boundaries
- `data/boundaries/{city}_boundary.json` - Individual city boundaries (8 cities)
- `scripts/convert_gccsa_boundaries.py` - Converts shapefiles to GeoJSON
- `scripts/boundary_utils.py` - Utility functions for boundary operations
- `scripts/download_city_data.py` - New unified download script
- `docs/METROPOLITAN_BOUNDARIES.md` - Full documentation
- `docs/BOUNDARIES_SUMMARY.md` - This file

### Modified Files:
- `app.js` - Updated all city bounds to use GCCSA boundaries
- `docs/NEW_CITIES_TODO.md` - Updated with new boundary information

## Boundary Comparison

### Example: Sydney
| Metric | Old (Rectangle) | New (GCCSA) |
|--------|----------------|-------------|
| South | -34.3 | -34.3312 |
| West | 150.35 | 149.9719 |
| North | -33.25 | -32.9961 |
| East | 151.5 | 151.6306 |
| **Area** | ~8,500 km² | **12,368 km²** (official) |

The old rectangular approach missed significant western areas (Blue Mountains) and included areas outside the metropolitan region.

## Benefits

1. **Official Standard**: Uses ABS definitions used for census and official statistics
2. **Accurate**: Represents the actual functional metropolitan area
3. **Consistent**: Same methodology across all 8 capital cities
4. **Citable**: Can reference official sources in reports/publications
5. **Polygon-based**: Excludes non-metropolitan areas even within bounding box

## All City Boundaries (GCCSA)

| City | GCCSA Name | Code | Lat Range | Lon Range |
|------|-----------|------|-----------|-----------|
| Sydney | Greater Sydney | 1GSYD | -34.33 to -33.00 | 149.97 to 151.63 |
| Melbourne | Greater Melbourne | 2GMEL | -38.50 to -37.18 | 144.33 to 145.88 |
| Brisbane | Greater Brisbane | 3GBRI | -28.36 to -26.45 | 152.07 to 153.55 |
| Perth | Greater Perth | 5GPER | -32.80 to -31.46 | 115.45 to 116.42 |
| Adelaide | Greater Adelaide | 4GADE | -35.35 to -34.50 | 138.44 to 139.04 |
| Canberra | ACT | 8ACTE | -35.92 to -35.12 | 148.76 to 149.40 |
| Hobart | Greater Hobart | 6GHOB | -43.12 to -42.66 | 147.03 to 147.94 |
| Darwin | Greater Darwin | 7GDAR | -12.86 to -12.00 | 130.82 to 131.40 |

## Data Source

- **Organization**: Australian Bureau of Statistics
- **Standard**: Australian Statistical Geography Standard (ASGS) Edition 3
- **Valid**: July 2021 - June 2026
- **License**: Creative Commons Attribution 4.0 International
- **Download**: [ABS Digital Boundary Files](https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs-edition-3/jul2021-jun2026/access-and-downloads/digital-boundary-files)

## Next Steps

To apply these boundaries to existing city data:

1. Re-download OSM data using the new script:
   ```bash
   python3 scripts/download_city_data.py <city>
   ```

2. Reprocess the data:
   ```bash
   python3 scripts/process_full_dataset.py --city <city>
   ```

3. The data will automatically be filtered to the GCCSA boundaries

## Documentation

For complete details, see [METROPOLITAN_BOUNDARIES.md](METROPOLITAN_BOUNDARIES.md)
