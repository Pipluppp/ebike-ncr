from flask import Flask, request, jsonify, render_template
from dijkstra import dijkstra, create_path
import osmnx as ox
import heapq

app = Flask(__name__)

with app.app_context():
    """Loads the Network graph before receiving requests"""
    # Load graph and stuff before running the flask app
    G = ox.io.load_graphml(filepath="data/metro_drive.graphml")
    ncr_land_boundary = open('data/metro.json').read()
    weight = "length"

    # Load GeoDataFrame for prohibited roads
    nodes, edges = ox.graph_to_gdfs(G, edges = True)
    prohibited_roads = edges[(edges.highway == "motorway") | (edges.highway == "trunk") | (edges.highway == "primary")]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/process_coords', methods=['POST'])
def process_coords():
    """Handles both source and destination coordinates and returns a path between them"""
    data = request.json
    sourceLat = data.get('sourceLat')
    sourceLng = data.get('sourceLng')
    destLat = data.get('destLat')
    destLng = data.get('destLng')

    # Get nearest nodes from the source and target
    source = ox.nearest_nodes(G, sourceLng, sourceLat)
    target = ox.nearest_nodes(G, destLng, destLat)

    # Run Dijkstra algorithm
    path_parents_nodes = dijkstra(G, source, target)
    path = create_path(nodes, path_parents_nodes, target)

    # Process the coordinates as needed
    response = {
        'message': 'Path calculated',
        'path': path
    }
    return jsonify(response)    

if __name__ == '__main__':
    app.run()