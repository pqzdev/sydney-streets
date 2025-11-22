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

// Color schemes for different categories
const colors = {
    default: '#3498db',
    common: '#e74c3c',
    suburbs: '#f79902ff',
    trees: '#248f5aff',
    royalty: '#8b50a3ff',
    famous: '#f1c40f'
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
document.getElementById('load-data').addEventListener('click', loadData);
document.getElementById('name-filter').addEventListener('input', filterStreets);
document.getElementById('category').addEventListener('change', filterStreets);

async function loadData() {
    const source = document.getElementById('data-source').value;
    const button = document.getElementById('load-data');

    button.disabled = true;
    button.textContent = 'Loading...';

    try {
        if (source === 'sample') {
            streetData = sampleData;
            processStreetData();
            visibleStreets = [...allStreets];
            displayStreets(streetData.features);
            updateStats();
            // Apply any active filters
            filterStreets();
        } else if (source === 'osm') {
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
        } else if (source === 'osm-sample') {
            // Load sample for testing
            const response = await fetch('data/sydney-roads-sample.geojson');
            if (!response.ok) {
                throw new Error('Failed to load sample data.');
            }
            streetData = await response.json();
            processStreetData();
            visibleStreets = [...allStreets];
            displayStreets(streetData.features);
            updateStats();
            // Apply any active filters
            filterStreets();
        }
    } catch (error) {
        alert(`Error loading data: ${error.message}`);
        console.error(error);
    } finally {
        button.disabled = false;
        button.textContent = 'Load Data';
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

    const nameFilter = document.getElementById('name-filter').value.toLowerCase();
    const category = document.getElementById('category').value;

    let filtered = streetData.features.filter(feature => {
        const name = (feature.properties.name || '').toLowerCase();
        const baseName = getBaseName(feature.properties.name || '').toLowerCase();

        // Apply name filter
        if (nameFilter && !name.includes(nameFilter)) {
            return false;
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

    // Count unique streets by base name + location (proxy for suburb)
    // Since we don't have suburb data, we cluster by geographic proximity
    function countUniqueStreets(streets) {
        const uniqueStreets = new Map();

        streets.forEach(street => {
            const baseName = street.baseName.toLowerCase();
            const coords = street.geometry.coordinates;

            if (!coords || coords.length === 0) return;

            // Get middle point of linestring as location identifier
            const midIdx = Math.floor(coords.length / 2);
            const location = coords[midIdx];

            // Create unique key: baseName_location
            // Round coordinates to cluster nearby segments (within ~500m)
            const roundedLat = Math.round(location[1] / 0.005) * 0.005;
            const roundedLng = Math.round(location[0] / 0.005) * 0.005;

            // Special case: highways are always singular
            const fullName = street.name.toLowerCase();
            const key = (fullName.includes('highway') || fullName.includes('hwy'))
                ? baseName  // Highway = one entry regardless of location
                : `${baseName}_${roundedLat}_${roundedLng}`;  // Street = one per location

            uniqueStreets.set(key, {
                baseName: baseName,
                fullName: street.name,
                location: location
            });
        });

        // Count how many unique instances of each base name
        const nameCounts = {};
        uniqueStreets.forEach(street => {
            const base = street.baseName;
            nameCounts[base] = (nameCounts[base] || 0) + 1;
        });

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
