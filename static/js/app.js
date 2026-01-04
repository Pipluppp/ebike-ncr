/**
 * app.js - Metro Manila E-Bike Routing (Client-Side)
 * 
 * Main application logic integrating:
 * - ngraph.graph for graph data structure
 * - ngraph.path (NBA*) for pathfinding
 * - Simple grid-based spatial index for click-to-node mapping
 * - Leaflet for map visualization
 * 
 * Supports two routing modes:
 * - 'ebike': E-bike safe routes (avoids prohibited roads)
 * - 'all': All roads (includes prohibited roads)
 */

// Global state - routing data
let graphs = {
    ebike: null,  // E-bike safe graph (without prohibited roads)
    all: null     // Full graph (all roads)
};
let pathFinders = {
    ebike: null,
    all: null
};
let spatialIndexes = {
    ebike: null,
    all: null
};

// Current routing mode
let currentMode = 'ebike';

// Other state
let prohibitedLayer = null;
// Note: sourceCoordinates, targetCoordinates, polyLineGroup are declared in index.html

// Polyline styles for gradient effect (from original)
const polyLineStyles = [
    { color: '#380818', weight: 14 },
    { color: '#4d0727', weight: 12 },
    { color: '#b45513', weight: 9, opacity: 0.7 },
    { color: '#b45513', weight: 8 },
    { color: '#fdd036', weight: 5, opacity: 0.9 },
    { color: '#fcfac4', weight: 3, opacity: 0.95 },
    { color: '#ffffff', weight: 1 }
];

// DOM elements
const loadingOverlay = document.getElementById('loading-overlay');
const loadingMessage = document.getElementById('loading-message');
const loadingProgress = document.getElementById('loading-progress');
const prohibitedToggle = document.getElementById('prohibited-toggle');

// Note: polyLineGroup, sourceCircleMarker, destMarker are declared in index.html

/**
 * Simple grid-based spatial index for fast nearest-node lookup.
 */
class GridSpatialIndex {
    constructor(cellSize = 0.005) {  // ~500m cells at this latitude
        this.cellSize = cellSize;
        this.grid = new Map();
    }
    
    // Get cell key for a coordinate
    getCellKey(lng, lat) {
        const cellX = Math.floor(lng / this.cellSize);
        const cellY = Math.floor(lat / this.cellSize);
        return `${cellX},${cellY}`;
    }
    
    // Add a node to the index
    add(nodeId, lng, lat) {
        const key = this.getCellKey(lng, lat);
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key).push({ nodeId, lng, lat });
    }
    
    // Find nodes near a point
    findNear(lng, lat, radiusCells = 1) {
        const results = [];
        const centerX = Math.floor(lng / this.cellSize);
        const centerY = Math.floor(lat / this.cellSize);
        
        // Search in surrounding cells
        for (let dx = -radiusCells; dx <= radiusCells; dx++) {
            for (let dy = -radiusCells; dy <= radiusCells; dy++) {
                const key = `${centerX + dx},${centerY + dy}`;
                const cell = this.grid.get(key);
                if (cell) {
                    results.push(...cell);
                }
            }
        }
        
        return results;
    }
}

/**
 * Initialize the application - loads BOTH graphs.
 */
async function init() {
    try {
        // Load E-bike safe graph first (primary)
        updateProgress({ message: 'Loading e-bike safe routes...', percent: 0 });
        const ebikeResult = await loadGraph('static/data/metro-manila', (p) => {
            updateProgress({ message: p.message, percent: p.percent * 0.45 });
        });
        graphs.ebike = ebikeResult.graph;
        
        // Build spatial index for e-bike graph
        updateProgress({ message: 'Building e-bike spatial index...', percent: 45 });
        spatialIndexes.ebike = await buildSpatialIndex(ebikeResult.points, 45, 50);
        
        // Initialize e-bike pathfinder
        updateProgress({ message: 'Initializing e-bike pathfinder...', percent: 50 });
        pathFinders.ebike = createPathFinder(graphs.ebike);
        
        // Load full graph (all roads)
        updateProgress({ message: 'Loading all roads graph...', percent: 52 });
        const fullResult = await loadGraph('static/data/metro-manila-full', (p) => {
            updateProgress({ message: p.message, percent: 52 + p.percent * 0.35 });
        });
        graphs.all = fullResult.graph;
        
        // Build spatial index for full graph
        updateProgress({ message: 'Building all roads spatial index...', percent: 87 });
        spatialIndexes.all = await buildSpatialIndex(fullResult.points, 87, 95);
        
        // Initialize full pathfinder
        updateProgress({ message: 'Initializing all roads pathfinder...', percent: 95 });
        pathFinders.all = createPathFinder(graphs.all);
        
        updateProgress({ message: 'Ready!', percent: 100 });
        
        // Brief delay to show "Ready!" message
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Hide loading overlay with fade
        loadingOverlay.style.opacity = '0';
        loadingOverlay.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 300);
        
        console.log(`E-bike graph: ${graphs.ebike.getNodesCount()} nodes, ${graphs.ebike.getLinksCount()} edges`);
        console.log(`Full graph: ${graphs.all.getNodesCount()} nodes, ${graphs.all.getLinksCount()} edges`);
        
    } catch (error) {
        console.error('Failed to initialize:', error);
        loadingMessage.textContent = `Error: ${error.message}`;
        loadingProgress.style.background = '#ff4444';
    }
}

/**
 * Build spatial index from points array.
 */
async function buildSpatialIndex(points, progressStart, progressEnd) {
    const index = new GridSpatialIndex(0.005);
    const nodeCount = points.length / 2;
    
    for (let i = 0; i < points.length; i += 2) {
        const nodeId = i / 2;
        const lng = points[i];
        const lat = points[i + 1];
        index.add(nodeId, lng, lat);
        
        if (i % 10000 === 0) {
            const pct = progressStart + ((i / points.length) * (progressEnd - progressStart));
            updateProgress({ 
                message: `Building spatial index (${Math.round((i/2)/nodeCount*100)}%)...`, 
                percent: pct 
            });
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    
    return index;
}

/**
 * Create pathfinder for a graph.
 */
function createPathFinder(graph) {
    return ngraphPath.nba(graph, {
        distance(fromNode, toNode, link) {
            const dx = fromNode.data.x - toNode.data.x;
            const dy = fromNode.data.y - toNode.data.y;
            return Math.sqrt(dx * dx + dy * dy);
        },
        heuristic(fromNode, toNode) {
            const dx = fromNode.data.x - toNode.data.x;
            const dy = fromNode.data.y - toNode.data.y;
            return Math.sqrt(dx * dx + dy * dy);
        }
    });
}

/**
 * Update loading progress UI.
 */
function updateProgress({ message, percent }) {
    if (loadingMessage) loadingMessage.textContent = message;
    if (loadingProgress) loadingProgress.style.width = `${percent}%`;
}

/**
 * Set the routing mode (called from UI).
 */
function setRoutingMode(mode) {
    if (mode === currentMode) return;
    if (!graphs[mode] || !pathFinders[mode]) {
        console.warn(`Graph for mode '${mode}' not loaded yet`);
        return;
    }
    
    currentMode = mode;
    
    // Update UI
    document.getElementById('mode-ebike').classList.toggle('active', mode === 'ebike');
    document.getElementById('mode-all').classList.toggle('active', mode === 'all');
    
    // Update hint text
    const hint = document.getElementById('routing-hint');
    if (hint) {
        hint.textContent = mode === 'ebike' 
            ? 'Avoids prohibited roads' 
            : 'Uses all available roads';
    }
    
    console.log(`Routing mode set to: ${mode}`);
    
    // Recalculate route if we have source and target
    if (sourceCoordinates && targetCoordinates) {
        mapRoute();
    }
}

/**
 * Find the nearest graph node to a lat/lng coordinate.
 * Uses the current mode's spatial index.
 */
function findNearestNode(lat, lng) {
    const spatialIndex = spatialIndexes[currentMode];
    const graph = graphs[currentMode];
    
    if (!spatialIndex || !graph) return null;
    
    // Search with expanding radius
    let radiusCells = 1;
    let candidates = spatialIndex.findNear(lng, lat, radiusCells);
    
    while (candidates.length === 0 && radiusCells < 20) {
        radiusCells++;
        candidates = spatialIndex.findNear(lng, lat, radiusCells);
    }
    
    if (candidates.length === 0) {
        console.warn('No nodes found near', lat, lng);
        return null;
    }
    
    // Find closest node
    let minDist = Infinity;
    let closestNodeId = null;
    
    for (const candidate of candidates) {
        const dx = candidate.lng - lng;
        const dy = candidate.lat - lat;
        const dist = dx * dx + dy * dy;
        
        if (dist < minDist) {
            minDist = dist;
            closestNodeId = candidate.nodeId;
        }
    }
    
    return closestNodeId;
}

/**
 * Calculate route between source and target coordinates.
 * Uses the current mode's pathfinder.
 */
function calculateRoute() {
    const pathFinder = pathFinders[currentMode];
    
    if (!sourceCoordinates || !targetCoordinates || !pathFinder) {
        return null;
    }
    
    const startNodeId = findNearestNode(sourceCoordinates.lat, sourceCoordinates.lng);
    const endNodeId = findNearestNode(targetCoordinates.lat, targetCoordinates.lng);
    
    if (startNodeId === null || endNodeId === null) {
        console.warn('Could not find nodes for coordinates');
        return null;
    }
    
    console.log(`Finding path (${currentMode}) from node ${startNodeId} to ${endNodeId}`);
    
    const startTime = performance.now();
    const path = pathFinder.find(startNodeId, endNodeId);
    const elapsed = performance.now() - startTime;
    
    console.log(`Route found in ${elapsed.toFixed(2)}ms (${path.length} nodes)`);
    
    if (!path || path.length === 0) {
        return null;
    }
    
    // Convert path to Leaflet coordinates [[lat, lng], ...]
    const coords = path.map(node => [node.data.y, node.data.x]);
    
    // Calculate total distance using Haversine formula
    let totalDistance = 0;
    for (let i = 1; i < path.length; i++) {
        const prev = path[i - 1].data;
        const curr = path[i].data;
        totalDistance += haversineDistance(prev.y, prev.x, curr.y, curr.x);
    }
    
    return { coords, distance: totalDistance };
}

/**
 * Haversine formula for accurate geographic distance.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + 
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Main routing function - called when source or target changes.
 */
function mapRoute() {
    // Clear existing route
    if (polyLineGroup) {
        map.removeLayer(polyLineGroup);
        polyLineGroup.clearLayers();
    }
    
    if (!sourceCoordinates || !targetCoordinates) {
        return;
    }
    
    const result = calculateRoute();
    
    if (!result) {
        info.update(false);
        return;
    }
    
    // Create polyline group for gradient effect
    polyLineGroup = L.layerGroup();
    
    polyLineStyles.forEach(style => {
        const polyline = new L.Polyline(result.coords, style);
        
        polyline.on('mouseover', function(e) {
            e.target.setStyle({ color: '#0c0a0b' });
        });
        
        polyline.on('mouseout', function(e) {
            e.target.setStyle(style);
        });
        
        polyline.on('click', function(e) {
            map.fitBounds(e.target.getBounds());
        });
        
        polyline.addTo(polyLineGroup);
    });
    
    polyLineGroup.addTo(map);
    
    // Update info panel with distance and mode indicator
    const modeLabel = currentMode === 'ebike' ? ' (e-bike)' : ' (all roads)';
    info.update(result.distance.toFixed(2) + modeLabel);
}

/**
 * Toggle prohibited roads layer (lazy loading).
 */
async function toggleProhibitedRoads() {
    if (prohibitedLayer) {
        if (map.hasLayer(prohibitedLayer)) {
            map.removeLayer(prohibitedLayer);
            prohibitedToggle.classList.remove('active');
            prohibitedToggle.querySelector('.toggle-text').textContent = 'Show Prohibited Roads';
        } else {
            map.addLayer(prohibitedLayer);
            prohibitedToggle.classList.add('active');
            prohibitedToggle.querySelector('.toggle-text').textContent = 'Hide Prohibited Roads';
        }
        return;
    }
    
    prohibitedToggle.disabled = true;
    prohibitedToggle.classList.add('loading');
    prohibitedToggle.querySelector('.toggle-text').textContent = 'Loading...';
    
    try {
        const response = await fetch('static/data/prohibited-roads.geojson');
        if (!response.ok) throw new Error('Failed to load');
        
        const geojson = await response.json();
        
        prohibitedLayer = L.geoJSON(geojson, {
            style: {
                color: "#3d3d47",
                weight: 2,
                opacity: 0.8,
                smoothFactor: 2
            }
        });
        
        prohibitedLayer.addTo(map);
        prohibitedToggle.classList.add('active');
        prohibitedToggle.querySelector('.toggle-text').textContent = 'Hide Prohibited Roads';
        
    } catch (error) {
        console.error('Failed to load prohibited roads:', error);
        prohibitedToggle.querySelector('.toggle-text').textContent = 'Failed to load';
    } finally {
        prohibitedToggle.disabled = false;
        prohibitedToggle.classList.remove('loading');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
