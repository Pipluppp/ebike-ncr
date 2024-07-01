import heapq

def dijkstra(G, source, target):
    """
    Dijkstra shortest path single-source single-target,
    
    Returns
    -------
    parents: dictionary 
        Parents of each node

        Used by create_path to form the sequence of nodes forming the shortest path
    """
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

def create_path(nodes, parents, target):
    """
    Given the Dijkstra function output parents (dictionary of nodes' parent),
    return the list of coordinates of the shortest path/route

    Returns
    -------

    path: list
        A list of lists of the coordinates of each node forming the shortest path to target
    """

    v = target
    path = []
    while v is not None:
        coordinates = nodes.loc[v, ['y', 'x']].values.tolist()
        path.append(coordinates)
        v = parents[v]
    
    return path[::-1]