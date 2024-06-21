from flask import Flask, request, jsonify, render_template
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
    path = coordinate_path(route)

    # Process the coordinates as needed
    response = {
        'message': 'Coordinates received',
        'lat': lat,
        'lon': lon,
        'path': path
    }
    return jsonify(response)    

def dijkstra(G, source, target):
    visited = set()
    queue = [(0, source, None)]  # (tentative cost, vertex, parent)
    parents = {}
    
    while queue:
        vertex_cost, vertex, parent = heapq.heappop(queue)  # Get lowest cost vertex from the queue

        if vertex in visited:
            continue

        visited.add(vertex) # Consider vertex as visited
        parents[vertex] = parent
        
        # End algorithm when vertex visited is the goal node
        if vertex == target:
            break

        # Relax neighbor vertices of vertex
        for _, neighbor, edge_length in G.out_edges(vertex, data="length"):
            if neighbor in visited:
                continue

            # No need to check if new cost is an improvement, just add it to the queue; other costs will be disregarded later on
            neighbor_cost = vertex_cost + edge_length 
            heapq.heappush(queue, (neighbor_cost, neighbor, vertex))

    return parents

# Make path: list of node id's
def make_path(parent, goal):
    """Given the Dijkstra algorithm output, creates the list of OSM node IDs of the shortest path"""
    if goal not in parent:
        return None
    v = goal
    path = []
    while v is not None: # root has null parent
        path.append(v)
        v = parent[v]
    return path[::-1]

def coordinate_path(route):
    """Given a list of OSM node IDs for the shortest path, return it as list of lists of the coordinates per node in the shortest path"""
    path = []
    filtered_nodes = nodes[nodes.index.isin(route)]
    coordinates = filtered_nodes[['y', 'x']]
    for node in route:
        path.append(coordinates.loc[node].values.tolist())
    return path

if __name__ == '__main__':
    app.run()
