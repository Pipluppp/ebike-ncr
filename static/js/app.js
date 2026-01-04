/**
 * app.js - Metro Manila E-Bike Routing (Client-Side)
 * 
 * Main application logic integrating:
 * - ngraph.graph for graph data structure
 * - ngraph.path (NBA*) for pathfinding
 * - Simple grid-based spatial index for click-to-node mapping
 * - Leaflet for map visualization
 */

// Global state
let graph = null;
let pathFinder = null;
let spatialIndex = null;  // Simple grid-based index
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
 * Initialize the application.
 */
async function init() {
    try {
        // Load graph with progress updates
        const result = await loadGraph('static/data/metro-manila', updateProgress);
        graph = result.graph;
        const points = result.points;
        
        // Initialize pathfinder using NBA* (optimal bi-directional A*)
        updateProgress({ message: 'Initializing pathfinder...', percent: 94 });
        pathFinder = ngraphPath.nba(graph, {
            distance(fromNode, toNode, link) {
                // Euclidean distance as edge weight
                const dx = fromNode.data.x - toNode.data.x;
                const dy = fromNode.data.y - toNode.data.y;
                return Math.sqrt(dx * dx + dy * dy);
            },
            heuristic(fromNode, toNode) {
                // A* heuristic: straight-line distance to goal
                const dx = fromNode.data.x - toNode.data.x;
                const dy = fromNode.data.y - toNode.data.y;
                return Math.sqrt(dx * dx + dy * dy);
            }
        });
        
        // Build simple grid-based spatial index
        updateProgress({ message: 'Building spatial index...', percent: 96 });
        spatialIndex = new GridSpatialIndex(0.005);  // ~500m cells
        
        const nodeCount = points.length / 2;
        for (let i = 0; i < points.length; i += 2) {
            const nodeId = i / 2;
            const lng = points[i];
            const lat = points[i + 1];
            spatialIndex.add(nodeId, lng, lat);
            
            if (i % 10000 === 0) {
                updateProgress({ 
                    message: `Building spatial index (${Math.round((i/2)/nodeCount*100)}%)...`, 
                    percent: 96 + (i / points.length) * 4 
                });
                // Yield to UI
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        updateProgress({ message: 'Ready!', percent: 100 });
        
        // Brief delay to show "Ready!" message
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Hide loading overlay with fade
        loadingOverlay.style.opacity = '0';
        loadingOverlay.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 300);
        
        console.log(`Application ready: ${graph.getNodesCount()} nodes, ${graph.getLinksCount()} edges`);
        
    } catch (error) {
        console.error('Failed to initialize:', error);
        loadingMessage.textContent = `Error: ${error.message}`;
        loadingProgress.style.background = '#ff4444';
    }
}

/**
 * Update loading progress UI.
 */
function updateProgress({ message, percent }) {
    if (loadingMessage) loadingMessage.textContent = message;
    if (loadingProgress) loadingProgress.style.width = `${percent}%`;
}

/**
 * Find the nearest graph node to a lat/lng coordinate.
 * Uses simple grid-based spatial index for efficient lookup.
 * 
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {number|null} Node ID or null if not found
 */
function findNearestNode(lat, lng) {
    if (!spatialIndex || !graph) return null;
    
    // Search with expanding radius
    let radiusCells = 1;
    let candidates = spatialIndex.findNear(lng, lat, radiusCells);
    
    // Expand search if nothing found
    while (candidates.length === 0 && radiusCells < 20) {
        radiusCells++;
        candidates = spatialIndex.findNear(lng, lat, radiusCells);
    }
    
    if (candidates.length === 0) {
        console.warn('No nodes found near', lat, lng);
        return null;
    }
    
    // Find closest node among candidates
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
 * 
 * @returns {Object|null} { coords: [[lat, lng], ...], distance: km } or null
 */
function calculateRoute() {
    if (!sourceCoordinates || !targetCoordinates || !pathFinder) {
        return null;
    }
    
    const startNodeId = findNearestNode(sourceCoordinates.lat, sourceCoordinates.lng);
    const endNodeId = findNearestNode(targetCoordinates.lat, targetCoordinates.lng);
    
    if (startNodeId === null || endNodeId === null) {
        console.warn('Could not find nodes for coordinates');
        return null;
    }
    
    console.log(`Finding path from node ${startNodeId} to ${endNodeId}`);
    
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
 * 
 * @param {number} lat1, lon1 - First point
 * @param {number} lat2, lon2 - Second point
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + 
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Main routing function - called when source or target changes.
 * Replaces the original fetch('/process_coords') call.
 */
function mapRoute() {
    // Clear existing route
    if (polyLineGroup) {
        map.removeLayer(polyLineGroup);
        polyLineGroup.clearLayers();
    }
    
    // Only calculate when both coordinates are set
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
        
        // Hover effects
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
    
    // Update info panel with distance
    info.update(result.distance.toFixed(2));
}

/**
 * Toggle prohibited roads layer (lazy loading).
 */
async function toggleProhibitedRoads() {
    if (prohibitedLayer) {
        // Layer already loaded, just toggle visibility
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
    
    // First time: load the GeoJSON
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
