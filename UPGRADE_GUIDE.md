# Sydney Streets - Remaining Features Implementation Guide

This guide provides complete code snippets to implement the remaining 7 features.

## Feature 1: Multi-Color Single Street Visualization

### Add helper function to app.js (after line 51):

```javascript
// Generate distinct colors for visualizing multiple occurrences
function generateColorPalette(count) {
    if (count <= 8) {
        // Use distinct colors from default palette
        return defaultColors.slice(0, count);
    }

    // Generate color gradient for larger counts
    const colors = [];
    for (let i = 0; i < count; i++) {
        const hue = (i * 360 / count) % 360;
        colors.push(`hsl(${hue}, 70%, 50%)`);
    }
    return colors;
}
```

### Modify updateMap() function (around line 651-670):

Replace the overlay section with:

```javascript
if (viewMode === 'overlay') {
    // Show overlay map
    document.getElementById('map').style.display = 'block';
    document.getElementById('grid-view').classList.remove('active');

    // If only one street selected, use multi-color visualization
    if (selectedStreetNames.length === 1) {
        const colorPalette = generateColorPalette(selectedFeatures.length);

        currentLayer = L.geoJSON(selectedFeatures, {
            style: function(feature) {
                const index = selectedFeatures.indexOf(feature);
                return {
                    color: colorPalette[index % colorPalette.length],
                    weight: 3,
                    opacity: 0.7
                }
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
                let matchingStreet = selectedStreetNames.find(s => {
                    if (nameMode === 'name-only') {
                        return getBaseName(name).toLowerCase() === s.toLowerCase();
                    } else {
                        return name.toLowerCase() === s.toLowerCase();
                    }
                });
                const color = streetColors[matchingStreet] || '#3498db';

                return {
                    color: color,
                    weight: 3,
                    opacity: 0.7
                }
            }
        }).addTo(map);

        // Hide single street legend
        hideSingleStreetLegend();
    }

    if (selectedFeatures.length > 0) {
        map.fitBounds(currentLayer.getBounds());
    }
}
```

## Feature 2: Color Legend

### Add CSS to index.html (in <style> section):

```css
.map-legend {
    position: absolute;
    bottom: 30px;
    right: 10px;
    background: white;
    padding: 10px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    max-height: 300px;
    overflow-y: auto;
    z-index: 1000;
    min-width: 150px;
}

.legend-title {
    font-weight: 600;
    margin-bottom: 8px;
    font-size: 0.9rem;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 4px 0;
    font-size: 0.85rem;
}

.legend-color {
    width: 20px;
    height: 3px;
    border-radius: 1px;
}

.legend-toggle {
    position: absolute;
    bottom: 30px;
    right: 10px;
    background: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    cursor: pointer;
    z-index: 1000;
    font-size: 0.85rem;
}

.legend-toggle:hover {
    background: #f0f0f0;
}
```

### Add to HTML (inside #map div):

```html
<div id="map">
    <button id="legend-toggle" class="legend-toggle" style="display: none;">Legend</button>
    <div id="map-legend" class="map-legend" style="display: none;"></div>
</div>
```

### Add functions to app.js:

```javascript
let legendVisible = false;

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

// Add to setupEventListeners():
document.getElementById('legend-toggle').addEventListener('click', toggleLegend);
```

## Feature 3: Predefined Color Picker

### Add CSS:

```css
.color-presets {
    display: flex;
    gap: 4px;
    margin-bottom: 4px;
    flex-wrap: wrap;
}

.color-preset {
    width: 24px;
    height: 24px;
    border-radius: 3px;
    cursor: pointer;
    border: 2px solid transparent;
}

.color-preset:hover {
    border-color: #666;
}
```

### Modify updateStreetColorsUI():

```javascript
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
            <input type="color" class="color-picker" value="${streetColors[name]}" data-street="${name}">
            <div class="street-name">${name}</div>
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
```

## Feature 4: Grid View Responsive Sizing

### Replace grid CSS in index.html:

```css
.grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(
        min(300px, 100%),
        1fr
    ));
    gap: 1rem;
}

/* Adjust based on number of items */
@media (min-width: 1400px) {
    .grid-container[data-count="1"] {
        grid-template-columns: 1fr;
    }
    .grid-container[data-count="2"] {
        grid-template-columns: repeat(2, 1fr);
    }
}
```

### Update renderGridView():

```javascript
const gridHTML = `
    <div class="grid-container" data-count="${selectedStreetNames.length}">
        ...
```

## Feature 5: Street Reordering

### Add CSS:

```css
.street-list-item {
    cursor: move;
}

.street-list-item.dragging {
    opacity: 0.5;
}
```

### Add to updateStreetColorsUI():

```javascript
// Make items draggable
container.querySelectorAll('.street-list-item').forEach((item, index) => {
    item.draggable = true;
    item.dataset.index = index;

    item.addEventListener('dragstart', (e) => {
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index);
    });

    item.addEventListener('dragend', (e) => {
        e.target.classList.remove('dragging');
    });

    item.addEventListener('dragover', (e) => {
        e.preventDefault();
        const dragging = container.querySelector('.dragging');
        const afterElement = getDragAfterElement(container, e.clientY);
        if (afterElement == null) {
            container.appendChild(dragging);
        } else {
            container.insertBefore(dragging, afterElement);
        }
    });

    item.addEventListener('drop', (e) => {
        e.preventDefault();
        // Reorder the selectedStreetNames array
        const newOrder = Array.from(container.querySelectorAll('.street-list-item'))
            .map(el => selectedStreetNames[el.dataset.index]);
        selectedStreetNames = newOrder;
        updateStreetColorsUI();
        updateMap();
        saveSearch();
    });
});

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.street-list-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}
```

## Feature 6: Address Search (Simple Version)

### Add HTML after the header:

```html
<div id="address-search" style="position: absolute; top: 80px; left: 50%; transform: translateX(-50%); z-index: 1000; display: none;">
    <input type="text" id="address-input" placeholder="Search address..."
           style="padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; width: 300px;">
</div>
```

### Add button to header-right:

```html
<button id="address-search-toggle" class="header-link" style="background: none; border: none; cursor: pointer;">
    Search Address
</button>
```

### Add to setupEventListeners():

```javascript
document.getElementById('address-search-toggle').addEventListener('click', () => {
    const searchBox = document.getElementById('address-search');
    searchBox.style.display = searchBox.style.display === 'none' ? 'block' : 'none';
    if (searchBox.style.display === 'block') {
        document.getElementById('address-input').focus();
    }
});

document.getElementById('address-input').addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const query = e.target.value;
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
                document.getElementById('address-search').style.display = 'none';
            } else {
                alert('Address not found');
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            alert('Error searching for address');
        }
    }
});
```

## Feature 7: Grid Map Sync Toggle

### Add to grid view controls (in collapsible-content):

```html
<div class="view-mode">
    <button id="view-overlay" class="active">Overlay</button>
    <button id="view-grid">Grid</button>
</div>
<div class="view-mode" id="grid-sync-controls" style="display: none;">
    <button id="sync-independent" class="active">Independent</button>
    <button id="sync-synchronized">Synchronized</button>
</div>
```

### Add to setupEventListeners():

```javascript
let gridMapsSync = false;
let gridMaps = [];

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
```

### Modify renderGridView() to track maps and add sync:

```javascript
gridMaps = []; // Clear old maps

// In the setTimeout section where maps are created:
const gridMap = L.map(mapId, {
    zoomControl: false,
    attributionControl: false
});

gridMaps.push(gridMap);

if (gridMapsSync && gridMaps.length > 1) {
    const mainMap = gridMaps[0];
    gridMap.on('moveend', () => syncGridMapView(gridMap));
    gridMap.on('zoomend', () => syncGridMapView(gridMap));
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
```

### Show/hide sync controls:

```javascript
// In setViewMode():
document.getElementById('grid-sync-controls').style.display = mode === 'grid' ? 'block' : 'none';
```

## Implementation Order

1. Start with **Color Legend** and **Predefined Colors** - easiest and most visual
2. **Multi-Color Single Street** - enhances exploration
3. **Address Search** - useful utility
4. **Grid Responsive** - simple CSS change
5. **Street Reordering** - nice UX improvement
6. **Grid Map Sync** - advanced feature

## Testing

After each feature:
1. Reload http://localhost:8001
2. Test the specific functionality
3. Ensure no regressions in existing features
