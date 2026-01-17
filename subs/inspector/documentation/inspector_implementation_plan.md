# Inspector Feature Implementation Plan

## Phase 1: Foundation (Week 1)
**Goal:** Get the basic orchestration working with 1-2 simple rules.

### Backend Tasks
- [ ] **Create DynamoDB Tables**
    - `inspector_rules` (PK: `rule_id`)
    - `inspector_violations` (PK: `violation_id`, SK: `detected_at`)
    - Add GSI on `inspector_violations`: `entity_id` + `rule_id` (for deduplication)
- [ ] **Build Orchestrator Lambda** (`inspector-orchestrator.py`)
    - Reads rules from DynamoDB
    - Invokes rule Lambdas (start with 2 rules)
    - Aggregates results
    - Saves violations to DynamoDB
    - Marks resolved violations
- [ ] **Build 2 Simple Rule Lambdas**
    - `inspector-rule-missing-photos.py` (easiest - just check if field is null)
    - `inspector-rule-items-need-repair.py` (query items where `needs_repair=true`)
- [ ] **Seed Rules Config**
    - Insert 2 rule definitions into `inspector_rules` table
- [ ] **Create API Endpoints**
    - `POST /inspector/check` → Triggers orchestrator manually
    - `GET /inspector/violations` → Returns violations list (with filters)
    - `PATCH /inspector/violations/{id}` → Dismiss violation

### Testing
- [ ] Manually invoke orchestrator Lambda
- [ ] Verify violations are written to DynamoDB
- [ ] Verify deduplication works
- [ ] Verify resolved violations are marked

**Deliverable:** Working backend that can detect 2 types of violations.

---

## Phase 2: Basic UI (Week 2)
**Goal:** Display violations in a simple list view.

### Frontend Tasks
- [ ] **Create Inspector Subdomain Structure**
    ```text
    inspector/
    ├── index.html
    ├── css/
    │   └── inspector.css
    └── js/
        ├── app.js (router setup)
        ├── utils/
        │   ├── inspector-api.js
        │   └── router.js
        ├── components/
        │   ├── ViolationsList.js
        │   └── SummaryCards.js
        └── pages/
            └── inspector-main.js
    ```
- [ ] **Build Core Components**
    - `SummaryCards.js` → Display counts by severity
    - `ViolationsList.js` → Render violation cards
    - Basic filtering (by severity only)
- [ ] **API Integration**
    - Fetch violations from backend
    - Display in list
    - "View Item" button (deep link to item page)
    - "Dismiss" button (calls API)
    - "Run Manual Check" button (triggers orchestrator)

### Testing
- [ ] Load violations in UI
- [ ] Click "View Item" → navigates to item
- [ ] Click "Dismiss" → violation disappears
- [ ] Click "Run Manual Check" → new check runs, UI refreshes

**Deliverable:** Basic Inspector UI showing 2 types of violations with dismiss capability.

---

## Phase 3: Add More Rules (Week 3)
**Goal:** Expand to 8-10 business rules.

### Backend Tasks
- [ ] **Build Additional Rule Lambdas**
    - `inspector-rule-off-season-deployed.py`
    - `inspector-rule-unpacked-storage.py`
    - `inspector-rule-missing-cost-records.py`
    - `inspector-rule-missing-vendor-metadata.py`
    - `inspector-rule-deployed-without-deployment-record.py`
    - `inspector-rule-storage-contents-mismatch.py` (items reference storage that doesn't match storage.contents)
- [ ] **Add Rule Definitions to DynamoDB**
    - Insert config for each new rule
- [ ] **Test Each Rule**
    - Verify each Lambda returns correct violations
    - Test edge cases (null values, missing fields, etc.)

### Frontend Tasks
- [ ] **Add Category Grouping**
    - Group violations by category in UI
    - Expandable/collapsible sections
- [ ] **Add More Filters**
    - Filter by category
    - Filter by season
    - Filter by status (active/dismissed/resolved)

**Deliverable:** Inspector can detect 8-10 different violation types.

---

## Phase 4: EventBridge Automation (Week 4)
**Goal:** Automate daily and seasonal checks.

### Backend Tasks
- [ ] **Create EventBridge Rules**
    - Daily check at 2am
    - Seasonal checks (Oct 1, Nov 15, Jan 15, May 1)
- [ ] **Add SNS Notifications**
    - Create SNS topic: `inspector-alerts`
    - Configure email subscription
    - Orchestrator sends notification if critical violations found during seasonal check
- [ ] **Add Season Detection Logic**
    - `get_current_season()` function in orchestrator
    - Rules can be season-aware

### Testing
- [ ] Manually trigger EventBridge rules
- [ ] Verify orchestrator runs on schedule
- [ ] Verify SNS emails are sent for critical violations
- [ ] Test season detection logic

**Deliverable:** Automated daily/seasonal checks with email alerts.

---

## Phase 5: Enhanced UI Features (Week 5)
**Goal:** Polish the UI with advanced features.

### Frontend Tasks
- [ ] **Add Tabs**
    - All Issues | Data Quality | Seasonal Compliance | Repair Queue | Resolved/History
- [ ] **Add Search**
    - Search violations by item name, ID, message
- [ ] **Add Contextual Actions**
    - "Mark as Stored" button for off-season violations
    - "Mark as Packed" button for unpacked storage violations
    - "Upload Photo" button for missing photo violations
    - Quick-fix modals for common actions
- [ ] **Add History View**
    - Show resolved violations
    - Show when they were resolved
    - Trend chart (violations over time)
- [ ] **Mobile Optimization**
    - Responsive card layout
    - Simplified filters for mobile

**Deliverable:** Polished, feature-complete Inspector UI.

---

## Phase 6: Rule Configuration UI (Week 6)
**Goal:** Allow admins to enable/disable rules without code changes.

### Frontend Tasks
- [ ] **Create Rule Settings Page** (`/inspector/settings`)
    - List all rules
    - Toggle switches to enable/disable
    - Edit severity levels
    - Edit thresholds (e.g., "flag if unpacked >30 days")
- [ ] **Build Components**
    - `RuleConfigList.js`
    - `RuleToggle.js`
    - `ThresholdEditor.js`

### Backend Tasks
- [ ] **Add API Endpoints**
    - `GET /inspector/rules` → Returns all rules
    - `PATCH /inspector/rules/{rule_id}` → Update rule config

### Testing
- [ ] Toggle rule off → verify it doesn't run next check
- [ ] Change threshold → verify new threshold is applied
- [ ] Change severity → verify violations show new severity

**Deliverable:** Configurable rules without code deployment.

---

## Phase 7: Advanced Features (Week 7-8)
**Goal:** Nice-to-have features for power users.

### Optional Features
- [ ] **Bulk Actions**
    - Select multiple violations -> Bulk dismiss / Bulk fix
- [ ] **Export/Reporting**
    - Export violations as CSV
    - Generate PDF report
    - Email digest (weekly summary)
- [ ] **Violation Trends**
    - Chart showing violations over time
    - Track improvement (are issues being fixed?)
    - Seasonal trends (more violations before holidays?)
- [ ] **Integration with Action Dashboard**
    - Surface top 5 critical issues on admin dashboard
    - Quick links from dashboard to Inspector
- [ ] **Dismissal Reasons**
    - Track why violations were dismissed
    - Analytics on most-dismissed rules
- [ ] **Smart Suggestions**
    - "Based on past patterns, you might want to..."
    - "3 items with similar names - possible duplicates?"

---

## Phase 8: Testing & Refinement (Week 9)
**Goal:** Ensure reliability and performance.

### Testing Tasks
- [ ] **Load Testing**
    - Test with 1000+ items
    - Verify parallel Lambda execution is fast
    - Optimize slow queries
- [ ] **Edge Cases**
    - What if a rule Lambda fails?
    - What if DynamoDB write fails?
    - What if user dismisses violation then issue recurs?
- [ ] **User Acceptance Testing**
    - Have real users interact with Inspector
    - Gather feedback on UX
    - Identify missing features
- [ ] **Documentation**
    - Document each rule (what it checks, why it matters)
    - Add tooltips/help text in UI
    - Create admin guide

**Deliverable:** Production-ready Inspector subdomain.

---

## Summary Timeline

| Week | Focus | Key Deliverable |
| :--- | :--- | :--- |
| **1** | Backend foundation | Orchestrator + 2 rules working |
| **2** | Basic UI | Violations displayed in list |
| **3** | More rules | 8-10 business rules implemented |
| **4** | Automation | EventBridge + SNS alerts |
| **5** | UI polish | Tabs, search, contextual actions |
| **6** | Rule config | Admin can toggle rules in UI |
| **7-8** | Advanced features | Bulk actions, exports, trends |
| **9** | Testing & refinement | Production-ready |

---

## Development Order Priorities

### Must-Have (MVP)
- ✅ Orchestrator Lambda
- ✅ 5-6 core rules (missing photos, off-season deployed, unpacked storage, needs repair, missing costs)
- ✅ Basic violations list UI
- ✅ Dismiss functionality
- ✅ Manual check trigger
- ✅ EventBridge daily automation

### Should-Have (Phase 2)
- ✅ Rule configuration UI
- ✅ Category grouping
- ✅ Filters and search
- ✅ Seasonal checks
- ✅ SNS alerts
- ✅ Resolved violations history

### Nice-to-Have (Future)
- [ ] Bulk actions
- [ ] Export/reporting
- [ ] Trend charts
- [ ] Smart suggestions

---

## Risk Mitigation

**Risk: Rule Lambdas are slow**
- **Mitigation:** Use parallel execution (ThreadPoolExecutor).
- **Mitigation:** Add timeout limits per rule.
- **Mitigation:** Optimize DynamoDB queries.

**Risk: Too many violations overwhelm users**
- **Mitigation:** Start with only critical rules enabled.
- **Mitigation:** Add filtering/search early.
- **Mitigation:** Group by category.
- **Mitigation:** Show summary cards, not full list by default.

**Risk: False positives**
- **Mitigation:** Add dismissal reasons tracking.
- **Mitigation:** Review frequently-dismissed rules.
- **Mitigation:** Adjust rule logic based on feedback.

**Risk: Violations recur after being dismissed**
- **Mitigation:** Track dismissals in DB.
- **Mitigation:** Don't re-show dismissed violations unless requested.
- **Mitigation:** Add "permanent dismiss" option for edge cases.