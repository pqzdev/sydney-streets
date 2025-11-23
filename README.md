# Sydney Streets

Interactive visualization of Sydney street names and patterns, featuring advanced street counting algorithms.

**[Live Demo](https://pqzdev.github.io/sydney-streets/)** | **[Research Methodology](https://pqzdev.github.io/sydney-streets/METHODOLOGY.html)**

## Overview

This project visualizes street data across **Greater Sydney** (as officially defined by the NSW Government) to explore interesting patterns in street naming:
- Most popular street names (counted using Grid 200m algorithm)
- Streets named after suburbs
- Tree-themed street names
- Royalty-themed street names
- Geographic clustering of name patterns

**Geographic Scope**: This project uses the official NSW Government definition of Greater Sydney, comprising 33 Local Government Areas across 5 planning districts. See [SCOPE.md](SCOPE.md) for the complete list and sources.

## Street Counting Methodology

A key challenge in this project is **counting unique instances of streets**. When "Victoria Street" appears in OpenStreetMap data, how do we know if it's one street or multiple distinct streets that share a name?

We researched and compared **5 different algorithms** to solve this problem:

1. **Point-to-Point Distance**: Check if any points on segments are within threshold distance
2. **Grid-based Flood Fill**: Divide map into grid cells and flood fill connected regions ⭐ **Winner**
3. **Polygon Buffer Intersection**: Create buffer polygons and check for intersections
4. **Endpoint-Only Distance**: Only check distances between segment endpoints
5. **Highway-Aware**: Hybrid method for handling long highways with gaps

### Winner: Grid 200m + Flood Fill

After extensive testing on 23 streets across Sydney:

- **224x faster** than Point-to-Point method (0.028s vs 6.28s)
- **Equivalent accuracy** to geometric methods
- **Scalable** to large datasets
- **Simple** implementation with no external dependencies

**Read the full research**: [METHODOLOGY.md](https://pqzdev.github.io/sydney-streets/METHODOLOGY.html)

**Interactive Tools**:
- [Method Comparison](https://pqzdev.github.io/sydney-streets/compare_visualization.html) - Compare algorithms side-by-side
- [Summary Table](https://pqzdev.github.io/sydney-streets/summary.html) - View all results and timing data

## Data Sources

### NSW Government Data (Primary)
- **Source**: [Data.NSW Road Segment Data](https://data.nsw.gov.au/data/dataset/2-road-segment-data-from-datansw)
- **Format**: GeoJSON with street polylines and metadata
- **Coverage**: Complete NSW road network
- **Attributes**: Road names, types, suburbs, geometries

### OpenStreetMap (Alternative)
- **Source**: [Overpass API](https://overpass-turbo.eu/)
- **Format**: GeoJSON
- **Query**: Streets within Sydney bounding box
- **Note**: Used for methodology research

## Getting Started

### Running Locally

1. Clone the repository:
```bash
git clone https://github.com/pqzdev/sydney-streets.git
cd sydney-streets
```

2. Start a local server:
```bash
python3 -m http.server 8000
open http://localhost:8000
```

3. The visualization will load with sample OSM data

### Running Method Comparisons

To reproduce our research findings:

```bash
# Install dependencies
pip install shapely scipy numpy

# Run comparison on test streets
python3 scripts/compare_methods.py

# Generate summary tables
python3 scripts/generate_summary_table.py

# View results
open compare_visualization.html
open summary.html
```

## Project Structure

```
sydney-streets/
├── index.html                  # Main visualization
├── app.js                      # Application logic
├── compare_visualization.html  # Method comparison tool
├── summary.html                # Results summary table
├── METHODOLOGY.md              # Research write-up
├── SCOPE.md                    # Geographic scope documentation
├── scripts/
│   ├── compare_methods.py          # Algorithm implementations
│   ├── generate_summary_table.py   # Summary generator
│   ├── process_full_dataset.py     # Grid 200m processing script
│   ├── download_osm_data.py        # OSM data downloader
│   └── add_suburbs.py              # Suburb data processing
├── data/
│   ├── sydney-roads-osm.geojson           # OSM street data
│   ├── sydney-roads-sample.geojson        # Sample data for testing
│   ├── method_comparison.json             # Comparison results
│   ├── method_comparison_detailed.json    # Detailed results
│   └── summary.json                       # Summary statistics
└── README.md                   # This file
```

## Features

### Main Visualization
- **Interactive Map**: Pan, zoom, and explore Sydney streets
- **Smart Counting**: Grid 200m algorithm for accurate street instance counts
- **Filter by Name**: Search for specific street names
- **Category Views**:
  - Most common names
  - Streets named after suburbs
  - Tree-themed streets
  - Royalty-themed streets
- **Statistics**: Real-time stats on visible streets and patterns
- **Popups**: Click streets for detailed information

### Research Tools
- **Method Comparison**: Compare up to 4 algorithms side-by-side on any street
- **Summary Table**: View all results, timing data, and disagreement analysis
- **Disagreement Visualization**: See where methods differ with 1km radius markers

## Technology Stack

- **Leaflet.js**: Interactive map library
- **OpenStreetMap**: Base map tiles
- **Vanilla JavaScript**: No frameworks, minimal dependencies
- **GeoJSON**: Geographic data format
- **Python**: Algorithm implementation and testing
  - NumPy/SciPy: K-D tree and spatial operations
  - Shapely: Geometric polygon operations

## Key Findings

From our methodology research:

| Method | Speed | Accuracy | Best For |
|--------|-------|----------|----------|
| Grid 200m | ⚡⚡⚡ (224x) | ⭐⭐⭐ | Production use |
| Grid 100m | ⚡⚡⚡ (170x) | ⭐⭐⭐ | Dense urban areas |
| Polygon Buffer 100m | ⚡⚡ (2.8x) | ⭐⭐⭐ | Geometric accuracy |
| Point-to-Point 100m | ⚡ (1x) | ⭐⭐⭐ | Baseline/validation |
| Highway-Aware | ⚡⚡⚡ | ⭐⭐⭐ | Long highways |

**Perfect highway counting**: Our Highway-Aware method correctly identifies Pacific Highway (722 segments) as 1 instance, while all other methods incorrectly counted it as 5 instances.

## Deployment

This site is deployed on GitHub Pages:

**Live Site**: [https://pqzdev.github.io/sydney-streets/](https://pqzdev.github.io/sydney-streets/)

To deploy your own version:
1. Fork this repository
2. Enable GitHub Pages in Settings → Pages
3. Select "main" branch as source
4. Your site will be live at `https://yourusername.github.io/sydney-streets/`

## Performance

Counting 23 test streets (3,956 total segments):
- **Grid 200m**: 0.028 seconds
- **Grid 100m**: 0.037 seconds
- **Polygon Buffer**: 2.26 seconds
- **Point-to-Point**: 6.28 seconds

## Future Enhancements

- [ ] Apply Grid 200m to full NSW dataset
- [ ] Add more name categories (historical figures, animals, etc.)
- [ ] Heat map of name popularity
- [ ] Street length analysis by category
- [ ] Export filtered results as GeoJSON
- [ ] Mobile-optimized interface
- [ ] Real-time method comparison on main map

## Contributing

Issues and pull requests welcome! Areas of particular interest:
- Additional street categorization patterns
- Performance optimizations for large datasets
- Alternative counting algorithms
- UI/UX improvements

## License

MIT

## Acknowledgments

- Data from [Data.NSW](https://data.nsw.gov.au/) and [OpenStreetMap](https://www.openstreetmap.org/)
- Maps from [OpenStreetMap](https://www.openstreetmap.org/) contributors
- Built with [Leaflet.js](https://leafletjs.com/)
- Research powered by NumPy, SciPy, and Shapely
- Special thanks to the OSM community for comprehensive Sydney street data

## Citation

If you use this methodology in your research:

```
Sydney Streets Project (2025). Street Instance Counting Algorithms for OpenStreetMap Data.
GitHub: https://github.com/pqzdev/sydney-streets
Methodology: https://pqzdev.github.io/sydney-streets/METHODOLOGY.html
```
