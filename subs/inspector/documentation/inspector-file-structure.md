inspector/
├── index.html                          # Single entry point
├── css/
│   ├── inspector.css                   # Main dashboard styles
│   ├── rule-detail.css                 # Rule detail page
│   ├── violation-reason.css                 # Rule detail page
│   ├── dismiss-modal-styles.css        # Dismiss detail styling
│   └── violation-detail.css            # Modal and item violations
└── js/
    ├── app.js                          # Main entry point
    ├── utils/
    │   ├── router.js                   # Navigo routing
    │   ├── inspector-api.js            # API client
    │   ├── inspector-config.js         # Constants and helpers
    │   ├── violation-helperjs          # helper for routing rule violations
    │   └── state.js                    # URL state management
    ├── shared/
    │   ├── toast.js                    # Toast notifications
    │   └── modal.js                    # Modal dialogs
    ├── components/
    │   ├── StatsBar.js                 # Stats display
    │   ├── DismissViolationModal.js    # Dismiss modal
    │   ├── TabBar.js                   # Tab navigation
    │   ├── RulesList.js                # Rules accordion
    │   ├── ViolationsTable.js          # Violations with infinite scroll
    │   ├── ItemViolationsView.js       # Item-grouped violations
    └── pages/
        ├── inspector-dashboard.js      # Dashboard orchestration
        └── rule-detail.js              # Rule detail page