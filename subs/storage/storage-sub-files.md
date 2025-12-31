# Storage Subdomain - File Structure

## Complete File Organization

```
storage/
│
├── index.html                          # Single HTML entry point for all routes
│
├── css/
│   ├── storage.css                     # Main styles (tabs, filters, table, cards) 
│   ├── storage-detail.css              # Detail page specific styles
│   └── wizard.css                      # Wizard styles (create & pack)
│
└── js/
    ├── app.js                          # Main entry point - initializes router 
    │
    ├── utils/
    │   ├── storage-config.js           # Constants, validation, utilities 
    │   ├── storage-api.js              # API client (storage, items, images) 
    │   ├── state.js                    # URL state management 
    │   └── router.js                   # Navigo router setup 
    │
    ├── shared/
    │   ├── toast.js                    # Toast notifications
    │   └── modal.js                    # Modal dialogs 
    │
    ├── components/
    │   ├── TabBar.js                   # Season tabs 
    │   ├── FilterBar.js                # Search + filter dropdowns 
    │   ├── StorageTable.js             # Desktop table view 
    │   ├── StorageCards.js             # Mobile card view 
    │   ├── StorageDetailView.js        # Detail page layout
    │   ├── ContentsPanel.js            # Contents list with thumbnails
    │   ├── CreateWizard.js             # 3-step creation wizard
    │   ├── ToteBuilderWizard.js        # 3-step packing wizard
    │   ├── StorageFormFields.js        # Dynamic form field generator
    │   └── PhotoUploader.js            # Photo upload component
    │
    └── pages/
        ├── storage-list.js             # List page orchestration 
        ├── storage-detail.js           # Detail page orchestration
        ├── storage-create.js           # Create wizard orchestration
        ├── tote-builder.js             # Tote builder orchestration
        └── storage-edit.js             # Edit form orchestration
```

## Routes → Page Handlers

| URL Route | Handler Function | Status |
|-----------|-----------------|---------|
| `/storage` | `renderStorageList()` 
| `/storage/create` | `renderCreateWizard()` 
| `/storage/pack` | `renderToteBuilder()` 
| `/storage/:id` | `renderStorageDetail(id)`
| `/storage/:id/edit` | `renderEditForm(id)`

## CloudFront/S3 Configuration

All routes serve the same `index.html`:
- Set error page (404) to redirect to `/index.html` with 200 status
- Client-side router (Navigo) handles routing after page load
- No server-side routing needed

## Component Dependencies

```
storage-list.js
  ├── TabBar.js
  ├── FilterBar.js
  ├── StorageTable.js
  ├── StorageCards.js
  ├── storage-api.js
  ├── state.js
  ├── modal.js
  └── toast.js

storage-detail.js
  ├── StorageDetailView.js
  ├── ContentsPanel.js
  ├── storage-api.js
  ├── modal.js
  └── toast.js

storage-create.js
  ├── CreateWizard.js
  ├── StorageFormFields.js
  ├── PhotoUploader.js
  ├── storage-api.js
  ├── items-api.js (for self-contained item selection)
  └── toast.js

tote-builder.js
  ├── ToteBuilderWizard.js
  ├── storage-api.js
  ├── items-api.js
  └── toast.js

storage-edit.js
  ├── StorageFormFields.js
  ├── PhotoUploader.js
  ├── storage-api.js
  └── toast.js

