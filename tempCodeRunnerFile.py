@app.route('/process_coords', methods=['POST'])
def process_coords():
    """The fetch function in index.html is triggered onMapClick, it then passes the data to this route"""
    data = request.json
    lat = data.get('lat')
    lon = data.get('lon')

    # Get nearest nodes from the source and target
    source = ox.nearest_nodes(G, 121.04437, 14.58182) # 120.99105, 14.50590
    target = ox.nearest_nodes(G, lon, lat)

    # Run Dijkstra algorithm
    path_parents_nodes = dijkstra(G, source, target)
    path = create_path(nodes, path_parents_nodes, target)

    # Process the coordinates as needed
    response = {
        'message': 'Coordinates received',
        'lat': lat,
        'lon': lon,
        'path': path
    }
    return jsonify(response)   