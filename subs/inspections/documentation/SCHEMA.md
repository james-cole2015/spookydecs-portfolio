# Inspector Rules JSON Schema

## Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `rule_id` | string | Unique identifier (uppercase, underscores) | `"MISSING_PRIMARY_PHOTO"` |
| `rule_name` | string | Human-readable name | `"Missing Primary Photos"` |
| `description` | string | Detailed explanation of what the rule checks | `"Decoration items without primary photo"` |
| `severity` | string | Rule severity level | `"Critical"`, `"Attention"`, or `"Info"` |
| `check_type` | string | How the rule is triggered | `"schedule"`, `"event"`, or `"manual"` |
| `entity_types` | array | Which entity types this rule applies to | `["Item"]`, `["Storage"]`, `["Item", "Storage"]` |
| `is_active` | boolean | Whether the rule is enabled | `true` or `false` |
| `created_at` | string | ISO 8601 timestamp | `"2026-01-14T10:30:00.000Z"` |
| `updated_at` | string | ISO 8601 timestamp | `"2026-01-14T10:30:00.000Z"` |

## Optional Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `schedule_expression` | string | Cron expression (required if check_type is "schedule") | `"cron(0 2 * * ? *)"` |
| `rule_config` | object | Rule-specific configuration (flexible JSON) | See below |

## Rule Config Structure

The `rule_config` field is flexible and can contain any rule-specific parameters. Common patterns:

### For Item Validation Rules
```json
{
  "item_classes": ["Decoration", "Storage"],
  "check_field": "images.primary_photo_id",
  "validation_type": "starts_with",
  "validation_value": "PHOTO",
  "message_template": "Item '{short_name}' is missing a primary photo"
}
```

### For Repair Status Rules
```json
{
  "item_classes": ["Decoration"],
  "check_field": "repair_status.criticality",
  "validation_type": "equals",
  "validation_value": "Critical",
  "message_template": "Item '{short_name}' has critical repair status"
}
```

### For Duplicate Detection Rules
```json
{
  "comparison_fields": ["short_name", "id"],
  "fuzzy_match_threshold": 0.85,
  "message_template": "Potential duplicate found: '{short_name}'"
}
```

## Validation Types

- `"starts_with"` - Field value starts with specified string
- `"equals"` - Field value exactly matches
- `"exists"` - Field exists and is not null/empty
- `"missing"` - Field is null or empty
- `"contains"` - Field contains specified substring
- `"greater_than"` - Numeric comparison
- `"less_than"` - Numeric comparison
- `"regex"` - Regular expression match

## Severity Levels

- `"Critical"` - Immediate action required, blocks deployments
- `"Attention"` - Should be addressed soon, non-blocking
- `"Info"` - Informational, low priority

## Check Types

- `"schedule"` - Runs on a cron schedule (requires `schedule_expression`)
- `"event"` - Triggered by item updates/changes
- `"manual"` - Only runs when explicitly invoked

## Complete Example

```json
{
  "rule_id": "MISSING_PRIMARY_PHOTO",
  "rule_name": "Missing Primary Photos",
  "description": "Decoration items without primary photo starting with PHOTO",
  "severity": "Attention",
  "check_type": "schedule",
  "schedule_expression": "cron(0 2 * * ? *)",
  "entity_types": ["Item"],
  "is_active": true,
  "rule_config": {
    "item_classes": ["Decoration"],
    "check_field": "images.primary_photo_id",
    "validation_type": "starts_with",
    "validation_value": "PHOTO",
    "message_template": "Decoration '{short_name}' is missing a primary photo"
  },
  "created_at": "2026-01-14T10:30:00.000Z",
  "updated_at": "2026-01-14T10:30:00.000Z"
}
```
