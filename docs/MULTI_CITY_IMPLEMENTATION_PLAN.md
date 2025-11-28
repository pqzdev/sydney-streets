# Multi-City Street Comparison - Implementation Plan

## Implementation Phases

### Phase 1: Foundation & Data Loading ⏱️ 2-3 hours

#### Step 1.1: Create HTML Structure
**File:** `compare.html`

```html
<!DOCTYPE html>
<html>
<head>
    <title>Multi-City Street Comparison</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link rel="stylesheet" href="compare.css">
</head>
<body>
    <div class="compare-container">
        <!-- Control Panel -->
        <aside class="control-panel">
            <h2>Controls</h2>

            <!-- City Selection -->
            <section class="control-section">
                <h3>Cities</h3>
                <div id="city-checkboxes"></div>
                <button id="select-all-cities">Select All</button>
                <button id="deselect-all-cities">Deselect All</button>
            </section>

            <!-- Name Mode -->
            <section class="control-section">
                <h3>Street Name Mode</h3>
                <label><input type="radio" name="mode" value="name-only" checked> Name only</label>
                <label><input type="radio" name="mode" value="name-type"> Name + Type</label>
                <label><input type="radio" name="mode" value="type"> Type only</label>
            </section>

            <!-- Street Selection -->
            <section class="control-section">
                <h3>Streets</h3>
                <input type="text" id="street-search" placeholder="Search for a street...">
                <button id="add-street">Add Street</button>
                <div id="selected-streets"></div>
            </section>

            <!-- Presets -->
            <section class="control-section">
                <h3>Presets</h3>
                <button id="preset-top12">Top 12</button>
                <button id="preset-royal">Royal Names</button>
                <button id="preset-trees">Tree Names</button>
            </section>
        </aside>

        <!-- Matrix Container -->
        <main class="matrix-container">
            <div id="matrix-header"></div>
            <div id="matrix-grid"></div>
            <div id="empty-state">
                <p>Add streets to begin comparison</p>
            </div>
        </main>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="config.js"></script>
    <script src="api.js"></script>
    <script src="compare-minimap.js"></script>
    <script src="compare.js"></script>
</body>
</html>
```

#### Step 1.2: Create CSS Styles
**File:** `compare.css`

```css
* {
    box-sizing: border-box;
}

body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.compare-container {
    display: flex;
    height: 100vh;
}

/* Control Panel */
.control-panel {
    width: 280px;
    background: #f5f5f5;
    padding: 1rem;
    overflow-y: auto;
    border-right: 1px solid #ddd;
}

.control-section {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #ddd;
}

/* Matrix */
.matrix-container {
    flex: 1;
    overflow: auto;
    padding: 1rem;
}

#matrix-grid {
    display: grid;
    grid-template-columns: 150px repeat(auto-fill, 220px);
    gap: 1px;
    background: #ddd;
}

.matrix-cell {
    background: white;
    padding: 0.5rem;
    position: relative;
}

.mini-map-container {
    width: 200px;
    height: 150px;
    border: 1px solid #ddd;
    position: relative;
}

.count-badge {
    position: absolute;
    top: 5px;
    right: 5px;
    background: rgba(52, 152, 219, 0.9);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: bold;
    z-index: 1000;
}
```

#### Step 1.3: Data Loading Module
**File:** `compare-api.js`

```javascript
class ComparisonDataLoader {
    constructor() {
        this.cityData = {};
        this.loadedCounts = {};
        this.geometryCache = {};
    }

    async loadAllCityCounts() {
        // Load counts.json for all 8 cities
        const cities = ['sydney', 'melbourne', 'brisbane', 'perth',
                       'adelaide', 'canberra', 'hobart', 'darwin'];

        const promises = cities.map(city => this.loadCityCounts(city));
        await Promise.all(promises);
    }

    async loadCityCounts(city) {
        const config = cityConfigs[city];
        const counts = await StreetAPI.loadCounts(city, config.countsFile);
        this.loadedCounts[city] = counts;
        return counts;
    }

    getStreetCount(city, streetName) {
        const counts = this.loadedCounts[city];
        if (!counts || !counts.counts) return 0;
        return counts.counts[streetName] || 0;
    }

    async fetchStreetGeometry(city, streetName) {
        const cacheKey = `${city}:${streetName}`;
        if (this.geometryCache[cacheKey]) {
            return this.geometryCache[cacheKey];
        }

        // Fetch from API
        const geometry = await StreetAPI.loadStreetGeometry(city, streetName);
        this.geometryCache[cacheKey] = geometry;
        return geometry;
    }

    getAllStreetNames(mode = 'name-only') {
        // Aggregate unique street names across all cities
        const names = new Set();

        for (const [city, counts] of Object.entries(this.loadedCounts)) {
            if (!counts || !counts.counts) continue;

            for (const streetName of Object.keys(counts.counts)) {
                const normalized = this.normalizeStreetName(streetName, mode);
                names.add(normalized);
            }
        }

        return Array.from(names).sort();
    }

    normalizeStreetName(name, mode) {
        // Convert based on mode
        switch (mode) {
            case 'name-only':
                // Remove type suffix
                return name.replace(/\s+(Street|Road|Avenue|Lane|Drive|Court|Place|Way|Crescent|Terrace|Close|Grove|Circuit|Highway|Parade)$/i, '').trim();
            case 'type':
                // Extract only type
                const match = name.match(/\s+(Street|Road|Avenue|Lane|Drive|Court|Place|Way|Crescent|Terrace|Close|Grove|Circuit|Highway|Parade)$/i);
                return match ? match[1] : name;
            case 'name-type':
            default:
                return name;
        }
    }
}
```

### Phase 2: Mini-Map Component ⏱️ 3-4 hours

#### Step 2.1: MiniMap Class
**File:** `compare-minimap.js`

```javascript
class MiniMap {
    constructor(containerId, city, streetName, dataLoader) {
        this.containerId = containerId;
        this.city = city;
        this.streetName = streetName;
        this.dataLoader = dataLoader;
        this.map = null;
        this.layer = null;
    }

    async render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Create map
        this.map = L.map(this.containerId, {
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false,
            keyboard: false
        });

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18
        }).addTo(this.map);

        // Load and display street geometry
        try {
            const geometry = await this.dataLoader.fetchStreetGeometry(this.city, this.streetName);

            if (geometry && geometry.features && geometry.features.length > 0) {
                this.layer = L.geoJSON(geometry, {
                    style: {
                        color: '#e74c3c',
                        weight: 3,
                        opacity: 0.8
                    }
                }).addTo(this.map);

                // Fit bounds
                this.map.fitBounds(this.layer.getBounds(), {
                    padding: [10, 10]
                });
            } else {
                // No data - show city center
                const cityConfig = cityConfigs[this.city];
                this.map.setView(cityConfig.center, 12);
            }
        } catch (error) {
            console.error(`Error loading ${this.streetName} in ${this.city}:`, error);
            // Fallback to city center
            const cityConfig = cityConfigs[this.city];
            this.map.setView(cityConfig.center, 12);
        }
    }

    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }
}
```

### Phase 3: Main Application Logic ⏱️ 4-5 hours

#### Step 3.1: ComparisonMatrix Class
**File:** `compare.js`

```javascript
class ComparisonMatrix {
    constructor() {
        this.dataLoader = new ComparisonDataLoader();
        this.selectedCities = [];
        this.selectedStreets = [];
        this.nameMode = 'name-only';
        this.miniMaps = {};
        this.initialized = false;
    }

    async init() {
        // Load all city counts
        await this.dataLoader.loadAllCityCounts();

        // Initialize UI
        this.initCityCheckboxes();
        this.initModeRadios();
        this.initStreetSearch();
        this.initPresets();

        this.initialized = true;
        this.render();
    }

    initCityCheckboxes() {
        const container = document.getElementById('city-checkboxes');
        const cities = Object.keys(cityConfigs);

        cities.forEach(cityId => {
            const config = cityConfigs[cityId];
            const label = document.createElement('label');
            label.innerHTML = `
                <input type="checkbox" value="${cityId}" checked>
                ${config.name}
            `;
            label.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.addCity(cityId);
                } else {
                    this.removeCity(cityId);
                }
            });
            container.appendChild(label);
        });

        // Select all by default
        this.selectedCities = cities;
    }

    addStreet(streetName) {
        if (!this.selectedStreets.includes(streetName)) {
            this.selectedStreets.push(streetName);
            this.render();
        }
    }

    removeStreet(streetName) {
        const index = this.selectedStreets.indexOf(streetName);
        if (index > -1) {
            this.selectedStreets.splice(index, 1);
            this.render();
        }
    }

    addCity(cityId) {
        if (!this.selectedCities.includes(cityId)) {
            this.selectedCities.push(cityId);
            this.render();
        }
    }

    removeCity(cityId) {
        const index = this.selectedCities.indexOf(cityId);
        if (index > -1) {
            this.selectedCities.splice(index, 1);
            this.render();
        }
    }

    setMode(mode) {
        this.nameMode = mode;
        // Re-normalize selected streets
        this.render();
    }

    async render() {
        if (!this.initialized) return;

        const grid = document.getElementById('matrix-grid');
        const emptyState = document.getElementById('empty-state');

        // Clear existing maps
        Object.values(this.miniMaps).forEach(map => map.destroy());
        this.miniMaps = {};

        if (this.selectedStreets.length === 0 || this.selectedCities.length === 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        // Render matrix
        this.renderMatrix();
    }

    renderMatrix() {
        // Implementation in next step
    }
}

// Initialize on page load
let comparisonMatrix;
window.addEventListener('DOMContentLoaded', async () => {
    comparisonMatrix = new ComparisonMatrix();
    await comparisonMatrix.init();
});
```

### Phase 4: Matrix Rendering ⏱️ 2-3 hours

#### Step 4.1: Complete renderMatrix() method

```javascript
renderMatrix() {
    const grid = document.getElementById('matrix-grid');
    grid.innerHTML = '';

    // Set grid template
    grid.style.gridTemplateColumns = `150px repeat(${this.selectedCities.length}, 220px)`;

    // Header row
    // Empty corner cell
    const corner = document.createElement('div');
    corner.className = 'matrix-cell matrix-header';
    corner.textContent = 'Street \\ City';
    grid.appendChild(corner);

    // City headers
    this.selectedCities.forEach(cityId => {
        const header = document.createElement('div');
        header.className = 'matrix-cell matrix-header';
        header.textContent = cityConfigs[cityId].name;
        grid.appendChild(header);
    });

    // Data rows
    this.selectedStreets.forEach(streetName => {
        // Row header (street name)
        const rowHeader = document.createElement('div');
        rowHeader.className = 'matrix-cell matrix-row-header';
        rowHeader.textContent = streetName;

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.className = 'remove-street';
        removeBtn.onclick = () => this.removeStreet(streetName);
        rowHeader.appendChild(removeBtn);

        grid.appendChild(rowHeader);

        // Data cells
        this.selectedCities.forEach(cityId => {
            const cell = this.createDataCell(cityId, streetName);
            grid.appendChild(cell);
        });
    });
}

createDataCell(cityId, streetName) {
    const cell = document.createElement('div');
    cell.className = 'matrix-cell matrix-data-cell';

    // Get count
    const count = this.dataLoader.getStreetCount(cityId, streetName);

    if (count === 0) {
        cell.innerHTML = '<div class="no-data">No data</div>';
        return cell;
    }

    // Create mini-map container
    const mapContainer = document.createElement('div');
    mapContainer.className = 'mini-map-container';
    const mapId = `map-${cityId}-${streetName.replace(/\s+/g, '-')}`;
    mapContainer.id = mapId;

    // Add count badge
    const badge = document.createElement('div');
    badge.className = 'count-badge';
    badge.textContent = count;
    mapContainer.appendChild(badge);

    cell.appendChild(mapContainer);

    // Create and render mini-map
    setTimeout(async () => {
        const miniMap = new MiniMap(mapId, cityId, streetName, this.dataLoader);
        this.miniMaps[mapId] = miniMap;
        await miniMap.render();
    }, 0);

    return cell;
}
```

### Phase 5: Polish & Features ⏱️ 2-3 hours

#### Step 5.1: Street Search with Autocomplete

```javascript
initStreetSearch() {
    const searchInput = document.getElementById('street-search');
    const addButton = document.getElementById('add-street');
    const datalist = document.createElement('datalist');
    datalist.id = 'street-suggestions';
    searchInput.setAttribute('list', 'street-suggestions');
    document.body.appendChild(datalist);

    // Populate autocomplete
    const allStreets = this.dataLoader.getAllStreetNames(this.nameMode);
    allStreets.forEach(street => {
        const option = document.createElement('option');
        option.value = street;
        datalist.appendChild(option);
    });

    // Add street on button click
    addButton.addEventListener('click', () => {
        const value = searchInput.value.trim();
        if (value) {
            this.addStreet(value);
            searchInput.value = '';
        }
    });

    // Add street on Enter key
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addButton.click();
        }
    });
}
```

#### Step 5.2: Presets

```javascript
initPresets() {
    // Top 12 preset
    document.getElementById('preset-top12').addEventListener('click', () => {
        this.loadPresetTop12();
    });

    // Royal names preset
    document.getElementById('preset-royal').addEventListener('click', () => {
        this.loadPresetRoyal();
    });

    // Tree names preset
    document.getElementById('preset-trees').addEventListener('click', () => {
        this.loadPresetTrees();
    });
}

loadPresetTop12() {
    // Get top 12 streets across all selected cities
    const streetCounts = {};

    this.selectedCities.forEach(cityId => {
        const counts = this.loadedCounts[cityId];
        if (!counts || !counts.counts) return;

        for (const [street, count] of Object.entries(counts.counts)) {
            const normalized = this.dataLoader.normalizeStreetName(street, this.nameMode);
            streetCounts[normalized] = (streetCounts[normalized] || 0) + count;
        }
    });

    // Get top 12
    const top12 = Object.entries(streetCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([name]) => name);

    this.selectedStreets = top12;
    this.render();
}

loadPresetRoyal() {
    const royalNames = ['George', 'Victoria', 'Elizabeth', 'William', 'Albert',
                       'Edward', 'Mary', 'Anne', 'Charlotte', 'Margaret'];
    this.selectedStreets = royalNames;
    this.render();
}

loadPresetTrees() {
    const treeNames = ['Oak', 'Pine', 'Elm', 'Maple', 'Ash', 'Birch',
                       'Cedar', 'Willow', 'Fig', 'Wattle'];
    this.selectedStreets = treeNames;
    this.render();
}
```

## Testing Plan

### Unit Tests
1. Data loading and normalization
2. Street name mode conversion
3. Count aggregation
4. Geometry caching

### Integration Tests
1. Add/remove cities
2. Add/remove streets
3. Mode switching
4. Preset loading

### Performance Tests
1. Load time with all cities
2. Render time for 12 streets × 8 cities = 96 maps
3. Memory usage
4. Scroll performance

## Deployment Checklist

- [ ] Create compare.html
- [ ] Create compare.css
- [ ] Create compare-minimap.js
- [ ] Create compare.js
- [ ] Test with all 8 cities
- [ ] Test with Top 12 streets
- [ ] Test mode switching
- [ ] Test on mobile (responsive)
- [ ] Add link from main app
- [ ] Update README

## Estimated Timeline

- Phase 1: 2-3 hours
- Phase 2: 3-4 hours
- Phase 3: 4-5 hours
- Phase 4: 2-3 hours
- Phase 5: 2-3 hours

**Total: 13-18 hours (2-3 days)**

## Next Steps

1. Create HTML structure
2. Set up CSS grid layout
3. Implement data loading
4. Build mini-map component
5. Wire up interactivity
6. Add presets and polish
