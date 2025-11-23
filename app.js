// Initialize map centered on Sydney
const map = L.map('map').setView([-33.8688, 151.2093], 12);

// Add CartoDB Positron tile layer (grey, minimal style for visualizations)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// Global variables
let allStreets = [];
let visibleStreets = [];
let currentLayer = null;
let streetData = null;
let precomputedCounts = null; // Grid 200m + Highway-Aware counts

// Color schemes for different categories
const colors = {
    default: '#3498db',
    common: '#e74c3c',
    suburbs: '#f79902ff',
    trees: '#248f5aff',
    royalty: '#8b50a3ff',
    famous: '#f1c40f'
};

// Greater Sydney LGAs (official NSW Government definition)
// Source: Greater Sydney Commission & Environmental Planning and Assessment Order 2017
const greaterSydneyLGAs = [
    // Eastern City District
    'bayside', 'burwood', 'canada bay', 'inner west', 'randwick', 'strathfield',
    'sydney', 'waverley', 'woollahra',
    // Central City District
    'blacktown', 'cumberland', 'parramatta', 'the hills shire', 'the hills',
    // Western City District
    'camden', 'campbelltown', 'blue mountains', 'fairfield', 'hawkesbury',
    'liverpool', 'penrith', 'wollondilly',
    // North District
    'hornsby', 'hunters hill', 'ku-ring-gai', 'lane cove', 'mosman', 'north sydney',
    'northern beaches', 'ryde', 'willoughby',
    // South District
    'canterbury-bankstown', 'georges river', 'sutherland'
];

// Categories and patterns
const categories = {
    trees: ['oak', 'pine', 'elm', 'maple', 'ash', 'birch', 'cedar', 'willow', 'plane', 'poplar',
            'fig', 'wattle', 'eucalyptus', 'gum', 'acacia', 'banksia', 'fir', 'spruce', 'cypress'],
    royalty: ['george', 'victoria', 'elizabeth', 'william', 'albert', 'edward', 'mary', 'anne',
              'charlotte', 'margaret', 'adelaide', 'alice', 'henry', 'charles', 'philip', 'andrew',
              'queen', 'king', 'prince', 'princess', 'duke', 'duchess'],
    famous: ['cook', 'macquarie', 'phillip', 'bligh', 'hunter', 'darling', 'bourke', 'fitzroy',
             'wentworth', 'lawson', 'blaxland', 'hume', 'parkes', 'bradfield', 'banks', 'flinders',
             'sturt', 'mitchell', 'oxley', 'cunningham']
};

// Initialize UI
document.getElementById('name-filter').addEventListener('input', filterStreets);
document.getElementById('category').addEventListener('change', filterStreets);

// Update viewport stats when map moves
map.on('moveend', updateViewportStats);

// Auto-load data on page load
window.addEventListener('DOMContentLoaded', () => {
    loadData();
});

async function loadData() {
    try {
        // Try to load pre-computed counts (Grid 200m method)
        try {
            const countsResponse = await fetch('data/street_counts_grid200.json');
            if (countsResponse.ok) {
                precomputedCounts = await countsResponse.json();
                console.log('Loaded pre-computed street counts (Grid 200m + Highway-Aware)');
            }
        } catch (e) {
            console.log('Pre-computed counts not available, will use client-side counting');
        }

        // Load full OSM dataset
        const response = await fetch('data/sydney-roads-osm.geojson');
        if (!response.ok) {
            throw new Error('Failed to load data. Make sure data file exists.');
        }
        streetData = await response.json();
        processStreetData();
        visibleStreets = [...allStreets];
        displayStreets(streetData.features);
        updateStats();
        // Apply any active filters
        filterStreets();
    } catch (error) {
        alert(`Error loading data: ${error.message}`);
        console.error(error);
    }
}

function processStreetData() {
    if (!streetData) return;

    // For OSM data, we already filtered by bounding box
    // For other sources, filter to Greater Sydney LGAs
    let filteredFeatures = streetData.features;

    if (streetData.features.length > 0 &&
        (streetData.features[0].properties.lga || streetData.features[0].properties.LGA)) {
        // Has LGA data, filter by it
        filteredFeatures = streetData.features.filter(feature => {
            const lga = (feature.properties.lga || feature.properties.LGA || '').toLowerCase();
            return greaterSydneyLGAs.some(validLga => lga.includes(validLga));
        });
    }

    // Build street list - keep all features for counting
    allStreets = filteredFeatures.map(feature => ({
        name: feature.properties.name || 'Unnamed',
        type: feature.properties.type || feature.properties.highway || '',
        suburb: feature.properties.suburb || feature.properties.postcode || '',
        lga: feature.properties.lga || feature.properties.LGA || '',
        postcode: feature.properties.postcode || '',
        geometry: feature.geometry,
        baseName: getBaseName(feature.properties.name || 'Unnamed')
    }));

    // Update streetData to contain only filtered streets
    streetData = {
        type: "FeatureCollection",
        features: filteredFeatures
    };
}

function getBaseName(fullName) {
    if (!fullName) return '';
    // Remove common suffixes
    const suffixes = ['Street', 'Road', 'Avenue', 'Drive', 'Lane', 'Way', 'Place', 'Circuit', 'Crescent', 'Court'];
    let base = fullName;
    suffixes.forEach(suffix => {
        base = base.replace(new RegExp(`\\s+${suffix}$`, 'i'), '');
    });
    return base.trim();
}

function displayStreets(streets) {
    // Remove existing layer
    if (currentLayer) {
        map.removeLayer(currentLayer);
    }

    // Create new GeoJSON layer
    currentLayer = L.geoJSON(streets, {
        style: function(feature) {
            return {
                color: getStreetColor(feature),
                weight: 3,
                opacity: 0.7
            };
        },
        onEachFeature: function(feature, layer) {
            if (feature.properties.name) {
                const lga = feature.properties.lga || feature.properties.LGA || '';
                layer.bindPopup(`
                    <strong>${feature.properties.name}</strong><br>
                    ${feature.properties.suburb ? `Suburb: ${feature.properties.suburb}<br>` : ''}
                    ${lga ? `LGA: ${lga}<br>` : ''}
                    ${feature.properties.type ? `Type: ${feature.properties.type}` : ''}
                `);
            }
        }
    }).addTo(map);

    // Fit map to show all streets
    if (streets.length > 0) {
        map.fitBounds(currentLayer.getBounds());
    }
}

function getStreetColor(feature) {
    const category = document.getElementById('category').value;
    const name = (feature.properties.name || '').toLowerCase();
    const baseName = getBaseName(feature.properties.name || '').toLowerCase();

    // Color by category
    if (category === 'trees' && categories.trees.some(tree => name.includes(tree))) {
        return colors.trees;
    } else if (category === 'royalty' && categories.royalty.some(royal => name.includes(royal))) {
        return colors.royalty;
    } else if (category === 'famous' && categories.famous.some(person => name.includes(person))) {
        return colors.famous;
    } else if (category === 'common') {
        // Color most common street names
        const commonNames = ['george', 'elizabeth', 'victoria', 'king', 'queen', 'park', 'main', 'church'];
        if (commonNames.some(common => baseName === common)) {
            return colors.common;
        }
    } else if (category === 'suburbs') {
        // Color streets named after suburbs (basic check)
        const suburbWords = ['sydney', 'parramatta', 'bondi', 'manly', 'penrith', 'liverpool', 'blacktown'];
        if (suburbWords.some(suburb => baseName.includes(suburb))) {
            return colors.suburbs;
        }
    }

    return colors.default;
}

function filterStreets() {
    if (!streetData) return;

    const nameFilterRaw = document.getElementById('name-filter').value;
    const category = document.getElementById('category').value;

    // Check if exact search (quoted)
    const isExactSearch = nameFilterRaw.startsWith('"') && nameFilterRaw.endsWith('"');
    const nameFilter = isExactSearch
        ? nameFilterRaw.slice(1, -1).toLowerCase().trim()
        : nameFilterRaw.toLowerCase().trim();

    // Normalize abbreviations for comparison
    function normalizeStreetName(name) {
        return name
            .replace(/\bstreet\b/gi, 'st')
            .replace(/\broad\b/gi, 'rd')
            .replace(/\bhighway\b/gi, 'hwy')
            .replace(/\bavenue\b/gi, 'ave')
            .replace(/\bdrive\b/gi, 'dr')
            .replace(/\blane\b/gi, 'ln')
            .replace(/\bplace\b/gi, 'pl')
            .replace(/\bcircuit\b/gi, 'cct')
            .replace(/\bcrescent\b/gi, 'cres')
            .replace(/\bcourt\b/gi, 'ct')
            .replace(/\s+/g, ' ')
            .trim();
    }

    let filtered = streetData.features.filter(feature => {
        const name = (feature.properties.name || '').toLowerCase();
        const baseName = getBaseName(feature.properties.name || '').toLowerCase();

        // Apply name filter
        if (nameFilter) {
            if (isExactSearch) {
                // Exact match: normalize both and compare
                const normalizedName = normalizeStreetName(name);
                const normalizedFilter = normalizeStreetName(nameFilter);
                if (normalizedName !== normalizedFilter) {
                    return false;
                }
            } else {
                // Partial match (default behavior)
                if (!name.includes(nameFilter)) {
                    return false;
                }
            }
        }

        // Apply category filter - only show streets matching the category
        if (category !== 'all') {
            if (category === 'trees') {
                if (!categories.trees.some(tree => name.includes(tree))) {
                    return false;
                }
            } else if (category === 'royalty') {
                if (!categories.royalty.some(royal => name.includes(royal))) {
                    return false;
                }
            } else if (category === 'famous') {
                if (!categories.famous.some(person => name.includes(person))) {
                    return false;
                }
            } else if (category === 'common') {
                const commonNames = ['george', 'elizabeth', 'victoria', 'king', 'queen', 'park', 'main', 'church'];
                if (!commonNames.some(common => baseName === common)) {
                    return false;
                }
            } else if (category === 'suburbs') {
                const suburbWords = ['sydney', 'parramatta', 'bondi', 'manly', 'penrith', 'liverpool', 'blacktown'];
                if (!suburbWords.some(suburb => baseName.includes(suburb))) {
                    return false;
                }
            }
        }

        return true;
    });

    // Update visible streets for stats - keep all for counting
    visibleStreets = filtered.map(feature => ({
        name: feature.properties.name || 'Unnamed',
        baseName: getBaseName(feature.properties.name || 'Unnamed'),
        type: feature.properties.type || feature.properties.highway || '',
        geometry: feature.geometry
    }));

    displayStreets(filtered);
    updateStats();
}

function updateStats() {
    if (!allStreets.length) return;

    // Count unique streets using tight grid with adjacency chains
    function countUniqueStreets(streets) {
        // If we have pre-computed counts, use them for better accuracy
        if (precomputedCounts && precomputedCounts.counts) {
            const nameCounts = {};

            // Group streets by name
            const streetsByName = {};
            streets.forEach(street => {
                const fullName = street.name;
                if (!streetsByName[fullName]) {
                    streetsByName[fullName] = [];
                }
                streetsByName[fullName].push(street);
            });

            // Use pre-computed counts
            for (const streetName of Object.keys(streetsByName)) {
                const baseName = getBaseName(streetName).toLowerCase();
                // Use pre-computed count if available, otherwise fall back to 1
                nameCounts[baseName] = precomputedCounts.counts[streetName] || 1;
            }

            return nameCounts;
        }

        // Fallback to client-side counting (Grid 100m method)
        // Grid size: 0.001 degrees ≈ 100 meters
        const GRID_SIZE = 0.001;

        // Group streets by base name first
        const streetsByName = {};
        streets.forEach(street => {
            const baseName = street.baseName.toLowerCase();
            const fullName = street.name.toLowerCase();

            // Special case: highways are always singular
            if (fullName.includes('highway') || fullName.includes('hwy')) {
                streetsByName[baseName] = streetsByName[baseName] || [];
                streetsByName[baseName].push({
                    coords: street.geometry.coordinates,
                    isHighway: true
                });
            } else {
                streetsByName[baseName] = streetsByName[baseName] || [];
                streetsByName[baseName].push({
                    coords: street.geometry.coordinates,
                    isHighway: false
                });
            }
        });

        // For each base name, find connected chains of segments
        const nameCounts = {};

        for (const [baseName, segments] of Object.entries(streetsByName)) {
            // Highways always count as 1
            if (segments.length > 0 && segments[0].isHighway) {
                nameCounts[baseName] = 1;
                continue;
            }

            // Build grid cells for all segments of this street name
            const cellSegments = new Map(); // cellKey -> segment indices

            segments.forEach((segment, segIdx) => {
                const coords = segment.coords;
                if (!coords || coords.length === 0) return;

                // Get all grid cells this segment touches
                const cells = new Set();
                coords.forEach(coord => {
                    const lat = coord[1];
                    const lng = coord[0];
                    const cellLat = Math.round(lat / GRID_SIZE) * GRID_SIZE;
                    const cellLng = Math.round(lng / GRID_SIZE) * GRID_SIZE;
                    const cellKey = `${cellLat},${cellLng}`;
                    cells.add(cellKey);
                });

                // Add this segment to all cells it touches
                cells.forEach(cellKey => {
                    if (!cellSegments.has(cellKey)) {
                        cellSegments.set(cellKey, new Set());
                    }
                    cellSegments.get(cellKey).add(segIdx);
                });
            });

            // Find connected chains using adjacency
            const visited = new Set();
            let chainCount = 0;

            function getAdjacentCells(cellKey) {
                const [lat, lng] = cellKey.split(',').map(Number);
                const adjacent = [];
                // Check 8 adjacent cells + current cell
                for (let dLat = -GRID_SIZE; dLat <= GRID_SIZE; dLat += GRID_SIZE) {
                    for (let dLng = -GRID_SIZE; dLng <= GRID_SIZE; dLng += GRID_SIZE) {
                        const adjLat = lat + dLat;
                        const adjLng = lng + dLng;
                        const adjKey = `${adjLat},${adjLng}`;
                        if (cellSegments.has(adjKey)) {
                            adjacent.push(adjKey);
                        }
                    }
                }
                return adjacent;
            }

            function exploreChain(startCell) {
                const queue = [startCell];
                visited.add(startCell);

                while (queue.length > 0) {
                    const cell = queue.shift();
                    const adjacent = getAdjacentCells(cell);

                    for (const adjCell of adjacent) {
                        if (!visited.has(adjCell)) {
                            visited.add(adjCell);
                            queue.push(adjCell);
                        }
                    }
                }
            }

            // Count chains by exploring from unvisited cells
            for (const cellKey of cellSegments.keys()) {
                if (!visited.has(cellKey)) {
                    exploreChain(cellKey);
                    chainCount++;
                }
            }

            nameCounts[baseName] = chainCount;
        }

        return nameCounts;
    }

    // Count all streets
    const allNameCount = countUniqueStreets(allStreets);

    // Count visible streets (after filtering)
    const nameCount = visibleStreets.length > 0 ? countUniqueStreets(visibleStreets) : allNameCount;

    // Total unique street instances (e.g., Victoria St in 8 different locations = 8)
    const totalStreetInstances = Object.values(allNameCount).reduce((sum, count) => sum + count, 0);
    const visibleStreetInstances = Object.values(nameCount).reduce((sum, count) => sum + count, 0);
    const topTen = Object.entries(nameCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    document.getElementById('stat-total').textContent = totalStreetInstances;
    document.getElementById('stat-visible').textContent = visibleStreetInstances;

    // Display top 10 with proper capitalization
    const topTenEl = document.getElementById('top-ten');
    if (topTen.length > 0) {
        topTenEl.innerHTML = topTen.map((entry, index) => {
            // Capitalize each word in the street name (proper noun)
            const capitalizedName = entry[0]
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            return `${index + 1}. ${capitalizedName} (${entry[1]})`;
        }).join('<br>');
    } else {
        topTenEl.textContent = '-';
    }
}

// Initial stats display
updateStats();
