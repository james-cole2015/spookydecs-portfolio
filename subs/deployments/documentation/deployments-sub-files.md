# Deployment Management Subdomain


deployments/
├── .github/
│   └── workflows/
│       └── deploy-dev-deployments.yml  # CI/CD workflow for dev deployment
├── css/
│   ├── breadcrumbs.css           # Breadcrumb navigation styling
│   ├── builder.css               # Styles for deployment builder form and zones dashboard
│   ├── complete.css              # Deployment complete/review page styles
│   ├── connection-builder.css    # Connection builder modal and source/connection panels
│   ├── connection-detail.css     # Connection detail page layout and flow diagram
│   ├── graphs.css                # Styles for deployment graphs view (placeholder)
│   ├── historical.css            # Styles for historical deployments view
│   ├── main.css                  # Base styles, CSS variables, and landing page layout
│   ├── session.css               # Session-related pages and session history table
│   ├── session-detail.css        # Session detail page layout, metadata, and items grid
│   ├── shared.css                # Common styles used across deployment pages
│   ├── staging.css               # Staging area page layout, tote cards, and breadcrumb
│   ├── stats.css                 # Styles for deployment stats overview and detail views
│   ├── teardown.css              # Deployment teardown page styles
│   ├── zone-detail.css           # Zone detail page, banners, stats cards, quick actions
│   └── zone-detail-items-drawer.css  # Zone items drawer slide-out panel styles
├── documentation/
│   ├── deployment-metadata.json  # Example deployment metadata schema
│   ├── deployment-zone.json      # Example deployment zone schema
│   └── deployments-sub-files.md  # This file - project structure reference
├── index.html                    # Entry point HTML with header component and script imports
└── js/
    ├── app.js                    # Main entry point - initializes router with page handlers
    ├── components/
    │   ├── builder/
    │   │   ├── ConnectionBuilder.js     # Connection topology editor with port-to-port linking
    │   │   ├── ConnectionDetailView.js  # Connection detail layout with flow diagram, items, and metadata
    │   │   ├── ConnectionModal.js       # Modal for selecting port and destination to create a connection
    │   │   ├── ConnectionsList.js       # Renders list of active connections with remove buttons
    │   │   ├── DeploymentCompleteView.js # Review UI for completing a deployment with zone sections and item cards
    │   │   ├── DeploymentForm.js        # Form component for creating new deployments with validation
    │   │   ├── EligibleItemCard.js      # Single card component for a source item in the connection builder
    │   │   ├── EndSessionReview.js      # End session review modal with photo management
    │   │   ├── SessionDetailView.js     # Session detail layout with metadata, items, and connections
    │   │   ├── SessionHistory.js        # Expandable session history table component
    │   │   ├── SessionStartModal.js     # Modal factory for session start confirmation
    │   │   ├── SourcesList.js           # Renders list of items with available ports for connections
    │   │   ├── StagingView.js           # Staging area view with tote selection and deployment staging
    │   │   ├── TeardownView.js          # Tabbed zone view listing deployed items with tear down buttons
    │   │   ├── ZoneCards.js             # Clickable zone cards displaying item counts and session stats
    │   │   ├── ZoneDetailView.js        # Zone detail layout with stats and quick actions
    │   │   └── ZoneItemsDrawer.js       # Side drawer showing all items deployed in a zone
    │   ├── historical/
    │   │   └── HistoricalView.js        # Rendering component for historical deployments (sidebar, detail panel, zone sections)
    │   └── stats/
    │       ├── StatsDetailView.js       # Intra-deployment stats drill-down with zone breakdown and efficiency metrics
    │       └── StatsView.js             # Inter-deployment stats overview with season filter
    ├── pages/
    │   ├── connection-detail.js   # Connection detail page with item photos and illuminates
    │   ├── deployment-builder.js  # Create deployment page with active deployment check
    │   ├── deployment-complete.js # Deployment complete/review page orchestration
    │   ├── deployment-historical.js # Historical deployments page with routing and data fetching
    │   ├── deployment-session.js  # Active connection building session handler
    │   ├── deployment-staging.js  # Staging page orchestration with tote loading and staging
    │   ├── deployment-stats.js    # Stats overview page listing all deployments with aggregate stats
    │   ├── deployment-stats-detail.js # Stats detail page for single deployment drill-down
    │   ├── deployment-teardown.js # Teardown page handler with zone hydration and item teardown
    │   ├── deployment-zones.js    # Zone dashboard showing zone cards for a deployment
    │   ├── main.js                # Landing page with option cards for Builder, Historical, Graphs, Stats
    │   ├── session-detail.js      # Session detail page with metadata, items, and connections
    │   └── zone-detail.js         # Zone detail page with session management
    └── utils/
        ├── deployment-api.js      # API client for deployments, items, sessions, connections, and images
        ├── deployment-config.js   # Seasons, zones, statuses, validation rules, and helper functions
        └── router.js              # Client-side routing using Navigo


### ROUTES
```
/deployments                          → Landing page with 4 option cards
/deployments/builder                  → Create deployment form (redirects to zones if active deployment exists)
/deployments/builder/:id/staging      → Staging area for selecting and staging totes
/deployments/builder/:id/zones        → Zone dashboard for managing deployment zones
/deployments/builder/:id/zones/complete → Deployment complete review page
/deployments/builder/:id/zones/:zone  → Zone detail with session management and stats
/deployments/builder/:id/zones/:zone/session   → Active session with connection builder
/deployments/builder/:id/zones/:zone/sessions/:sessionId → Session detail with metadata and connections
/deployments/builder/:deploymentId/:sessionId/:connectionId → Connection detail with flow diagram and items
/deployments/builder/:id/teardown     → Teardown page for removing deployed items
/deployments/:id                      → Deployment detail (placeholder)
/deployments/historical               → Historical deployments list with detail panel
/deployments/historical/:id           → Historical deployment detail (same page, URL-synced)
/deployments/graphs                   → Deployment graphs (placeholder)
/deployments/stats                    → Deployment stats overview with season filter
/deployments/stats/:id                → Deployment stats detail drill-down
```


### DEPLOYMENT STATUSES
```
pre-deployment   → Deployment created, setup not started
active_setup     → Currently setting up items in zones
completed        → Deployment is live and complete
active_teardown  → Currently removing items from zones
archived         → Deployment is finished and archived
```


### ZONES
```
FY → Front Yard (REC-FY-001)
BY → Back Yard (REC-BY-001)
SY → Side Yard (REC-SY-001)
```


### SESSIONS
```
- Sessions are work periods within a zone for setting up items/connections
- Active session: has start_time but no end_time
- Completed session: has both start_time and end_time
- Sessions track: items deployed, connections created, duration, notes
- Only one active session per zone at a time
- End session flow includes review modal with photo management
```


### CONNECTIONS
```
- Connections link items via port-to-port topology
- Flow: Select source item → Select source port → Select destination item → Confirm
- Connections tracked with: from_item_id, from_port, to_item_id, to_port
- Connections can be marked as "illuminates" for lighting relationships
- Connection detail page shows flow diagram, item cards with photos, and illuminated items
- Photos can be attached to connections during end-session review
```


### API FUNCTIONS (deployment-api.js)
```
Deployments:
  listDeployments(filters)                     → Get all deployments (optional season/year/status filters)
  getDeployment(id, include)                   → Get deployment by ID (optionally include zones)
  createDeployment(data)                       → Create new deployment
  updateDeployment(id, data)                   → Update existing deployment
  deleteDeployment(id)                         → Delete deployment
  checkDeploymentExists(season, year)          → Check if deployment exists for season/year
  completeDeployment(id)                       → Mark deployment as completed
  getItemsAdminUrl()                           → Get items admin URL from config

Historical:
  listHistoricalDeployments()                  → Get all historical (archived/completed) deployments
  getHistoricalDeployment(id)                  → Get historical deployment detail by ID

Items:
  searchItems(filters)                         → Search items with filters (season, class, connection_building, etc.)
  getItem(id)                                  → Get item by ID

Sessions:
  createSession(deploymentId, data)            → Start a new session in a deployment
  endSession(deploymentId, sessionId, data)    → End an active session with notes
  getSession(deploymentId, sessionId)          → Get session by ID
  getZoneSessions(deploymentId, zoneCode)      → Get all sessions for a zone
  getActiveSessions(deploymentId)              → Get all active sessions for a deployment

Connections:
  getAvailablePorts(deploymentId, zoneCode)    → Get available ports for items in a zone
  createConnection(deploymentId, data)         → Create a new connection
  removeConnection(deploymentId, connectionId) → Remove a connection
  updateConnection(deploymentId, connectionId, updates) → Update a connection (PATCH)
  updateConnectionPhotos(deploymentId, connectionId, photoIds) → Attach photos to a connection
  getConnection(deploymentId, sessionId, connectionId) → Get connection detail by ID
  getRemovedConnections(deploymentId, sessionId) → Get removed connections for a session

Staging:
  getStagingTotes(deploymentId)                  → Get totes available for staging
  stageTote(deploymentId, body)                  → Stage a tote for deployment

Teardown:
  apiTeardownStart(deploymentId)               → Start teardown process for a deployment
  apiTeardownItem(deploymentId, itemId)        → Tear down a single item
  apiTeardownComplete(deploymentId)            → Complete the teardown process

Images:
  fetchImageById(imageId)                      → Fetch image details (cloudfront_url) by ID
```


### NOTES
```
- Only one active (non-archived) deployment allowed at a time
- Deployment ID format: DEP-{SEASON_CODE}-{YEAR} (e.g., DEP-HAL-2025)
- Zones are predefined and immutable per deployment
- Builder page automatically redirects to zones dashboard if active deployment exists
- Breadcrumb navigation available on zone detail, session detail, and connection detail pages
- All API calls include debug logging prefixed with module name
- Error handling displays user-friendly toast notifications
- Route order matters: more specific routes must come before generic ones in app.js
- Item photos use class-specific placeholders for Light, Accessory, and Decoration classes
- Stats detail page destroys chart instances on navigation to avoid canvas reuse errors
```
