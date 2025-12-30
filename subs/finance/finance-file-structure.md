finance/
├── index.html                          # Single entry point
│
├── css/
│   ├── finance.css                     # Main styles (tabs, table, forms)
│   ├── cost-detail.css                 # Detail drawer/page styles
│   └── cost-form.css                   # Form-specific styles
│   └── new-cost-record.css             # Form-specific styles
│
└── js/
    ├── app.js                          # Router initialization
    │
    ├── utils/
    │   ├── finance-config.js           # Constants, validation, cost types
    │   ├── finance-api.js              # API client (GET, POST, PUT, DELETE)
    │   ├── state.js                    # URL state management
    │   └── router.js                   # Navigo router
    │
    ├── shared/
    │   ├── toast.js                    # Toast notifications
    │   └── modal.js                    # Confirmation modals
    │
    ├── components/
    │   ├── TabBar.js                   # Tabs: Records | Stats | (Future: Receipts)
    │   ├── CostRecordsTable.js         # TanStack Table implementation
    │   ├── CostDetailDrawer.js         # Slide-out drawer with View/Edit/Delete
    │   ├── CostFormFields.js           # Dynamic form field generator
    │   ├── CostFormRenderers.js           # Dynamic form field generator
    │   ├── CostReviewModal.js          # Review before submit
    │   └── StatsPanel.js               # Stats placeholder 
    │
    └── pages/
        └── finance-main.js             # Main page orchestration
        └── new-cost-record.js          # New Cost Form