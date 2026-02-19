finance/
├── config.json
├── css
│   ├── cost-detail.css
│   ├── cost-form.css
│   ├── cost-record-detail.css
│   ├── finance.css
│   ├── gift-checkbox-styles.css
│   ├── item-costs.css
│   ├── items-browse.css
│   ├── multi-item-review-modal.css
│   ├── new-cost-record.css
│   ├── receipt-upload-modal.css
│   ├── receipts.css
│   └── stats-panel.css
├── finance-file-structure.md
├── index.html
└── js
    ├── app.js
    ├── components
    │   ├── CostDetailDrawer.js
    │   ├── CostDetailView.js
    │   ├── CostFormFields.js
    │   ├── CostFormRenderers.js
    │   ├── CostHistoryList.js
    │   ├── CostRecordsTable.js
    │   ├── CostReviewModal.js
    │   ├── ItemCostView.js
    │   ├── ItemsBrowsePage.js
    │   ├── MultiItemReviewModal.js
    │   ├── ReceiptUploadModal.js
    │   ├── ReceiptsGrid.js
    │   ├── StatsPanel.js
    │   └── TabBar.js
    ├── pages
    │   ├── cost-detail.js
    │   ├── finance-main.js
    │   ├── item-costs.js
    │   ├── new-cost-record.js
    │   └── receipts.js
    ├── shared
    │   ├── modal.js
    │   └── toast.js
    └── utils
        ├── finance-api.js
        ├── finance-config.js
        ├── helpers.js
        ├── router.js
        └── state.js

lambdas/
├── finance-costs-handler.py            # Main CRUD operations for costs
├── receipt-processor.py                # AI receipt extraction
├── audit-log-updater.py                # Update audit log after cost creation
└── image-updater.py                    # Move receipt after cost creation
