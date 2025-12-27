maintenance-records/
├── index.html                          # Updated with scheduleApi.js script tag
├── config.json                         # API endpoints configuration
│
├── css/
│   ├── main.css                        # Main styles
│   ├── table.css                       # Table styles
│   ├── filters.css                     # Filter bar styles
│   ├── detail.css                      # Detail view styles
│   ├── toast.css                       # Toast notification styles
│   ├── form.css                        # Form styles
│   ├── photo-gallery.css               # Photo gallery styles
│   └── schedules.css                   # NEW - Schedule template styles
│
└── js/
    ├── main.js                         # App initialization
    ├── router.js                       # Updated - Schedule routes added
    ├── state.js                        # Updated - Schedule state management
    ├── api.js                          # REFACTORED - Records & items only
    ├── scheduleApi.js                  # NEW - Schedule template API
    │
    ├── utils/
    │   ├── helpers.js                  # General utilities
    │   ├── formatters.js               # Data formatting functions
    │   ├── toast.js                    # Toast notifications
    │   └── scheduleHelpers.js          # NEW - Schedule-specific utilities
    │
    └── components/
        ├── MainTable.js                # Updated - "Maintenance Schedules" button
        ├── RecordDetail.js             # Record detail view
        ├── ItemDetail.js               # Item detail view
        ├── RecordForm.js               # Record create/edit form
        ├── StatsCards.js               # Stats display
        ├── Tabs.js                     # Tab navigation
        ├── Filters.js                  # Filter components
        ├── PhotoSwipeGallery.js        # Photo gallery
        ├── PhotoCarousel.js            # Photo carousel
        ├── PhotoUpload.js              # Photo upload
        │
        ├── SchedulesTable.js           # NEW - Template list view
        ├── ScheduleForm.js             # NEW - Template create/edit
        ├── ScheduleDetail.js           # NEW - Template detail view
        │
        └── form/
            ├── ItemSelector.js         # Item search/select
            ├── MaterialsList.js        # Materials editor
            └── ExistingPhotos.js       # Photo management

backend/
└── maintenance_schedule_handler.py    # NEW - Template CRUD Lambda