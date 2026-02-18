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


### ROUTES
```
/items                    → Main list view with filter bar and item cards
/items/create             → Multi-step wizard for creating new items
/items/:id                → Item detail view with info, maintenance, photos tabs
/items/:id/edit           → Edit page with form fields and action center
```


### ITEM CLASSES
```
Decoration → Inflatable, Animatronic, Static Prop
Light      → String Light, Spot Light, Projection
Accessory  → Cord, Plug, Receptacle, Timer, Controller
Storage    → Tote, Box, Bin (filtered out in items subdomain)
```


### ITEM STATUSES
```
Active     → Item is available for use (#16a34a - green)
Packed     → Item is stored/packed away (#6b7280 - gray)
Deployed   → Item is currently deployed (#3b82f6 - blue)
Retired    → Item is no longer in use (#ef4444 - red)
```


### SEASONS
```
Halloween  → Halloween decorations and lights
Christmas  → Christmas decorations and lights
Shared     → Items used across multiple seasons
```


### CLASS TYPE ATTRIBUTES
```
Inflatable    → height_length, stakes, tethers, adapter, power_inlet
Animatronic   → height_length, stakes, tethers, adapter, power_inlet
Static Prop   → height_length, stakes, tethers, power_inlet
String Light  → color, bulb_type, length, power_inlet
Spot Light    → color, bulb_type, power_inlet
Projection    → power_inlet
Cord          → length, male_ends, female_ends, watts, amps
Plug          → male_ends, female_ends, power_inlet
Receptacle    → female_ends, power_inlet
Timer         → male_ends, female_ends, power_inlet
Controller    → male_ends, female_ends, power_inlet
```


### API FUNCTIONS (items.js)
```
Items:
  fetchAllItems(bustCache)         → Get all items (filters to Decoration, Light, Accessory)
  fetchItemById(id, bustCache)     → Get item by ID with photo URL resolved
  createItem(data)                 → Create new item, returns preview and confirmation
  updateItem(id, data)             → Update existing item (partial or full)
  deleteItem(id)                   → Hard delete an item
  retireItem(id)                   → Soft delete (set status to "Retired")
  bulkRetireItems(ids)             → Retire multiple items
  bulkDeleteItems(ids)             → Delete multiple items
  bulkStore(ids, location)         → Store items in a location

Config URLs:
  getStorageUrl()                  → Get storage subdomain URL
  getDeploymentUrl()               → Get deployment subdomain URL
  getMaintenanceUrl()              → Get maintenance subdomain URL
  getFinanceUrl()                  → Get finance subdomain URL

Images:
  fetchImageById(id)               → Get image details by ID
```


### API FUNCTIONS (photos.js)
```
Photos:
  fetchPhotoById(id)               → Get photo by ID
  fetchPhotosByIds(ids)            → Get multiple photos by IDs
  uploadPhoto(file, itemId, season, isPrimary) → Upload single photo with presigned URLs
  uploadPhotos(files, itemId, season)          → Upload multiple photos
  linkPhotoToItem(photoId, itemId, isPrimary)  → Link existing photo to item
  unlinkPhotoFromItem(photoId, itemId)         → Remove photo-item association
  deletePhoto(photoId)             → Delete a photo
  getPhotosForItem(item)           → Get all photos for an item (primary + secondary)
  validateFile(file)               → Validate file before upload (10MB max, JPEG/PNG/HEIC)
```


### API FUNCTIONS (maintenance.js)
```
Maintenance:
  getMaintenanceRecords(itemId, limit) → Get maintenance records for an item
  getMaintenancePageUrl(itemId)        → Get URL to maintenance page for an item
  getMaintenanceUrl()                  → Get maintenance subdomain base URL
```


### PHOTO UPLOAD FLOW
```
1. Request presigned URLs     → POST /admin/images/presign
2. Generate thumbnail         → Client-side canvas resize to 300x300
3. Upload image to S3         → PUT to presigned_url
4. Upload thumbnail to S3     → PUT to thumb_presigned_url
5. Confirm upload             → POST /admin/images/confirm (creates photo record)
```


### NOTES
```
- Allowed classes filter: Only Decoration, Light, and Accessory shown (Storage filtered out)
- Item ID format: {CLASS_CODE}-{TYPE_CODE}-{SEASON_CODE}-{NUMBER} (e.g., DEC-INF-ZERO-011)
- Photo size limit: 10MB maximum, allowed types: JPEG, PNG, HEIC, HEIF
- Thumbnails: Generated client-side, 300x300 max, JPEG at 85% quality
- Primary photo: First uploaded photo or explicitly set via linkPhotoToItem
- All API calls use standardized response format: { success: true, data: {...} }
- Error handling displays user-friendly toast notifications
- Filter state persisted in URL query parameters for shareable links
```
