/**
 * Multi-City Street Comparison Tool
 * Compare street name distributions across Australian capital cities
 */

// Configuration
const CITY_CONFIG = {
    sydney: {
        name: 'Sydney',
        center: [-33.8688, 151.2093]
    },
    melbourne: {
        name: 'Melbourne',
        center: [-37.8136, 144.9631]
    },
    brisbane: {
        name: 'Brisbane',
        center: [-27.4698, 153.0251]
    },
    perth: {
        name: 'Perth',
        center: [-31.9505, 115.8605]
    },
    adelaide: {
        name: 'Adelaide',
        center: [-34.9285, 138.6007]
    },
    canberra: {
        name: 'Canberra',
        center: [-35.2809, 149.1300]
    },
    hobart: {
        name: 'Hobart',
        center: [-42.8821, 147.3272]
    },
    darwin: {
        name: 'Darwin',
        center: [-12.4634, 130.8456]
    }
};

// Presets
const PRESETS = {
    top10: ['George', 'William', 'Victoria', 'Elizabeth', 'King', 'Queen', 'Albert', 'Edward', 'Mary', 'James'],
    numbers: ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'],
    royalty: ['George', 'William', 'Victoria', 'Elizabeth', 'King', 'Queen', 'Albert', 'Edward', 'Mary', 'Charles']
};

/**
 * Data Loader - Handles loading and caching of city data using the API
 */
class ComparisonDataLoader {
    constructor() {
        this.countsCache = {}; // Cache for counts data
        this.geometryCache = {}; // Cache for street geometries
    }

    /**
     * Load counts data for a city using the API
     */
    async loadCounts(cityId, mode = 'name-type') {
        const cacheKey = `${cityId}:${mode}`;
        if (this.countsCache[cacheKey]) {
            return this.countsCache[cacheKey];
        }

        try {
            const data = await StreetAPI.getCounts(cityId, mode);
            this.countsCache[cacheKey] = data;
            return data;
        } catch (error) {
            console.error(`Error loading counts for ${cityId}:`, error);
            return { counts: {}, total_streets: 0 };
        }
    }

    /**
     * Load geometry data for a specific street in a city using the API
     * In name-only or type-only mode, this loads ALL variants of the street
     */
    async loadStreetGeometry(cityId, searchName, mode) {
        const cacheKey = `${cityId}:${searchName}:${mode}`;
        if (this.geometryCache[cacheKey]) {
            return this.geometryCache[cacheKey];
        }

        try {
            // Get all matching street names based on mode
            const matchingNames = await this.getMatchingStreetNames(cityId, searchName, mode);

            if (matchingNames.length === 0) {
                return {
                    type: 'FeatureCollection',
                    features: []
                };
            }

            // If name-type mode or only one match, fetch directly
            if (mode === 'name-type' || matchingNames.length === 1) {
                const geojson = await StreetAPI.getStreetByName(cityId, matchingNames[0]);
                this.geometryCache[cacheKey] = geojson;
                return geojson;
            }

            // For name-only or type mode, fetch all variants and combine
            const allFeatures = [];
            for (const streetName of matchingNames) {
                const geojson = await StreetAPI.getStreetByName(cityId, streetName);
                if (geojson.features) {
                    allFeatures.push(...geojson.features);
                }
            }

            const combined = {
                type: 'FeatureCollection',
                features: allFeatures
            };
            this.geometryCache[cacheKey] = combined;
            return combined;

        } catch (error) {
            console.error(`Error loading geometry for ${cityId} - ${searchName}:`, error);
            return {
                type: 'FeatureCollection',
                features: []
            };
        }
    }

    /**
     * Get all street names that match the search term based on mode
     * Returns full street names (for fetching geometry)
     */
    async getMatchingStreetNames(cityId, searchName, mode) {
        if (mode === 'name-type') {
            // For name-type mode, searchName is already the full name
            return [searchName];
        }

        // For name-only and type modes, we need to find all full names that match
        // Get the full name list from name-type mode
        const fullNameData = await this.loadCounts(cityId, 'name-type');
        const allFullNames = Object.keys(fullNameData.counts || {});

        if (mode === 'name-only') {
            // Find all full names with this base name
            return allFullNames.filter(fullName =>
                getBaseName(fullName).toLowerCase() === searchName.toLowerCase()
            );
        } else if (mode === 'type') {
            // Find all full names with this street type
            return allFullNames.filter(fullName =>
                getStreetType(fullName).toLowerCase() === searchName.toLowerCase()
            );
        }

        return [];
    }

    /**
     * Get count for a specific street in a city
     * In the new API, the count is already aggregated based on mode
     */
    async getStreetCount(cityId, searchName, mode) {
        const data = await this.loadCounts(cityId, mode);

        // Direct lookup since API already aggregates by mode
        // Try exact match first, then case-insensitive search
        if (data.counts[searchName] !== undefined) {
            return data.counts[searchName];
        }

        // Case-insensitive fallback
        const lowerSearch = searchName.toLowerCase();
        for (const [name, count] of Object.entries(data.counts)) {
            if (name.toLowerCase() === lowerSearch) {
                return count;
            }
        }

        return 0;
    }

    /**
     * Get all street names from a city (for autocomplete)
     */
    async getAllStreetNames(cityId, mode = 'name-type') {
        const data = await this.loadCounts(cityId, mode);
        return Object.keys(data.counts || {}).sort();
    }
}

/**
 * Mini Map - Renders a small Leaflet map for a street in a city
 */
class MiniMap {
    constructor(containerId, cityId, streetName, mode) {
        this.containerId = containerId;
        this.cityId = cityId;
        this.streetName = streetName;
        this.mode = mode;
        this.map = null;
        this.layer = null;
    }

    /**
     * Initialize and render the map
     */
    async render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Initialize map
        const config = CITY_CONFIG[this.cityId];
        this.map = L.map(this.containerId, {
            center: config.center,
            zoom: 11,
            zoomControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false,
            keyboard: false,
            attributionControl: false
        });

        // Add tile layer (CartoDB Light - same as main page)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }).addTo(this.map);

        // Load and display street geometry (handles mode-based matching)
        const geometry = await dataLoader.loadStreetGeometry(this.cityId, this.streetName, this.mode);

        if (geometry.features.length > 0) {
            this.layer = L.geoJSON(geometry, {
                style: {
                    color: '#e74c3c',
                    weight: 3,
                    opacity: 0.8
                }
            }).addTo(this.map);

            // Fit map to geometry bounds
            const bounds = this.layer.getBounds();
            if (bounds.isValid()) {
                this.map.fitBounds(bounds, { padding: [10, 10] });
            }
        }
    }

    /**
     * Destroy the map instance
     */
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }
}

/**
 * Comparison Matrix - Main controller for the comparison interface
 */
class ComparisonMatrix {
    constructor() {
        this.selectedCities = ['sydney', 'melbourne', 'brisbane'];
        this.selectedStreets = [];
        this.nameMode = 'name-only';
        this.miniMaps = {}; // Track mini map instances
    }

    /**
     * Initialize the matrix and event listeners
     */
    init() {
        this.loadFromURL();
        this.bindEvents();
        this.syncUIWithState();
        this.render();
    }

    /**
     * Load state from URL parameters
     */
    loadFromURL() {
        const params = new URLSearchParams(window.location.search);

        // Load cities
        const citiesParam = params.get('cities');
        if (citiesParam) {
            this.selectedCities = citiesParam.split(',').filter(c => CITY_CONFIG[c]);
        }

        // Load streets
        const streetsParam = params.get('streets');
        if (streetsParam) {
            this.selectedStreets = streetsParam.split(',').map(s => decodeURIComponent(s));
        }

        // Load mode
        const modeParam = params.get('mode');
        if (modeParam && ['name-only', 'name-type', 'type'].includes(modeParam)) {
            this.nameMode = modeParam;
        }
    }

    /**
     * Sync UI checkboxes and radio buttons with current state
     */
    syncUIWithState() {
        // Render city checkboxes in order (selected first, then unselected)
        this.renderCityCheckboxes();

        // Sync mode radio buttons
        document.querySelectorAll('.name-mode input[type="radio"]').forEach(radio => {
            radio.checked = radio.value === this.nameMode;
        });

        // Update street list UI
        this.updateStreetList();
    }

    /**
     * Render city checkboxes with drag-and-drop support
     */
    renderCityCheckboxes() {
        const container = document.querySelector('.city-checkboxes');
        container.innerHTML = '';

        // Get all cities (selected first, maintaining order, then unselected)
        const allCityIds = Object.keys(CITY_CONFIG);
        const unselectedCities = allCityIds.filter(id => !this.selectedCities.includes(id));
        const orderedCities = [...this.selectedCities, ...unselectedCities];

        orderedCities.forEach(cityId => {
            const config = CITY_CONFIG[cityId];
            const isSelected = this.selectedCities.includes(cityId);

            const label = document.createElement('label');
            label.draggable = isSelected; // Only selected cities are draggable
            label.dataset.cityId = cityId;
            label.className = isSelected ? 'draggable' : '';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = cityId;
            checkbox.checked = isSelected;
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.addCity(cityId);
                } else {
                    this.removeCity(cityId);
                }
            });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(' ' + config.name));

            // Add drag-and-drop event listeners for selected cities
            if (isSelected) {
                label.addEventListener('dragstart', (e) => this.handleDragStart(e));
                label.addEventListener('dragend', (e) => this.handleDragEnd(e));
                label.addEventListener('dragover', (e) => this.handleDragOver(e));
                label.addEventListener('drop', (e) => this.handleDrop(e));
            }

            container.appendChild(label);
        });
    }

    handleDragStart(e) {
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', e.target.dataset.cityId);
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDrop(e) {
        e.preventDefault();
        const draggedCityId = e.dataTransfer.getData('text/plain');
        const targetCityId = e.target.closest('label').dataset.cityId;

        if (draggedCityId === targetCityId) return;

        // Reorder selectedCities array
        const draggedIndex = this.selectedCities.indexOf(draggedCityId);
        const targetIndex = this.selectedCities.indexOf(targetCityId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
            this.selectedCities.splice(draggedIndex, 1);
            const newTargetIndex = this.selectedCities.indexOf(targetCityId);
            this.selectedCities.splice(newTargetIndex, 0, draggedCityId);

            this.updateURL();
            this.syncUIWithState();
            this.render();
        }
    }

    /**
     * Update URL with current state
     */
    updateURL() {
        const params = new URLSearchParams();

        if (this.selectedCities.length > 0) {
            params.set('cities', this.selectedCities.join(','));
        }

        if (this.selectedStreets.length > 0) {
            params.set('streets', this.selectedStreets.map(s => encodeURIComponent(s)).join(','));
        }

        // Always include mode in URL
        params.set('mode', this.nameMode);

        const newURL = params.toString() ?
            `${window.location.pathname}?${params.toString()}` :
            window.location.pathname;

        window.history.replaceState({}, '', newURL);
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // City checkboxes are handled in renderCityCheckboxes()

        // Name mode radio buttons
        document.querySelectorAll('.name-mode input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.nameMode = e.target.value;
                this.updateURL();
                this.render();
            });
        });

        // Add street button
        document.getElementById('add-street-btn').addEventListener('click', () => {
            this.addStreetFromInput();
        });

        // Street search input - Enter key
        document.getElementById('street-search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addStreetFromInput();
            }
        });

        // Clear all button
        document.getElementById('clear-all-btn').addEventListener('click', () => {
            this.clearAllStreets();
        });

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.target.dataset.preset;
                this.loadPreset(preset);
            });
        });
    }

    /**
     * Add a city to the comparison
     */
    addCity(cityId) {
        if (!this.selectedCities.includes(cityId)) {
            this.selectedCities.push(cityId);
            this.updateURL();
            this.render();
        }
    }

    /**
     * Remove a city from the comparison
     */
    removeCity(cityId) {
        this.selectedCities = this.selectedCities.filter(id => id !== cityId);
        this.updateURL();
        this.render();
    }

    /**
     * Add a street from the input field
     */
    addStreetFromInput() {
        const input = document.getElementById('street-search-input');
        const streetName = input.value.trim();

        if (streetName) {
            this.addStreet(streetName);
            input.value = '';
        }
    }

    /**
     * Add a street to the comparison
     */
    addStreet(streetName) {
        if (!this.selectedStreets.includes(streetName)) {
            this.selectedStreets.push(streetName);
            this.updateStreetList();
            this.updateURL();
            this.render();
        }
    }

    /**
     * Remove a street from the comparison
     */
    removeStreet(streetName) {
        this.selectedStreets = this.selectedStreets.filter(s => s !== streetName);
        this.updateStreetList();
        this.updateURL();
        this.render();
    }

    /**
     * Clear all streets
     */
    clearAllStreets() {
        this.selectedStreets = [];
        this.updateStreetList();
        this.updateURL();
        this.render();
    }

    /**
     * Load a preset collection of streets
     */
    loadPreset(presetName) {
        const streets = PRESETS[presetName] || [];
        this.selectedStreets = [...streets];
        this.updateStreetList();
        this.updateURL();
        this.render();
    }

    /**
     * Update the street list chips in the control panel
     */
    updateStreetList() {
        const container = document.getElementById('street-list');
        container.innerHTML = '';

        this.selectedStreets.forEach(street => {
            const chip = document.createElement('div');
            chip.className = 'street-chip';
            chip.innerHTML = `
                <span>${street}</span>
                <button class="remove-btn" data-street="${street}">×</button>
            `;

            chip.querySelector('.remove-btn').addEventListener('click', (e) => {
                const streetName = e.target.dataset.street;
                this.removeStreet(streetName);
            });

            container.appendChild(chip);
        });
    }

    /**
     * Render the comparison matrix
     */
    async render() {
        const headerRow1 = document.getElementById('matrix-header-row-1');
        const headerRow2 = document.getElementById('matrix-header-row-2');
        const tbody = document.getElementById('matrix-body');

        // Clear existing mini maps
        Object.values(this.miniMaps).forEach(map => map.destroy());
        this.miniMaps = {};

        // Render first header row (Metro area label)
        // Clear existing city headers (keep Street Name which has rowspan=2)
        while (headerRow1.children.length > 1) {
            headerRow1.removeChild(headerRow1.lastChild);
        }

        if (this.selectedCities.length > 0) {
            const metroTh = document.createElement('th');
            metroTh.className = 'metro-area-header';
            metroTh.colSpan = this.selectedCities.length;
            metroTh.textContent = 'Metro area';
            headerRow1.appendChild(metroTh);
        }

        // Render second header row (individual city names)
        headerRow2.innerHTML = '';
        this.selectedCities.forEach(cityId => {
            const config = CITY_CONFIG[cityId];
            const th = document.createElement('th');
            th.className = 'city-header';
            th.textContent = config.name;
            headerRow2.appendChild(th);
        });

        // Render body
        tbody.innerHTML = '';

        if (this.selectedStreets.length === 0 || this.selectedCities.length === 0) {
            // Show empty state
            const emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-state';
            emptyRow.innerHTML = `
                <td colspan="${this.selectedCities.length + 1}">
                    <div class="empty-message">
                        <p>👈 Select cities and add streets to begin comparison</p>
                    </div>
                </td>
            `;
            tbody.appendChild(emptyRow);
            return;
        }

        // Render each street row
        for (const streetName of this.selectedStreets) {
            const row = document.createElement('tr');

            // Street name cell
            const nameCell = document.createElement('td');
            nameCell.className = 'street-name-cell';
            nameCell.textContent = streetName;
            row.appendChild(nameCell);

            // City cells
            for (const cityId of this.selectedCities) {
                const mapCell = document.createElement('td');
                mapCell.className = 'map-cell';

                const containerId = `map-${cityId}-${streetName.replace(/\s/g, '-')}`;

                mapCell.innerHTML = `
                    <div class="mini-map-container">
                        <div id="${containerId}" class="mini-map loading">Loading...</div>
                        <div class="street-count" id="count-${containerId}">-</div>
                    </div>
                `;

                row.appendChild(mapCell);
            }

            tbody.appendChild(row);
        }

        // Load data and render maps (after DOM is ready)
        setTimeout(() => this.loadMapsData(), 100);
    }

    /**
     * Load data and render all mini maps
     */
    async loadMapsData() {
        for (const streetName of this.selectedStreets) {
            for (const cityId of this.selectedCities) {
                const containerId = `map-${cityId}-${streetName.replace(/\s/g, '-')}`;
                const countId = `count-${containerId}`;

                try {
                    // Get count (using current name mode)
                    const count = await dataLoader.getStreetCount(cityId, streetName, this.nameMode);
                    const countElement = document.getElementById(countId);
                    if (countElement) {
                        countElement.textContent = count;
                        if (count === 0) {
                            countElement.classList.add('zero');
                        }
                    }

                    // Render map if count > 0
                    if (count > 0) {
                        const container = document.getElementById(containerId);
                        if (container) {
                            container.classList.remove('loading');
                            container.textContent = '';

                            const miniMap = new MiniMap(containerId, cityId, streetName, this.nameMode);
                            await miniMap.render();
                            this.miniMaps[containerId] = miniMap;
                        }
                    } else {
                        // No streets found - just show empty grey square
                        const container = document.getElementById(containerId);
                        if (container) {
                            container.classList.remove('loading');
                            container.textContent = '';
                            container.classList.add('no-data');
                        }
                    }
                } catch (error) {
                    console.error(`Error loading data for ${cityId} - ${streetName}:`, error);
                    const container = document.getElementById(containerId);
                    if (container) {
                        container.classList.remove('loading');
                        container.textContent = 'Error';
                    }
                }
            }
        }
    }
}

// Global instances
const dataLoader = new ComparisonDataLoader();
const matrix = new ComparisonMatrix();

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    matrix.init();
});
