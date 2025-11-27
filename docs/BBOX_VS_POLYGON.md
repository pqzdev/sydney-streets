# Bounding Box vs Polygon Boundaries

## The Problem with Rectangles

Using simple rectangular bounding boxes (lat/lng limits) to define metropolitan areas has significant issues:

```
┌─────────────────────────────────┐
│                                 │  ← Rectangle includes:
│     OCEAN    CITY    RURAL      │     - Ocean areas
│              ████                │     - Rural regions
│     ████   ████████   ████      │     - Non-metro suburbs
│              ████                │
│                                 │
└─────────────────────────────────┘
   Simple Rectangle (Old Approach)
```

## The Solution: GCCSA Polygons

Official GCCSA boundaries use **actual polygon geometry** that follows the true metropolitan extent:

```
        ╔══════════════╗
       ║   ████████    ║  ← Polygon follows:
      ║   ████████████  ║     - Actual city boundaries
     ║   ████████████   ║     - Statistical areas
      ║   ████████████  ║     - Functional regions
       ║   ████████     ║
        ╚══════════════╝
    GCCSA Polygon (New Approach)
```

## Real Example: Greater Brisbane

### Old (Rectangle)
```javascript
bounds: [[-27.8, 152.6], [-27.1, 153.3]]
```
- Area: ~6,037 km² (rectangle)
- Includes: Large ocean areas, rural regions
- Misses: Northern and southern metro suburbs
- Arbitrary: No official basis

### New (GCCSA Polygon)
```javascript
bounds: [[-28.3639, 152.0734], [-26.4523, 153.5467]]  // Bbox for initial view
boundaryFile: 'data/boundaries/brisbane_boundary.json'  // Actual polygon
```
- Area: **34,700 km²** (official GCCSA)
- Geometry: MultiPolygon with **33 separate parts**
- Points: **1,942 vertices** defining exact boundary
- Includes: All of Greater Brisbane GCCSA (Code: 3GBRI)
- Excludes: Areas outside the functional metro region
- **Change: +475% area** - shows how much was missed!

## Visual Comparison

### Sydney: Rectangle vs Polygon

**Rectangle Approach:**
```
                  ┌──────────────────┐
                  │                  │
                  │   Ocean          │
                  │                  │
          Blue    │                  │
          Mts     │   SYDNEY         │
          (missed)│   ████           │
                  │                  │
                  └──────────────────┘
                        Ocean
```

**GCCSA Polygon Approach:**
```
       ╔═══════════════════════════════╗
      ║                                 ║
     ║   Blue Mountains                 ║
    ║   ████████                        ║
   ║   ████████   SYDNEY                ║
  ║   ████████   ████████████            ║
   ║            ████████████            ║
    ║          ████████                ║
     ║                                 ║
      ║  (Excludes ocean)              ║
       ╚════════════════════════════╝
         16 separate polygon parts
```

## Implementation in This Project

### Web App
1. **Loads** polygon boundaries from GeoJSON files
2. **Displays** actual GCCSA boundary on map (toggle button)
3. **Uses** bounding box for initial view (performance)
4. **Can filter** streets by polygon boundary (accuracy)

### Python Scripts
```python
# Point-in-polygon checking
is_point_in_metro_area(lat, lon, 'sydney')  # True if in GCCSA

# Filter GeoJSON by polygon boundary
filter_geojson_by_boundary(data, 'sydney')  # Only streets in GCCSA
```

### Download Process
```
1. Get GCCSA bounding box → Fast Overpass API query
2. Download OSM data      → All streets in bbox
3. Filter by polygon      → Only streets in GCCSA
4. Save filtered data     → Accurate metro dataset
```

## All 8 Cities

| City | Rectangle | Polygon Type | Parts | Change |
|------|-----------|--------------|-------|---------|
| Sydney | 14,878 km² | MultiPolygon | 16 | **+83%** |
| Melbourne | 17,619 km² | MultiPolygon | 24 | **+44%** |
| Brisbane | 6,037 km² | MultiPolygon | 33 | **+475%** |
| Perth | 12,198 km² | MultiPolygon | 15 | **+31%** |
| Adelaide | Approx | MultiPolygon | 4 | Updated |
| Canberra | Approx | Polygon | 1 | Updated |
| Hobart | Approx | MultiPolygon | 69 | Updated |
| Darwin | Approx | MultiPolygon | 15 | Updated |

## Key Takeaway

**We're not using rectangles anymore!** 

✅ Actual polygon geometries with thousands of vertices  
✅ MultiPolygon support for islands and non-contiguous areas  
✅ Official ABS definitions from ASGS Edition 3  
✅ Visual overlay on the map to see the exact boundary  
✅ Python utilities for polygon-based filtering  

The bounding boxes in `app.js` are **only for initial map view** - the actual boundaries are proper polygon geometries loaded from GeoJSON files.
