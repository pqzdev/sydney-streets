// Australian Capital Cities Street Names - Interactive Visualization
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
let gridMapsSync = false; // Whether grid maps pan/zoom together
let gridMaps = []; // Array of grid map instances
// Get city from URL parameter or default to sydney
const urlParams = new URLSearchParams(window.location.search);
let currentCity = urlParams.get('city') || 'sydney'; // Currently selected city

// Default colors for streets - 11 maximally distinguishable colors (Kelly's color set + additions)
// Source: Kelly, K. L. (1965) "Color designation and specification"
const defaultColors = [
    '#F3C300', // Vivid Yellow
    '#875692', // Strong Purple
    '#F38400', // Vivid Orange
    '#A1CAF1', // Very Light Blue
    '#BE0032', // Vivid Red
    '#C2B280', // Grayish Yellow
    '#848482', // Medium Gray
    '#008856', // Vivid Green
    '#E68FAC', // Strong Purplish Pink
    '#0067A5', // Strong Blue
    '#F99379'  // Strong Yellowish Pink
];

// Color schemes for different categories
const colors = {
    default: '#3498db',
    common: '#e74c3c',
    suburbs: '#f79902ff',
    trees: '#248f5aff',
    royalty: '#8b50a3ff',
    famous: '#f1c40f'
};

// City configurations
const cityConfigs = {
    sydney: {
        name: 'Sydney',
        center: [-33.8688, 151.2093],
        zoom: 12,
        bounds: [[-34.3, 150.35], [-33.25, 151.5]],
        dataFile: 'data/cities/sydney/streets.geojson',
        countsFile: 'data/cities/sydney/counts.json',
        lgas: [
            'bayside', 'burwood', 'canada bay', 'inner west', 'randwick', 'strathfield',
            'sydney', 'waverley', 'woollahra',
            'blacktown', 'cumberland', 'parramatta', 'the hills shire', 'the hills',
            'camden', 'campbelltown', 'blue mountains', 'fairfield', 'hawkesbury',
            'liverpool', 'penrith', 'wollondilly',
            'hornsby', 'hunters hill', 'ku-ring-gai', 'lane cove', 'mosman', 'north sydney',
            'northern beaches', 'ryde', 'willoughby',
            'canterbury-bankstown', 'georges river', 'sutherland'
        ]
    },
    melbourne: {
        name: 'Melbourne',
        center: [-37.8136, 144.9631],
        zoom: 11,
        bounds: [[-38.5, 144.5], [-37.4, 145.8]],
        dataFile: 'data/cities/melbourne/streets.geojson',
        countsFile: 'data/cities/melbourne/counts.json',
        lgas: []  // TODO: add Melbourne LGAs
    }
};


// Category regex patterns for filtering streets
// Using word boundaries (\b) to match whole words only
const categoryPatterns = {
    trees: '\\b(Oak|Pine|Elm|Maple|Ash|Birch|Cedar|Willow|Plane|Poplar|Fig|Wattle|Eucalyptus|Gum|Acacia|Banksia|Fir|Spruce|Cypress|Jacaranda|Bottlebrush|Grevillea|Melaleuca|Callistemon|Lilly\\s*Pilly|Lilly Pilly)\\b',
    royalty: '\\b(George|Victoria|Elizabeth|William|Albert|Edward|Mary|Anne|Charlotte|Margaret|Adelaide|Alice|Henry|Charles|Philip|Andrew|Queen|King|Prince|Princess|Duke|Duchess|Royal|Regal|Imperial|Crown)\\b',
    famous: '\\b(Cook|Macquarie|Phillip|Bligh|Hunter|Darling|Bourke|Fitzroy|Wentworth|Lawson|Blaxland|Hume|Parkes|Bradfield|Banks|Flinders|Sturt|Mitchell|Oxley|Cunningham|Endeavour)\\b',
    suburbs: '\\b(Sydney|Parramatta|Bondi|Manly|Penrith|Liverpool|Blacktown|Melbourne|Richmond|Brunswick|Fitzroy|Carlton|Collingwood|Kensington)\\b'
};

// Legacy: Keep for backward compatibility with existing code
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
    // Get city config
    const cityConfig = cityConfigs[currentCity];

    // Define city bounds with buffer
    const cityBounds = L.latLngBounds(
        L.latLng(cityConfig.bounds[0][0], cityConfig.bounds[0][1]),
        L.latLng(cityConfig.bounds[1][0], cityConfig.bounds[1][1])
    );

    // Initialize map centered on selected city with bounds restriction
    map = L.map('map', {
        maxBounds: cityBounds,
        maxBoundsViscosity: 1.0,  // Prevent dragging outside bounds
        minZoom: 10,
        maxZoom: 18
    }).setView(cityConfig.center, cityConfig.zoom);

    // Add CartoDB Positron tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Set city selector to match current city
    document.getElementById('city-selector').value = currentCity;

    // Initialize UI event listeners
    setupEventListeners();

    // Load data and restore previous search
    loadData();
});

function setupEventListeners() {
    // City selector
    document.getElementById('city-selector').addEventListener('change', (e) => {
        const newCity = e.target.value;
        if (newCity !== currentCity && cityConfigs[newCity]) {
            // Reload the page with the new city parameter
            window.location.href = `?city=${newCity}`;
        }
    });

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

    // Grid sync toggle buttons
    document.getElementById('sync-independent').addEventListener('click', () => {
        gridMapsSync = false;
        document.getElementById('sync-independent').classList.add('active');
        document.getElementById('sync-synchronized').classList.remove('active');
    });

    document.getElementById('sync-synchronized').addEventListener('click', () => {
        gridMapsSync = true;
        document.getElementById('sync-independent').classList.remove('active');
        document.getElementById('sync-synchronized').classList.add('active');
        synchronizeGridMaps();
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
    const query = e.target.value.trim();
    const autocompleteList = document.getElementById('autocomplete-list');

    if (query.length < 2) {
        hideAutocomplete();
        return;
    }

    let allMatches;

    // Check if query is wrapped in quotes for exact match
    if (query.startsWith('"') && query.endsWith('"')) {
        const exactQuery = query.slice(1, -1).toLowerCase();
        allMatches = uniqueStreetNames.filter(name =>
            name.toLowerCase() === exactQuery
        );
    } else {
        // Try to use as regex, fall back to simple contains if invalid
        try {
            const regex = new RegExp(query, 'i');
            allMatches = uniqueStreetNames.filter(name => regex.test(name));
        } catch (e) {
            // Invalid regex, fall back to simple contains
            const lowerQuery = query.toLowerCase();
            allMatches = uniqueStreetNames.filter(name =>
                name.toLowerCase().includes(lowerQuery)
            );
        }
    }

    if (allMatches.length === 0) {
        hideAutocomplete();
        return;
    }

    // Show all matches (with scrolling)
    const displayMatches = allMatches.slice(0, 100); // Show up to 100 results

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
    // Use the same 11 maximally distinguishable colors as defaultColors
    const presetColors = defaultColors;

    container.innerHTML = selectedStreetNames.map((name, index) => `
        <div class="street-list-item" draggable="true" data-index="${index}" data-street="${name}">
            <div class="street-list-item-row">
                <div style="position: relative;">
                    <div class="current-color-button" style="background: ${streetColors[name]}" data-street="${name}"></div>
                    <div class="color-presets" data-street="${name}">
                        ${presetColors.map(color => `
                            <div class="color-preset" style="background: ${color}"
                                 data-street="${name}" data-color="${color}"></div>
                        `).join('')}
                        <div class="color-preset custom" data-street="${name}"></div>
                    </div>
                    <input type="color" class="color-picker" value="${streetColors[name]}" data-street="${name}" style="display: none;">
                </div>
                <div class="street-name">${name}</div>
            </div>
        </div>
    `).join('');

    // Add current color button click handlers (toggle dropdown)
    container.querySelectorAll('.current-color-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const street = button.dataset.street;
            const dropdown = container.querySelector(`.color-presets[data-street="${street}"]`);

            // Close all other dropdowns
            container.querySelectorAll('.color-presets').forEach(d => {
                if (d !== dropdown) d.classList.remove('show');
            });

            // Toggle this dropdown
            dropdown.classList.toggle('show');
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.street-list-item')) {
            container.querySelectorAll('.color-presets').forEach(d => d.classList.remove('show'));
        }
    });

    // Add preset click handlers
    container.querySelectorAll('.color-preset:not(.custom)').forEach(preset => {
        preset.addEventListener('click', (e) => {
            e.stopPropagation();
            const street = e.target.dataset.street;
            const color = e.target.dataset.color;
            streetColors[street] = color;
            // Update the button color
            container.querySelector(`.current-color-button[data-street="${street}"]`).style.background = color;
            // Close dropdown
            container.querySelector(`.color-presets[data-street="${street}"]`).classList.remove('show');
            updateMap();
        });
    });

    // Add custom color (color wheel) handler
    container.querySelectorAll('.color-preset.custom').forEach(customBtn => {
        customBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const street = customBtn.dataset.street;
            const picker = container.querySelector(`input[data-street="${street}"]`);
            picker.click();
            // Close dropdown
            container.querySelector(`.color-presets[data-street="${street}"]`).classList.remove('show');
        });
    });

    // Add color picker change handlers
    container.querySelectorAll('.color-picker').forEach(picker => {
        picker.addEventListener('change', (e) => {
            const street = e.target.dataset.street;
            streetColors[street] = e.target.value;
            // Update the button color
            container.querySelector(`.current-color-button[data-street="${street}"]`).style.background = e.target.value;
            updateMap();
        });
    });

    // Add drag-and-drop handlers
    const items = container.querySelectorAll('.street-list-item');
    items.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
    });
}

let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    const items = document.querySelectorAll('.street-list-item');
    items.forEach(item => item.classList.remove('drag-over'));
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    if (this !== draggedItem) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    if (draggedItem !== this) {
        const fromIndex = parseInt(draggedItem.dataset.index);
        const toIndex = parseInt(this.dataset.index);

        // Reorder the array
        const item = selectedStreetNames.splice(fromIndex, 1)[0];
        selectedStreetNames.splice(toIndex, 0, item);

        // Update UI and map
        updateStreetColorsUI();
        updateMap();
        saveSearch();
    }

    return false;
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

    // Show/hide grid sync controls
    document.getElementById('grid-sync-controls').style.display = mode === 'grid' ? 'flex' : 'none';

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
    // Show loading bar
    const loadingBar = document.getElementById('loading-bar');
    loadingBar.classList.add('show');

    const cityConfig = cityConfigs[currentCity];

    try {
        // Load pre-computed counts (from API or static file)
        if (cityConfig.countsFile) {
            try {
                precomputedCounts = await StreetAPI.loadCounts(currentCity, cityConfig.countsFile);
                if (precomputedCounts) {
                    console.log(`Loaded pre-computed street counts for ${cityConfig.name} (Grid 200m + Highway-Aware)`);
                }
            } catch (e) {
                console.log('Pre-computed counts not available:', e);
            }
        }

        // Load street data (from API or static file)
        streetData = await StreetAPI.loadAllStreets(currentCity, cityConfig.dataFile);
        processStreetData();

        // Load saved search or default
        loadSearch();

        // Update map with selected streets
        updateMap();
        updateStats();

        // Hide loading bar
        loadingBar.classList.remove('show');
    } catch (error) {
        // Hide loading bar on error too
        loadingBar.classList.remove('show');
        alert(`Error loading data: ${error.message}`);
        console.error(error);
    }
}

function processStreetData() {
    if (!streetData) return;

    const cityConfig = cityConfigs[currentCity];

    // Filter to city area if LGA data available
    let filteredFeatures = streetData.features;
    if (cityConfig.lgas && streetData.features.length > 0 &&
        (streetData.features[0].properties.lga || streetData.features[0].properties.LGA)) {
        filteredFeatures = streetData.features.filter(feature => {
            const lga = (feature.properties.lga || feature.properties.LGA || '').toLowerCase();
            return cityConfig.lgas.some(validLga => lga.includes(validLga));
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
            // Use instance IDs directly from GeoJSON (assigned by Grid 200m processing)
            const instanceCount = selectedFeatures[0]?.properties?._totalInstances || getStreetCount(selectedStreetNames[0]);
            console.log(`${selectedStreetNames[0]}: ${instanceCount} instances, ${selectedFeatures.length} segments`);

            const colorPalette = generateColorPalette(instanceCount);

            currentLayer = L.geoJSON(selectedFeatures, {
                style: function(feature) {
                    // Use the precomputed instance ID from Grid 200m processing
                    const instanceId = feature.properties._instanceId !== undefined ? feature.properties._instanceId : 0;
                    return {
                        color: colorPalette[instanceId % colorPalette.length],
                        weight: 3,
                        opacity: 0.7
                    };
                },
                onEachFeature: function(feature, layer) {
                    const instanceId = feature.properties._instanceId !== undefined ? feature.properties._instanceId : 0;
                    layer.bindPopup(`<b>${selectedStreetNames[0]}</b><br>Instance #${instanceId + 1} of ${instanceCount}`);
                }
            }).addTo(map);

            // Show legend for single street
            showSingleStreetLegend(selectedStreetNames[0], instanceCount, colorPalette);
        } else{
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
        <div class="grid-container" data-count="${selectedStreetNames.length}">
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

    // Clear old grid maps
    gridMaps = [];

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

                // Add to grid maps array
                gridMaps.push(gridMap);

                // Always add sync event listeners (they check gridMapsSync internally)
                gridMap.on('moveend', () => syncGridMapView(gridMap));
                gridMap.on('zoomend', () => syncGridMapView(gridMap));
            }
        });
    }, 100);
}

function syncGridMapView(sourceMap) {
    if (!gridMapsSync) return;
    const center = sourceMap.getCenter();
    const zoom = sourceMap.getZoom();
    gridMaps.forEach(m => {
        if (m !== sourceMap) {
            m.setView(center, zoom);
        }
    });
}

function synchronizeGridMaps() {
    if (gridMaps.length > 0) {
        const mainMap = gridMaps[0];
        const center = mainMap.getCenter();
        const zoom = mainMap.getZoom();
        gridMaps.forEach(m => m.setView(center, zoom));
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

// Group features into geographically distinct clusters (street instances)
// Features that are close together belong to the same instance
function groupFeaturesIntoClusters(features) {
    if (features.length === 0) return [];

    // Distance threshold in degrees (~200m at Sydney's latitude)
    const DISTANCE_THRESHOLD = 0.002;

    // Calculate centroid of a feature
    function getCentroid(feature) {
        const coords = feature.geometry.coordinates;
        if (feature.geometry.type === 'LineString') {
            // Get midpoint of linestring
            const mid = Math.floor(coords.length / 2);
            return coords[mid];
        } else if (feature.geometry.type === 'MultiLineString') {
            // Get first line's midpoint
            const firstLine = coords[0];
            const mid = Math.floor(firstLine.length / 2);
            return firstLine[mid];
        }
        return coords[0] || [0, 0];
    }

    // Calculate distance between two points [lon, lat]
    function distance(p1, p2) {
        const dx = p1[0] - p2[0];
        const dy = p1[1] - p2[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Features that haven't been assigned to a cluster yet
    const unassigned = [...features];
    const clusters = [];

    while (unassigned.length > 0) {
        // Start a new cluster with the first unassigned feature
        const cluster = [unassigned.shift()];
        const clusterCentroids = [getCentroid(cluster[0])];

        // Find all nearby features and add them to this cluster
        let i = 0;
        while (i < unassigned.length) {
            const featureCentroid = getCentroid(unassigned[i]);

            // Check if this feature is close to any feature in the cluster
            const isNearby = clusterCentroids.some(clusterCentroid =>
                distance(featureCentroid, clusterCentroid) < DISTANCE_THRESHOLD
            );

            if (isNearby) {
                // Add to cluster and remove from unassigned
                cluster.push(unassigned[i]);
                clusterCentroids.push(featureCentroid);
                unassigned.splice(i, 1);
                // Don't increment i since we removed an element
            } else {
                i++;
            }
        }

        clusters.push(cluster);
    }

    return clusters;
}

// Legend functions
function showSingleStreetLegend(streetName, count, colors) {
    const legend = document.getElementById('map-legend');
    const toggle = document.getElementById('legend-toggle');

    let html = `<div class="legend-title">
        <span>${streetName} Occurrences</span>
        <span class="legend-close" onclick="hideSingleStreetLegend()">×</span>
    </div>`;
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
        let html = `<div class="legend-title">
            <span>Streets</span>
            <span class="legend-close" onclick="toggleLegend()">×</span>
        </div>`;
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
