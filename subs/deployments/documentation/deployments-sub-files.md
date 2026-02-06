# Deployment Management Subdomain


deployments/
├── css/
│   ├── breadcrumbs.css           # Breadcrumb navigation styling
│   ├── builder.css               # Styles for deployment builder form and zones dashboard
│   ├── connection-builder.css    # Connection builder modal and source/connection panels
│   ├── graphs.css                # Styles for deployment graphs view (placeholder)
│   ├── historical.css            # Styles for historical deployments view (placeholder)
│   ├── main.css                  # Base styles, CSS variables, and landing page layout
│   ├── session.css               # Session-related pages and session history table
│   ├── shared.css                # Common styles used across deployment pages
│   ├── stats.css                 # Styles for deployment stats view (placeholder)
│   └── zone-detail.css           # Zone detail page, banners, stats cards, quick actions
├── documentation/
│   └── deployments-sub-files.md  # This file - project structure reference
├── index.html                    # Entry point HTML with header component and script imports
└── js/
    ├── app.js                    # Main entry point - initializes router with page handlers
    ├── components/
    │   └── builder/
    │       ├── ConnectionBuilder.js   # Connection topology editor with port-to-port linking
    │       ├── DeploymentForm.js      # Form component for creating new deployments with validation
    │       ├── SessionHistory.js      # Expandable session history table component
    │       ├── SessionStartModal.js   # Modal factory for session start confirmation
    │       ├── ZoneCards.js           # Clickable zone cards displaying item counts and session stats
    │       └── ZoneDetailView.js      # Zone detail layout with stats and quick actions
    ├── pages/
    │   ├── deployment-builder.js  # Create deployment page with active deployment check
    │   ├── deployment-session.js  # Active connection building session handler
    │   ├── deployment-zones.js    # Zone dashboard showing zone cards for a deployment
    │   ├── main.js                # Landing page with option cards for Builder, Historical, Graphs, Stats
    │   └── zone-detail.js         # Zone detail page with session management
    └── utils/
        ├── deployment-api.js      # API client for deployments, items, sessions, and connections
        ├── deployment-config.js   # Seasons, zones, statuses, validation rules, and helper functions
        └── router.js              # Client-side routing using Navigo


### ROUTES
```
/deployments                          → Landing page with 4 option cards
/deployments/builder                  → Create deployment form (redirects to zones if active deployment exists)
/deployments/:id/zones                → Zone dashboard for managing deployment zones
/deployments/:id/zones/:zone          → Zone detail with session management and stats
/deployments/:id/zones/:zone/session  → Active session with connection builder
/deployments/:id                      → Deployment detail (placeholder)
/deployments/historical               → Historical deployments (placeholder)
/deployments/graphs                   → Deployment graphs (placeholder)
/deployments/stats                    → Deployment stats (placeholder)
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
```


### CONNECTIONS
```
- Connections link items via port-to-port topology
- Flow: Select source item → Select source port → Select destination item → Confirm
- Connections tracked with: from_item_id, from_port, to_item_id, to_port
- Connections can be marked as "illuminates" for lighting relationships
```


### API FUNCTIONS (deployment-api.js)
```
Deployments:
  listDeployments()              → Get all deployments
  getDeployment(id, includeZones) → Get deployment by ID (optionally with zones)
  createDeployment(data)         → Create new deployment
  updateDeployment(id, data)     → Update existing deployment
  deleteDeployment(id)           → Delete deployment
  checkDeploymentExists(id)      → Check if deployment exists

Items:
  searchItems(query, limit)      → Search items by query string
  getItem(id)                    → Get item by ID

Sessions:
  createSession(zoneId, data)    → Start a new session in a zone
  endSession(sessionId)          → End an active session
  getSession(sessionId)          → Get session by ID
  getZoneSessions(zoneId)        → Get all sessions for a zone

Connections:
  getAvailablePorts(itemId)      → Get available ports for an item
  createConnection(sessionId, data) → Create a new connection
  removeConnection(connectionId) → Remove a connection
```


### NOTES
```
- Only one active (non-archived) deployment allowed at a time
- Deployment ID format: DEP-{SEASON_CODE}-{YEAR} (e.g., DEP-HAL-2025)
- Zones are predefined and immutable per deployment
- Builder page automatically redirects to zones dashboard if active deployment exists
- Breadcrumb navigation available on zone detail and session pages
- All API calls include debug logging prefixed with module name
- Error handling displays user-friendly toast notifications
```
