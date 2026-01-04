# E-Bike NCR - Metro Manila Routing

A fully client-side e-bike routing application for Metro Manila. Calculates safe routes that avoid MMDA-prohibited roads (national roads, circumferential roads, and radial roads) per Regulation No. 24-022.

![E-Bike Routing Demo](https://raw.githubusercontent.com/pipluppp/ebike-ncr/main/docs/demo.png)

## Features

- 🗺️ **Interactive Map** - OpenFreeMap vector tiles with Leaflet
- 🚴 **E-Bike Safe Routes** - Avoids prohibited roads per MMDA regulations
- ⚡ **Fast Pathfinding** - NBA* algorithm via ngraph.path (~50ms for any route)
- 📱 **Fully Client-Side** - No server required, runs entirely in browser
- 🔄 **Lazy Loading** - Prohibited roads layer loads on-demand

## Quick Start

### Option 1: Local Development
```bash
# Serve the static files
python -m http.server 8000

# Open in browser
# http://localhost:8000
```

### Option 2: Deploy to GitHub Pages
Simply push to the `gh-pages` branch or configure GitHub Pages to serve from the `v2` branch.

## How to Use

1. **Right-click** on the map at your starting location
2. Select **"Directions from here"**
3. **Right-click** on your destination
4. Select **"Directions to here"**
5. The optimal route avoiding prohibited roads will be displayed

## Project Structure

```
ebike-ncr/
├── index.html                 # Main application entry point
├── static/
│   ├── css/
│   │   ├── app.css            # Application styles
│   │   ├── L.Control.Sidebar.css
│   │   └── sidebar_styles.css
│   ├── js/
│   │   ├── app.js             # Main routing logic (ngraph.path)
│   │   ├── loadGraph.js       # Binary graph loader
│   │   ├── L.Control.Sidebar.js
│   │   └── button_toggle_visibility_sidebar.js
│   └── data/
│       ├── metro-manila.co.bin      # Node coordinates (binary)
│       ├── metro-manila.gr.bin      # Edge list (binary)
│       └── prohibited-roads.geojson # Prohibited roads layer
├── data/                      # Original GraphML source files
│   ├── metro_graph_without_prohibited.graphml
│   └── metro_graph_prohibited.graphml
├── scripts/                   # Python scripts for data regeneration
│   ├── export_graph_binary.py
│   └── export_prohibited_geojson.py
└── docs/
    └── implementation-plan.md
```

## Technical Details

### Graph Data
- **59,055 nodes** and **142,001 edges** representing Metro Manila's road network
- Binary format: ~1.5MB total (vs 73MB GraphML)
- Coordinates stored as Int32 (lat/lng × 1,000,000)

### Pathfinding
- Uses [ngraph.path](https://github.com/anvaka/ngraph.path) NBA* algorithm
- Bi-directional A* search for optimal performance
- Euclidean distance heuristic

### Map
- [OpenFreeMap](https://openfreemap.org/) vector tiles via MapLibre GL
- Leaflet for overlays and interactivity

## Regenerating Graph Data

If you need to regenerate the binary graph data from the original GraphML files:

```bash
# Install dependencies
pip install osmnx

# Export binary graph
python scripts/export_graph_binary.py

# Export prohibited roads GeoJSON
python scripts/export_prohibited_geojson.py
```

## Technologies

- [Leaflet](https://leafletjs.com/) - Interactive maps
- [MapLibre GL](https://maplibre.org/) - Vector tile rendering
- [OpenFreeMap](https://openfreemap.org/) - Free map tiles
- [ngraph.path](https://github.com/anvaka/ngraph.path) - Fast pathfinding
- [OSMnx](https://osmnx.readthedocs.io/) - Graph data processing

## License

MIT License

## Acknowledgments

- Road network data from [OpenStreetMap](https://www.openstreetmap.org/)
- MMDA Regulation No. 24-022 for e-bike road restrictions
