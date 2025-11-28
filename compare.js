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
    async loadCounts(cityId) {
        if (this.countsCache[cityId]) {
            return this.countsCache[cityId];
        }

        try {
            const data = await StreetAPI.getCounts(cityId);
            this.countsCache[cityId] = data;
            return data;
        } catch (error) {
            console.error(`Error loading counts for ${cityId}:`, error);
            return { street_counts: {}, total_streets: 0 };
        }
    }

    /**
     * Load geometry data for a specific street in a city using the API
     */
    async loadStreetGeometry(cityId, streetName) {
        const cacheKey = `${cityId}:${streetName}`;
        if (this.geometryCache[cacheKey]) {
            return this.geometryCache[cacheKey];
        }

        try {
            const geojson = await StreetAPI.getStreetByName(cityId, streetName);
            this.geometryCache[cacheKey] = geojson;
            return geojson;
        } catch (error) {
            console.error(`Error loading geometry for ${cityId} - ${streetName}:`, error);
            return {
                type: 'FeatureCollection',
                features: []
            };
        }
    }

    /**
     * Get count for a specific street in a city
     */
    async getStreetCount(cityId, streetName) {
        const counts = await this.loadCounts(cityId);

        // API returns structure: { "street_counts": { "George": 52, ... } }
        if (counts.street_counts && counts.street_counts[streetName] !== undefined) {
            return counts.street_counts[streetName];
        }

        return 0;
    }

    /**
     * Get all street names from a city (for autocomplete)
     */
    async getAllStreetNames(cityId) {
        const counts = await this.loadCounts(cityId);
        return Object.keys(counts.street_counts || {}).sort();
    }
}

/**
 * Mini Map - Renders a small Leaflet map for a street in a city
 */
class MiniMap {
    constructor(containerId, cityId, streetName) {
        this.containerId = containerId;
        this.cityId = cityId;
        this.streetName = streetName;
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

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(this.map);

        // Load and display street geometry
        const geometry = await dataLoader.loadStreetGeometry(this.cityId, this.streetName);

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
        this.nameMode = 'name';
        this.miniMaps = {}; // Track mini map instances
    }

    /**
     * Initialize the matrix and event listeners
     */
    init() {
        this.bindEvents();
        this.render();
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // City checkboxes
        document.querySelectorAll('.city-checkboxes input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const cityId = e.target.value;
                if (e.target.checked) {
                    this.addCity(cityId);
                } else {
                    this.removeCity(cityId);
                }
            });
        });

        // Name mode radio buttons
        document.querySelectorAll('.name-mode input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.nameMode = e.target.value;
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
            this.render();
        }
    }

    /**
     * Remove a city from the comparison
     */
    removeCity(cityId) {
        this.selectedCities = this.selectedCities.filter(id => id !== cityId);
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
            this.render();
        }
    }

    /**
     * Remove a street from the comparison
     */
    removeStreet(streetName) {
        this.selectedStreets = this.selectedStreets.filter(s => s !== streetName);
        this.updateStreetList();
        this.render();
    }

    /**
     * Clear all streets
     */
    clearAllStreets() {
        this.selectedStreets = [];
        this.updateStreetList();
        this.render();
    }

    /**
     * Load a preset collection of streets
     */
    loadPreset(presetName) {
        const streets = PRESETS[presetName] || [];
        this.selectedStreets = [...streets];
        this.updateStreetList();
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
        const headerRow = document.getElementById('matrix-header-row');
        const tbody = document.getElementById('matrix-body');

        // Clear existing mini maps
        Object.values(this.miniMaps).forEach(map => map.destroy());
        this.miniMaps = {};

        // Render header
        headerRow.innerHTML = '<th class="street-name-header">Street Name</th>';
        this.selectedCities.forEach(cityId => {
            const config = CITY_CONFIG[cityId];
            const th = document.createElement('th');
            th.className = 'city-header';
            th.textContent = config.name;
            headerRow.appendChild(th);
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
                    // Get count
                    const count = await dataLoader.getStreetCount(cityId, streetName);
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

                            const miniMap = new MiniMap(containerId, cityId, streetName);
                            await miniMap.render();
                            this.miniMaps[containerId] = miniMap;
                        }
                    } else {
                        // No streets found
                        const container = document.getElementById(containerId);
                        if (container) {
                            container.classList.remove('loading');
                            container.textContent = 'No data';
                            container.style.display = 'flex';
                            container.style.alignItems = 'center';
                            container.style.justifyContent = 'center';
                            container.style.fontSize = '0.85rem';
                            container.style.color = '#95a5a6';
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
