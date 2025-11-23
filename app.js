// Sydney Streets - Interactive Visualization
// Global variables
let map;
let allStreets = [];
let selectedStreetNames = []; // Array of full street names like "Victoria Street"
let streetColors = {}; // Map of street name to color
let currentLayer = null;
let streetData = null;
let precomputedCounts = null;
let viewMode = 'overlay'; // 'overlay' or 'grid'
let uniqueStreetNames = []; // All unique street names in dataset

// Default colors for streets
const defaultColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'];

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
const greaterSydneyLGAs = [
    'bayside', 'burwood', 'canada bay', 'inner west', 'randwick', 'strathfield',
    'sydney', 'waverley', 'woollahra',
    'blacktown', 'cumberland', 'parramatta', 'the hills shire', 'the hills',
    'camden', 'campbelltown', 'blue mountains', 'fairfield', 'hawkesbury',
    'liverpool', 'penrith', 'wollondilly',
    'hornsby', 'hunters hill', 'ku-ring-gai', 'lane cove', 'mosman', 'north sydney',
    'northern beaches', 'ryde', 'willoughby',
    'canterbury-bankstown', 'georges river', 'sutherland'
];

// Categories and patterns
const categories = {
    trees: ['oak', 'pine', 'elm', 'maple', 'ash', 'birch', 'cedar', 'willow', 'plane', 'poplar',
            'fig', 'wattle', 'eucalyptus', 'gum', 'acacia', 'banksia', 'fir', 'spruce', 'cypress'],
    royalty: ['george street', 'george road', 'victoria street', 'victoria road', 'elizabeth street', 'elizabeth road',
              'william street', 'albert street', 'edward street', 'mary street', 'anne street',
              'charlotte street', 'margaret street', 'adelaide street', 'alice street', 'henry street',
              'charles street', 'philip street', 'andrew street', 'queen street', 'king street',
              'prince street', 'princess street', 'duke street', 'duchess street'],
    famous: ['cook', 'macquarie', 'phillip', 'bligh', 'hunter', 'darling', 'bourke', 'fitzroy',
             'wentworth', 'lawson', 'blaxland', 'hume', 'parkes', 'bradfield', 'banks', 'flinders',
             'sturt', 'mitchell', 'oxley', 'cunningham'],
    suburbs: ['sydney', 'parramatta', 'bondi', 'manly', 'penrith', 'liverpool', 'blacktown']
};

// Auto-load data on page load
window.addEventListener('DOMContentLoaded', () => {
    // Initialize map centered on Sydney
    map = L.map('map').setView([-33.8688, 151.2093], 12);

    // Add CartoDB Positron tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Initialize UI event listeners
    setupEventListeners();

    // Load data and restore previous search
    loadData();
});

function setupEventListeners() {
    // Lists dropdown
    document.getElementById('lists-toggle').addEventListener('click', (e) => {
        e.preventDefault();
        const dropdown = document.getElementById('lists-dropdown');
        dropdown.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('lists-dropdown');
        const toggle = document.getElementById('lists-toggle');
        if (!dropdown.contains(e.target) && !toggle.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });

    // List selection
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const listType = e.target.dataset.list;
            loadList(listType);
            document.getElementById('lists-dropdown').classList.remove('show');
        });
    });

    // Street search with autocomplete
    const searchInput = document.getElementById('street-search');
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const value = searchInput.value.trim();
            if (value) {
                addStreetToSelection(value);
                searchInput.value = '';
                hideAutocomplete();
            }
        }
    });

    // Clear button
    document.getElementById('clear-streets').addEventListener('click', () => {
        selectedStreetNames = [];
        streetColors = {};
        saveSearch();
        updateSelectedStreetsUI();
        updateStreetColorsUI();
        updateMap();
        updateStats();
    });

    // Collapsible compare menu
    document.getElementById('compare-toggle').addEventListener('click', () => {
        const content = document.getElementById('compare-content');
        content.classList.toggle('active');
    });

    // View mode buttons
    document.getElementById('view-overlay').addEventListener('click', () => {
        setViewMode('overlay');
    });

    document.getElementById('view-grid').addEventListener('click', () => {
        setViewMode('grid');
    });

    // Sidebar resizer
    const resizer = document.querySelector('.resizer');
    const sidebar = document.getElementById('sidebar');
    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const newWidth = e.clientX;
        if (newWidth >= 250 && newWidth <= 600) {
            sidebar.style.width = newWidth + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
        }
    });
}

function handleSearchInput(e) {
    const query = e.target.value.toLowerCase().trim();
    const autocompleteList = document.getElementById('autocomplete-list');

    if (query.length < 2) {
        hideAutocomplete();
        return;
    }

    // Find matching streets (get all matches, not just first 10)
    const allMatches = uniqueStreetNames
        .filter(name => name.toLowerCase().includes(query));

    if (allMatches.length === 0) {
        hideAutocomplete();
        return;
    }

    // Show first 10 for display
    const displayMatches = allMatches.slice(0, 10);

    // Show autocomplete with header
    const header = `
        <div class="autocomplete-header">
            <span>${allMatches.length} result${allMatches.length !== 1 ? 's' : ''}</span>
            <a href="#" class="select-all-link" id="select-all-autocomplete">Select all</a>
        </div>
    `;

    const items = displayMatches.map(name =>
        `<div class="autocomplete-item" data-street="${name}">${name}</div>`
    ).join('');

    autocompleteList.innerHTML = header + items;
    autocompleteList.style.display = 'block';

    // Add click handler for "Select all"
    document.getElementById('select-all-autocomplete').addEventListener('click', (e) => {
        e.preventDefault();
        allMatches.forEach(street => addStreetToSelection(street));
        document.getElementById('street-search').value = '';
        hideAutocomplete();
    });

    // Add click handlers for individual items
    autocompleteList.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
            addStreetToSelection(item.dataset.street);
            document.getElementById('street-search').value = '';
            hideAutocomplete();
        });
    });
}

function hideAutocomplete() {
    document.getElementById('autocomplete-list').style.display = 'none';
}

function addStreetToSelection(streetName) {
    // Normalize the street name to match what's in the dataset
    const normalizedName = streetName.trim();

    // Check if street exists in dataset
    if (!uniqueStreetNames.some(name => name.toLowerCase() === normalizedName.toLowerCase())) {
        return; // Street not found
    }

    // Get the properly capitalized version from dataset
    const properName = uniqueStreetNames.find(name => name.toLowerCase() === normalizedName.toLowerCase());

    // Check if already selected
    if (selectedStreetNames.includes(properName)) {
        return;
    }

    selectedStreetNames.push(properName);

    // Assign a color if not already assigned
    if (!streetColors[properName]) {
        const colorIndex = Object.keys(streetColors).length % defaultColors.length;
        streetColors[properName] = defaultColors[colorIndex];
    }

    saveSearch();
    updateSelectedStreetsUI();
    updateStreetColorsUI();
    updateMap();
}

function removeStreetFromSelection(streetName) {
    selectedStreetNames = selectedStreetNames.filter(name => name !== streetName);
    saveSearch();
    updateSelectedStreetsUI();
    updateStreetColorsUI();
    updateMap();
}

function updateSelectedStreetsUI() {
    const container = document.getElementById('selected-streets');
    container.innerHTML = selectedStreetNames.map(name => `
        <div class="street-tag">
            ${name}
            <span class="remove" data-street="${name}">×</span>
        </div>
    `).join('');

    // Add remove handlers
    container.querySelectorAll('.remove').forEach(btn => {
        btn.addEventListener('click', () => {
            removeStreetFromSelection(btn.dataset.street);
        });
    });
}

function updateStreetColorsUI() {
    const container = document.getElementById('street-colors');
    container.innerHTML = selectedStreetNames.map(name => `
        <div class="street-list-item">
            <input type="color" class="color-picker" value="${streetColors[name]}" data-street="${name}">
            <div class="street-name">${name}</div>
        </div>
    `).join('');

    // Add color change handlers
    container.querySelectorAll('.color-picker').forEach(picker => {
        picker.addEventListener('change', (e) => {
            streetColors[e.target.dataset.street] = e.target.value;
            updateMap();
        });
    });
}

function loadList(listType) {
    let streets = [];

    if (listType === 'top10') {
        // Get top 10 most common street BASE NAMES (not counting full names)
        const baseNameCounts = {};

        // Count by base name
        uniqueStreetNames.forEach(fullName => {
            const baseName = getBaseName(fullName);
            if (baseName) {
                // Get the count for this specific full street name
                const count = getStreetCount(fullName);

                // Add to base name total
                if (!baseNameCounts[baseName]) {
                    baseNameCounts[baseName] = { total: 0, examples: [] };
                }
                baseNameCounts[baseName].total += count;
                baseNameCounts[baseName].examples.push({ fullName, count });
            }
        });

        // Get top 10 base names by total count
        const top10BaseNames = Object.entries(baseNameCounts)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 10)
            .map(entry => entry[0]);

        // For each top base name, find the most common full variation
        streets = top10BaseNames.map(baseName => {
            const info = baseNameCounts[baseName];
            // Sort examples by count and take the most common one
            const mostCommon = info.examples.sort((a, b) => b.count - a.count)[0];
            return mostCommon.fullName;
        });
    } else if (categories[listType]) {
        // Get streets matching category
        const pattern = categories[listType];
        streets = uniqueStreetNames.filter(name =>
            pattern.some(word => name.toLowerCase().includes(word))
        ).slice(0, 20); // Limit to 20 streets
    }

    // Clear current selection and add new streets
    selectedStreetNames = [];
    streetColors = {};
    streets.forEach(street => addStreetToSelection(street));
}

function setViewMode(mode) {
    viewMode = mode;

    // Update button states
    document.getElementById('view-overlay').classList.toggle('active', mode === 'overlay');
    document.getElementById('view-grid').classList.toggle('active', mode === 'grid');

    updateMap();
}

function saveSearch() {
    localStorage.setItem('sydney-streets-search', JSON.stringify(selectedStreetNames));
    localStorage.setItem('sydney-streets-colors', JSON.stringify(streetColors));
}

function loadSearch() {
    const saved = localStorage.getItem('sydney-streets-search');
    const savedColors = localStorage.getItem('sydney-streets-colors');

    if (saved) {
        selectedStreetNames = JSON.parse(saved);
        if (savedColors) {
            streetColors = JSON.parse(savedColors);
        }
    } else {
        // Default: add Victoria Street
        if (uniqueStreetNames.includes('Victoria Street')) {
            addStreetToSelection('Victoria Street');
        }
    }

    updateSelectedStreetsUI();
    updateStreetColorsUI();
}

async function loadData() {
    try {
        // Try to load pre-computed counts
        try {
            const countsResponse = await fetch('data/street_counts_grid200.json');
            if (countsResponse.ok) {
                precomputedCounts = await countsResponse.json();
                console.log('Loaded pre-computed street counts (Grid 200m + Highway-Aware)');
            }
        } catch (e) {
            console.log('Pre-computed counts not available');
        }

        // Load street data
        let response = await fetch('data/sydney-roads-web.geojson');
        if (!response.ok) {
            response = await fetch('data/sydney-roads-osm.geojson');
            if (!response.ok) {
                response = await fetch('data/sydney-roads-sample.geojson');
                if (!response.ok) {
                    throw new Error('Failed to load data');
                }
            }
        }

        streetData = await response.json();
        processStreetData();

        // Load saved search or default
        loadSearch();

        // Update map with selected streets
        updateMap();
        updateStats();
    } catch (error) {
        alert(`Error loading data: ${error.message}`);
        console.error(error);
    }
}

function processStreetData() {
    if (!streetData) return;

    // Filter to Greater Sydney if LGA data available
    let filteredFeatures = streetData.features;
    if (streetData.features.length > 0 &&
        (streetData.features[0].properties.lga || streetData.features[0].properties.LGA)) {
        filteredFeatures = streetData.features.filter(feature => {
            const lga = (feature.properties.lga || feature.properties.LGA || '').toLowerCase();
            return greaterSydneyLGAs.some(validLga => lga.includes(validLga));
        });
    }

    // Build list of all streets
    allStreets = filteredFeatures.map(feature => ({
        name: feature.properties.name || 'Unnamed',
        type: feature.properties.type || feature.properties.highway || '',
        suburb: feature.properties.suburb || feature.properties.postcode || '',
        lga: feature.properties.lga || feature.properties.LGA || '',
        geometry: feature.geometry
    }));

    // Get unique street names (full names, not base names)
    const nameSet = new Set();
    allStreets.forEach(street => {
        if (street.name && street.name !== 'Unnamed') {
            nameSet.add(street.name);
        }
    });
    uniqueStreetNames = Array.from(nameSet).sort();

    // Update streetData with filtered features
    streetData = {
        type: "FeatureCollection",
        features: filteredFeatures
    };
}

function updateMap() {
    // Remove existing layer
    if (currentLayer) {
        map.removeLayer(currentLayer);
    }

    // If no streets selected, show empty map
    if (selectedStreetNames.length === 0) {
        return;
    }

    // Filter features to only selected streets
    const selectedFeatures = streetData.features.filter(feature => {
        const name = feature.properties.name || '';
        return selectedStreetNames.some(selectedName =>
            name.toLowerCase() === selectedName.toLowerCase()
        );
    });

    if (viewMode === 'overlay') {
        // Show all streets on map with their colors
        currentLayer = L.geoJSON(selectedFeatures, {
            style: function(feature) {
                const name = feature.properties.name || '';
                const color = streetColors[selectedStreetNames.find(s =>
                    s.toLowerCase() === name.toLowerCase()
                )] || '#3498db';

                return {
                    color: color,
                    weight: 3,
                    opacity: 0.7
                };
            },
            onEachFeature: function(feature, layer) {
                if (feature.properties.name) {
                    layer.bindPopup(`<strong>${feature.properties.name}</strong>`);
                }
            }
        }).addTo(map);

        if (selectedFeatures.length > 0) {
            map.fitBounds(currentLayer.getBounds());
        }
    } else {
        // Grid view - TODO: implement grid layout
        // For now, just show overlay
        updateMap();
        viewMode = 'overlay';
    }
}

function updateStats() {
    if (!allStreets.length) return;

    // Count instances for selected streets only
    const selectedCounts = {};
    if (selectedStreetNames.length > 0) {
        selectedStreetNames.forEach(streetName => {
            const count = getStreetCount(streetName);
            selectedCounts[streetName] = count;
        });
    }

    // Update street count list for selected streets
    const countEl = document.getElementById('street-count');
    if (selectedStreetNames.length > 0) {
        countEl.innerHTML = Object.entries(selectedCounts).map(([name, count]) => {
            return `${name}: <strong>${count}</strong>`;
        }).join('<br>');
    } else {
        countEl.textContent = 'No streets selected';
    }
}

function getStreetCount(fullStreetName) {
    // Use pre-computed counts if available
    if (precomputedCounts && precomputedCounts.counts) {
        // Try exact match first
        if (precomputedCounts.counts[fullStreetName]) {
            return precomputedCounts.counts[fullStreetName];
        }

        // Try case-insensitive match
        const key = Object.keys(precomputedCounts.counts).find(
            k => k.toLowerCase() === fullStreetName.toLowerCase()
        );
        if (key) {
            return precomputedCounts.counts[key];
        }
    }

    // Fallback: count from features
    const count = streetData.features.filter(feature =>
        (feature.properties.name || '').toLowerCase() === fullStreetName.toLowerCase()
    ).length;

    return count;
}

function countAllStreets() {
    // Use pre-computed counts if available
    if (precomputedCounts && precomputedCounts.counts) {
        const nameCounts = {};
        for (const [streetName, count] of Object.entries(precomputedCounts.counts)) {
            const baseName = getBaseName(streetName).toLowerCase();
            nameCounts[baseName] = count;
        }
        return nameCounts;
    }

    // Fallback: simple count by base name
    const nameCounts = {};
    allStreets.forEach(street => {
        const baseName = getBaseName(street.name).toLowerCase();
        nameCounts[baseName] = (nameCounts[baseName] || 0) + 1;
    });
    return nameCounts;
}

function getBaseName(fullName) {
    if (!fullName) return '';
    const suffixes = ['Street', 'Road', 'Avenue', 'Drive', 'Lane', 'Way', 'Place', 'Circuit', 'Crescent', 'Court'];
    let base = fullName;
    suffixes.forEach(suffix => {
        base = base.replace(new RegExp(`\\s+${suffix}$`, 'i'), '');
    });
    return base.trim();
}
