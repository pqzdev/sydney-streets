# GCCSA Polygon Boundaries - Complete Implementation

## Summary

The Sydney Streets project now uses **official GCCSA (Greater Capital City Statistical Area) polygon boundaries** from the Australian Bureau of Statistics instead of arbitrary rectangular lat/lng boxes.

## What's Implemented

### ✅ Polygon Boundary Data (Not Just Boxes!)

**Before:** Simple rectangular bounding boxes
```javascript
bounds: [[-34.3, 150.35], [-33.25, 151.5]]  // Just a rectangle
```

**After:** Actual GCCSA polygon boundaries + bounding box
```javascript
bounds: [[-34.3312, 149.9719], [-32.9961, 151.6306]],  // Bbox for initial view
boundaryFile: 'data/boundaries/sydney_boundary.json'    // ACTUAL polygon!
```

### ✅ 8 Cities with Official Boundaries

All **8 Australian capital cities** now have official GCCSA polygon boundaries:

| City | GCCSA Name | Geometry Type | Points |
|------|-----------|---------------|--------|
| Sydney | Greater Sydney | MultiPolygon | 3,202 |
| Melbourne | Greater Melbourne | MultiPolygon | 1,179 |
| Brisbane | Greater Brisbane | MultiPolygon | 1,942 |
| Perth | Greater Perth | MultiPolygon | 929 |
| Adelaide | Greater Adelaide | MultiPolygon | 495 |
| Hobart | Greater Hobart | MultiPolygon | 1,423 |
| Darwin | Greater Darwin | MultiPolygon | 713 |
| Canberra | Australian Capital Territory | Polygon | 387 |

### ✅ Web App Features

1. **Boundary Loading**: Polygon boundaries are loaded automatically on app start
2. **Visual Overlay**: Click "Metro Boundary" button to show/hide the GCCSA polygon on the map
3. **Boundary Display**: Red dashed polygon with semi-transparent fill
4. **Toggle Control**: Button changes color (blue → red) when boundary is visible

### ✅ Python Scripts

1. **`convert_gccsa_boundaries.py`**: Converts ABS shapefiles to GeoJSON
2. **`boundary_utils.py`**: Utility functions for:
   - Loading polygon boundaries
   - Point-in-polygon checking
   - Filtering GeoJSON by polygon boundary
   - Getting bounding boxes
3. **`download_city_data.py`**: Unified download script with polygon filtering

## How It Works

### 1. Bounding Box vs Polygon

**Bounding Box** (bbox):
- Fast rectangular approximation
- Used for initial map view and Overpass API queries
- May include areas outside the metro region

**Polygon Boundary**:
- Exact GCCSA geometry from ABS
- Used for accurate filtering
- Excludes non-metropolitan areas even if within bbox

### 2. Data Flow

```
Download OSM Data
    ↓
Use bbox for Overpass API query (fast)
    ↓
Filter results by polygon boundary (accurate)
    ↓
Save only streets within GCCSA
```

### 3. Web App Flow

```
Load app
    ↓
Load GCCSA polygon from JSON
    ↓
Display map with bbox view
    ↓
User clicks "Metro Boundary" button
    ↓
Show/hide polygon overlay
```

## Key Files

### Data Files
- `data/boundaries/*.json` - Individual city boundaries (8 files)
- `data/boundaries/city_boundaries.json` - Combined boundaries
- `data/boundaries/GCCSA_2021_AUST_GDA2020.*` - Original ABS shapefiles

### Code Files
- `app.js` - Lines 18-20, 62, 897-951: Boundary loading and display
- `index.html` - Line 787: Boundary toggle button
- `scripts/convert_gccsa_boundaries.py` - Converts shapefiles
- `scripts/boundary_utils.py` - Boundary utilities
- `scripts/download_city_data.py` - Downloads with polygon filtering

### Documentation
- `docs/METROPOLITAN_BOUNDARIES.md` - Complete technical documentation
- `docs/BOUNDARIES_SUMMARY.md` - Quick reference
- `data/boundaries/README.md` - Boundary data documentation

## User Experience

### For End Users

1. **Open the app** - Boundaries load automatically
2. **Click "Metro Boundary"** button on map
3. **See the exact GCCSA boundary** as red polygon overlay
4. **Understand the metro area** extent visually

### For Developers

```python
# Download with polygon filtering
python3 scripts/download_city_data.py sydney

# Check if point is in metro area
from boundary_utils import is_point_in_metro_area
if is_point_in_metro_area(-33.8688, 151.2093, 'sydney'):
    print("In Greater Sydney")

# Filter existing GeoJSON
from boundary_utils import filter_geojson_by_boundary
filtered = filter_geojson_by_boundary(data, 'sydney')
```

## Data Source

- **Source**: Australian Bureau of Statistics
- **Dataset**: ASGS Edition 3 - GCCSA 2021
- **License**: CC BY 4.0
- **Valid**: July 2021 - June 2026
- **Download**: [ABS Digital Boundary Files](https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs-edition-3/jul2021-jun2026/access-and-downloads/digital-boundary-files)

## Example: Sydney Changes

### Old (Rectangle)
```
Bounds: [-34.3, 150.35] to [-33.25, 151.5]
Area: ~8,500 km² (rectangle)
Problems:
- Missed western areas (Blue Mountains)
- Included ocean and non-metro regions
```

### New (GCCSA Polygon)
```
Bounds: [-34.3312, 149.9719] to [-32.9961, 151.6306]
Area: 12,368 km² (official)
Geometry: MultiPolygon with 16 parts, 3,202 points
Includes: All of Greater Sydney GCCSA (Code: 1GSYD)
Excludes: Areas outside metro boundary
```

## Benefits

1. ✅ **Accurate**: Uses actual geographic polygons, not rectangles
2. ✅ **Official**: Based on ABS definitions
3. ✅ **Visual**: Users can see the boundary on the map
4. ✅ **Consistent**: Same methodology for all 8 cities
5. ✅ **Flexible**: Can use polygon or bbox depending on use case
6. ✅ **Documented**: Fully documented with sources

## Next Steps

- Consider using polygon boundaries for client-side street filtering
- Add statistics showing streets inside vs outside boundary
- Allow users to export the boundary polygon
- Add SA4 (Statistical Area Level 4) sub-boundaries
