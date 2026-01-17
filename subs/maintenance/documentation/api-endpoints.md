# API Endpoints

## Maintenance Records API

| HTTP Method | Endpoint Route | Associated Function | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/admin/maintenance-records` | `fetchAllRecords`, `fetchRecordsByItem` | Fetches maintenance records. Accepts `item_id` query param to filter by specific item. |
| **GET** | `/admin/maintenance-records/{recordId}` | `fetchRecord` | Fetches a single maintenance record by its ID. |
| **POST** | `/admin/maintenance-records` | `createRecord` | Creates a new maintenance record. Expects record data in the body. |
| **PUT** | `/admin/maintenance-records/{recordId}` | `updateRecord` | Updates an existing maintenance record. |
| **DELETE** | `/admin/maintenance-records/{recordId}` | `deleteRecord` | Deletes a maintenance record. |
| **POST** | `/admin/maintenance-records/{recordId}/inspect` | `performInspection` | Performs an inspection. Returns inspection data and generated tasks. |

## Maintenance Schedule Templates API

| HTTP Method | Endpoint Route | Associated Function | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/admin/maintenance-schedules` | `fetchSchedules` | Fetches all schedule templates with optional filters. Accepts `class_type`, `status`, `task_type`, `enabled`, and `is_default` query params. |
| **GET** | `/admin/maintenance-schedules/{scheduleId}` | `fetchSchedule` | Fetches a single schedule template by its ID. |
| **POST** | `/admin/maintenance-schedules` | `createSchedule` | Creates a new schedule template. Expects schedule data in the body (must include class_type, task_type, short_name, title, frequency). |
| **PUT** | `/admin/maintenance-schedules/{scheduleId}` | `updateSchedule` | Updates an existing schedule template. Expects updated schedule data in the body. |
| **DELETE** | `/admin/maintenance-schedules/{scheduleId}` | `deleteSchedule` | Deletes a schedule template and cancels all future scheduled records. Returns deletion result with cancelled records count. |
| **GET** | `/admin/maintenance-schedules/{scheduleId}/records` | `fetchScheduleRecords` | Fetches all maintenance records generated from a specific schedule template. |
| **POST** | `/admin/maintenance-schedules/{scheduleId}/generate` | `generateScheduleRecords` | Manually generates additional records for a schedule template. Expects `count` in the body (default 2). |
| **POST** | `/admin/maintenance-schedules/{scheduleId}/apply` | `applyTemplateToItems` | Applies a template to one or more items. Expects `item_ids` array and optional `start_date` in the body. Returns items_updated, records_created, and details. |

## Items API

| HTTP Method | Endpoint Route | Associated Function | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/items/{itemId}` | `fetchItem` | Fetches a single item by its ID. |
| **GET** | `/items` | `searchItems`, `fetchAllItems` | Searches or lists items. Accepts `search`, `class_type`, `status`, and `enabled` query parameters. |

## Images API

| HTTP Method | Endpoint Route | Associated Function | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/admin/images/presign` | `getPresignedUrls` | Requests presigned S3 URLs for photo uploads. |
| **POST** | `/admin/images/confirm` | `confirmPhotoUpload` | Confirms S3 uploads and creates photo records in the database. |
| **GET** | `/admin/images/{photoId}` | `fetchPhoto` | Fetches photo metadata and URLs by photo ID. |