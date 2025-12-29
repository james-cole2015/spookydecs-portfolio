maintenance-records/
├── index.html                           # Main index
├── config.json                          # API endpoints configuration
│
├── css/
│   ├── main.css                         # Main styles
│   ├── table.css                        # Table styles
│   ├── filters.css                      # Filter bar styles
│   ├── detail.css                       # Detail view styles
│   ├── toast.css                        # Toast notification styles
│   ├── form.css                         # Form styles
│   ├── photo-gallery.css                # Photo gallery styles
│   └── schedules.css                    # Schedule template styles
│   └── inspection-form.css              # Schedule template styles

│
└── js/
    ├── main.js                          # App initialization
    ├── router.js                        # Schedule routes added
    ├── state.js                         # Schedule state management
    ├── api.js                           # Records & items only
    ├── scheduleApi.js                   # Schedule template API
    │
    ├── utils/
    │   ├── helpers.js                   # General utilities
    │   ├── formatters.js                # Data formatting functions
    │   ├── toast.js                     # Toast notifications
    │   └── scheduleHelpers.js           # Schedule-specific utilities
    │
    └── components/
        ├── MainTable.js                 # "Maintenance Schedules" button
        ├── RecordDetail.js              # Record detail view
        ├── ItemDetail.js                # Item detail view
        ├── RecordForm.js                # Record create/edit form
        ├── StatsCards.js                # Stats display
        ├── Tabs.js                      # Tab navigation
        ├── Filters.js                   # Filter components
        ├── PerformInspectionForm.js     # Photo gallery
        ├── PhotoSwipeGallery.js         # Photo gallery
        └── inspection/                     )
            ├── InspectionTaskManager.js # Task Manager for Inspections
            └── InspectionFormSubmit.js. # Form Submit
        ├── PhotoCarousel.js             # Photo carousel
        ├── PhotoUpload.js               # Photo upload
        │
        ├── SchedulesTable.js            # Template list view
        ├── ScheduleForm.js              # Template create/edit
        ├── ScheduleDetail.js            # Template detail view
        │
        └── form/
            ├── ItemSelector.js          # Item search/select
            ├── MaterialsList.js         # Materials editor
            └── ExistingPhotos.js        # Photo management

backend/
└── maintenance_schedule_handler.py    # NEW - Template CRUD Lambda
└── applyTemplatesToItems.py           # NEW - Template CRUD Lambda
└── sync_maintenance_to_items.py       # Adds record_ids to maintenance.generation_ids
└── retirement_cleanup.py              # changes item.status to Retired
