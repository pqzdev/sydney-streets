# Metropolitan Area Boundaries

This directory contains official GCCSA (Greater Capital City Statistical Area) boundary data from the Australian Bureau of Statistics.

## Files

- `GCCSA_2021_AUST_GDA2020.*` - Original ABS shapefiles (GDA2020 coordinate system)
- `city_boundaries.json` - Combined boundaries for all 8 capital cities
- `{city}_boundary.json` - Individual city boundary files

## Boundary Files Format

Each city boundary file contains:
```json
{
  "name": "Greater Sydney",
  "code": "1GSYD",
  "geometry": {
    "type": "MultiPolygon" or "Polygon",
    "coordinates": [...]
  }
}
```

## Cities Included

| City | GCCSA Name | Code | File |
|------|-----------|------|------|
| Sydney | Greater Sydney | 1GSYD | sydney_boundary.json |
| Melbourne | Greater Melbourne | 2GMEL | melbourne_boundary.json |
| Brisbane | Greater Brisbane | 3GBRI | brisbane_boundary.json |
| Perth | Greater Perth | 5GPER | perth_boundary.json |
| Adelaide | Greater Adelaide | 4GADE | adelaide_boundary.json |
| Canberra | Australian Capital Territory | 8ACTE | canberra_boundary.json |
| Hobart | Greater Hobart | 6GHOB | hobart_boundary.json |
| Darwin | Greater Darwin | 7GDAR | darwin_boundary.json |

## Data Source

- **Source**: Australian Bureau of Statistics
- **Standard**: ASGS Edition 3 (2021-2026)
- **License**: CC BY 4.0
- **Date**: July 20, 2021
- **Coordinate System**: GDA2020 (Geographic lat/lng)
- **URL**: https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs-edition-3/jul2021-jun2026/access-and-downloads/digital-boundary-files

## Usage

See `scripts/boundary_utils.py` for Python utilities to work with these boundaries.

See `docs/METROPOLITAN_BOUNDARIES.md` for full documentation.

## Regenerating Boundaries

If you need to regenerate the boundary files (e.g., when ABS releases ASGS Edition 4):

1. Download the latest GCCSA shapefile from ABS
2. Extract to this directory
3. Run: `python3 scripts/convert_gccsa_boundaries.py`

## Notes

- Boundaries are simplified (0.001° tolerance) to reduce file size while maintaining accuracy
- MultiPolygon geometries include islands and non-contiguous areas
- All coordinates are in WGS84 (EPSG:4326) decimal degrees
