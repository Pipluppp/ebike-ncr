"""
Export merged graph (all roads including prohibited) to binary format.

This script:
1. Loads both GraphML files (without_prohibited + prohibited)
2. Merges them into a single complete road network
3. Exports as binary format for browser consumption

The output files allow routing on ALL roads (ignoring e-bike restrictions).
"""

import osmnx as ox
import networkx as nx
import struct
import os
from pathlib import Path


def merge_and_export_graph(
    main_graph_path: str,
    prohibited_graph_path: str, 
    output_prefix: str
) -> dict:
    """
    Merge two GraphML files and export as binary.
    
    Args:
        main_graph_path: Path to main road network (without prohibited)
        prohibited_graph_path: Path to prohibited roads only
        output_prefix: Output path prefix (without extension)
    
    Returns:
        Dictionary with export statistics
    """
    print(f"Loading main graph from {main_graph_path}...")
    G_main = ox.load_graphml(main_graph_path)
    print(f"  Nodes: {G_main.number_of_nodes()}, Edges: {G_main.number_of_edges()}")
    
    print(f"Loading prohibited graph from {prohibited_graph_path}...")
    G_prohibited = ox.load_graphml(prohibited_graph_path)
    print(f"  Nodes: {G_prohibited.number_of_nodes()}, Edges: {G_prohibited.number_of_edges()}")
    
    # Merge graphs using NetworkX compose
    print("Merging graphs...")
    G_merged = nx.compose(G_main, G_prohibited)
    print(f"  Merged: Nodes: {G_merged.number_of_nodes()}, Edges: {G_merged.number_of_edges()}")
    
    # Create node ID mapping (OSM ID → 0-indexed integer)
    node_list = list(G_merged.nodes())
    node_id_to_idx = {osm_id: idx for idx, osm_id in enumerate(node_list)}
    
    print(f"Processing {len(node_list)} nodes...")
    
    # Export coordinates
    coords = []
    for osm_id in node_list:
        node = G_merged.nodes[osm_id]
        x = int(node['x'] * 1_000_000)
        y = int(node['y'] * 1_000_000)
        coords.extend([x, y])
    
    # Ensure output directory exists
    output_dir = Path(output_prefix).parent
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Write coordinates binary
    coord_path = f"{output_prefix}.co.bin"
    with open(coord_path, 'wb') as f:
        for val in coords:
            f.write(struct.pack('<i', val))
    
    print(f"Processing {G_merged.number_of_edges()} edges...")
    
    # Export edges
    edges = []
    for u, v, _ in G_merged.edges(data=True):
        from_idx = node_id_to_idx[u] + 1  # 1-indexed
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
    merge_and_export_graph(
        "data/metro_graph_without_prohibited.graphml",
        "data/metro_graph_prohibited.graphml",
        "static/data/metro-manila-full"
    )
