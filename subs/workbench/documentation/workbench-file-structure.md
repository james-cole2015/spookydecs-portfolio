# Frontend Directory Structure: `/workbench`

The frontend is designed as a lightweight **Single Page Application (SPA)** shell using a modular JavaScript approach. Each module is intentionally kept small (<350 lines) to maintain readability and ease of debugging.

## 📂 Project Tree

```text
workbench/
├── index.html                # SPA shell with spookydecs-header
├── css/
│   ├── workbench.css         # Global styles, Kanban, and Season creation
│   └── detail-view.css       # Item detail page specific styles
└── js/
    ├── app.js                # Initialization, global state, loads router
    ├── router.js             # Navigo instance, route definitions, navigation
    ├── api.js                # Fetch/XHR wrappers for backend communication
    ├── kanban-view.js        # Kanban board logic and rendering
    ├── detail-view.js        # Item detail page logic and rendering
    ├── create-season-view.js # Season creation form logic
    ├── modal.js              # Shared modal component
    ├── toast.js              # Shared notification/toast component
    ├── spinner.js            # Loading spinner component
    └── utils.js              # Date helpers, formatters, and validators
```
