# DynamoDB Table Schema: `workbench_2026`

This table uses a **Single Table Design** pattern with a composite primary key:
- **Partition Key (PK):** `season_id`
- **Sort Key (SK):** `workbench_item_id`

---

## 1. Table Attribute Definitions

### Season Metadata Record (`SK: METADATA`)
| Attribute | Type | Values / Notes |
| :--- | :--- | :--- |
| `status` | String | `draft`, `active`, `closed` |
| `total_items` | Number | Roll-up count of all items |
| `completed_items` | Number | Roll-up count of completed items |
| `ai_generated` | Boolean | Flag if scaffolded by AI |

### Workbench Item Record (`SK: <UUID>`)
| Attribute | Type | Values / Notes |
| :--- | :--- | :--- |
| `source_type` | String | `maintenance`, `idea` |
| `workbench_status`| String | `todo`, `in_progress`, `completed` |
| `priority` | String | `high`, `medium`, `low` |
| `record_type` | String | `repair`, `maintenance`, `idea_build` |
| `synced_back` | Boolean | Status of push-back to source table |

---

## 2. Raw JSON Structure
### Season Metadata Record:

```json
{
    "season_id": "off-season_2026",
    "workbench_item_id": "METADATA",
    "season_name": "off-season_2026",
    "start_date": "2026-04-01",
    "end_date": "2026-09-30",
    "status": "draft",
    "total_items": 0,
    "completed_items": 0,
    "total_estimated_cost": 0,
    "total_actual_cost": 0,
    "ai_generated": false,
    "created_at": "2026-03-15T12:00:00Z",
    "created_by": "SpookyDecs Ent",
    "updated_at": "2026-03-15T12:00:00Z",
    "closed_at": null
  }
  ```
  ### Season Metadata Item Record:

  ```
{
    "season_id": "off-season_2026",
    "workbench_item_id": "uuid-1234-5678",
    "source_type": "maintenance",
    "source_id": "8c8a28b9-xxxx",
    "workbench_status": "todo",
    "priority": "high",
    "title": "Test Record 3",
    "description": "Detailed description of work needed",
    "record_type": "repair",
    "estimated_completion_date": null,
    "actual_completion_date": null,
    "work_notes": "",
    "costs": {
      "cost_record_ids": [],
      "estimated_cost": 50,
      "actual_cost": null
    },
    "materials": [
      {
        "name": "Plywood",
        "quantity": "1",
        "unit": "each",
        "cost": "50",
        "brand": "Home Depot",
        "vendor": "HD",
        "notes": "8x4 sheet",
        "in_inventory": false
      }
    ],
    "shopping_list": {
      "Plywood": "",
      "LED Strip Lights": "Need warm white, 16ft"
    },
    "photos": {
      "reference": [],
      "before": [],
      "during": [],
      "after": [],
      "documentation": []
    },
    "ai_suggestions": {
      "recommended_priority": "high",
      "suggested_phase": "April-May",
      "reasoning": "High criticality repair, cheap materials",
      "estimated_material_costs": [
        {
          "material_name": "Plywood",
          "estimated_cost": 50
        }
      ],
      "estimated_total_cost": 50
    },
    "created_at": "2026-03-15T12:00:00Z",
    "created_by": "SpookyDecs Ent",
    "updated_at": "2026-03-15T12:00:00Z",
    "completed_at": null,
    "synced_back": false,
    "synced_back_at": null
  }
```