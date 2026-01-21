images/
├── index.html                        # Main entry point with header and app container
├── documentation/
│   └── images-file-structure.md      # This file - documents the folder structure
├── css/
│   ├── images.css                    # Styles for images list page and cards
│   ├── images-detail.css             # Styles for image detail/edit pages and breadcrumbs
│   ├── images-upload.css             # Styles for image upload interface
│   └── images-browser.css            # Styles for photo browser interface
└── js/
    ├── app.js                        # Application initialization and route configuration
    ├── utils/
    │   ├── images-api.js             # API client for image CRUD operations and S3 uploads
    │   ├── images-config.js          # Configuration for image categories, seasons,oh  and validation
    │   ├── router.js                 # Navigo router setup and navigation helpers
    │   └── state.js                  # Application state management
    ├── shared/
    │   ├── modal.js                  # Reusable modal/confirmation dialog component
    │   └── toast.js                  # Toast notification system
    ├── components/
    │   ├── Autocomplete.js           # Autocomplete input component
    │   ├── Breadcrumb.js             # Breadcrumb navigation component for detail pages
    │   ├── FilterPanel.js            # Filtering controls for images list
    │   ├── ImageCard.js              # Card component for displaying images in grid
    │   ├── ImageDetail.js            # Image detail view with edit mode and breadcrumbs
    │   ├── ImageUpload.js            # Multi-file upload interface with drag-and-drop
    │   └── LightboxGallery.js        # Lightbox component for viewing images
    └── pages/
        ├── images-list.js            # Images list page with grid, filters, and pagination
        ├── image-detail.js           # Image detail page controller
        ├── image-upload.js           # Image upload page controller
        └── photo-browser.js          # Photo browser page controller
