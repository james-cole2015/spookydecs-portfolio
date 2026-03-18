# Cross-Sub Syncs — EventBridge Architecture

## Overview

SpookyDecs uses AWS EventBridge + SQS to handle cross-subdomain data updates asynchronously. When a Lambda in one sub needs to update a record owned by another sub, it publishes an event to a central EventBridge bus instead of making a direct HTTP or DynamoDB call. A consumer Lambda subscribes via SQS and performs the write.

This pattern decouples producers from consumers, adds automatic retry via SQS, and routes failed messages to a Dead Letter Queue (DLQ) for inspection and replay.

---

## Architecture

```
Producer Lambda (e.g. maintenance)
  │
  └─ publish_event() → EventBridge custom bus (sd-events-{stage})
                              │
                    EventBridge Rule (filter by source)
                              │
                         SQS Queue (spookydecs-items-events-{stage})
                              │  (retries up to 3x, then → DLQ)
                         Consumer Lambda
                              │
                         DynamoDB (target table, selected by env from event payload)
```

### Key design decisions

- **One custom EventBridge bus** per environment: `sd-events-dev` / `sd-events-prod`
- **SQS sits between EventBridge and the consumer** — provides retry, backoff, and DLQ
- **Environment travels with the event** — the `detail.env` field (`"dev"` or `"prod"`) tells the consumer which DynamoDB table to write to. This allows a single consumer Lambda deployment to serve both environments.
- **Fire-and-forget publish** — `publish_event()` logs failures but never raises, so a failed publish does not roll back the producer's primary write.

---

## Shared Publisher Utility

**File:** `lambdas-spookydecs/shared/layers/lambda_utils.py`
**Function:** `publish_event(event_bus_name, source, detail_type, entity_id, data, env)`

```python
publish_event(
    event_bus_name="sd-events-dev",   # from EVENT_BUS_NAME stage var
    source="spookydecs.maintenance",           # domain of the producer
    detail_type="RepairRecord.Created",        # what happened
    entity_id=record_id,                       # primary ID of the changed entity
    data={ ... },                              # domain-specific payload
    env="dev",                                 # from STAGE stage var
)
```

**Event envelope written to EventBridge:**
```json
{
  "source": "spookydecs.{domain}",
  "detail-type": "{Entity}.{Action}",
  "detail": {
    "env": "dev|prod",
    "entity_id": "uuid",
    "data": { "...domain payload..." }
  }
}
```

### Stage variables required on any producer Lambda

| Variable | Value |
|---|---|
| `EVENT_BUS_NAME` | `sd-events-dev` or `sd-events-prod` |
| `STAGE` | `dev` or `prod` |

### IAM required on producer Lambda role

```
events:PutEvents on arn:aws:events:*:*:event-bus/sd-events-*
```

> **Note:** `events:PutEvents` is included in the `next-gen-get-parameters` managed policy — no additional IAM action required on new producer Lambdas.

---

## Consumer Lambda Pattern

Consumer Lambdas are SQS-triggered. They receive a batch of SQS records, each wrapping an EventBridge event. The `detail.env` field is used to select the correct DynamoDB table at runtime.

```python
_TABLE_NAMES = {
    "dev":  os.environ.get("TABLE_NAME_DEV"),
    "prod": os.environ.get("TABLE_NAME_PROD"),
}

def _get_table(env):
    table_name = _TABLE_NAMES.get(env)
    if not table_name:
        raise RuntimeError(f"TABLE_NAME_{env.upper()} not set")
    return dynamodb.Table(table_name)
```

Failed records are returned as `batchItemFailures` so SQS retries only the failed messages (not the whole batch).

### Environment variables required on any consumer Lambda

| Variable | Value |
|---|---|
| `TABLE_NAME_DEV` | Target DynamoDB table name (dev) |
| `TABLE_NAME_PROD` | Target DynamoDB table name (prod) |

### IAM required on consumer Lambda role

```
dynamodb:UpdateItem, dynamodb:GetItem on the target table ARN
sqs:ReceiveMessage, sqs:DeleteMessage, sqs:GetQueueAttributes on the SQS queue ARN
```

---

## AWS Infrastructure (manual setup per environment)

1. **EventBridge custom bus** — `sd-events-dev` / `sd-events-prod`
2. **SQS DLQ** — `sd-{producer}-items-{stage}-dlq` (standard queue, default settings)
3. **SQS main queue** — `sd-{producer}-items-{stage}` (DLQ enabled, max receives = 3, visibility timeout = 360s — must be ≥ 6× Lambda timeout)
4. **EventBridge rule** — source filter → SQS target, with SQS resource policy granting `events.amazonaws.com` the `sqs:SendMessage` action
5. **SQS trigger** on consumer Lambda pointing at main queue

---

---

## Troubleshooting

### EventBridge rule matches but messages never arrive in SQS

**Symptoms:** Producer Lambda logs "Published event: ..." (FailedEntryCount=0), the EventBridge rule is ENABLED with the correct source pattern, the SQS queue and Lambda ESM both exist and are enabled — but the queue stays empty and the consumer Lambda is never invoked.

**Root causes encountered (Storage → Items, March 2026):**

#### 1. IAM role on the EventBridge target blocks delivery

When you create an EventBridge rule targeting SQS via the AWS console, the console automatically attaches an IAM role to the target. If that role's policy does not include `sqs:SendMessage` on the specific queue ARN, EventBridge silently drops events — no DLQ capture, no error metric visible without CloudWatch access.

**Resolution:** Remove the IAM role from the target entirely and rely solely on the SQS resource-based policy. The console does not provide a UI option for this; use the CLI:
```bash
aws events put-targets --rule <rule-name> --event-bus-name <bus-name> \
  --targets '[{"Id":"<target-id>","Arn":"<queue-arn>"}]' --region us-east-2
```
Omitting `RoleArn` from the target JSON drops the role from the delivery path.

#### 2. SQS resource policy `"Id"` field added by the console

When setting an SQS access policy via the AWS console, the console injects `"Id": "__default_policy_ID"` into the policy document. This field is normally harmless, but in combination with other issues it was found on all non-working queues and absent on all working queues.

**Resolution:** Set the resource policy manually without the `Id` field:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "events.amazonaws.com"},
    "Action": "sqs:SendMessage",
    "Resource": "<queue-arn>"
  }]
}
```

#### 3. EventBridge caches a failure state on a queue ARN after repeated delivery failures

After hours or days of failed delivery attempts to a specific SQS queue ARN (e.g. due to the IAM role issue above), EventBridge enters a persistent backoff/failure state on that ARN. Fixing the permissions and recreating the EventBridge rule does not clear this state. Deleting and recreating the SQS queue with the **same name** also does not help — the ARN is identical, so the failure state persists.

**Diagnosis:** Temporarily point the broken rule at a known-good queue (e.g. the maintenance queue). If a message arrives there, the rule and bus are fine and the specific queue ARN is the problem.

**Resolution:** Create a new SQS queue with a **different name** (different ARN). Update the EventBridge rule target, Lambda ESM, and consumer IAM policy to reference the new queue name. The old queue can be deleted.

---

---

## Implemented Syncs

---

### 1. Maintenance → Items (`repair_data`)

**Purpose:** Keep `maintenance.repair_data` on an item record in sync with the state of its repair records in the maintenance table.

**Trigger events:** Creating or completing a repair-type maintenance record.

#### Item schema updated

```json
"maintenance": {
  "inspection_data": {
    "applied_templates": [],
    "next_inspection_date": null,
    "last_synced_at": null
  },
  "maintenance_data": {
    "applied_templates": [],
    "next_maintenance_date": null,
    "last_synced_at": null
  },
  "repair_data": {
    "needs_repair": false,
    "is_critical": false,
    "critical_record_id": null,
    "last_synced_at": null
  }
}
```

This replaces the old `repair_status` field on item records.

#### Producer: `sd_maintenance_handler.py`

Route: `POST /admin/maintenance-records`

When a record is created with `record_type = "repair"`, publishes:

```json
{
  "source": "spookydecs.maintenance",
  "detail-type": "RepairRecord.Created",
  "detail": {
    "env": "dev|prod",
    "entity_id": "{record_id}",
    "data": {
      "item_id": "...",
      "record_id": "...",
      "needs_repair": true,
      "is_critical": true|false,
      "critical_record_id": "{record_id} or null"
    }
  }
}
```

`is_critical` is `true` when `criticality` is `"high"` or `"critical"`.

#### Producer: `sd_maintenance_repair_handler.py`

Route: `POST /admin/maintenance-records/{record_id}/repair`

When a repair is completed, publishes:

```json
{
  "source": "spookydecs.maintenance",
  "detail-type": "Repair.Completed",
  "detail": {
    "env": "dev|prod",
    "entity_id": "{record_id}",
    "data": {
      "item_id": "...",
      "record_id": "...",
      "needs_repair": false,
      "is_critical": false,
      "critical_record_id": null,
      "date_performed": "YYYY-MM-DD"
    }
  }
}
```

#### Consumer: `sd_items_maintenance_consumer.py`

**File:** `lambdas-spookydecs/handlers/items/sd_items_maintenance_consumer.py`
**Trigger:** SQS queue `sd-maintenance-items-dev` / `sd-maintenance-items-prd`
**EventBridge rule source filter:** `spookydecs.maintenance`

| `detail-type` | DynamoDB operation |
|---|---|
| `RepairRecord.Created` | `SET maintenance.repair_data = { needs_repair: true, is_critical, critical_record_id, last_synced_at }` |
| `Repair.Completed` | `SET maintenance.repair_data = { needs_repair: false, is_critical: false, critical_record_id: null, last_synced_at }` |

#### Frontend tracking

Issue [#60](https://github.com/james-cole2015/spookydecs-portfolio/issues/60) tracks updating `subs/items` frontend components from `repair_status?.needs_repair` to `maintenance?.repair_data?.needs_repair`.

---

### 2. Storage → Items (`packing_data`)

**Purpose:** Keep `packing_data` on an item record in sync when items are packed into or removed from a storage unit.

**Trigger events:** Adding items to a storage unit's contents, or removing them.

#### Item schema updated

```json
"packing_data": {
  "packable": true,
  "packing_status": false,
  "single_packed": false,
  "tote_id": "STOR-TOTE-CHR-001",
  "tote_location": "Shed"
}
```

`packing_status: true` means the item is currently packed in a storage unit. `tote_id` and `tote_location` are preserved on unpack as a historical record of where the item was last stored.

#### Producer: `sd_storage_handler.py`

Routes: `POST /storage/self`, `POST /storage/{id}/contents`, `DELETE /storage/{id}/contents`, `POST /storage/pack-single`, `PUT /storage/{id}` (Self-type packed toggle)

When items are packed into storage, publishes per item:

```json
{
  "source": "spookydecs.storage",
  "detail-type": "Item.Packed",
  "detail": {
    "env": "dev|prod",
    "entity_id": "{item_id}",
    "data": {
      "item_id": "...",
      "storage_id": "...",
      "location": "Shed|Attic|Crawl Space|Other"
    }
  }
}
```

When items are removed from storage, publishes per item:

```json
{
  "source": "spookydecs.storage",
  "detail-type": "Item.Unpacked",
  "detail": {
    "env": "dev|prod",
    "entity_id": "{item_id}",
    "data": {
      "item_id": "..."
    }
  }
}
```

#### Consumer: `sd_items_storage_consumer.py`

**File:** `lambdas-spookydecs/handlers/items/sd_items_storage_consumer.py`
**Trigger:** SQS queue `sd-storage-items-dev` / `sd-storage-items-prd`
**EventBridge rule source filter:** `spookydecs.storage`

| `detail-type` | DynamoDB operation |
|---|---|
| `Item.Packed` | `SET packing_data.packing_status = true, packing_data.tote_id, packing_data.tote_location` |
| `Item.Unpacked` | `SET packing_data.packing_status = false, status = "Active"` |

Uses `_ensure_packing_data_map()` for lazy migration of items missing the `packing_data` map.

---

### 3. Finance → Items (`vendor_metadata`)

**Purpose:** Keep `vendor_metadata` on item records in sync when acquisition or pack costs are created, updated, or deleted.

**Trigger events:** Creating, updating, or deleting an acquisition cost with a `related_item_id`, or any pack cost.

#### Producer: `sd_finance_handler.py`

Routes: `POST /finance/costs`, `PUT /finance/costs/{cost_id}`, `DELETE /finance/costs/{cost_id}/delete`

When an acquisition cost (with `related_item_id`) or pack cost is created or updated, publishes per cost:

```json
{
  "source": "spookydecs.finance",
  "detail-type": "VendorMetadata.Synced",
  "detail": {
    "env": "dev|prod",
    "entity_id": "{cost_id}",
    "data": {
      "cost_id": "...",
      "item_ids": ["item_id_1"],
      "vendor_store": "...",
      "manufacturer": "...",
      "cost": "12.99",
      "value": "12.99"
    }
  }
}
```

For pack costs, `item_ids` contains all `pack_item_ids`; for single acquisition costs it contains just `related_item_id`. `cost` and `value` use `cost_per_item`/`value_per_item` for packs, `total_cost`/`value` for single items.

When a qualifying cost is deleted, publishes:

```json
{
  "source": "spookydecs.finance",
  "detail-type": "VendorMetadata.Cleared",
  "detail": {
    "env": "dev|prod",
    "entity_id": "{cost_id}",
    "data": {
      "cost_id": "...",
      "item_ids": ["item_id_1"]
    }
  }
}
```

#### Consumer: `sd_items_finance_consumer.py`

**File:** `lambdas-spookydecs/handlers/items/sd_items_finance_consumer.py`
**Trigger:** SQS queue `sd-finance-items-dev` / `sd-finance-items-prd`
**EventBridge rule source filter:** `spookydecs.finance`

| `detail-type` | DynamoDB operation |
|---|---|
| `VendorMetadata.Synced` | For each item_id: `SET vendor_metadata.{vendor_store, manufacturer, cost, value}` |
| `VendorMetadata.Cleared` | For each item_id: `SET vendor_metadata fields = ""` |

---

### 4. Ideas → Finance + Items (`build cost aggregation`)

**Purpose:** When an idea is marked as Built, aggregate all associated idea cost records into a single acquisition cost record and sync the total to the item's `vendor_metadata`.

**Trigger events:** Transitioning an idea's status to `"Built"`.

#### Producer: `sd_ideas_handler.py`

Route: `PUT /ideas`

When `status` transitions to `"Built"`, publishes:

```json
{
  "source": "spookydecs.ideas",
  "detail-type": "IdeaBuild.Complete",
  "detail": {
    "env": "dev|prod",
    "entity_id": "{idea_id}",
    "data": {
      "idea_id": "...",
      "item_id": "...",
      "season": "Halloween|Christmas|Shared"
    }
  }
}
```

#### Consumer 1: `sd_ideas_build_consumer.py`

**File:** `lambdas-spookydecs/handlers/ideas/sd_ideas_build_consumer.py`
**Trigger:** SQS queue `sd-ideas-items-dev` / `sd-ideas-items-prd`
**EventBridge rule source filter:** `spookydecs.ideas`

| `detail-type` | Action |
|---|---|
| `IdeaBuild.Complete` | Scan costs table for all records with `related_idea_id = idea_id`, aggregate `total_cost`, write deterministic acquisition cost record `acq-build-{idea_id}-{item_id}` to costs table |

#### Lambda environment variables (Consumer 1)

| Variable | Value |
|---|---|
| `COSTS_TABLE_DEV` | `cost_records_dev` |
| `COSTS_TABLE_PROD` | `cost_records_prod` |

#### Idempotency

The acquisition cost record uses `cost_id = acq-build-{idea_id}-{item_id}` with a `ConditionExpression` guard — safe to retry.

#### Consumer 2: `sd_items_ideas_consumer.py`

**File:** `lambdas-spookydecs/handlers/items/sd_items_ideas_consumer.py`
**Trigger:** SQS queue `sd-items-ideas-dev` / `sd-items-ideas-prd`
**EventBridge rule:** Second target on the same `spookydecs-ideas-to-items-{stage}` rule (fan-out)

| `detail-type` | Action |
|---|---|
| `IdeaBuild.Complete` | Look up `acq-build-{idea_id}-{item_id}` from costs table (retries via SQS if Consumer 1 hasn't written it yet), then `SET vendor_metadata.{vendor_store="SpookyDecs Ent", manufacturer="SpookyDecs Ent", cost=total_cost, value=total_cost}` |

#### Lambda environment variables (Consumer 2)

| Variable | Value |
|---|---|
| `TABLE_NAME_DEV` | `sd_items_records_dev` |
| `TABLE_NAME_PROD` | `sd_items_records_prod` |
| `COSTS_TABLE_DEV` | `cost_records_dev` |
| `COSTS_TABLE_PROD` | `cost_records_prod` |

---

### 5. Images → Items (`images` back-links)

**Purpose:** Keep `images.primary_photo_id` and `images.secondary_photo_ids` on item and storage records in sync whenever a photo is confirmed or deleted.

**Trigger events:** Confirming a new photo upload or deleting an existing photo.

#### Item/storage schema updated

```json
"images": {
  "primary_photo_id": "PHOTO-20260227-152034-6d3a8926",
  "secondary_photo_ids": ["PHOTO-...", "PHOTO-..."]
}
```

#### Producer 1: `sd_photos_confirm.py`

Route: `POST /admin/images/confirm`

After writing the photo record to the images DynamoDB table, publishes:

```json
{
  "source": "spookydecs.images",
  "detail-type": "Image.Uploaded",
  "detail": {
    "env": "dev|prod",
    "entity_id": "{photo_id}",
    "data": {
      "context": "item|storage",
      "entity_id": "{item_id or storage_id}",
      "photo_id": "...",
      "is_primary": true|false
    }
  }
}
```

Also calls `s3.delete_object_tagging()` on the uploaded S3 object(s) to clear the `confirmed=false` lifecycle tag set at presign time.

#### Producer 2: `sd_photos_delete.py`

Route: `DELETE /admin/images/{photo_id}`

After deleting S3 objects and the photo DynamoDB record, publishes:

```json
{
  "source": "spookydecs.images",
  "detail-type": "Image.Deleted",
  "detail": {
    "env": "dev|prod",
    "entity_id": "{photo_id}",
    "data": {
      "context": "item|storage",
      "entity_id": "{item_id or storage_id}",
      "photo_id": "...",
      "was_primary": true|false,
      "new_primary_photo_id": "{photo_id or null}"
    }
  }
}
```

The `is_primary` flip on the promoted photo record (in the images table) is performed by the delete handler before publishing.

#### Consumer: `sd_items_images_consumer.py`

**File:** `lambdas-spookydecs/handlers/images/sd_items_images_consumer.py`
**Trigger:** SQS queue `sd-items-images-{stage}`
**EventBridge rule source filter:** `spookydecs.images`

| `detail-type` | Action |
|---|---|
| `Image.Uploaded` | `SET images.primary_photo_id = photo_id` (if `is_primary`) or `list_append images.secondary_photo_ids` (if not `is_primary`) |
| `Image.Deleted` | Read-modify-write: remove `photo_id` from `secondary_photo_ids`; if `was_primary`, set `primary_photo_id = new_primary_photo_id` and remove promoted photo from secondaries |

#### Lambda environment variables

| Variable | Value |
|---|---|
| `TABLE_NAME_DEV` | `sd_items_records_dev` |
| `TABLE_NAME_PROD` | `sd_items_records_prod` |

#### S3 orphan cleanup (presign-side)

`sd_photos_presign.py` includes `Tagging: 'confirmed=false'` in the presigned URL params. The CDN `photo-upload-service.js` must send `x-amz-tagging: confirmed%3Dfalse` in the S3 PUT request. An S3 lifecycle rule on the images bucket with tag filter `confirmed=false` expires unconfirmed objects after 1 day.

---

### 6. Inspector → Violations (`violation lifecycle`)

**Purpose:** Decouple inspector rule evaluation from persistence. Inspector Lambdas evaluate items/photos, determine violation actions, and publish events. The violations consumer owns all DynamoDB writes to the `inspector_violations` table.

**Trigger events:** Any inspector Lambda evaluation that results in a new, updated, or resolved violation.

#### Producers (all 5 inspector Lambdas)

| Lambda | Category | Write path |
|---|---|---|
| `sd_inspector_field_validation.py` | field_validation | via `execute_rule()` + `event_publisher` callback |
| `sd_inspector_relationship_checker.py` | relationship_eval | via `execute_rule()` + `event_publisher` callback |
| `sd_inspector_entity_relationship_checker.py` | required_related_entity | via `handle_violation()` direct calls |
| `sd_inspector_duplicate_detection.py` | duplicate_detection | via `handle_violation()` direct calls |
| `sd_inspector_orphaned_images.py` | orphaned_photos | via inline `handle_violation()` (entity_type='Photo') |

All handlers still **read** the violations table (to check existing state / dismiss status) but no longer write to it. Instead, `handle_violation()` / `execute_rule()` return event payloads that the handler publishes via `publish_event()`.

**`Violation.Detected`** — published when a new or recurring violation is created, or when an existing open violation is re-evaluated:

```json
{
  "source": "spookydecs.inspector",
  "detail-type": "Violation.Detected",
  "detail": {
    "env": "dev|prod",
    "entity_id": "{violation_id}",
    "data": {
      "violation_id": "...",
      "item_id": "...",
      "rule_id": "...",
      "severity": "Attention|Warning|Critical",
      "violation_details": { "...rule-specific details..." },
      "entity_type": "Item|Photo",
      "status": "open",
      "action": "created|updated"
    }
  }
}
```

**`Violation.Resolved`** — published when a previously-open violation is no longer triggered:

```json
{
  "source": "spookydecs.inspector",
  "detail-type": "Violation.Resolved",
  "detail": {
    "env": "dev|prod",
    "entity_id": "{violation_id}",
    "data": {
      "violation_id": "...",
      "item_id": "...",
      "rule_id": "..."
    }
  }
}
```

#### Consumer: `sd_violations_consumer.py`

**File:** `lambdas-spookydecs/handlers/inspector/sd_violations_consumer.py`
**Trigger:** SQS queue `sd-inspector-violations-dev` / `sd-inspector-violations-prd`
**EventBridge rule source filter:** `spookydecs.inspector`

| `detail-type` | `data.action` | DynamoDB operation |
|---|---|---|
| `Violation.Detected` | `created` | `put_item` — full violation record with all fields + timestamps |
| `Violation.Detected` | `updated` | `update_item` — SET `violation_details`, `severity`, `last_evaluated_at`, `updated_at` |
| `Violation.Resolved` | — | `update_item` — SET `#status = 'resolved'`, `resolved_at`, `last_evaluated_at`, `updated_at` |

#### Lambda environment variables (consumer)

| Variable | Value |
|---|---|
| `TABLE_NAME_DEV` | `inspector_violations_dev` (or equivalent) |
| `TABLE_NAME_PROD` | `inspector_violations_prod` (or equivalent) |

#### Stage variables required on all 5 inspector Lambdas

| Variable | Value |
|---|---|
| `EVENT_BUS_NAME` | `sd-events-dev` or `sd-events-prod` |
| `STAGE` | `dev` or `prod` |

#### Infrastructure checklist (manual AWS console)

- [ ] SQS DLQ: `sd-inspector-violations-dev-dlq` / `sd-inspector-violations-prd-dlq`
- [ ] SQS main queue: `sd-inspector-violations-dev` / `sd-inspector-violations-prd` (visibility 30s, redrive to DLQ after 3 receives, resource policy: `events.amazonaws.com` → `sqs:SendMessage`, no `Id` field, no `RoleArn` on EB target)
- [ ] EventBridge rule on `sd-events-dev`/`sd-events-prd`: source filter `{ "source": ["spookydecs.inspector"] }`, target = SQS queue above (no role attached to target)
- [ ] Lambda `sd_violations_consumer`: Python 3.12, attach `spookydecs-python-utils` layer, env vars above, IAM: `dynamodb:PutItem dynamodb:UpdateItem` on violations table + SQS queue permissions, SQS trigger on main queue (batch size 10)
- [ ] Add `EVENT_BUS_NAME` + `STAGE` stage variables on all 5 inspector Lambda API GW stage configs

---

## Design Rules

### Consumers must be pure — no fan-out via publishing

EventBridge targets must be pure consumers: they receive an event and write to exactly one data store. A consumer must never publish events to another bus.

If a single event needs to trigger writes to multiple data stores, use **EventBridge fan-out**: add multiple SQS targets to the same EventBridge rule (up to 5), one per consumer. Each consumer handles its own domain independently.

**Do not use SNS** between EventBridge and SQS — EventBridge natively supports multiple SQS targets per rule. SNS adds an unnecessary hop with no benefit in this stack.

---

## Adding a New Cross-Sub Sync

### Step 1 — Producer Lambda: publish the event

After the successful primary DynamoDB write, call `publish_event()` from `lambda_utils`:

```python
from lambda_utils import publish_event

publish_event(
    event_bus_name=event.get("event_bus_name"),   # from stage_vars.get("EVENT_BUS_NAME")
    source="spookydecs.{domain}",                  # e.g. "spookydecs.maintenance"
    detail_type="{Entity}.{Action}",               # e.g. "RepairRecord.Created"
    entity_id=record_id,
    data={
        "target_item_id": "...",                   # whatever the consumer needs
        # ... other domain fields
    },
    env=event.get("stage", "prod"),               # from stage_vars.get("STAGE", "prod")
)
```

Ensure the producer Lambda's API Gateway stage has these stage variables set:

| Variable | Value |
|---|---|
| `EVENT_BUS_NAME` | `sd-events-dev` or `sd-events-prod` |
| `STAGE` | `dev` or `prod` |

`events:PutEvents` IAM permission is already covered by the `next-gen-get-parameters` managed policy — no additional action needed.

---

### Step 2 — Consumer Lambda: create the handler file

Create `handlers/{target-sub}/sd_{target}__{source}_consumer.py`. Follow this structure:

```python
import json, os
from datetime import datetime
import boto3

dynamodb = boto3.resource("dynamodb")

_TABLE_NAMES = {
    "dev":  os.environ.get("TABLE_NAME_DEV"),
    "prod": os.environ.get("TABLE_NAME_PROD"),
}

def _get_table(env):
    name = _TABLE_NAMES.get(env)
    if not name:
        raise RuntimeError(f"TABLE_NAME_{env.upper()} not set")
    return dynamodb.Table(name)

def lambda_handler(event, context):
    failures = []
    for record in event.get("Records", []):
        message_id = record.get("messageId", "unknown")
        try:
            body = json.loads(record["body"])
            detail_type = body.get("detail-type", "")
            detail = body.get("detail", {})
            env = detail.get("env", "prod")
            table = _get_table(env)

            if detail_type == "{Entity}.{Action}":
                _handle_{action}(table, detail)
            else:
                print(f"Unhandled detail-type: {detail_type} — skipping")

        except Exception as e:
            print(f"ERROR processing message {message_id}: {e}")
            import traceback; traceback.print_exc()
            failures.append({"itemIdentifier": message_id})

    if failures:
        return {"batchItemFailures": failures}
```

**Important:** return `batchItemFailures` so SQS only retries failed messages, not the whole batch.

Register the new handler in **`deploy-sqs-handlers.yml`** (do not create a separate workflow file). Four places to update:

1. **`paths:`** — add the new file path so the workflow triggers on changes to it
2. **`filters:`** in the `detect-changes` job — add a new key/path entry
3. **`VALID_KEYS` / `FN_MAP` / `PATH_MAP`** in the `deploy` job — add the key → function name and file path mappings
4. **`matrix: lambda:`** in the `update-layer` job — add the Lambda function name so it receives layer updates when `lambda_utils.py` changes

---

### Step 3 — AWS Console: SQS queues

**Queues are per consumer sub, not per producer.** If a queue already exists for the target sub (e.g. `spookydecs-items-events-dev`), skip queue creation entirely — just add a new EventBridge rule pointing at the existing queue (Step 4) and add a new `elif detail_type == "..."` branch in the existing consumer Lambda.

If no queue exists yet for this sub, create one for each environment (dev + prod):

1. **Create DLQ** — standard queue, name: `spookydecs-{consumer}-events-{stage}-dlq`, all defaults
2. **Create main queue** — standard queue, name: `spookydecs-{consumer}-events-{stage}`
   - Visibility timeout: **30s**
   - Redrive policy: DLQ above, max receives = **3**
   - Add a **resource policy** allowing EventBridge to send messages:
     ```json
     {
       "Effect": "Allow",
       "Principal": { "Service": "events.amazonaws.com" },
       "Action": "sqs:SendMessage",
       "Resource": "<queue-arn>"
     }
     ```

---

### Step 4 — AWS Console: EventBridge rule

On the `sd-events-dev` / `sd-events-prod` custom bus:

1. Create a new rule
2. **Event pattern** — filter by source:
   ```json
   { "source": ["spookydecs.{domain}"] }
   ```
3. **Target** — select the SQS main queue created in Step 3
4. **Do not attach an IAM role to the target.** The AWS console shows a "Use execution role" checkbox when adding an SQS target — **uncheck it**. The SQS queue's resource policy (set in Step 3) already authorizes delivery; adding a role causes EventBridge to silently drop all events.

   If you already saved the rule with a role attached, strip it via CLI:
   ```bash
   # Get target ID and ARN
   aws events list-targets-by-rule \
     --rule <rule-name> \
     --event-bus-name sd-events-{stage} \
     --region us-east-2

   # Re-put target without RoleArn
   aws events put-targets \
     --rule <rule-name> \
     --event-bus-name sd-events-{stage} \
     --targets '[{"Id":"<Id-from-list-targets>","Arn":"<queue-arn>"}]' \
     --region us-east-2
   ```
   Verify with `list-targets-by-rule` — output should show only `Id` and `Arn`, no `RoleArn`.

---

### Step 5 — AWS Console: Lambda setup

1. **Create the Lambda function** (if new) — Python 3.12, attach the shared `lambda-utils` layer
2. **Environment variables:**

   | Variable | Value |
   |---|---|
   | `TABLE_NAME_DEV` | Target DynamoDB table name (dev) |
   | `TABLE_NAME_PROD` | Target DynamoDB table name (prod) |

3. **IAM role** — add an inline policy:
   ```
   dynamodb:UpdateItem, dynamodb:GetItem on the target table ARN
   sqs:ReceiveMessage, sqs:DeleteMessage, sqs:GetQueueAttributes on the SQS queue ARN
   ```

4. **Add SQS trigger** — point at the main queue from Step 3, batch size = 10

---

### Step 6 — Documentation

Add the new sync to the **Implemented Syncs** section of this document following the existing pattern:
- Producer file + route
- Event schema (JSON)
- Consumer file + trigger queue
- Table of `detail-type` → DynamoDB operation
