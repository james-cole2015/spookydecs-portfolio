# SpookyDecs Documentation

## Table of Contents

- [Admin](#admin) - User management, permissions, and system configuration
- [Audit](#audit) - Change tracking and audit logs
- [Auth](#auth) - Authentication and authorization
- [Deployments](#deployments) - Setup tracking, work sessions, and connections
- [Gallery](#gallery) - Photo management and decoration images
- [Ideas](#ideas) - Custom decoration concepts and inspirations
- [Items](#items) - Inventory management for decorations, accessories, and lights
- [Main](#main) - Dashboard and overview
- [Repairs](#repairs) - Repair tracking and maintenance logs
- [Storage](#storage) - Storage location and tote management

---

## Audit

### What is the Audit Dashboard?

The Audit Dashboard automatically tracks every change made in SpookyDecs, including:
- **Inventory items** - When decorations, accessories, lights, or storage items are created, updated, or deleted
- **Deployments** - Setup sessions, connections, and deployment progress
- **Gallery images** - Photo uploads and metadata changes
- **Ideas** - Custom decoration concepts and inspirations

## Getting Started

### Navigating the Dashboard

The dashboard has four main views accessible via tabs:

- **Recent Activity** - Shows all recent changes across all entity types
- **Inventory** - Filters to show only inventory-related changes
- **Gallery** - Shows changes to gallery photos
- **Ideas** - Tracks updates to your decoration ideas

### Using Filters

Use the filter bar to narrow down your audit records:

- **Date Range** - View changes from the last 7, 30, 90, or 365 days
- **Operation** - Filter by Create, Update, or Delete operations
- **Class Type** (Inventory only) - Filter by Decoration, Accessory, Light, Deployment, or Storage
- **Search** - Search by ID, name, or title

### Understanding Audit Records

Each audit record shows:
- **Time** - When the change occurred (e.g., "2 hours ago", "3 days ago")
- **Entity Type** - What was changed (Inventory 📦, Gallery 🖼️, Ideas 💡)
- **Name** - The item's display name
- **Operation** - CREATE (green), UPDATE (blue), or DELETE (red)
- **Changed Fields** - Summary of what was modified

### Viewing Change Details

Click any audit record to see detailed information:

1. **Changed Fields Summary** - Quick overview of what fields were modified
2. **Deployment Changes** (for deployments only) - Human-readable summary of:
   - Status changes
   - Work sessions added or completed
   - Connections created
   - Items deployed to locations
3. **Field-by-Field Comparison** - Before and after values for each changed field
4. **Full Record Details** - Complete JSON representation of the record before and after the change

### Special Features for Deployments

Deployment records show enhanced information:

- **Smart Change Detection** - Automatically identifies and summarizes:
  - "Added 2 work sessions to Back Yard"
  - "Created 3 connections in Side Yard"
  - "Deployed 5 items to Front Yard"
  - "Status changed from 'not_started' to 'in_progress'"

- **Location Breakdown** - Clean summary showing items and connections per location:
  ```
  Back Yard: 3 items, 2 connections
    items deployed:
      • ACC-CORD-1M1F-029
      • REC-BY-001
      • DEC-INF-PUMPKIN_BOY-005
    connections:
      • conn-5938aef6017f
      • conn-170fdb7ad186
  ```

## Mobile vs Desktop

The dashboard is fully responsive:

- **Desktop** - Full table view with all columns, horizontal filter bar
- **Mobile** - Card-based layout, drawer-style filters (tap the Filter button)

## Tips & Tricks

1. **Finding Specific Changes** - Use the search box to quickly find records by ID, item name, or title
2. **Tracking Setup Progress** - Filter to Deployments and look for "Completed work session" entries
3. **Recent Updates** - Use "Last 7 days" filter to see what changed this week
4. **Restoration** - While the "Restore This Version" button is currently disabled, this feature is coming soon

## Need Help?

If you encounter any issues or have questions about the audit dashboard, please contact support or check the SpookyDecs documentation.

---

*SpookyDecs - Making holiday decoration management spooky simple!* 🎃 🎄

---

## Admin

**Coming soon** - Documentation for user management, permissions, and system configuration.

---

## Auth

**Coming soon** - Documentation for authentication and authorization.

---

## Deployments

**Coming soon** - Documentation for setup tracking, work sessions, and connections.

---

## Gallery

**Coming soon** - Documentation for photo management and decoration images.

---

## Ideas

**Coming soon** - Documentation for custom decoration concepts and inspirations.

---

## Items

**Coming soon** - Documentation for inventory management (decorations, accessories, lights).

---

## Main

**Coming soon** - Documentation for the main dashboard and overview.

---

## Repairs

**Coming soon** - Documentation for repair tracking and maintenance logs.

---

## Storage

**Coming soon** - Documentation for storage location and tote management.