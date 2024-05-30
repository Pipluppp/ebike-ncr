from flask import Flask

import folium
import osmnx as ox
import networkx as nx

app = Flask(__name__)

with app.app_context():
    # Load graph and stuff before running the flask app
    G = ox.io.load_graphml(filepath="data/metro_drive.graphml")
    weight = "length"

@app.route("/")
def fullscreen():
    """Simple example of a fullscreen map."""
    m = folium.Map(
            location=[14.55515, 120.99169],
            zoom_start=11,
            tiles='cartodbdarkmatter',

            # Some sample limitations to limit dragging outside Metro Manila (zooming out still works unfortunately)
            min_lon = 120.8290, 
            max_lon = 121.2600,
            min_lat = 14.1679,
            max_lat = 14.9182,
            max_bounds=True,
        )

    # GeoJSON file for Metro Manila land boundary
    metro_data = open('data/metro.json').read()
    folium.GeoJson(
        metro_data,
        # for styling https://python-visualization.github.io/folium/latest/user_guide/geojson/geojson.html#Styling
        style_function=lambda feature: {
            "fillColor": "#e0e0ff",
            "weight": 0,
            "fillOpacity": 0.1
        },
    ).add_to(m)

    # Get a sample route
    orig = ox.nearest_nodes(G, 120.99169, 14.51015)
    dest = ox.nearest_nodes(G, 121.0643, 14.6548)

    route = nx.dijkstra_path(G, orig, dest, weight=weight)
    route_edges = ox.routing.route_to_gdf(G, route, weight=weight)

    style = {'color': '#98e3af'} # styling for the route line
    folium.GeoJson(route_edges, style_function=lambda x:style).add_to(m)

    # Primary roads remove overlay
    #style_prim = {'color': '#de437b'} # styling for the route line
    #edges = ox.graph_to_gdfs(G, nodes = False)
    #removed_edges = edges[(edges.highway != "motorway") & (edges.highway != "trunk") & (edges.highway != "primary")]
    #folium.GeoJson(removed_edges, style_function=lambda x:style_prim).add_to(m)
    
    return m.get_root().render()

if __name__ == "__main__":
    app.run(debug=False)