"""
Export GraphML to binary format for ngraph.path consumption.

This script converts the OSMnx GraphML road network into a compact binary
format that can be efficiently loaded in the browser using TypedArrays.

Output Files:
- {output_prefix}.co.bin: Node coordinates (Int32 x,y pairs)
- {output_prefix}.gr.bin: Edge list (Int32 from,to pairs)

Binary Format (from ngraph.path.demo):
- Coordinates: [x0, y0, x1, y1, x2, y2, ...] as Int32Array
  Node index = array_position / 2
- Edges: [from0, to0, from1, to1, ...] as Int32Array  
  Each pair is a directed edge, using 1-indexed node IDs

Storage calculation: (V + E) × 8 bytes
For V nodes and E edges: size = V × 4 × 2 + E × 4 × 2
"""

import osmnx as ox
import struct
import os
from pathlib import Path


def export_graph_binary(input_path: str, output_prefix: str) -> dict:
    """
    Export GraphML to binary format for ngraph.path consumption.
    
    Args:
        input_path: Path to the GraphML file
        output_prefix: Output path prefix (without extension)
    
    Returns:
        Dictionary with export statistics
    """
    print(f"Loading graph from {input_path}...")
    G = ox.load_graphml(input_path)
    
    # Create node ID mapping (OSM ID → 0-indexed integer)
    node_list = list(G.nodes())
    node_id_to_idx = {osm_id: idx for idx, osm_id in enumerate(node_list)}
    
    print(f"Processing {len(node_list)} nodes...")
    
    # Export coordinates
    # Store lng (x) and lat (y) as integers multiplied by 1,000,000 for 6 decimal precision
    coords = []
    for osm_id in node_list:
        node = G.nodes[osm_id]
        # x = longitude, y = latitude in OSMnx
        x = int(node['x'] * 1_000_000)  # 6 decimal places
        y = int(node['y'] * 1_000_000)
        coords.extend([x, y])
    
    # Ensure output directory exists
    output_dir = Path(output_prefix).parent
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Write coordinates binary (little-endian int32)
    coord_path = f"{output_prefix}.co.bin"
    with open(coord_path, 'wb') as f:
        for val in coords:
            f.write(struct.pack('<i', val))
    
    print(f"Processing {G.number_of_edges()} edges...")
    
    # Export edges
    # The graph is a MultiDiGraph, so we iterate over all edges
    # ngraph uses 1-indexed IDs by convention (subtract 1 on client side)
    edges = []
    for u, v, _ in G.edges(data=True):
        # Add 1 for 1-indexed format expected by ngraph
        from_idx = node_id_to_idx[u] + 1
        to_idx = node_id_to_idx[v] + 1
        edges.extend([from_idx, to_idx])
    
    # Write edges binary
    edge_path = f"{output_prefix}.gr.bin"
    with open(edge_path, 'wb') as f:
        for val in edges:
            f.write(struct.pack('<i', val))
    
    # Calculate file sizes
    coord_size = os.path.getsize(coord_path)
    edge_size = os.path.getsize(edge_path)
    
    stats = {
        'nodes': len(node_list),
        'edges': len(edges) // 2,
        'coord_file_kb': coord_size / 1024,
        'edge_file_kb': edge_size / 1024,
        'total_kb': (coord_size + edge_size) / 1024
    }
    
    print(f"\n=== Export Complete ===")
    print(f"Nodes: {stats['nodes']:,}")
    print(f"Edges: {stats['edges']:,}")
    print(f"Coord file: {stats['coord_file_kb']:.1f} KB ({coord_path})")
    print(f"Edge file: {stats['edge_file_kb']:.1f} KB ({edge_path})")
    print(f"Total: {stats['total_kb']:.1f} KB ({stats['total_kb']/1024:.2f} MB)")
    
    return stats


if __name__ == "__main__":
    # Export the main road network (without prohibited roads)
    export_graph_binary(
        "data/metro_graph_without_prohibited.graphml",
        "static/data/metro-manila"
    )
