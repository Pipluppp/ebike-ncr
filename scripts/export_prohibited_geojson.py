"""
Export prohibited roads as GeoJSON for optional client-side display.

This script converts the prohibited roads GraphML to a simplified GeoJSON
file that can be lazy-loaded when the user enables the toggle.

The output is minified and stripped of unnecessary properties to reduce
file size for faster network transfer.
"""

import osmnx as ox
import json
import os
from pathlib import Path


def export_prohibited_geojson(input_path: str, output_path: str) -> dict:
    """
    Export prohibited roads as simplified GeoJSON.
    
    Args:
        input_path: Path to the prohibited roads GraphML file
        output_path: Path to output GeoJSON file
    
    Returns:
        Dictionary with export statistics
    """
    print(f"Loading prohibited roads from {input_path}...")
    G = ox.load_graphml(input_path)
    
    print("Converting to GeoDataFrame...")
    edges = ox.graph_to_gdfs(G, nodes=False, edges=True)
    
    print(f"Processing {len(edges)} road segments...")
    
    # Convert to GeoJSON
    geojson = json.loads(edges.to_json())
    
    # Simplify properties to reduce file size
    # Keep only essential properties for display
    for feature in geojson['features']:
        props = feature.get('properties', {})
        # Keep only name and highway type for potential tooltips
        feature['properties'] = {
            'name': props.get('name', ''),
            'highway': props.get('highway', '')
        }
    
    # Ensure output directory exists
    output_dir = Path(output_path).parent
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Write minified JSON (no whitespace)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, separators=(',', ':'))
    
    file_size = os.path.getsize(output_path)
    
    stats = {
        'features': len(geojson['features']),
        'file_size_kb': file_size / 1024,
        'file_size_mb': file_size / (1024 * 1024)
    }
    
    print(f"\n=== Export Complete ===")
    print(f"Road segments: {stats['features']:,}")
    print(f"File size: {stats['file_size_kb']:.1f} KB ({stats['file_size_mb']:.2f} MB)")
    print(f"Output: {output_path}")
    
    return stats


if __name__ == "__main__":
    export_prohibited_geojson(
        "data/metro_graph_prohibited.graphml",
        "static/data/prohibited-roads.geojson"
    )
