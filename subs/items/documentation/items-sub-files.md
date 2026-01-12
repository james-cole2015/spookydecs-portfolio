// Item Management Subdomain


items/
├── css
│   ├── add-cost-modal.css
│   ├── crop-modal.css
│   ├── item-detail.css
│   ├── item-form.css
│   ├── items.css
│   ├── maintenance-section-styles.css
│   └── shared.css
├── index.html
├── items-sub-files.md
└── js
    ├── api
    │   ├── items.js
    │   ├── maintenance.js
    │   └── photos.js
    ├── components
    │   ├── AddCostModal.js
    │   ├── CropModal.js
    │   ├── FilterBar.js
    │   ├── ItemDetailView.js
    │   ├── ItemFormFields.js
    │   ├── ItemFormSteps.js
    │   ├── ItemFormWizard.js
    │   ├── ItemsTable.js
    │   ├── PhotoUploader.js
    │   ├── StoreItemModal.js
    │   └── TabBar.js
    ├── pages
    │   ├── item-detail.js
    │   ├── item-form.js
    │   └── items-list.js
    ├── router.js
    ├── shared
    │   ├── modal.js
    │   └── toast.js
    └── utils
        ├── item-config.js
        └── state.js


backend/
└── status-sync-dev.py    # updates root level status based on nested attributes. See notes. 



### NOTES 
status-sync-dev lambda
```
The status-sync-dev checks for nested attributes to update the root-level status: 
if packing_status == TRUE, deployment == False, status == Packed
if packing_status == FALSE, deployment == True, status == Deployed
if repair_status.needs_repair == TRUE and repair_status == Critical, status = Unavailable 
if repair_status.needs_repair == TRUE and repair_status != Critical, status is unaffected. 
if status == Retired, no other updates can override this. 
```
