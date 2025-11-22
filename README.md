# Sydney Streets

Interactive visualization of Sydney street names and patterns.

## Overview

This project visualizes street data across **Greater Sydney** (as officially defined by the NSW Government) to explore interesting patterns in street naming:
- Most popular street names
- Streets named after suburbs
- Tree-themed street names
- Royalty-themed street names
- Geographic clustering of name patterns

**Geographic Scope**: This project uses the official NSW Government definition of Greater Sydney, comprising 33 Local Government Areas across 5 planning districts. See [SCOPE.md](SCOPE.md) for the complete list and sources.

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

## Getting Started

### Running Locally

1. Clone the repository:
```bash
git clone https://github.com/pqzdev/sydney-streets.git
cd sydney-streets
```

2. Open `index.html` in your browser:
```bash
open index.html
# or
python3 -m http.server 8000
```

3. Load sample data or download NSW data (instructions below)

### Downloading NSW Road Data

1. Visit [Data.NSW Road Segment Data](https://data.nsw.gov.au/data/dataset/2-road-segment-data-from-datansw)
2. Click "Go to resource"
3. Select area (or download all)
4. Choose **GeoJSON** format
5. Save to `data/sydney-roads.geojson`

## Project Structure

```
sydney-streets/
├── index.html          # Main application
├── app.js              # Application logic
├── data/               # Street data files
│   └── .gitignore      # Ignore large data files
└── README.md           # This file
```

## Features

- **Interactive Map**: Pan, zoom, and explore Sydney streets
- **Filter by Name**: Search for specific street names
- **Category Views**:
  - Most common names
  - Streets named after suburbs
  - Tree-themed streets
  - Royalty-themed streets
- **Statistics**: Real-time stats on visible streets and patterns
- **Popups**: Click streets for detailed information

## Technology Stack

- **Leaflet.js**: Interactive map library
- **OpenStreetMap**: Base map tiles
- **Vanilla JavaScript**: No frameworks, just HTML/CSS/JS
- **GeoJSON**: Geographic data format

## Deployment

This site is deployed on GitHub Pages / Cloudflare Pages (free hosting).

Visit: [https://pqzdev.github.io/sydney-streets/](https://pqzdev.github.io/sydney-streets/)

## Future Enhancements

- [ ] Download NSW road data automatically
- [ ] Add more name categories (historical figures, animals, etc.)
- [ ] Heat map of name popularity
- [ ] Street length analysis
- [ ] Export filtered results
- [ ] Mobile-optimized interface
- [ ] Data caching for faster loading

## Contributing

Issues and pull requests welcome!

## License

MIT

## Acknowledgments

- Data from [Data.NSW](https://data.nsw.gov.au/)
- Maps from [OpenStreetMap](https://www.openstreetmap.org/)
- Built with [Leaflet.js](https://leafletjs.com/)
