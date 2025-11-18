 PHASE 1: Backend Lambda Development
Task 1.1: Set Up Lambda Layer with NetworkX

Create Lambda Layer with networkx library
Package dependencies: networkx, numpy (if needed)
Deploy layer to AWS
Files to create: lambda-layer/requirements.txt, build script

Task 1.2: Create Color Configuration Module

Create graph_config.py with color mappings
Define class type colors (REC, CRD, INF, PRP, etc.)
Define connection type colors (power, illuminates)
Define zone background colors
Make easily updatable for future Parameter Store migration
Files to create: graph_config.py

Task 1.3: Create Graph Visualization Lambda

Create new Lambda function: graph-visualization.py
Set up API Gateway endpoint: GET /admin/deployments/{id}/visualization
Add query parameters support: ?type=network|tree&zone=...
Files to create: graph-visualization.py

Task 1.4: Implement Data Fetching Layer
python# Functions to build:
- batch_get_items(table, item_ids)        # Batch DynamoDB fetch
- get_deployment_connections(deployment)   # Extract all connections
- get_unique_items_from_connections()      # Get unique item IDs
- enrich_connections_with_items()          # Add item details to connections

Add to: graph-visualization.py

Task 1.5: Build Graph Data Structure
python# Functions to build:
- build_graph_structure(connections, items)  # Create nodes & edges lists
- classify_connection_type(connection)       # power vs illuminates
- calculate_node_metadata(node, connections) # in/out degree, ports
- add_class_acronyms(nodes)                  # REC, INF, CRD, etc.

Add to: graph-visualization.py

Task 1.6: Implement Network Layout Algorithm
python# Functions to build:
- calculate_network_layout(nodes, edges, zones)
  - Use networkx.spring_layout()
  - Apply zone constraints (group nodes by zone)
  - Position receptacles toward top
  - Scale coordinates to viewport
  - Return nodes with x,y positions

- create_zone_regions(nodes, zones)
  - Calculate bounding boxes for each zone
  - Return zone region metadata

Add to: graph-visualization.py

Task 1.7: Implement Tree Layout Algorithm
python# Functions to build:
- calculate_tree_layout(nodes, edges, zones)
  - Build 3 separate trees (one per receptacle/zone)
  - Use Reingold-Tilford algorithm via networkx
  - Stack trees vertically
  - Calculate curved paths for "illuminates" edges
  - Return nodes with x,y positions and edge paths

- build_hierarchical_tree(receptacle_id, connections)
  - Create tree from receptacle downward
  - Calculate depth levels

Add to: graph-visualization.py

Task 1.8: Add Visual Property Calculations
python# Functions to build:
- assign_node_colors(nodes, color_config)
- assign_node_sizes(nodes)  # Based on connection count
- assign_edge_styles(edges, color_config)  # Solid/dashed, colors
- calculate_viewport_bounds(nodes)

Add to: graph-visualization.py

Task 1.9: Build Response Formatter
python# Functions to build:
- format_visualization_response(deployment, graph_data, viz_type)
  - Return structure as defined in workflow
  - Include nodes, edges, zones, bounds, statistics
  
- handle_empty_deployment()  # Friendly message for no connections

Add to: graph-visualization.py

Task 1.10: Lambda Testing

Test with real deployment data
Test both network and tree types
Test zone filtering
Test empty deployments
Verify response structure matches spec
Create: Test events in test-events/ directory

 PHASE 2: Frontend React Components
Task 2.1: Update API Layer
javascript// Add to api.js:
- listCompletedDeployments()
- getVisualization(deploymentId, type, zone)
```
- **File to update:** `api.js`

#### **Task 2.2: Create Component Structure**
Create React component files:
```
graph-view/
├── GraphView.jsx              
├── DeploymentSelector.jsx     
├── GraphControls.jsx          
├── NetworkGraphRenderer.jsx   
├── TreeGraphRenderer.jsx      
├── Legend.jsx                 
├── NodeTooltip.jsx           
└── graph-styles.css

Files to create: All 7 files above

Task 2.3: Build GraphView.jsx (Main Container)
javascript// Responsibilities:
- Fetch completed deployments on mount
- Manage selected deployment state
- Manage view type state (network/tree)
- Fetch visualization data from API
- Render DeploymentSelector, GraphControls, and appropriate renderer
- Handle loading/error states

File to create: graph-view/GraphView.jsx

Task 2.4: Build DeploymentSelector.jsx
javascript// Responsibilities:
- Dropdown showing completed deployments
- Display: "{deployment_id} - {season} {year}"
- Handle selection change
- Default to most recent deployment

File to create: graph-view/DeploymentSelector.jsx

Task 2.5: Build GraphControls.jsx
javascript// Responsibilities:
- Toggle buttons: "Network View" | "Tree View"
- Zoom controls: + and - buttons
- Reset view button
- Toggle legend button

File to create: graph-view/GraphControls.jsx

Task 2.6: Build Legend.jsx
javascript// Responsibilities:
- Display class type acronyms with colors
- Show connection type indicators (solid=power, dashed=illuminates)
- Collapsible panel
- Position: bottom-right or side panel

File to create: graph-view/Legend.jsx

Task 2.7: Build NodeTooltip.jsx
javascript// Responsibilities:
- Display on node hover
- Show: short_name, ID, class_type, zone
- Show: connection counts, available ports
- Position near cursor/node

File to create: graph-view/NodeTooltip.jsx

Task 2.8: Build NetworkGraphRenderer.jsx
javascript// Responsibilities:
- Render SVG-based network graph
- Use D3 for zoom/pan behavior ONLY (not layout)
- Render nodes using pre-calculated x,y positions
- Render edges as lines
- Render zone background regions
- Handle mouse events (hover, click)
- Apply colors/styles from API data

// D3 usage:
- d3.select() for DOM manipulation
- d3.zoom() for zoom/pan
- No force simulation or layout calculation

File to create: graph-view/NetworkGraphRenderer.jsx

Task 2.9: Build TreeGraphRenderer.jsx
javascript// Responsibilities:
- Render SVG-based tree graph
- 3 trees stacked vertically
- Use D3 for zoom/pan behavior ONLY
- Render nodes using pre-calculated x,y positions
- Render edges using pre-calculated paths
- Show curved "illuminates" connections
- Handle mouse events (hover, click)
- Apply colors/styles from API data

File to create: graph-view/TreeGraphRenderer.jsx

Task 2.10: Create Styles

// graph-styles.css:
- Node styles (circles, labels)
- Edge styles (lines, curves)
- Zone region styles
- Control button styles
- Legend styles
- Tooltip styles
- Responsive considerations
```
- **File to create:** `graph-view/graph-styles.css`

---

### 🔗 PHASE 3: Integration

#### **Task 3.1: Mount React Component in Graph View**
- Update `index.html` or main HTML to include graph view container
- Add script tag for React graph component bundle
- Ensure Tailwind classes work with new components
- **Files to update:** `index.html`, potentially build config

#### **Task 3.2: Update Navigation**
- Ensure "Graph" tab properly shows/hides graph view
- Test navigation between tabs
- **Files to update:** `app.js` (navigation logic)

#### **Task 3.3: API Gateway Configuration**
- Add new route: `GET /admin/deployments/{id}/visualization`
- Connect to Lambda
- Add CORS configuration
- Test endpoint manually
- **AWS Console:** API Gateway configuration

#### **Task 3.4: End-to-End Testing**
- Test deployment selection flow
- Test network view rendering
- Test tree view rendering
- Test zoom/pan functionality
- Test tooltips
- Test legend
- Test empty deployments
- Test with various deployment sizes

---

### 🎯 PHASE 4: Refinement & Decision

#### **Task 4.1: Compare Visualizations**
- Generate both network and tree views for same deployment
- Evaluate usability, clarity, performance
- Document pros/cons of each
- **Decision point:** Keep both or choose one as primary

#### **Task 4.2: Performance Optimization**
- Measure lambda execution time
- Optimize if needed (caching, algorithm tuning)
- Test with large deployments (50+ items)

#### **Task 4.3: Visual Polish**
- Adjust colors if needed (update `graph_config.py`)
- Fine-tune spacing, sizes
- Improve label readability
- Test on mobile/tablet

#### **Task 4.4: Add to Historical View (Future)**
- Add "View Graph" button in historical deployments modal
- Link directly to graph view with selected deployment
- **Files to update:** `historical_deploy_view.js`

---

## 📝 Current State Checklist

When starting a new chat, provide this checklist of what's been completed:
```
PHASE 1: Backend Lambda
[ ] Task 1.1: Lambda Layer with NetworkX
[ ] Task 1.2: Color Configuration Module
[ ] Task 1.3: Lambda Function Created
[ ] Task 1.4: Data Fetching Layer
[ ] Task 1.5: Graph Data Structure
[ ] Task 1.6: Network Layout Algorithm
[ ] Task 1.7: Tree Layout Algorithm
[ ] Task 1.8: Visual Property Calculations
[ ] Task 1.9: Response Formatter
[ ] Task 1.10: Lambda Testing

PHASE 2: Frontend Components
[ ] Task 2.1: API Layer Updates
[ ] Task 2.2: Component Structure
[ ] Task 2.3: GraphView.jsx
[ ] Task 2.4: DeploymentSelector.jsx
[ ] Task 2.5: GraphControls.jsx
[ ] Task 2.6: Legend.jsx
[ ] Task 2.7: NodeTooltip.jsx
[ ] Task 2.8: NetworkGraphRenderer.jsx
[ ] Task 2.9: TreeGraphRenderer.jsx
[ ] Task 2.10: Styles

PHASE 3: Integration
[ ] Task 3.1: Mount React Component
[ ] Task 3.2: Update Navigation
[ ] Task 3.3: API Gateway Config
[ ] Task 3.4: End-to-End Testing

PHASE 4: Refinement
[ ] Task 4.1: Compare Visualizations
[ ] Task 4.2: Performance Optimization
[ ] Task 4.3: Visual Polish
[ ] Task 4.4: Link from Historical View