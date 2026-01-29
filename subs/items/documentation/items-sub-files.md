# Item Management Subdomain


items/
├── css/
│   ├── item-detail.css             # Styles for item detail view with tabs and sections
│   ├── item-edit-mobile.css        # Mobile-responsive overrides for edit page
│   ├── item-edit.css               # Styles for item edit page layout and form
│   ├── item-form.css               # Styles for create wizard steps and controls
│   └── items.css                   # Base styles and items list grid layout
├── documentation/
│   ├── api-documentation.md        # API endpoint documentation and examples
│   ├── item-schema.json            # DynamoDB item schema definition
│   └── items-sub-files.md          # This file - project structure reference
├── index.html                      # Entry point HTML with app container and script imports
└── js/
    ├── api/
    │   ├── items.js                # CRUD operations for items via Lambda API
    │   ├── maintenance.js          # Fetches maintenance records for items
    │   └── photos.js               # Photo upload, link, and delete operations via presigned URLs
    ├── app.js                      # Main entry point - initializes router with page handlers
    ├── components/
    │   ├── ActionCenter.js         # Action buttons: upload photo, flag repair, retire, delete
    │   ├── ActionModal.js          # Post-create modal with skip/add cost/add photo options
    │   ├── CropModal.js            # Modal for cropping photos to square using Cropper.js
    │   ├── FilterBar.js            # Search and filter controls with URL state sync
    │   ├── ItemEditForm.js         # Edit form wrapper organizing fields into sections
    │   ├── ItemFormFields.js       # Dynamic form field generator based on class/type
    │   ├── ItemFormSteps.js        # Renders each step of the create wizard
    │   ├── ItemFormWizard.js       # Wizard state management and step navigation
    │   ├── ItemsCards.js           # Grid of item cards with photo, status, and actions
    │   └── TabBar.js               # Sticky tab navigation with scroll indicators
    ├── pages/
    │   ├── item-detail.js          # Item detail view with tabs for info, maintenance, photos
    │   ├── item-edit.js            # Edit page with form fields and action center
    │   ├── item-form.js            # Create page with multi-step wizard
    │   └── items-list.js           # Main list view with filter bar and item cards
    ├── shared/
    │   ├── modal.js                # Reusable modal for confirmations and alerts
    │   └── toast.js                # Toast notification system for success/error messages
    └── utils/
        ├── item-config.js          # Class hierarchy, seasons, statuses, and field metadata
        ├── router.js               # Client-side routing using Navigo
        └── state.js                # URL query parameter state management


backend/
└── status-sync-dev.py              # Lambda that updates root status based on nested attributes


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
