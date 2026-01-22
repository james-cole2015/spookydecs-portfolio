# API Endpoints

| HTTP Method | Endpoint Route | Associated Function | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/items` | `fetchAllItems` | Retrieves all items. Accepts a `_t` timestamp query param for cache busting. |
| **GET** | `/items/{itemId}` | `fetchItemById` | Retrieves a specific item by its ID. Accepts a `_t` timestamp query param. |
| **POST** | `/admin/items` | `createItem` | Creates a new item. Expects `itemData` JSON in the body. |
| **PUT** | `/items/{itemId}` | `updateItem` | Updates an existing item. Used directly and by `retireItem` (which sets status to "Retired"). |
| **DELETE** | `/items/{itemId}` | `deleteItem` | Performs a hard delete of a specific item. |
| **PATCH** | `/admin/items/bulk` | `bulkStore` | Bulk updates the storage location for multiple items. Expects `{ item_ids, location }`. |
| **GET** | `/admin/maintenance-records` | `getMaintenanceRecords` | Fetches maintenance records for a specific item. Accepts `item_id` and `limit` as query parameters. |
| **GET** | `/admin/images/{photoId}` | `fetchPhotoById` | Retrieves a specific photo object by its ID. Returns null if 404. |
| **POST** | `/admin/images/presign` | `uploadPhoto` | Requests presigned S3 URLs for uploading the original image and thumbnail. |
| **POST** | `/admin/images/confirm` | `uploadPhoto` | Confirms the S3 upload is complete and creates the photo record in the database. |
| **POST** | `/admin/images/{photoId}/link` | `linkPhotoToItem` | Links an existing photo to an item. Can optionally set the photo as primary. |
| **POST** | `/admin/images/{photoId}/unlink` | `unlinkPhotoFromItem` | Removes the association between a specific photo and an item. |
| **DELETE** | `/admin/images/{photoId}` | `deletePhoto` | Permanently deletes a photo record. |