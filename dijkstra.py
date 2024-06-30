import heapq

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

def coordinate_path(nodes, route):
    """Given a list of OSM node IDs for the shortest path, return it as list of lists of the coordinates per node in the shortest path"""
    path = []
    filtered_nodes = nodes[nodes.index.isin(route)]
    coordinates = filtered_nodes[['y', 'x']]
    for node in route:
        path.append(coordinates.loc[node].values.tolist())
    return path