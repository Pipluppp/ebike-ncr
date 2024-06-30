from flask import Flask, request, jsonify, render_template
from dijkstra import dijkstra, make_path, coordinate_path
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
    return render_template('index_sidebar_test.html')

@app.route('/process_coords', methods=['POST'])
def process_coords():
    """The fetch function in index.html is triggered onMapClick, it then passes the data to this route"""
    data = request.json
    lat = data.get('lat')
    lon = data.get('lon')

    # Get nearest nodes from the source and target
    source = ox.nearest_nodes(G, 120.99105, 14.50590)
    target = ox.nearest_nodes(G, lon, lat)

    # Run Dijkstra algorithm
    shortest_path = dijkstra(G, source, target)

    # Output of Dijkstra is just the target node, create the path of node IDs from source to target
    route = make_path(shortest_path, target)

    # LeafletJS requires a list of the coordinates of each node: converts list of nodes to list of coordinates
    path = coordinate_path(nodes, route)

    # Process the coordinates as needed
    response = {
        'message': 'Coordinates received',
        'lat': lat,
        'lon': lon,
        'path': path
    }
    return jsonify(response)    

if __name__ == '__main__':
    app.run()
