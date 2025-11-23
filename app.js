// Sydney Streets - Interactive Visualization
// Global variables
let map;
let allStreets = [];
let selectedStreetNames = []; // Array of full street names like "Victoria Street"
let streetColors = {}; // Map of street name to color
let currentLayer = null;
let streetData = null;
let precomputedCounts = null;
let baseNameCountsCache = {}; // Cache for base name counts in name-only mode
let viewMode = 'overlay'; // 'overlay' or 'grid'
let nameMode = 'name-only'; // 'name-only' or 'name-type'
let uniqueStreetNames = []; // All unique street names in dataset
let legendVisible = false; // Legend toggle state

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

// Categories and patterns (base names only)
const categories = {
    trees: ['oak', 'pine', 'elm', 'maple', 'ash', 'birch', 'cedar', 'willow', 'plane', 'poplar',
            'fig', 'wattle', 'eucalyptus', 'gum', 'acacia', 'banksia', 'fir', 'spruce', 'cypress'],
    royalty: ['george', 'victoria', 'elizabeth', 'william', 'albert', 'edward', 'mary', 'anne',
              'charlotte', 'margaret', 'adelaide', 'alice', 'henry', 'charles', 'philip', 'andrew',
              'queen', 'king', 'prince', 'princess', 'duke', 'duchess'],
    famous: ['cook', 'macquarie', 'phillip', 'bligh', 'hunter', 'darling', 'bourke', 'fitzroy',
             'wentworth', 'lawson', 'blaxland', 'hume', 'parkes', 'bradfield', 'banks', 'flinders',
             'sturt', 'mitchell', 'oxley', 'cunningham'],
    suburbs: ['sydney', 'parramatta', 'bondi', 'manly', 'penrith', 'liverpool', 'blacktown']
};

// Generate distinct colors for visualizing multiple occurrences
function generateColorPalette(count) {
    if (count <= 8) {
        return defaultColors.slice(0, count);
    }
    // Generate HSL color gradient for larger counts
    const colors = [];
    for (let i = 0; i < count; i++) {
        const hue = (i * 360 / count) % 360;
        colors.push(`hsl(${hue}, 70%, 50%)`);
    }
    return colors;
}

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

    // Name mode buttons
    document.getElementById('mode-name-only').addEventListener('click', () => {
        setNameMode('name-only');
    });

    document.getElementById('mode-name-type').addEventListener('click', () => {
        setNameMode('name-type');
    });

    // Legend toggle
    document.getElementById('legend-toggle').addEventListener('click', toggleLegend);

    // Address search toggle
    document.getElementById('address-search-toggle').addEventListener('click', () => {
        const searchBox = document.getElementById('address-search-box');
        searchBox.style.display = searchBox.style.display === 'none' ? 'block' : 'none';
        if (searchBox.style.display === 'block') {
            document.getElementById('address-input').focus();
        }
    });

    // Address search input
    document.getElementById('address-input').addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value.trim();
            if (!query) return;

            // Use Nominatim geocoding API
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}, Sydney, Australia&limit=1`
                );
                const data = await response.json();
                if (data.length > 0) {
                    const { lat, lon } = data[0];
                    map.setView([lat, lon], 16);
                    document.getElementById('address-search-box').style.display = 'none';
                    e.target.value = '';
                } else {
                    alert('Address not found in Sydney area');
                }
            } catch (error) {
                console.error('Geocoding error:', error);
                alert('Error searching for address. Please try again.');
            }
        }
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
    updateStats();
}

function removeStreetFromSelection(streetName) {
    selectedStreetNames = selectedStreetNames.filter(name => name !== streetName);
    saveSearch();
    updateSelectedStreetsUI();
    updateStreetColorsUI();
    updateMap();
    updateStats();
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
    const presetColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22', '#e91e63', '#00bcd4'];

    container.innerHTML = selectedStreetNames.map(name => `
        <div class="street-list-item">
            <div class="color-presets">
                ${presetColors.map(color => `
                    <div class="color-preset" style="background: ${color}"
                         data-street="${name}" data-color="${color}"></div>
                `).join('')}
            </div>
            <div class="street-list-item-row">
                <input type="color" class="color-picker" value="${streetColors[name]}" data-street="${name}">
                <div class="street-name">${name}</div>
            </div>
        </div>
    `).join('');

    // Add preset click handlers
    container.querySelectorAll('.color-preset').forEach(preset => {
        preset.addEventListener('click', (e) => {
            const street = e.target.dataset.street;
            const color = e.target.dataset.color;
            streetColors[street] = color;
            // Update the color picker
            container.querySelector(`input[data-street="${street}"]`).value = color;
            updateMap();
        });
    });

    // Add color picker change handlers
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
        if (nameMode === 'name-only') {
            // In name-only mode, directly use the base name counts cache
            streets = Object.entries(baseNameCountsCache)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([baseName]) => baseName);
        } else {
            // In name-type mode, get top 10 full names
            const fullNameCounts = {};
            uniqueStreetNames.forEach(fullName => {
                const count = getStreetCount(fullName);
                if (count > 0) {
                    fullNameCounts[fullName] = count;
                }
            });

            streets = Object.entries(fullNameCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([name]) => name);
        }
    } else if (categories[listType]) {
        // Get streets matching category
        const pattern = categories[listType];
        streets = uniqueStreetNames.filter(name => {
            const nameLower = name.toLowerCase();
            return pattern.some(word => {
                // Use word boundary regex to match exact words only
                const regex = new RegExp(`\\b${word.toLowerCase()}\\b`);
                return regex.test(nameLower);
            });
        }); // Don't limit - show all matches
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

    saveSearch(); // Save view mode to URL
    updateMap();
}

function setNameMode(mode) {
    nameMode = mode;

    // Update button states
    document.getElementById('mode-name-only').classList.toggle('active', mode === 'name-only');
    document.getElementById('mode-name-type').classList.toggle('active', mode === 'name-type');

    // Rebuild unique names list based on mode
    processStreetData();

    // Clear and reload current selection with new mode
    const currentStreets = [...selectedStreetNames];
    selectedStreetNames = [];
    streetColors = {};

    currentStreets.forEach(street => {
        const displayName = getDisplayName(street, mode);
        if (!selectedStreetNames.includes(displayName)) {
            addStreetToSelection(displayName);
        }
    });

    saveSearch();
    updateSelectedStreetsUI();
    updateStreetColorsUI();
    updateMap();
    updateStats();
}

function getDisplayName(fullName, mode = nameMode) {
    if (mode === 'name-only') {
        // Return just the base name (e.g., "Victoria Street" -> "Victoria")
        return getBaseName(fullName);
    }
    // Return full name (e.g., "Victoria Street")
    return fullName;
}

function saveSearch() {
    // Save to localStorage
    localStorage.setItem('sydney-streets-search', JSON.stringify(selectedStreetNames));
    localStorage.setItem('sydney-streets-colors', JSON.stringify(streetColors));
    localStorage.setItem('sydney-streets-viewmode', viewMode);
    localStorage.setItem('sydney-streets-namemode', nameMode);

    // Update URL parameters
    const params = new URLSearchParams();
    if (selectedStreetNames.length > 0) {
        params.set('streets', selectedStreetNames.join('|'));
    }
    if (viewMode !== 'overlay') {
        params.set('view', viewMode);
    }
    if (nameMode !== 'name-only') {
        params.set('mode', nameMode);
    }

    // Update URL without reloading page
    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
}

function loadSearch() {
    // Try URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const streetsParam = urlParams.get('streets');
    const viewParam = urlParams.get('view');
    const modeParam = urlParams.get('mode');

    // Load name mode first (before processing streets)
    if (modeParam && (modeParam === 'name-only' || modeParam === 'name-type')) {
        nameMode = modeParam;
        document.getElementById('mode-name-only').classList.toggle('active', nameMode === 'name-only');
        document.getElementById('mode-name-type').classList.toggle('active', nameMode === 'name-type');
        processStreetData(); // Rebuild street names with correct mode
    }

    if (streetsParam) {
        // Load from URL
        selectedStreetNames = streetsParam.split('|').filter(name =>
            uniqueStreetNames.some(n => n.toLowerCase() === name.toLowerCase())
        );

        // Assign colors
        selectedStreetNames.forEach((name, index) => {
            if (!streetColors[name]) {
                streetColors[name] = defaultColors[index % defaultColors.length];
            }
        });

        // Load view mode from URL
        if (viewParam && (viewParam === 'overlay' || viewParam === 'grid')) {
            viewMode = viewParam;
        }
    } else {
        // Fallback to localStorage
        const saved = localStorage.getItem('sydney-streets-search');
        const savedColors = localStorage.getItem('sydney-streets-colors');
        const savedViewMode = localStorage.getItem('sydney-streets-viewmode');
        const savedNameMode = localStorage.getItem('sydney-streets-namemode');

        if (savedNameMode && (savedNameMode === 'name-only' || savedNameMode === 'name-type')) {
            nameMode = savedNameMode;
            document.getElementById('mode-name-only').classList.toggle('active', nameMode === 'name-only');
            document.getElementById('mode-name-type').classList.toggle('active', nameMode === 'name-type');
            processStreetData();
        }

        if (saved) {
            selectedStreetNames = JSON.parse(saved);
            if (savedColors) {
                streetColors = JSON.parse(savedColors);
            }
            if (savedViewMode) {
                viewMode = savedViewMode;
            }
        } else {
            // Default: add Victoria Street (or just Victoria in name-only mode)
            const defaultStreet = nameMode === 'name-only' ? 'Victoria' : 'Victoria Street';
            if (uniqueStreetNames.some(n => n.toLowerCase() === defaultStreet.toLowerCase())) {
                addStreetToSelection(defaultStreet);
            }
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

    // Filter out non-street entities (exits, ramps, cycleways, paths, etc.)
    const excludePatterns = [
        /\b(exit|offramp|onramp|on-ramp|off-ramp|on ramp|off ramp)\b/i,
        /\bcycleway\b/i,
        /\bshared path\b/i,
        /\bpaid area\b/i,
        /\bservice road\b/i,
        /\bunderpass\b/i,
        /\bcrossing\b/i,
        /\btunnel\b/i
    ];

    filteredFeatures = filteredFeatures.filter(feature => {
        const name = feature.properties.name || '';
        const highway = feature.properties.highway || '';

        // Exclude based on name patterns
        if (excludePatterns.some(pattern => pattern.test(name))) {
            return false;
        }

        // Exclude based on highway type
        const excludeHighwayTypes = ['cycleway', 'footway', 'path', 'steps', 'pedestrian', 'track'];
        if (excludeHighwayTypes.includes(highway.toLowerCase())) {
            return false;
        }

        return true;
    });

    // Build list of all streets
    allStreets = filteredFeatures.map(feature => ({
        name: feature.properties.name || 'Unnamed',
        type: feature.properties.type || feature.properties.highway || '',
        suburb: feature.properties.suburb || feature.properties.postcode || '',
        lga: feature.properties.lga || feature.properties.LGA || '',
        geometry: feature.geometry
    }));

    // Get unique street names based on current name mode
    const nameSet = new Set();
    allStreets.forEach(street => {
        if (street.name && street.name !== 'Unnamed') {
            if (nameMode === 'name-only') {
                const baseName = getBaseName(street.name);
                if (baseName) {
                    nameSet.add(baseName);
                }
            } else {
                nameSet.add(street.name);
            }
        }
    });
    uniqueStreetNames = Array.from(nameSet).sort();

    // Update streetData with filtered features
    streetData = {
        type: "FeatureCollection",
        features: filteredFeatures
    };

    // Pre-compute base name counts for name-only mode performance
    if (nameMode === 'name-only') {
        baseNameCountsCache = {};

        // Use Grid 200m precomputed counts if available
        if (precomputedCounts && precomputedCounts.counts) {
            // Aggregate Grid 200m counts by base name
            for (const [fullName, count] of Object.entries(precomputedCounts.counts)) {
                const baseName = getBaseName(fullName).toLowerCase();
                baseNameCountsCache[baseName] = (baseNameCountsCache[baseName] || 0) + count;
            }
            console.log(`Pre-computed ${Object.keys(baseNameCountsCache).length} base name counts (Grid 200m)`);
        } else {
            // Fallback: count segments (not ideal, but better than nothing)
            filteredFeatures.forEach(feature => {
                const fullName = feature.properties.name || '';
                if (fullName && fullName !== 'Unnamed') {
                    const baseName = getBaseName(fullName).toLowerCase();
                    baseNameCountsCache[baseName] = (baseNameCountsCache[baseName] || 0) + 1;
                }
            });
            console.log(`Pre-computed ${Object.keys(baseNameCountsCache).length} base name counts (segment fallback - not Grid 200m)`);
        }
    } else {
        baseNameCountsCache = {};
    }
}

function updateMap() {
    // Remove existing layer
    if (currentLayer) {
        map.removeLayer(currentLayer);
    }

    // If no streets selected, show empty map/grid
    if (selectedStreetNames.length === 0) {
        if (viewMode === 'grid') {
            document.getElementById('grid-view').innerHTML = '<p style="text-align: center; color: #999; margin-top: 2rem;">No streets selected</p>';
        }
        return;
    }

    // Filter features to only selected streets
    const selectedFeatures = streetData.features.filter(feature => {
        const name = feature.properties.name || '';
        if (nameMode === 'name-only') {
            // Match by base name
            const baseName = getBaseName(name);
            return selectedStreetNames.some(selectedName =>
                baseName.toLowerCase() === selectedName.toLowerCase()
            );
        } else {
            // Match by full name
            return selectedStreetNames.some(selectedName =>
                name.toLowerCase() === selectedName.toLowerCase()
            );
        }
    });

    if (viewMode === 'overlay') {
        // Show overlay map
        document.getElementById('map').style.display = 'block';
        document.getElementById('grid-view').classList.remove('active');

        // Check if only one street selected for multi-color visualization
        if (selectedStreetNames.length === 1) {
            const colorPalette = generateColorPalette(selectedFeatures.length);

            currentLayer = L.geoJSON(selectedFeatures, {
                style: function(feature) {
                    const index = selectedFeatures.indexOf(feature);
                    return {
                        color: colorPalette[index % colorPalette.length],
                        weight: 3,
                        opacity: 0.7
                    };
                },
                onEachFeature: function(feature, layer) {
                    const index = selectedFeatures.indexOf(feature);
                    layer.bindPopup(`<b>${selectedStreetNames[0]}</b><br>Occurrence #${index + 1}`);
                }
            }).addTo(map);

            // Show legend for single street
            showSingleStreetLegend(selectedStreetNames[0], selectedFeatures.length, colorPalette);
        } else {
            // Multiple streets: use assigned colors
            currentLayer = L.geoJSON(selectedFeatures, {
                style: function(feature) {
                    const name = feature.properties.name || '';
                    let matchingStreet;

                    if (nameMode === 'name-only') {
                        // Match by base name
                        const baseName = getBaseName(name);
                        matchingStreet = selectedStreetNames.find(s =>
                            baseName.toLowerCase() === s.toLowerCase()
                        );
                    } else {
                        // Match by full name
                        matchingStreet = selectedStreetNames.find(s =>
                            name.toLowerCase() === s.toLowerCase()
                        );
                    }

                    const color = streetColors[matchingStreet] || '#3498db';

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

            // Hide single street legend, maybe show multi-street legend toggle
            hideSingleStreetLegend();
        }

        if (selectedFeatures.length > 0) {
            map.fitBounds(currentLayer.getBounds());
        }
    } else {
        // Grid view
        document.getElementById('map').style.display = 'none';
        document.getElementById('grid-view').classList.add('active');

        renderGridView(selectedFeatures);
    }
}

function renderGridView(selectedFeatures) {
    const gridView = document.getElementById('grid-view');

    // Group features by selected street name (base name or full name depending on mode)
    const streetGroups = {};
    selectedFeatures.forEach(feature => {
        const name = feature.properties.name || '';

        // Find which selected street this feature belongs to
        let matchingStreet;
        if (nameMode === 'name-only') {
            const baseName = getBaseName(name);
            matchingStreet = selectedStreetNames.find(s =>
                baseName.toLowerCase() === s.toLowerCase()
            );
        } else {
            matchingStreet = selectedStreetNames.find(s =>
                name.toLowerCase() === s.toLowerCase()
            );
        }

        if (matchingStreet) {
            if (!streetGroups[matchingStreet]) {
                streetGroups[matchingStreet] = [];
            }
            streetGroups[matchingStreet].push(feature);
        }
    });

    // Create grid items
    const gridHTML = `
        <div class="grid-container">
            ${selectedStreetNames.map(streetName => {
                const features = streetGroups[streetName] || [];
                const color = streetColors[streetName] || '#3498db';
                const count = getStreetCount(streetName);

                return `
                    <div class="grid-item">
                        <div class="grid-item-header">
                            <div class="grid-item-color" style="background: ${color}"></div>
                            <div class="grid-item-name">${streetName}</div>
                            <div class="grid-item-count">${count} street${count !== 1 ? 's' : ''}</div>
                        </div>
                        <div class="grid-item-map" id="grid-map-${streetName.replace(/[^a-zA-Z0-9]/g, '-')}"></div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    gridView.innerHTML = gridHTML;

    // Create individual maps for each street
    setTimeout(() => {
        selectedStreetNames.forEach(streetName => {
            const features = streetGroups[streetName] || [];
            const mapId = `grid-map-${streetName.replace(/[^a-zA-Z0-9]/g, '-')}`;
            const color = streetColors[streetName] || '#3498db';

            if (features.length > 0) {
                const gridMap = L.map(mapId, {
                    zoomControl: false,
                    attributionControl: false
                });

                L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                    subdomains: 'abcd',
                    maxZoom: 20
                }).addTo(gridMap);

                const layer = L.geoJSON(features, {
                    style: {
                        color: color,
                        weight: 3,
                        opacity: 0.7
                    }
                }).addTo(gridMap);

                gridMap.fitBounds(layer.getBounds(), { padding: [10, 10] });
            }
        });
    }, 100);
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

    // Update street count list for selected streets (sorted by count descending)
    const countEl = document.getElementById('street-count');
    if (selectedStreetNames.length > 0) {
        const sortedEntries = Object.entries(selectedCounts)
            .sort((a, b) => b[1] - a[1]); // Sort by count descending

        countEl.innerHTML = sortedEntries.map(([name, count]) => {
            return `${name}: <strong>${count}</strong>`;
        }).join('<br>');
    } else {
        countEl.textContent = 'No streets selected';
    }
}

function getStreetCount(streetName) {
    if (nameMode === 'name-only') {
        // In name-only mode, use pre-computed cache for instant lookup
        const key = streetName.toLowerCase();
        return baseNameCountsCache[key] || 0;
    } else {
        // In name-type mode, count only exact matches
        // Use pre-computed counts if available
        if (precomputedCounts && precomputedCounts.counts) {
            // Try exact match first
            if (precomputedCounts.counts[streetName]) {
                return precomputedCounts.counts[streetName];
            }

            // Try case-insensitive match
            const key = Object.keys(precomputedCounts.counts).find(
                k => k.toLowerCase() === streetName.toLowerCase()
            );
            if (key) {
                return precomputedCounts.counts[key];
            }
        }

        // Fallback: count from features
        const count = streetData.features.filter(feature =>
            (feature.properties.name || '').toLowerCase() === streetName.toLowerCase()
        ).length;

        return count;
    }
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

// Legend functions
function showSingleStreetLegend(streetName, count, colors) {
    const legend = document.getElementById('map-legend');
    const toggle = document.getElementById('legend-toggle');

    let html = `<div class="legend-title">${streetName} Occurrences</div>`;
    for (let i = 0; i < Math.min(count, 20); i++) {
        html += `
            <div class="legend-item">
                <div class="legend-color" style="background: ${colors[i % colors.length]}"></div>
                <span>#${i + 1}</span>
            </div>
        `;
    }
    if (count > 20) {
        html += `<div class="legend-item" style="font-style: italic;">...and ${count - 20} more</div>`;
    }

    legend.innerHTML = html;
    legend.style.display = 'block';
    toggle.style.display = 'none';
}

function hideSingleStreetLegend() {
    document.getElementById('map-legend').style.display = 'none';
    const toggle = document.getElementById('legend-toggle');
    if (selectedStreetNames.length > 1) {
        toggle.style.display = 'block';
    } else {
        toggle.style.display = 'none';
    }
}

function toggleLegend() {
    const legend = document.getElementById('map-legend');
    legendVisible = !legendVisible;

    if (legendVisible && selectedStreetNames.length > 1) {
        let html = `<div class="legend-title">Streets</div>`;
        selectedStreetNames.forEach(street => {
            html += `
                <div class="legend-item">
                    <div class="legend-color" style="background: ${streetColors[street] || '#3498db'}"></div>
                    <span>${street}</span>
                </div>
            `;
        });
        legend.innerHTML = html;
        legend.style.display = 'block';
    } else {
        legend.style.display = 'none';
    }
}
