from flask import Flask, request, jsonify, render_template
from dijkstra import dijkstra, create_path
import osmnx as ox
import heapq
import json

app = Flask(__name__)

with app.app_context():
    """Loads the Network graph before receiving requests"""
    # Load graph and stuff before running the flask app
    G = ox.io.load_graphml(filepath="data/metro_graph_without_prohibited.graphml")
    prohibited_G = ox.io.load_graphml(filepath="data/metro_graph_prohibited.graphml")
    ncr_land_boundary = open('data/metro.json').read()
    weight = "length"


    # Load GeoDataFrame for prohibited roads
    nodes, edges = ox.graph_to_gdfs(G, edges = True)    
    prohibited_nodes, prohibited_edges = ox.graph_to_gdfs(prohibited_G, edges = True)
    prohibited_edges_geojson = json.loads(prohibited_edges.to_json())

@app.route('/')
def index():
    return render_template('index.html', prohibited_edges_geojson=json.dumps(prohibited_edges_geojson))

@app.route('/process_coords', methods=['POST'])
def process_coords():
    """Handles both source and destination coordinates and returns a path between them"""
    data = request.json
    sourceLat = data.get('sourceLat')
    sourceLng = data.get('sourceLng')
    targetLat = data.get('targetLat')
    targetLng = data.get('targetLng')

    # Get nearest nodes from the source and target
    source = ox.nearest_nodes(G, sourceLng, sourceLat)
    target = ox.nearest_nodes(G, targetLng, targetLat)

    # Run Dijkstra algorithm
    path_parents_nodes, length = dijkstra(G, source, target)
    path = create_path(nodes, path_parents_nodes, target)

    # Process the coordinates as needed
    response = {
        'message': 'Path calculated',
        'path': path,
        'length': length
    }
    return jsonify(response)    

if __name__ == '__main__':
    app.run()