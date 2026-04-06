# SpookyDecs Documentation

## Table of Contents

- [Admin](#admin) - User management, permissions, and system configuration
- [Auth](#auth) - Authentication and authorization
- [Deployments](#deployments) - Setup tracking, work sessions, and connections
- [Finance](#finance) - Cost tracking, receipt scanning, and spend statistics
- [Gallery](#gallery) - Photo management and decoration images
- [Ideas](#ideas) - Custom decoration concepts and inspirations
- [Images](#images) - Centralized photo management across all entities
- [Items](#items) - Inventory management for decorations, accessories, and lights
- [Main](#main) - Dashboard and overview
- [Maintenance](#maintenance) - Maintenance records, inspections, and schedule templates
- [Storage](#storage) - Storage location and tote management
- [Workbench](#workbench) - Seasonal monitoring dashboard for ideas and maintenance

---

## Admin

Central admin hub for SpookyDecs. Aggregates stats from all other subs (items, deployments, maintenance, storage, ideas, images, workbench) into a system-wide dashboard. Includes a search text indexing tool and the **Iris AI assistant** — an agentic Claude model (via Bedrock) that can answer questions and take actions across the platform. Used exclusively by internal admin staff.

### Main Views

- **Dashboard** — System map with sub status cards and aggregated stats across the platform
- **Search Text** — Trigger a search text index rebuild for item catalog search
- **About** — About page

### Iris AI Assistant

Iris is an agentic Claude model that can answer questions and take actions via 6 tools: `search_items`, `get_item_detail`, `search_storage`, `pack_item`, `create_maintenance_record`, and `get_maintenance_records`. Iris uses Bedrock in `us-east-2` and forwards auth cookies to all tool API calls.

---

## Auth

**Coming soon** - Documentation for authentication and authorization.

---

## Deployments

Manages the full lifecycle of seasonal decoration deployments — from builder planning (zones, item placement) through active deployment (sessions, power connections) to teardown and historical archiving. Internal staff use it during setup and takedown of seasonal displays.

### Key Concepts

- **Zones** — Each deployment has exactly 3 zones (FY, BY, SY — front yard, back yard, side yard). Items are assigned to zones during the builder phase.
- **Sessions** — Work periods within an active deployment. Multiple sessions can be logged per deployment.
- **Connections** — Item-to-power-port links recorded during a session.
- **Staging** — Tote-by-tote workflow for loading items from storage before deployment begins.

### Main Views

- **Dashboard** — Active deployments list with status overview
- **Builder** — Create a new deployment and assign items to zones
- **Zone Detail** — Items assigned to a specific zone
- **Session** — Log and review work sessions; record power connections
- **Staging** — Step through totes to stage items for the deployment
- **Complete / Teardown** — Finalize the deployment or begin teardown workflow
- **Historical** — Archived (completed + torn down) deployments
- **Stats** — Deployment statistics dashboard

---

## Finance

Tracks all financial costs associated with SpookyDecs inventory — acquisitions, repairs, maintenance, builds, and supply purchases. Supports AI receipt scanning (Claude Vision), photo upload for receipts, cost-to-item linking, and vendor metadata sync to the items table.

### Key Concepts

- **Cost Records** — Individual cost events linked to an item, idea, or maintenance record. Supports single-item (`item`) and pack (`pack`) purchases. Pack records store per-item computed costs across multiple items bought together.
- **Receipt Scanning** — Upload a receipt photo and Claude Vision extracts line items automatically, creating cost records. Extraction jobs are logged to an audit table.
- **Vendor Metadata Sync** — Acquisition and pack costs publish `VendorMetadata.Synced` events to EventBridge. The items sub consumes these asynchronously to keep vendor/manufacturer data current on item records.

### Main Views

- **Landing** — Hub page with quick links to all finance sections
- **Records** — Browse all cost records with filters for cost type, category, vendor, item, date range, and more
- **New Cost** — Create a single-item or pack cost record
- **Cost Detail** — View, edit, or delete a cost record
- **Items** — Browse inventory items to attach or review costs
- **Item Costs** — All cost records for a specific item
- **Receipts** — Receipt photo grid; upload receipts for AI extraction
- **Statistics** — Spend statistics panel across all cost types and categories

---

## Gallery

Public-facing photo gallery for SpookyDecs seasonal displays. Serves three sections browsable without login. Admin staff manage uploads, curation, and AI tag suggestion (matches gallery photos to inventory items via Cohere Embed v4).

### Sections

- **Showcase** — Curated featured display photos with a hero carousel; featured photos sort first
- **Progress** — Build and work-in-progress photos
- **Community** — Community photos (browsing only; no public upload)

### Filters

- Season (Halloween, Christmas, Shared)
- Year
- Tags (any-match — a photo matches if it has at least one of the requested tags)

---

## Ideas

Manages decoration ideas through their full lifecycle — from initial concept through active build to completion. End users browse, create, and track decoration ideas by season (Halloween, Christmas, Shared). Ideas move through statuses (Considering → Planning → Workbench → Built/Abandoned). When a build completes, an EventBridge event fires that triggers item record creation in the items sub and cost aggregation in finance.

### Key Concepts

- **Ideas** — Individual decoration concepts tracked by season, status, and planning bucket (e.g., "2026 Off-Season")
- **Build Workspace** — Interactive workspace for ideas in Workbench status. Tracks build sessions, materials, time spent, and build photos inline
- **Build Complete** — Transitioning an idea to Built publishes an `IdeaBuild.Complete` event; the items sub creates an inventory record and the finance sub aggregates a total acquisition cost

### Main Views

- **Landing** — Hub with season cards (Halloween, Christmas, Shared) and a workbench summary badge
- **List** — Season-filtered idea grid (Workbench, Built, and Abandoned ideas are hidden here — use Workbench view for active builds)
- **Workbench** — Grid of all ideas currently in active build (status = Workbench)
- **Create / Edit** — New idea form; edit mode reuses the same form
- **Idea Detail** — Full detail view with status transitions, photos, cost log, and link to build workspace
- **Build Workspace** — Interactive build session: inline field editing, session logging, materials tracking, build photo uploads

---

## Images

Centralized photo management system for SpookyDecs. Handles the full lifecycle of photos across all subs: presigned S3 upload URLs, upload confirmation, DynamoDB record creation, thumbnail generation, primary/secondary photo promotion, gallery curation, and photo deletion with cascade updates. Photos can be linked to items, storage units, deployments, ideas, and maintenance records. Used primarily by internal admin staff.

### Key Concepts

- **Photo Contexts** — Each photo is tagged with a `photo_type` (e.g., `catalog`, `build`, `inspection`, `storage`, `gallery_showcase`) and linked to at most one entity (item, storage unit, idea, deployment, or maintenance record)
- **Presign / Confirm Flow** — Upload requires two API calls: `POST /admin/images/presign` (get S3 URL) then `POST /admin/images/confirm` (write DDB record). Unconfirmed uploads auto-expire after 24h via S3 lifecycle rule
- **Thumbnails** — Auto-generated 400×400 JPEG thumbnails by S3 event trigger; `thumb_cloudfront_url` may not exist immediately after upload
- **Primary Photo** — Each entity has a single primary photo promoted via `POST /admin/images/set_primary`; uses a DDB transaction to demote all other primaries simultaneously
- **Gallery Curation** — Showcase, Progress, and Community sections have their own `photo_type` values and `gallery_data` metadata (display name, location, featured status, sort order)

### Main Views

- **Landing** — Hub with 4 navigation cards
- **List** — Admin grid with filtering by photo type, season, year, public status, and entity references
- **Browse** — Visual photo browser with full-screen lightbox, keyboard/swipe navigation, and 4-second slideshow
- **Gallery** — Gallery manager for curating Showcase, Progress, and Community sections; toggle featured, set sort order, edit/delete cards
- **Entities** — Photos grouped by linked entity (item, storage unit, idea); drill into a specific entity to see all its photos
- **Photo Detail / Edit** — Single photo view with tag pills, AI tag suggestion (Claude Vision), entity references, and gallery metadata editing

---

## Items

**Coming soon** - Documentation for inventory management (decorations, accessories, lights).

---

## Main

**Coming soon** - Documentation for the main dashboard and overview.

---

## Maintenance

The Maintenance sub tracks the full lifecycle of maintenance activity for inventory items — inspections, repairs, and recurring schedule templates.

### Key Concepts

- **Maintenance Records** — Individual maintenance events (inspection, repair, cleaning, etc.) tied to a specific item. Each record can include photos, materials used, time spent, notes, and cost.
- **Inspections** — Structured inspection workflows that generate tasks and produce an inspection report as part of a record.
- **Schedule Templates** — Reusable templates that define recurring maintenance tasks for a class type (e.g., annual inspection for all Inflatables). Templates can be applied to individual items or in bulk, and auto-generate future records.

### Main Views

- **Records Table** — Browse all maintenance records with filters for item, status, type, and date range. Supports mobile card view and desktop table view.
- **Record Detail** — Full detail view with tabs for summary, photos, materials, and inspection results. Includes before/after photo carousel.
- **Schedules** — Manage schedule templates: create, edit, apply to items, and view all records generated from a template.

### Filters

- Item ID / item search
- Record type (inspection, repair, cleaning, etc.)
- Status (open, complete, cancelled)
- Date range

### Stats Cards

The landing page displays summary stats across all records: total records, open records, records completed this season, and total maintenance cost.

---

## Storage

Manages physical storage units (totes and shelving) used to organize Halloween and Christmas decorations before deployments. Storage units are represented as a `class=Storage` item type in the shared items table — there is no separate storage table. Internal staff use this sub to track what is packed where before a deployment begins.

### Key Concepts

- **Storage Units** — Totes or self-storage units assigned a season (Halloween, Christmas, Shared) and a physical location (Shed, Attic, Crawl Space, Other). Unit IDs use a sequential format: `TOTE-HAL-3`
- **Packing** — Workflow for assigning items to a tote step by step. Pack/unpack actions publish `Item.Packed` / `Item.Unpacked` events to EventBridge; the items sub consumes these to update item packing data asynchronously
- **Non-Packable Items** — Items that cannot be assigned to a tote (e.g., large props) are tracked separately in the Non-Packable view
- **Photo Management** — Each unit has its own photo gallery; deleting a unit cascades photo record removal from the images table

### Main Views

- **Landing** — Hub with quick links: List, Create, Statistics, Non-Packable
- **List** — Browse all units with filter bar (season, location, size, status)
- **Unit Detail** — Contents panel (packed items), photo gallery, and unit metadata
- **Create** — Multi-step wizard for creating a new tote or self-storage unit
- **Pack** — Step-by-step packing workflow: search and assign items to a unit
- **Statistics** — Packing stats dashboard (units packed, items packed, capacity utilization)

---

## Workbench

Read-only seasonal monitoring dashboard. Aggregates ideas and maintenance records from their respective tables and presents them in a 3-column view (Off-Season, Halloween, Christmas), grouped by year. Active and completed items are shown per season bucket. Users can click cards to preview details and open the source record in its home sub (Ideas or Maintenance). Used exclusively by internal admin staff.

### Main Views

- **Seasonal View** — 3-column monitor layout (Off-Season / Halloween / Christmas) organized by year bucket. Each column shows active ideas (Considering, Planning, Workbench) and maintenance records (inspections, repairs, maintenance tasks). Completed items are collapsed into a disclosure section. Clicking a card opens a preview modal with a link to the full record.
