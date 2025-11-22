// Initialize map centered on Sydney
const map = L.map('map').setView([-33.8688, 151.2093], 12);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
}).addTo(map);

// Global variables
let allStreets = [];
let currentLayer = null;
let streetData = null;

// Color schemes for different categories
const colors = {
    default: '#3498db',
    common: '#e74c3c',
    suburbs: '#2ecc71',
    trees: '#27ae60',
    royalty: '#9b59b6'
};

// Sample data for demonstration
const sampleData = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            properties: {
                name: "George Street",
                type: "Street",
                suburb: "Sydney"
            },
            geometry: {
                type: "LineString",
                coordinates: [
                    [151.2073, -33.8688],
                    [151.2078, -33.8698],
                    [151.2083, -33.8708]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                name: "Park Road",
                type: "Road",
                suburb: "Bondi"
            },
            geometry: {
                type: "LineString",
                coordinates: [
                    [151.2643, -33.8915],
                    [151.2653, -33.8925],
                    [151.2663, -33.8935]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                name: "Oak Avenue",
                type: "Avenue",
                suburb: "Newtown"
            },
            geometry: {
                type: "LineString",
                coordinates: [
                    [151.1793, -33.8988],
                    [151.1803, -33.8998],
                    [151.1813, -33.9008]
                ]
            }
        }
    ]
};

// Categories and patterns
const categories = {
    trees: ['oak', 'pine', 'elm', 'maple', 'ash', 'birch', 'cedar', 'willow'],
    royalty: ['george', 'victoria', 'elizabeth', 'william', 'albert', 'edward', 'mary', 'anne'],
    // suburbs will be populated from data
};

// Initialize UI
document.getElementById('load-data').addEventListener('click', loadData);
document.getElementById('name-filter').addEventListener('input', filterStreets);
document.getElementById('category').addEventListener('change', filterStreets);

function loadData() {
    const source = document.getElementById('data-source').value;

    if (source === 'sample') {
        streetData = sampleData;
        processStreetData();
        displayStreets(streetData.features);
        updateStats();
    } else if (source === 'nsw') {
        alert('NSW Government data will be loaded from local GeoJSON file. Please download data first.');
        // TODO: Load from local file
    } else if (source === 'osm') {
        alert('OpenStreetMap data loading will be implemented next.');
        // TODO: Implement Overpass API query
    }
}

function processStreetData() {
    if (!streetData) return;

    allStreets = streetData.features.map(feature => ({
        name: feature.properties.name || 'Unnamed',
        type: feature.properties.type || '',
        suburb: feature.properties.suburb || '',
        geometry: feature.geometry,
        baseName: getBaseName(feature.properties.name)
    }));
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
                layer.bindPopup(`
                    <strong>${feature.properties.name}</strong><br>
                    ${feature.properties.suburb ? `Suburb: ${feature.properties.suburb}<br>` : ''}
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

    if (category === 'trees' && categories.trees.some(tree => name.includes(tree))) {
        return colors.trees;
    } else if (category === 'royalty' && categories.royalty.some(royal => name.includes(royal))) {
        return colors.royalty;
    }

    return colors.default;
}

function filterStreets() {
    if (!streetData) return;

    const nameFilter = document.getElementById('name-filter').value.toLowerCase();
    const category = document.getElementById('category').value;

    let filtered = streetData.features.filter(feature => {
        const name = (feature.properties.name || '').toLowerCase();

        // Apply name filter
        if (nameFilter && !name.includes(nameFilter)) {
            return false;
        }

        // Apply category filter
        if (category === 'trees' && !categories.trees.some(tree => name.includes(tree))) {
            return false;
        } else if (category === 'royalty' && !categories.royalty.some(royal => name.includes(royal))) {
            return false;
        }

        return true;
    });

    displayStreets(filtered);
    updateStats();
}

function updateStats() {
    if (!allStreets.length) return;

    const nameFilter = document.getElementById('name-filter').value.toLowerCase();
    const filtered = allStreets.filter(street =>
        !nameFilter || street.name.toLowerCase().includes(nameFilter)
    );

    // Count unique base names
    const nameCount = {};
    filtered.forEach(street => {
        const base = street.baseName.toLowerCase();
        nameCount[base] = (nameCount[base] || 0) + 1;
    });

    const uniqueNames = Object.keys(nameCount).length;
    const mostCommon = Object.entries(nameCount)
        .sort((a, b) => b[1] - a[1])[0];

    document.getElementById('stat-total').textContent = allStreets.length;
    document.getElementById('stat-visible').textContent = filtered.length;
    document.getElementById('stat-unique').textContent = uniqueNames;
    document.getElementById('stat-common').textContent = mostCommon
        ? `${mostCommon[0]} (${mostCommon[1]})`
        : '-';
}

// Initial stats display
updateStats();
