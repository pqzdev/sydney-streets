# Multi-City Street Comparison Tool - Design Document

## Overview

A matrix-based visualization tool showing how street names are distributed across Australian capital cities. Each cell contains a mini-map showing the actual street locations plus a count.

## Visual Design

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Multi-City Street Comparison                                    │
├──────────────┬──────────────────────────────────────────────────┤
│              │         Sydney    Melbourne   Brisbane   Perth... │
│  Control     ├──────────────────────────────────────────────────┤
│  Panel       │  George St │ [map]  │  [map]   │  [map]   │ ... │
│              │            │  52    │   21     │   7      │     │
│              ├────────────┼────────┼──────────┼──────────┼─────┤
│  [Cities]    │ William St │ [map]  │  [map]   │  [map]   │ ... │
│  [Streets]   │            │  53    │   10     │   18     │     │
│  [Mode]      ├────────────┼────────┼──────────┼──────────┼─────┤
│  [Add/Del]   │ King St    │ [map]  │  [map]   │  [map]   │ ... │
│              │            │  41    │   8      │   17     │     │
│              └────────────┴────────┴──────────┴──────────┴─────┘
└──────────────────────────────────────────────────────────────────┘
```

### Cell Design

Each cell contains:
1. **Mini-map** (200x150px) showing street segments
   - Use Leaflet for consistency
   - Static tile layer (OSM)
   - Street segments overlaid in distinctive color
   - Auto-zoom to fit all segments
2. **Count badge** - Number overlay in corner
3. **Hover effect** - Enlarge or show details

### Control Panel (Left Sidebar)

**1. City Selection**
- Checkboxes for all 8 cities
- "Select All" / "Deselect All" buttons
- Default: All cities selected

**2. Street Name Mode**
- Radio buttons:
  - [ ] Name only (e.g., "George")
  - [ ] Name + Type (e.g., "George Street")
  - [x] Type only (e.g., "Street")
- Default: Name only

**3. Street Selection**
- Search box with autocomplete
- "Add Street" button
- List of selected streets with delete icons
- Default: Empty (show prompt to add streets)

**4. Presets**
- "Top 12 Streets" button
- "Royal Names" button
- "Tree Names" button
- Custom preset save/load

## Data Architecture

### Data Structure

```javascript
{
  cities: {
    sydney: {
      name: 'Sydney',
      counts: { /* from counts.json */ },
      boundaryFile: 'data/boundaries/sydney_boundary.json'
    },
    // ... other cities
  },

  selectedCities: ['sydney', 'melbourne', 'brisbane', ...],
  selectedStreets: ['George Street', 'William Street', ...],
  nameMode: 'name-only', // 'name-only', 'name-type', 'type'

  matrixData: {
    'George Street': {
      sydney: { count: 52, segments: [/* GeoJSON */] },
      melbourne: { count: 21, segments: [/* GeoJSON */] },
      // ...
    }
  }
}
```

### Data Loading Strategy

**Option 1: API-based (Recommended)**
- Use existing StreetAPI
- Fetch by street name per city
- Load only visible cells (lazy loading)
- Pros: Efficient, scalable
- Cons: Requires API calls

**Option 2: Pre-load counts**
- Load all counts.json files upfront
- Fetch geometries on-demand via API
- Pros: Fast street list, counts available
- Cons: Initial load time

**Recommended: Hybrid**
1. Load counts.json for all cities (small, ~100KB each)
2. Populate street name autocomplete
3. Fetch geometries via API when cells are added
4. Cache fetched geometries

## Technical Implementation

### File Structure

```
/
├── compare.html          (new page)
├── compare.css           (styles)
├── compare.js            (main logic)
├── compare-api.js        (data fetching)
└── compare-minimap.js    (mini-map rendering)
```

### Key Components

#### 1. ComparisonMatrix Class
```javascript
class ComparisonMatrix {
  constructor(cities, streets, mode)
  addStreet(streetName)
  removeStreet(streetName)
  addCity(cityId)
  removeCity(cityId)
  setMode(mode)
  render()
  exportData()
}
```

#### 2. MiniMap Class
```javascript
class MiniMap {
  constructor(containerId, cityId, streetName)
  async loadData()
  render()
  destroy()
}
```

#### 3. StreetSearch Component
```javascript
class StreetSearch {
  constructor(cities, mode)
  updateAutocomplete()
  onSelect(streetName)
}
```

### Technology Stack

- **Framework**: Vanilla JS (consistency with main app)
- **Maps**: Leaflet (already in use)
- **Tiles**: OpenStreetMap
- **Data**: StreetAPI (existing)
- **UI**: CSS Grid for matrix layout

## UI/UX Features

### Core Features (MVP)

1. ✅ Select multiple cities (checkboxes)
2. ✅ Select multiple streets (search + add)
3. ✅ Toggle name mode (name/name+type/type)
4. ✅ Matrix display with mini-maps
5. ✅ Street count in each cell
6. ✅ Empty state handling (0 streets)

### Enhanced Features (V2)

1. 🔄 Cell hover - enlarge map
2. 🔄 Cell click - open in main app
3. 🔄 Export matrix as image
4. 🔄 Sort rows (by total count, alphabetically)
5. 🔄 Sort columns (by city, by count)
6. 🔄 Color-code cells by count (heatmap)
7. 🔄 Preset configurations (Top 12, etc.)

### Performance Optimizations

1. **Lazy Loading**
   - Only render visible cells
   - Load geometries on-demand
   - Virtual scrolling for many streets

2. **Caching**
   - Cache fetched geometries
   - Cache rendered maps
   - Use localStorage for preferences

3. **Debouncing**
   - Debounce search input
   - Debounce resize events
   - Batch API requests

## Implementation Plan

### Phase 1: Foundation (Day 1)
- [ ] Create compare.html with basic layout
- [ ] Set up CSS Grid for matrix
- [ ] Implement control panel UI
- [ ] Load counts.json for all cities
- [ ] Build street name autocomplete

### Phase 2: Mini-Maps (Day 2)
- [ ] Create MiniMap class
- [ ] Integrate Leaflet in cells
- [ ] Fetch street geometries via API
- [ ] Auto-zoom to fit streets
- [ ] Add count badge overlay

### Phase 3: Interactivity (Day 3)
- [ ] Add/remove streets dynamically
- [ ] Add/remove cities dynamically
- [ ] Toggle name modes
- [ ] Handle empty cells
- [ ] Responsive design

### Phase 4: Polish (Day 4)
- [ ] Hover effects
- [ ] Loading states
- [ ] Error handling
- [ ] Preset configurations
- [ ] Export functionality

## Data Flow

```
User adds street name
    ↓
Search autocomplete (from loaded counts.json)
    ↓
Add to selectedStreets array
    ↓
For each selected city:
    - Fetch street count from counts.json (already loaded)
    - Fetch street geometries via StreetAPI
    ↓
Create MiniMap for each cell
    ↓
Render in matrix grid
```

## API Requirements

### Existing APIs to use:

1. **StreetAPI.loadCounts(city)**
   - Load counts.json for autocomplete
   - Get street counts

2. **StreetAPI.searchStreets(city, query)**
   - Search for street name
   - Returns matching streets with counts

3. **StreetAPI.loadStreetGeometry(city, streetName)**
   - Fetch GeoJSON for specific street
   - Used for mini-map rendering

## Challenges & Solutions

### Challenge 1: Many API calls
**Solution:**
- Pre-load counts.json (8 files, ~800KB total)
- Lazy load geometries
- Batch requests when possible

### Challenge 2: Map rendering performance
**Solution:**
- Limit mini-map tile layers (single zoom level)
- Use static tiles where possible
- Destroy maps when scrolled out of view

### Challenge 3: Large matrices (many streets × cities)
**Solution:**
- Virtual scrolling
- Pagination
- Limit to 20 streets at once
- Progressive loading

### Challenge 4: Name mode switching
**Solution:**
- Re-aggregate counts on mode change
- Use cached geometries (don't re-fetch)
- Smart street name normalization

## Example Use Cases

### Use Case 1: Compare "George Street" across cities
1. Select all 8 cities
2. Mode: "Name only"
3. Add "George"
4. See: Sydney (52), Melbourne (21), Brisbane (7), etc.
5. Visual: Mini-maps show distribution in each city

### Use Case 2: Find cities with most "Streets" vs "Roads"
1. Select all cities
2. Mode: "Type only"
3. Add "Street" and "Road"
4. Compare counts across cities
5. See which cities prefer which type

### Use Case 3: Royal names distribution
1. Select major cities (Sydney, Melbourne, Brisbane)
2. Mode: "Name only"
3. Add: George, Victoria, William, Elizabeth, Albert
4. See which royal names are most common where

## Success Metrics

- Fast initial load (< 2 seconds for all counts)
- Responsive mini-maps (< 500ms per map render)
- Smooth interactions (no lag when adding/removing)
- Clear visual hierarchy
- Intuitive controls

## Future Enhancements

1. **Comparison Stats**
   - Total streets per city
   - Average segments per street
   - Most/least common across cities

2. **Filtering**
   - Filter by LGA
   - Filter by count threshold
   - Filter by street type

3. **Visualizations**
   - Bar charts for counts
   - Heatmap color coding
   - Timeline (if historical data available)

4. **Sharing**
   - Generate shareable URL
   - Export as PNG/PDF
   - Embed code for blogs

## Technical Specifications

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Dependencies
- Leaflet 1.9.4 (already in use)
- OpenStreetMap tiles
- Existing StreetAPI

### File Sizes (Estimated)
- HTML: ~5KB
- CSS: ~10KB
- JS: ~30KB
- Data (counts): ~800KB (8 cities × ~100KB)
- Tiles: Loaded on-demand from OSM

## Accessibility

- Keyboard navigation for controls
- ARIA labels for screen readers
- Alt text for maps
- High contrast mode support
- Responsive text sizing

## Notes

- This is a separate page initially (compare.html)
- May integrate into main app later
- Reuses existing API and data structure
- Complements existing visualizations
- Could be linked from main app navigation
