/**
 * loadGraph.js - Async binary graph loader for Metro Manila routing
 * 
 * Loads binary graph data in the format used by ngraph.path.demo:
 * - .co.bin: Node coordinates as Int32Array [x0, y0, x1, y1, ...]
 * - .gr.bin: Edges as Int32Array [from0, to0, from1, to1, ...]
 * 
 * Node coordinates are stored as lat/lng * 1,000,000 for 6 decimal precision.
 * Edge indices are 1-indexed in the binary format (subtract 1 when using).
 */

/**
 * Load graph from binary files with progress updates.
 * 
 * @param {string} baseName - Base path/name for the .co.bin and .gr.bin files
 * @param {function} onProgress - Callback for progress updates: { message, percent }
 * @returns {Promise<{graph, points, graphBBox}>} Loaded graph data
 */
async function loadGraph(baseName, onProgress) {
    // Create ngraph instance (createGraph is the UMD global name)
    const graph = createGraph();
    const graphBBox = { 
        minX: Infinity, 
        minY: Infinity, 
        maxX: -Infinity, 
        maxY: -Infinity 
    };
    
    // 1. Load coordinates
    onProgress?.({ message: 'Loading node coordinates...', percent: 0 });
    const coordBuffer = await fetchBinary(
        `${baseName}.co.bin`, 
        (p) => onProgress?.({ message: 'Downloading coordinates...', percent: p * 30 })
    );
    const coords = new Int32Array(coordBuffer);
    
    // 2. Add nodes to graph
    onProgress?.({ message: 'Building node index...', percent: 30 });
    const points = []; // For QuadTree spatial index: [x0, y0, x1, y1, ...]
    const nodeCount = coords.length / 2;
    
    await asyncForEach(coords.length, 2, (i) => {
        const nodeId = Math.floor(i / 2);
        const x = coords[i];       // longitude * 1M
        const y = coords[i + 1];   // latitude * 1M
        
        // Convert back to lat/lng (stored as int * 1M)
        const lng = x / 1_000_000;
        const lat = y / 1_000_000;
        
        graph.addNode(nodeId, { x: lng, y: lat });
        points.push(lng, lat); // For QuadTree [x, y] order
        
        // Update bounding box
        graphBBox.minX = Math.min(graphBBox.minX, lng);
        graphBBox.maxX = Math.max(graphBBox.maxX, lng);
        graphBBox.minY = Math.min(graphBBox.minY, lat);
        graphBBox.maxY = Math.max(graphBBox.maxY, lat);
        
        if (i % 5000 === 0) {
            onProgress?.({ 
                message: `Building nodes (${((i/2)/nodeCount*100).toFixed(0)}%)...`, 
                percent: 30 + (i / coords.length) * 15 
            });
        }
    });
    
    // 3. Load edges
    onProgress?.({ message: 'Loading road network...', percent: 45 });
    const edgeBuffer = await fetchBinary(
        `${baseName}.gr.bin`,
        (p) => onProgress?.({ message: 'Downloading edges...', percent: 45 + p * 30 })
    );
    const edges = new Int32Array(edgeBuffer);
    
    // 4. Add edges to graph
    onProgress?.({ message: 'Building road connections...', percent: 75 });
    const edgeCount = edges.length / 2;
    
    await asyncForEach(edges.length, 2, (i) => {
        // Binary format uses 1-indexed IDs, convert to 0-indexed
        const fromId = edges[i] - 1;
        const toId = edges[i + 1] - 1;
        graph.addLink(fromId, toId);
        
        if (i % 10000 === 0) {
            onProgress?.({ 
                message: `Building edges (${((i/2)/edgeCount*100).toFixed(0)}%)...`, 
                percent: 75 + (i / edges.length) * 20 
            });
        }
    });
    
    onProgress?.({ message: 'Ready!', percent: 100 });
    
    console.log(`Graph loaded: ${graph.getNodesCount()} nodes, ${graph.getLinksCount()} edges`);
    console.log(`Bounding box: [${graphBBox.minX.toFixed(4)}, ${graphBBox.minY.toFixed(4)}] to [${graphBBox.maxX.toFixed(4)}, ${graphBBox.maxY.toFixed(4)}]`);
    
    return { graph, points, graphBBox };
}

/**
 * Fetch binary file with progress tracking.
 * 
 * @param {string} url - URL to fetch
 * @param {function} onProgress - Progress callback (0-1)
 * @returns {Promise<ArrayBuffer>} Binary data
 */
async function fetchBinary(url, onProgress) {
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    
    const reader = response.body.getReader();
    const contentLength = +response.headers.get('Content-Length');
    
    let receivedLength = 0;
    const chunks = [];
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        if (contentLength) {
            onProgress?.(receivedLength / contentLength);
        }
    }
    
    // Concatenate chunks into single ArrayBuffer
    const allBytes = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
        allBytes.set(chunk, position);
        position += chunk.length;
    }
    
    return allBytes.buffer;
}

/**
 * Async for-each with chunking to prevent UI freeze.
 * Yields to browser every 16ms (~60fps).
 * 
 * @param {number} length - Array length to iterate
 * @param {number} step - Step size per iteration
 * @param {function} callback - Called with current index
 * @returns {Promise<void>}
 */
function asyncForEach(length, step, callback) {
    return new Promise((resolve) => {
        let i = 0;
        
        function processChunk() {
            const startTime = performance.now();
            
            while (i < length) {
                callback(i);
                i += step;
                
                // Yield to browser every 16ms to maintain 60fps
                if (performance.now() - startTime > 16) {
                    setTimeout(processChunk, 0);
                    return;
                }
            }
            
            resolve();
        }
        
        processChunk();
    });
}
