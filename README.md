# E-bike NCR Dijkstra routing

E-bike routing in NCR for shortest path

## TODO

- [ ] Create the set of edges from `metro_drive.graphml` corresponding to the banned roads
- [ ] **Map click as input**: logic for managing source and destination clicks, right click to choose if click is source or destination
    - Check if map click within Metro Manila
- [ ] **Form submission as input**: flask `GET` route, search engine, source and destination boxes 
- [ ] Explore [taxicab OSMnx](https://github.com/nathanrooy/taxicab) for exact routing


**Dynamic shortest path routes to destination clicked on map (fixed source)**

![demo](./ebike_ncr_demo.gif)

Barebones setup of a [leaflet-sidebar](https://github.com/Turbo87/leaflet-sidebar) (just copied the basic example and the `.css` and `.js` files)

![demo_sidebar](./leaflet_sidebar_demo.gif)
