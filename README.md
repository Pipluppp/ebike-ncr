# E-bike NCR Dijkstra 

A Dijkstra shortest path routing application for the Metro Manila road network which avoids the e-bike prohibited roads from [MMDA Regulation No. 24-022 series of 2024](https://mmda.gov.ph/100-news/news-2024/7256-february-19-2024-mmda-prohibits-e-vehicles-on-national-roads-penalties-for-violators-set.html). 

## Metro Manila road network graph

The graph of nodes and edges forming the Metro Manila driveable road network is taken from [OpenStreetMap](https://github.com/openstreetmap). Simplified and manually cleaned to remove the prohibited road edges where e-bike are prohibited through [OSMnx](https://osmnx.readthedocs.io/en/stable/).

The graph is a [MultiDiGraph](https://networkx.org/documentation/stable/reference/classes/multidigraph.html) and then stored as a `.graphml` file. It contains 59,0555 nodes and 148,676 edges

## Interactive map and drawing shortest paths

An interactive map of the Metro Manila region is served using [LeafletJS](https://leafletjs.com/), and from user destination inputs the shortest path is calculated and drawn dynamically on the map. 

## Dijkstra algorithm

The e-bike routing is a single-source single-target shortest path problem. The specific implementation is a Dijkstra without Decrease-Key operation using binary heaps from the python library `heapq`. See [Lewis (2023)](https://arxiv.org/abs/2303.10034) for runtime comparisons with other implementations. 