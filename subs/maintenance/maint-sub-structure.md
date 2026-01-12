maintenance-records/
├── css
│   ├── detail.css
│   ├── filters.css
│   ├── form.css
│   ├── inspection-form.css
│   ├── item-detail.css
│   ├── main.css
│   ├── mobile.css
│   ├── photo-gallery.css
│   ├── schedule-detail.css
│   ├── schedules-detail.css
│   ├── schedules.css
│   ├── table.css
│   ├── template-application.css
│   └── toast.css
├── index.html
├── js
│   ├── api.js
│   ├── components
│   │   ├── Filters.js
│   │   ├── form
│   │   │   ├── ExistingPhotos.js
│   │   │   ├── ItemSelector.js
│   │   │   └── MaterialsList.js
│   │   ├── inspection
│   │   │   ├── InspectionFormSubmit.js
│   │   │   └── InspectionTaskManager.js
│   │   ├── ItemDetail.js
│   │   ├── MainTable.js
│   │   ├── MobileCardView.js
│   │   ├── MobileFilters.js
│   │   ├── PerformInspectionForm.js
│   │   ├── PhotoCarousel.js
│   │   ├── PhotoSwipeGallery.js
│   │   ├── PhotoUpload.js
│   │   ├── RecordDetailActions.js
│   │   ├── RecordDetailRenderer.js
│   │   ├── RecordDetailTabs.js
│   │   ├── RecordDetailView.js
│   │   ├── RecordForm.js
│   │   ├── ScheduleDetail.js
│   │   ├── ScheduleForm.js
│   │   ├── SchedulesTable.js
│   │   ├── SchedulesTableHandlers.js
│   │   ├── SchedulesTableRenderers.js
│   │   ├── StatsCards.js
│   │   ├── Tabs.js
│   │   └── TemplateApplication.js
│   ├── main.js
│   ├── RecordDetail.js
│   ├── router.js
│   ├── scheduleApi.js
│   ├── state.js
│   └── utils
│       ├── formatters.js
│       ├── helpers.js
│       ├── responsive.js
│       ├── scheduleHelpers.js
│       └── toast.js
└── maint-sub-structure.md

backend/
└── maintenance_schedule_handler.py    # NEW - Template CRUD Lambda
└── applyTemplatesToItems.py           # NEW - Template CRUD Lambda
└── auto-apply-templates.py            # Applies default templates to items with matching class types; note that there is one for dev and one for prod
└── sync_maintenance_to_items.py       # Adds record_ids to maintenance.generation_ids; note that there is one for dev and one for prod. 
└── retirement_cleanup.py              # changes item.status to Retired
