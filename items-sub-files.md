// Item Management Subdomain


root/
├── items.html                          # Main items list page
├── item-detail.html                    # Item detail page
├── item-form.html                      # Create/Edit form page
│
├── js/
│   ├── router.js                       # Navigo router setup
│   │
│   ├── pages/
│   │   ├── items-list.js              # Items list orchestration
│   │   ├── item-detail.js             # Item detail orchestration
│   │   └── item-form.js               # Form orchestration (create/edit)
│   │
│   ├── components/
│   │   ├── ItemsTable.js              # Vanilla JS table component
│   │   ├── FilterBar.js               # Search + pill filters
│   │   ├── TabBar.js                  # Tab navigation component
│   │   ├── ItemDetailView.js          # Detail page layout
│   │   ├── ItemFormFields.js          # Dynamic form fields generator
│   │   └── PhotoUploader.js           # Photo upload component (reusable)
│   │
│   ├── api/
│   │   ├── items.js                   # Items CRUD operations
│   │   └── photos.js                  # Photo upload/management
│   │
│   ├── utils/
│   │   ├── state.js                   # URL state management
│   │   └── item-config.js               # CLASS_HIERARCHY, CLASS_TYPE_ATTRIBUTES
│   │
│   └── shared/
│       ├── modal.js                   # Confirmation modal (for delete)
│       └── toast.js                   # Toast notifications
│
└── css/
    ├── items.css                      # Items-specific styles
    └── shared.css                     # Shared component styles
    ├── item-detail.css                      # Items-specific styles
    └── item-form.css                     # Shared component styles
    