# Multi-City Street Comparison Tool

A visualization tool for comparing street name distributions across Australian capital cities.

## Overview

This tool provides an interactive matrix-based interface where:
- **Columns** = Cities (Sydney, Melbourne, Brisbane, Perth, Adelaide, Canberra, Hobart, Darwin)
- **Rows** = Street names
- **Cells** = Mini-maps showing street locations + count

## Files

- [compare.html](compare.html) - Main HTML structure
- [compare.css](compare.css) - Styling and responsive layout
- [compare.js](compare.js) - JavaScript logic and data loading

## Features

### MVP Features (Implemented)

1. **City Selection**
   - Checkboxes to select which cities to include in comparison
   - Default: Sydney, Melbourne, Brisbane

2. **Street Search**
   - Text input with autocomplete
   - Add multiple streets to compare
   - Remove streets individually
   - Clear all streets button

3. **Display Modes**
   - Name only (e.g., "George")
   - Name + Type (e.g., "George Street")
   - Type only (e.g., "Street")

4. **Quick Presets**
   - Top 10 Streets: George, William, Victoria, Elizabeth, King, Queen, Albert, Edward, Mary, James
   - Number Streets: First, Second, Third, etc.
   - Royal Names: George, William, Victoria, Elizabeth, King, Queen, etc.

5. **Mini-Maps**
   - 200x150px Leaflet maps in each cell
   - Shows all instances of the street name in that city
   - Red lines for street segments
   - Street count displayed below each map

6. **Performance Optimizations**
   - Lazy loading: Maps only render when streets are added
   - Cached counts: Pre-load counts.json for all cities
   - Cached geometries: Load street geometries on-demand and cache

## Usage

### Access the Tool

1. Start a local server (if not already running):
   ```bash
   python3 -m http.server 8080
   ```

2. Open in browser:
   ```
   http://localhost:8080/compare.html
   ```

### Using the Interface

1. **Select Cities**: Check/uncheck cities in the left control panel
2. **Add Streets**:
   - Type a street name in the search box
   - Click "Add Street" or press Enter
   - Use preset buttons for common street names
3. **View Comparison**: The matrix updates automatically
4. **Adjust View**: Toggle between name modes (name/name+type/type)
5. **Remove Streets**: Click × on any street chip to remove it

## Data Sources

- **Street Data**: `data/cities/{city}/streets.geojson`
- **Street Counts**: `data/cities/{city}/counts.json`
- **Boundaries**: ABS GCCSA (2021-2026)

## Architecture

### Class: ComparisonDataLoader

Handles loading and caching of city data:
- `loadCounts(cityId)` - Load counts.json for a city
- `loadStreetGeometry(cityId, streetName)` - Load geometries for a specific street
- `getStreetCount(cityId, streetName)` - Get count for a street
- `getAllStreetNames(cityId)` - Get all street names (for autocomplete)

### Class: MiniMap

Renders individual mini-maps:
- `render()` - Initialize Leaflet map and load street geometry
- `destroy()` - Clean up map instance

### Class: ComparisonMatrix

Main controller:
- `init()` - Initialize interface and bind events
- `addCity(cityId)` / `removeCity(cityId)` - Manage city selection
- `addStreet(streetName)` / `removeStreet(streetName)` - Manage street selection
- `loadPreset(presetName)` - Load preset street collections
- `render()` - Render the comparison matrix
- `loadMapsData()` - Load data and render all mini-maps

## Example Comparisons

### Most Common Street Names

Compare how many instances of "George Street" exist across all cities:
- Sydney: 52
- Melbourne: 63
- Brisbane: 44
- Perth: 29
- Adelaide: 31
- Canberra: 7
- Hobart: 12
- Darwin: 8

### Royal Names Pattern

Add: George, William, Victoria, Elizabeth, King, Queen, Albert, Edward, Mary, Charles

See which cities favor which royal names in their street naming conventions.

### Number Streets

Add: First, Second, Third, Fourth, Fifth, Sixth, Seventh, Eighth, Ninth, Tenth

Compare the grid-based numbering systems across different cities.

## Future Enhancements (V2)

Potential improvements documented in [MULTI_CITY_IMPLEMENTATION_PLAN.md](docs/MULTI_CITY_IMPLEMENTATION_PLAN.md):

1. **Enhanced Autocomplete**: Show street counts while typing
2. **Export Features**: Export matrix as PNG/PDF
3. **Statistical Analysis**: Show totals, averages, percentages
4. **Color Coding**: Heat map colors based on count ranges
5. **Sorting Options**: Sort rows by total count, alphabetically, etc.
6. **URL Sharing**: Share specific comparisons via URL parameters
7. **Mobile Optimization**: Better touch controls and responsive design

## Technical Notes

### Performance Considerations

- **Large Datasets**: Melbourne has 49,462 unique street names (196k features)
- **Lazy Loading**: Only load geometries when needed
- **Caching**: Aggressive caching to minimize repeated file reads
- **Background Processing**: Maps render asynchronously to avoid UI blocking

### Browser Compatibility

- Requires modern browser with ES6 support
- Tested on Chrome, Firefox, Safari
- Leaflet.js for mapping (loaded from CDN)

### Data Format

**counts.json structure:**
```json
{
  "street_counts": {
    "George Street": 52,
    "William Street": 53,
    ...
  },
  "top_12": [...],
  "total_streets": 32413,
  "total_segments": 114948
}
```

**streets.geojson structure:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "George Street",
        "instance_id": "..."
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [...]
      }
    }
  ]
}
```

## Integration with Main App

Link from main app (index.html):
```html
<a href="compare.html">Compare Cities</a>
```

Link back to main app (compare.html):
```html
<a href="index.html">← Back to Main App</a>
```

## Credits

- **Data**: OpenStreetMap contributors
- **Boundaries**: Australian Bureau of Statistics (ABS GCCSA)
- **Mapping**: Leaflet.js
- **Processing**: Python scripts for street counting and filtering
