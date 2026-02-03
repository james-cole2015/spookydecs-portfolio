gallery/
├── index.html
├── css/
│   ├── gallery.css           # NEW - Theme variables, global styles
│   ├── hero-carousel.css     # NEW - Carousel styling
│   ├── showcase.css          # UPDATED - Filter tags, refined grid
│   ├── progress.css          # UPDATED - Minimal page styles
│   └── community.css         # UPDATED - Minimal page styles
└── js/
    ├── app.js                # UPDATED - New routing with tabs
    ├── utils/
    │   ├── gallery-api.js    # UPDATED - Correct endpoint path
    │   ├── gallery-config.js # NEW - Constants and helpers
    │   ├── router.js         # Same - Navigo routing
    │   └── state.js          # NEW - URL state management
    ├── components/
    │   ├── HeroCarousel.js        # NEW - Featured photo carousel
    │   ├── FilterTags.js          # NEW - Active filter badges
    │   ├── FilterPopover.js       # NEW - Filter dropdown
    │   ├── SectionTabs.js         # NEW - Tab navigation (desktop/mobile)
    │   ├── PhotoCard.js           # UPDATED - Cleaner design
    │   ├── PhotoGrid.js           # UPDATED - Infinite scroll
    │   └── PhotoSwipeLightbox.js  # UPDATED - Full metadata
    └── pages/
        ├── showcase.js       # UPDATED - Hero + filters
        ├── progress.js       # UPDATED - Consistent layout
        └── community.js      # UPDATED - Consistent layout