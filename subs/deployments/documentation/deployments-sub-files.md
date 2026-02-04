# Deployment Management Subdomain


deployments/
├── css/
│   ├── builder.css                # Styles for deployment builder form and zones dashboard
│   ├── graphs.css                 # Styles for deployment graphs view (placeholder)
│   ├── historical.css             # Styles for historical deployments view (placeholder)
│   ├── main.css                   # Base styles, CSS variables, and landing page layout
│   ├── shared.css                 # Common styles used across deployment pages
│   └── stats.css                  # Styles for deployment stats view (placeholder)
├── documentation/
│   └── deployments-sub-files.md   # This file - project structure reference
├── index.html                     # Entry point HTML with header component and script imports
└── js/
    ├── api/                       # (Future) Dedicated API modules
    ├── app.js                     # Main entry point - initializes router with page handlers
    ├── components/
    │   └── builder/
    │       ├── DeploymentForm.js  # Form component for creating new deployments with validation
    │       └── ZoneCards.js       # Clickable zone cards displaying item counts and session stats
    ├── pages/
    │   ├── deployment-builder.js  # Create deployment page with active deployment check
    │   ├── deployment-zones.js    # Zone dashboard showing zone cards for a deployment
    │   └── main.js                # Landing page with option cards for Builder, Historical, Graphs, Stats
    └── utils/
        ├── deployment-api.js      # API client for deployment CRUD operations and item search
        ├── deployment-config.js   # Seasons, zones, statuses, validation rules, and helper functions
        └── router.js              # Client-side routing using Navigo


### ROUTES
```
/deployments              → Landing page with 4 option cards
/deployments/builder      → Create deployment form (redirects to zones if active deployment exists)
/deployments/:id/zones    → Zone dashboard for managing deployment zones
/deployments/:id          → Deployment detail (placeholder)
/deployments/historical   → Historical deployments (placeholder)
/deployments/graphs       → Deployment graphs (placeholder)
/deployments/stats        → Deployment stats (placeholder)
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


### NOTES
```
- Only one active (non-archived) deployment allowed at a time
- Deployment ID format: DEP-{SEASON_CODE}-{YEAR} (e.g., DEP-HAL-2025)
- Zones are predefined and immutable per deployment
- Builder page automatically redirects to zones dashboard if active deployment exists
```
