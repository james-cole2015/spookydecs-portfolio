# Workbench Implementation Roadmap

## Phase 1: Data Layer (Backend Foundation)
*Focus: Establishing the core infrastructure and data synchronization logic.*

1. **DynamoDB Schema:** Create the `workbench_2026` table schema.
2. **CRUD API:** Build basic API Gateway endpoints for workbench records (Create, Read, Update, Delete).
3. **Manual Import Lambda:** * Write the Lambda function to import records from `maintenance` and `ideas` tables.
    * **Goal:** Prove the data sync logic works and allows for manual testing before introducing AI.

---

## Phase 2: Basic Frontend (Proof of Concept)
*Focus: Creating a functional UI to validate the user workflow.*

4. **Main Workbench UI:** Build a Kanban board featuring:
    * `To Do` column
    * `In Progress` column
    * `Completed` column
5. **Item Detail Page:** Build a dedicated view for individual workbench item details.
6. **Import Trigger:** Add a manual "Create Workbench" button that invokes the Import Lambda.
    * **Goal:** Validate the end-to-end workflow manually before investing in AI integration.

---

## Phase 3: AI Enhancement
*Focus: Integrating intelligence to assist with planning and context.*

7. **Context API:** Create a read-only API endpoint specifically for AI context gathering.
8. **AI Planner Lambda:** Integrate the Claude API to handle intelligent planning logic.
9. **UI Updates:** Enhance the frontend to display AI suggestions and a "Draft Mode" for review before finalization.

---

## Phase 4: Automation & Polish
*Focus: Lifecycle management and closing the feedback loop.*

10. **Notifications:** Implement EventBridge scheduled rules for automated email reminders.
11. **Season Wrap-up:** Build the end-of-season disposition workflow.
12. **Sync-Back Logic:** Implement the logic to update source tables (`maintenance` or `ideas`) once items are marked as complete in the workbench.