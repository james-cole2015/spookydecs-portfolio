# Inspector Rules Definition
*SpookyDecs · v1.0 · 2026-05-15*

> Reference doc for all inspector rules: configuration, violation behavior, IG resolution path, and Penny auto-remediation determination.
> Source: `sd_inspector_rules_prod` DDB table + prod violation audit (2026-05-15).

---

## Rule Index

| Rule ID | Category | Dismissible | Auto-remediate | Penny Tool |
|---|---|---|---|---|
| `DEPLOYMENT_PACKING_CONFLICT` | relationship_eval | TBD (#231) | ❌ No | — |
| `DUPLICATE_ACCESSORIES` | duplicate_detection | TBD (#231) | ❌ No | — |
| `DUPLICATE_ITEMS` | duplicate_detection | TBD (#231) | ❌ No | — |
| `DUPLICATE_LIGHTS` | duplicate_detection | TBD (#231) | ❌ No | — |
| `DUPLICATE_STORAGE` | duplicate_detection | TBD (#231) | ❌ No | — |
| `EMPTY_VENDOR_METADATA_VALUES` | field_validation | TBD (#231) | ❌ No | — |
| `MISSING_ACQUISITION_COST` | required_related_entity | TBD (#231) | ❌ No | — |
| `MISSING_DEPLOYMENT_DATA` | field_validation | TBD (#231) | ❌ No | — |
| `MISSING_PACKING_DATA` | field_validation | TBD (#231) | ✅ Yes | `update_item_packing_data` |
| `MISSING_PRIMARY_PHOTO` | required_related_entity | TBD (#231) | ❌ No | — |
| `MISSING_VENDOR_METADATA` | field_validation | TBD (#231) | ✅ Yes | `initialize_vendor_metadata` |
| `MISSING_VENDOR_METADATA_FIELDS` | field_validation | TBD (#231) | ✅ Yes | `initialize_vendor_metadata` |
| `ORPHANED_COST_PHOTO` | orphaned_images | TBD (#231) | ❌ No | — |
| `ORPHANED_ITEM_PHOTO` | orphaned_images | TBD (#231) | ❌ No | — |
| `PACKED_MISSING_LOCATION` | relationship_eval | TBD (#231) | ✅ Yes | `update_item_packing_data` |
| `PACKED_MISSING_TOTE_ID` | relationship_eval | TBD (#231) | ✅ Yes | `update_item_packing_data` |
| `REPAIR_CRITICAL` | field_validation | TBD (#231) | ❌ No | — |

> **Dismissible column:** `dismissible` boolean will be added to all rules when issue #231 ships (removes severity, replaces Critical "no dismiss" behavior with explicit per-rule policy). Column to be updated at that time.

---

## Rule Definitions

---

### DEPLOYMENT_PACKING_CONFLICT

| Field | Value |
|---|---|
| Category | `relationship_eval` |
| Violation message | `'{short_name}' is marked as both deployed and packed` |
| Item classes | Decoration, Light, Accessory |
| Auto-remediate | ❌ No |
| IG resolution path | `verify_item_status` |
| IG requires_confirmation | Mixed (36 False / 4 True in prod) |

**Rule logic:** Mutual exclusion — `deployment_data.deployed` and `packing_data.packing_status` cannot both be `true`.

**Why not auto-remediate:** Choosing which state to clear (deployed or packed) requires human judgment. Getting it wrong materially changes item state.

**Config:**
```json
{
  "field_paths": ["deployment_data.deployed", "packing_data.packing_status"],
  "item_classes": ["Decoration", "Light", "Accessory"],
  "relationship_type": "mutual_exclusion",
  "violation_condition": "both_true"
}
```

---

### DUPLICATE_ACCESSORIES

| Field | Value |
|---|---|
| Category | `duplicate_detection` |
| Item classes | Accessory |
| Auto-remediate | ❌ No |
| IG resolution path | `manual_review` (expected) |

**Rule logic:** Pairwise fuzzy string match on `short_name` within class (difflib, threshold 0.85). Fires when similarity score exceeds threshold.

**Why not auto-remediate:** Human must determine which record is the true one and which is the duplicate.

---

### DUPLICATE_ITEMS

| Field | Value |
|---|---|
| Category | `duplicate_detection` |
| Item classes | All |
| Auto-remediate | ❌ No |
| IG resolution path | `manual_review` (expected) |

**Rule logic:** Same as DUPLICATE_ACCESSORIES — pairwise fuzzy match across all item classes.

**Why not auto-remediate:** Same as above.

---

### DUPLICATE_LIGHTS

| Field | Value |
|---|---|
| Category | `duplicate_detection` |
| Item classes | Light |
| Auto-remediate | ❌ No |
| IG resolution path | `manual_review` |
| IG requires_confirmation | Mixed (11 False / 10 True in prod) |

**Rule logic:** Pairwise fuzzy match within Light class.

**Why not auto-remediate:** Human must determine which record is real.

---

### DUPLICATE_STORAGE

| Field | Value |
|---|---|
| Category | `duplicate_detection` |
| Item classes | Storage |
| Auto-remediate | ❌ No |
| IG resolution path | `manual_review` (expected) |

**Rule logic:** Pairwise fuzzy match within Storage class.

**Why not auto-remediate:** Human must determine which record is real.

---

### EMPTY_VENDOR_METADATA_VALUES

| Field | Value |
|---|---|
| Category | `field_validation` |
| Validation type | `values_present` |
| Violation message | `'{short_name}' has empty vendor metadata values` |
| Item classes | Decoration, Light, Accessory |
| Auto-remediate | ❌ No |
| IG resolution path | `manual_review` |
| IG requires_confirmation | Mixed (4 False / 1 True in prod) |

**Rule logic:** Checks that `vendor_metadata.cost`, `vendor_metadata.manufacturer`, `vendor_metadata.value`, and `vendor_metadata.vendor_store` are all non-empty. Fields structurally exist but have blank/zero values.

**Why not auto-remediate:** The keys exist but the actual values (purchase price, manufacturer name, etc.) require human input. Distinct from `MISSING_VENDOR_METADATA_FIELDS` where the keys are absent.

**Config:**
```json
{
  "item_classes": ["Decoration", "Light", "Accessory"],
  "validation_type": "values_present",
  "required_structure": {
    "root_field": "vendor_metadata",
    "nested_fields": ["cost", "manufacturer", "value", "vendor_store"]
  }
}
```

---

### MISSING_ACQUISITION_COST

| Field | Value |
|---|---|
| Category | `required_related_entity` |
| Auto-remediate | ❌ No |
| IG resolution path | `create_acquisition_cost_record` / `manual_review` |
| IG requires_confirmation | Mixed (4 False / 2 True in prod) |

**Rule logic:** Checks that a cost record with `cost_type=acquisition` exists for the item.

**Why not auto-remediate:** Creating a cost record requires real data (cost amount, vendor, date, manufacturer) that Penny cannot infer from the item record alone.

---

### MISSING_DEPLOYMENT_DATA

| Field | Value |
|---|---|
| Category | `field_validation` |
| Validation type | `schema_complete` |
| Violation message | `'{short_name}' is missing required deployment data fields` |
| Item classes | Decoration, Light, Accessory |
| Auto-remediate | ❌ No |
| IG resolution path | Not observed in prod |

**Rule logic:** Checks that `deployment_data` map contains `deployed`, `last_deployment_id`, and `previous_deployments`.

**Why not auto-remediate:** Initializing `deployed: false` could be incorrect if the item is actually deployed but has a data gap. Requires human verification.

**Config:**
```json
{
  "item_classes": ["Decoration", "Light", "Accessory"],
  "validation_type": "schema_complete",
  "required_structure": {
    "root_field": "deployment_data",
    "nested_fields": ["deployed", "last_deployment_id", "previous_deployments"]
  }
}
```

---

### MISSING_PACKING_DATA

| Field | Value |
|---|---|
| Category | `field_validation` |
| Validation type | `schema_complete` |
| Violation message | `'{short_name}' is missing required packing data fields` |
| Item classes | Decoration, Light, Accessory |
| Auto-remediate | ✅ Yes |
| Penny tool | `update_item_packing_data` |
| IG resolution path | `suggest_packing_location` |
| IG requires_confirmation | False (1 in prod) |

**Rule logic:** Checks that `packing_data` map contains `packable`, `single_packed`, `packing_status`, `tote_id`, and `tote_location`.

**Why auto-remediate:** IG gathers the item's existing packing context and provides a specific recommendation in `agent_notes`. Penny writes the missing fields per IG's guidance.

**Config:**
```json
{
  "item_classes": ["Decoration", "Light", "Accessory"],
  "validation_type": "schema_complete",
  "required_structure": {
    "root_field": "packing_data",
    "nested_fields": ["packable", "single_packed", "packing_status", "tote_id", "tote_location"]
  }
}
```

---

### MISSING_PRIMARY_PHOTO

| Field | Value |
|---|---|
| Category | `required_related_entity` |
| Auto-remediate | ❌ No |
| IG resolution path | `update_missing_photo` / `manual_review` |
| IG requires_confirmation | False (17 in prod) |

**Rule logic:** Checks that at least one photo record exists for the item.

**Why not auto-remediate:** Penny cannot source or upload photos autonomously.

---

### MISSING_VENDOR_METADATA

| Field | Value |
|---|---|
| Category | `field_validation` |
| Validation type | `schema_complete` |
| Violation message | `'{short_name}' is missing required vendor metadata fields` |
| Item classes | Decoration, Light, Accessory |
| Auto-remediate | ✅ Yes |
| Penny tool | `initialize_vendor_metadata` |
| IG resolution path | `initialize_vendor_metadata` (to be added to IG system prompt) |
| IG requires_confirmation | False (expected) |

**Rule logic:** Checks that `vendor_metadata` map contains `cost`, `manufacturer`, `value`, and `vendor_store` keys.

**Why auto-remediate:** The entire `vendor_metadata` map or its required keys are absent. No value judgment required — Penny initializes missing keys with safe defaults (`cost: 0`, `value: 0`, `manufacturer: ""`, `vendor_store: ""`). Human fills in real values afterward; `EMPTY_VENDOR_METADATA_VALUES` will fire if they remain blank.

**Config:**
```json
{
  "item_classes": ["Decoration", "Light", "Accessory"],
  "validation_type": "schema_complete",
  "required_structure": {
    "root_field": "vendor_metadata",
    "nested_fields": ["cost", "manufacturer", "value", "vendor_store"]
  }
}
```

---

### MISSING_VENDOR_METADATA_FIELDS

| Field | Value |
|---|---|
| Category | `field_validation` |
| Validation type | `schema_complete` (with type checking) |
| Violation message | `'{short_name}' is missing required vendor metadata fields or has incorrect data types` |
| Item classes | Decoration, Light, Accessory |
| Auto-remediate | ✅ Yes |
| Penny tool | `initialize_vendor_metadata` |
| IG resolution path | `initialize_vendor_metadata` (to be added to IG system prompt) |
| IG requires_confirmation | False (expected) |

**Rule logic:** Same as `MISSING_VENDOR_METADATA` but additionally validates field types (`cost` and `value` must be numbers; `manufacturer` and `vendor_store` must be strings). Note: targets item_classes `Decorations`, `Lights`, `Accessories` (plural — potential config inconsistency with other rules).

**Why auto-remediate:** Same rationale as `MISSING_VENDOR_METADATA`. Type-correct safe defaults satisfy both the presence and type checks.

**Config:**
```json
{
  "item_classes": ["Decorations", "Lights", "Accessories"],
  "validation_type": "schema_complete",
  "required_structure": {
    "root_field": "vendor_metadata",
    "nested_fields": [
      {"field": "cost", "type": "number"},
      {"field": "manufacturer", "type": "string"},
      {"field": "value", "type": "number"},
      {"field": "vendor_store", "type": "string"}
    ]
  }
}
```

> **Note:** `item_classes` uses plural form (`Decorations`, `Lights`, `Accessories`) unlike all other rules which use singular. Verify this matches actual item `class` field values — if items use singular form, this rule may never fire.

---

### ORPHANED_COST_PHOTO

| Field | Value |
|---|---|
| Category | `orphaned_images` |
| Auto-remediate | ❌ No |
| IG resolution path | `manual_review` |
| IG requires_confirmation | True (1 in prod) |

**Rule logic:** Detects photos whose `cost_ids` reference cost records that no longer exist.

**Why not auto-remediate:** Deleting a photo requires human confirmation. Photo may have value independent of the orphaned reference.

> **Note:** `sd_inspector_orphaned_images` runs on a schedule and scans photos directly (rather than being triggered by item events), but it does emit `Violation.Detected` events to EventBridge after writing violations. IG is triggered normally.

---

### ORPHANED_ITEM_PHOTO

| Field | Value |
|---|---|
| Category | `orphaned_images` |
| Auto-remediate | ❌ No |
| IG resolution path | `manual_review` (expected) |

**Rule logic:** Detects photos whose `item_id` references an item that no longer exists.

**Why not auto-remediate:** Deleting a photo requires human confirmation.

> **Note:** Same schedule-scan pattern as `ORPHANED_COST_PHOTO` — emits `Violation.Detected` events normally.

---

### PACKED_MISSING_LOCATION

| Field | Value |
|---|---|
| Category | `relationship_eval` |
| Violation message | `'{short_name}' is packed but has no tote location` |
| Item classes | All |
| Auto-remediate | ✅ Yes |
| Penny tool | `update_item_packing_data` |
| IG resolution path | `suggest_packing_location` / `verify_item_status` |
| IG requires_confirmation | False (7 in prod) |

**Rule logic:** Required-when — `packing_data.tote_location` must be non-empty when `packing_data.packing_status` is `true`.

**Why auto-remediate:** IG reads the item's audit history and existing packing context to identify the correct tote location and writes a specific recommendation in `agent_notes`. Penny acts on that recommendation.

**Config:**
```json
{
  "relationship_type": "required_when",
  "condition_field": "packing_data.packing_status",
  "condition_value": true,
  "required_field": "packing_data.tote_location",
  "required_condition": "not_empty",
  "exclude_when": [{"field": "packing_data.packable", "value": false}]
}
```

---

### PACKED_MISSING_TOTE_ID

| Field | Value |
|---|---|
| Category | `relationship_eval` |
| Violation message | `'{short_name}' is packed but has no tote id` |
| Item classes | All |
| Auto-remediate | ✅ Yes |
| Penny tool | `update_item_packing_data` |
| IG resolution path | `suggest_packing_location` / `verify_item_status` / `manual_review` |
| IG requires_confirmation | False (14 in prod) |

**Rule logic:** Required-when — `packing_data.tote_id` must be non-empty when `packing_data.packing_status` is `true`.

**Why auto-remediate:** Same as `PACKED_MISSING_LOCATION` — IG provides a specific tote_id recommendation from item context.

**Config:**
```json
{
  "relationship_type": "required_when",
  "condition_field": "packing_data.packing_status",
  "condition_value": true,
  "required_field": "packing_data.tote_id",
  "required_condition": "not_empty",
  "exclude_when": [{"field": "packing_data.packable", "value": false}]
}
```

---

### REPAIR_CRITICAL

| Field | Value |
|---|---|
| Category | `field_validation` |
| Validation type | `equals` |
| Violation message | `Decoration '{short_name}' has critical repair status` |
| Item classes | Decoration |
| Auto-remediate | ❌ No |
| IG resolution path | `schedule_maintenance` / `review_maintenance_history` |
| IG requires_confirmation | False (2 in prod — bug, see below) |

**Rule logic:** Fires when `repair_status.criticality == "critical"`.

**Why not auto-remediate:** Non-dismissible rule (once #231 ships). Always requires human sign-off. IG is currently writing `requires_confirmation: False` for this rule — that is a known bug that will be corrected when #231 introduces the `dismissible` field.

**Config:**
```json
{
  "item_classes": ["Decoration"],
  "validation_type": "equals",
  "check_field": "repair_status.criticality",
  "validation_value": "critical"
}
```

---

## Penny Tool → Rule Mapping

| Penny Tool | Rules handled |
|---|---|
| `update_item_packing_data` | `PACKED_MISSING_LOCATION`, `PACKED_MISSING_TOTE_ID`, `MISSING_PACKING_DATA` |
| `initialize_vendor_metadata` | `MISSING_VENDOR_METADATA`, `MISSING_VENDOR_METADATA_FIELDS` |

---

## IG Resolution Path → Rule Mapping

| IG resolution_path | Rules that produce it | Penny action |
|---|---|---|
| `verify_item_status` | `DEPLOYMENT_PACKING_CONFLICT`, `PACKED_MISSING_LOCATION`, `PACKED_MISSING_TOTE_ID` | Act only for PACKED_* rules; skip DEPLOYMENT_PACKING_CONFLICT by rule_id check |
| `suggest_packing_location` | `MISSING_PACKING_DATA`, `PACKED_MISSING_LOCATION`, `PACKED_MISSING_TOTE_ID` | Act |
| `initialize_vendor_metadata` | `MISSING_VENDOR_METADATA`, `MISSING_VENDOR_METADATA_FIELDS` | Act |
| `manual_review` | `DUPLICATE_*`, `EMPTY_VENDOR_METADATA_VALUES`, `MISSING_ACQUISITION_COST`, `MISSING_PRIMARY_PHOTO`, `ORPHANED_COST_PHOTO` | Skip always |
| `update_missing_photo` | `MISSING_PRIMARY_PHOTO` | Skip always |
| `create_acquisition_cost_record` | `MISSING_ACQUISITION_COST` | Skip always |
| `schedule_maintenance` | `REPAIR_CRITICAL` | Skip always |
| `review_maintenance_history` | `REPAIR_CRITICAL` | Skip always |

---

## exclude_when — Item Skip Conditions

`exclude_when` is an optional list of `{field, value}` conditions in `rule_config`. Before a rule's evaluate function runs for an item, `rule_helper.execute_rule` checks every condition in the list — if **any** condition matches, the item is skipped entirely (no violation created or resolved). The check is short-circuit: it stops at the first match.

**Scope:** `exclude_when` is evaluated in `rule_helper.execute_rule`, upstream of all per-category evaluate functions. It works identically for `field_validation`, `relationship_eval`, and `duplicate_detection` rules.

**Field paths** support dot notation (e.g. `"packing_data.packable"`).

**Example config:**
```json
"exclude_when": [
  {"field": "packing_data.packable", "value": false}
]
```

**Currently used by:** `PACKED_MISSING_TOTE_ID`, `PACKED_MISSING_LOCATION` — both exclude non-packable items (`packable=false`) because those items are stored at a location but never assigned a tote, making tote-related rules always false positives for them.

**Executor guard:** `sd_inspector_executor` applies a matching runtime check before writing packing data — if the item has `packing_data.packable=false`, the write is skipped and the violation is left open for manual dismissal. This handles any false-positive violations that were created before the `exclude_when` config was applied.

---

## Open Issues

| Issue | Detail |
|---|---|
| `dismissible` not yet defined | All rules show `TBD` for dismissible. Column to be populated when issue #231 ships. |
| `DEPLOYMENT_PACKING_CONFLICT` requires_confirmation | IG system prompt updated to always write `true` for this rule. Existing open violations were annotated before this fix — clear `agent_notes` to trigger re-annotation if needed. |
