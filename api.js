/**
 * API client for backend street data
 */

// API helper functions
const StreetAPI = {
    /**
     * Get street counts for a city
     * @param {string} city - City name (e.g., 'sydney', 'melbourne')
     * @returns {Promise<Object>} - Counts data with {method, total_streets, counts}
     */
    async getCounts(city) {
        const url = `${API_BASE_URL}/api/counts?city=${city}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch counts: ${response.statusText}`);
        }
        return await response.json();
    },

    /**
     * Get streets within viewport bounds
     * @param {string} city - City name
     * @param {Object} bounds - Map bounds {south, west, north, east}
     * @returns {Promise<Object>} - GeoJSON FeatureCollection
     */
    async getStreetsByBounds(city, bounds) {
        const boundsStr = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
        const url = `${API_BASE_URL}/api/streets?city=${city}&bounds=${boundsStr}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch streets: ${response.statusText}`);
        }
        return await response.json();
    },

    /**
     * Get all instances of a specific street
     * @param {string} city - City name
     * @param {string} streetName - Street name to fetch
     * @returns {Promise<Object>} - GeoJSON FeatureCollection
     */
    async getStreetByName(city, streetName) {
        const url = `${API_BASE_URL}/api/streets?city=${city}&name=${encodeURIComponent(streetName)}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch street: ${response.statusText}`);
        }
        return await response.json();
    },

    /**
     * Search for streets by query
     * @param {string} city - City name
     * @param {string} query - Search query
     * @returns {Promise<Object>} - Search results with {results: [{name, count}]}
     */
    async searchStreets(city, query) {
        const url = `${API_BASE_URL}/api/search?city=${city}&query=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to search streets: ${response.statusText}`);
        }
        return await response.json();
    },

    /**
     * Load all streets for a city (falls back to static file if USE_API is false)
     * @param {string} city - City name
     * @param {string} dataFile - Path to static GeoJSON file (fallback)
     * @returns {Promise<Object>} - GeoJSON FeatureCollection
     */
    async loadAllStreets(city, dataFile) {
        if (USE_API) {
            // For API mode, we'll need to get all streets
            // This is not ideal for large datasets, but needed for initial migration
            // TODO: Implement progressive loading or viewport-based approach
            console.warn('API mode: Loading all streets may be slow for large cities');

            // For now, fall back to static file when loading all
            // In future, could fetch incrementally or by region
            const response = await fetch(dataFile);
            if (!response.ok) {
                throw new Error(`Failed to load data file: ${response.statusText}`);
            }
            return await response.json();
        } else {
            // Static file mode
            const response = await fetch(dataFile);
            if (!response.ok) {
                throw new Error(`Failed to load data file: ${response.statusText}`);
            }
            return await response.json();
        }
    },

    /**
     * Load street counts (from API or static file)
     * @param {string} city - City name
     * @param {string} countsFile - Path to static counts file (fallback)
     * @returns {Promise<Object>} - Counts data
     */
    async loadCounts(city, countsFile) {
        if (USE_API) {
            return await this.getCounts(city);
        } else {
            try {
                const response = await fetch(countsFile);
                if (response.ok) {
                    return await response.json();
                }
            } catch (e) {
                console.log('Pre-computed counts not available');
            }
            return null;
        }
    }
};
