# Workbench API Documentation

## Season Management
Endpoints for managing the lifecycle and metadata of work seasons.

* **GET** `/workbench/seasons`
    * List all seasons (metadata records only).
* **GET** `/workbench/seasons/{season_id}`
    * Retrieve season metadata and summary statistics (e.g., total items, completed count).
* **POST** `/workbench/seasons`
    * Create a new season metadata record.
* **PATCH** `/workbench/seasons/{season_id}`
    * Update season metadata (e.g., marking a season as closed).

---

## Task/Item Management
Endpoints for managing individual items within a specific season.

* **GET** `/workbench/seasons/{season_id}/items`
    * Get all items for a season.
    * **Query Params:** `status`, `priority` (e.g., `?status=todo&priority=high`).
* **GET** `/workbench/seasons/{season_id}/items/{item_id}`
    * Get single item details.
* **POST** `/workbench/seasons/{season_id}/items`
    * Manually add a new workbench item.
* **PATCH** `/workbench/seasons/{season_id}/items/{item_id}`
    * Update an item (status changes, adding notes, etc.).
* **DELETE** `/workbench/seasons/{season_id}/items/{item_id}`
    * Remove an item from the season.

---

## Import & Sync
Operations for moving data between the workbench and external source tables.

### Bulk Import
**POST** `/workbench/seasons/{season_id}/import`
* **Description:** Manual "Create Workbench" action to pull from maintenance/ideas tables.
* **Request Body:**
    ```json
    {
      "source_types": ["maintenance", "idea"],
      "filters": { "..." }
    }
    ```

### Sync Back
**POST** `/workbench/seasons/{season_id}/items/{item_id}/sync-back`
* **Description:** Sync a completed item back to its source table (Maintenance or Ideas).

---

## Bulk Operations

### Bulk Update
**POST** `/workbench/seasons/{season_id}/items/bulk-update`
* **Description:** Update multiple items at once.
* **Use Case:** Useful for mass disposition at the end of a season.