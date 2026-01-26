/**
 * Rules List Component
 * Displays rules grouped by severity with expandable violations
 */

class RulesList {
    constructor(container) {
        this.container = container;
        this.rules = [];
        this.violations = [];
        this.expandedRules = new Set();
        this.violationsByRule = {};
    }

    /**
     * Load rules and violations
     */
    async load() {
        try {
            this.renderLoading();
            
            // Load rules and violations in parallel
            const [rulesData, violationsData] = await Promise.all([
                InspectorAPI.getRules(),
                InspectorAPI.getAllViolations()
            ]);

            this.rules = rulesData.rules || [];
            this.violations = violationsData || [];
            
            // Group violations by rule
            this.violationsByRule = groupViolationsByRule(this.violations);
            
            this.render();
            
        } catch (error) {
            console.error('Error loading rules:', error);
            this.renderError(error.message);
        }
    }

    /**
     * Toggle rule expansion
     */
    toggleRule(ruleId) {
        if (this.expandedRules.has(ruleId)) {
            this.expandedRules.delete(ruleId);
        } else {
            this.expandedRules.add(ruleId);
        }
        this.render();
    }

    /**
     * Navigate to rule detail page
     */
    viewRuleDetail(ruleId) {
        navigateTo(`/inspector/rules/${ruleId}`);
    }

    /**
     * Run rule (execute evaluation)
     */
    async runRule(ruleId, ruleName) {
        const runBtn = this.container.querySelector(`[data-run-rule-id="${ruleId}"]`);
        if (!runBtn) return;

        const originalText = runBtn.innerHTML;
        runBtn.disabled = true;
        runBtn.innerHTML = 'Running...';

        try {
            // Find the rule to get its category
            const rule = this.rules.find(r => r.rule_id === ruleId);
            if (!rule) {
                throw new Error('Rule not found');
            }

            await InspectorAPI.executeRule(ruleId, rule.rule_category);
            showSuccessToast(`Rule "${ruleName}" executed successfully`);

            // Reload violations for this rule
            setTimeout(async () => {
                try {
                    const violationsData = await InspectorAPI.getAllViolations();
                    this.violations = violationsData || [];
                    this.violationsByRule = groupViolationsByRule(this.violations);
                    
                    // Update the rule's last_evaluated_at
                    const updatedRuleData = await InspectorAPI.getRule(ruleId);
                    const ruleIndex = this.rules.findIndex(r => r.rule_id === ruleId);
                    if (ruleIndex !== -1 && updatedRuleData.rule) {
                        this.rules[ruleIndex] = updatedRuleData.rule;
                    }
                    
                    this.render();
                } catch (error) {
                    console.error('Error reloading violations:', error);
                    runBtn.disabled = false;
                    runBtn.innerHTML = originalText;
                }
            }, 2000);

        } catch (error) {
            console.error('Error running rule:', error);
            showErrorToast(`Failed to run rule: ${error.message}`);
            runBtn.disabled = false;
            runBtn.innerHTML = originalText;
        }
    }

    /**
     * Delete rule (deactivate)
     */
    async deleteRule(ruleId, ruleName) {
        showConfirmModal(
            'Deactivate Rule',
            `Are you sure you want to deactivate "${ruleName}"? This will mark the rule as inactive.`,
            async () => {
                try {
                    await InspectorAPI.deleteRule(ruleId);
                    showSuccessToast('Rule deactivated successfully');
                    this.load(); // Reload list
                } catch (error) {
                    showErrorToast(`Failed to deactivate rule: ${error.message}`);
                }
            }
        );
    }

    /**
     * Render loading state
     */
    renderLoading() {
        this.container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Loading rules...</p>
            </div>
        `;
    }

    /**
     * Render error state
     */
    renderError(message) {
        this.container.innerHTML = `
            <div class="error-container">
                <h3>⚠️ Failed to Load Rules</h3>
                <p class="error-message">${sanitizeHtml(message)}</p>
                <div class="error-help">
                    <p><strong>Possible causes:</strong></p>
                    <ul>
                        <li>Lambda function not deployed</li>
                        <li>API Gateway route not configured</li>
                        <li>Stage variables not set (RULES_TABLE, ALLOWED_ORIGINS_PARAM)</li>
                        <li>IAM permissions missing</li>
                    </ul>
                    <p><strong>Check CloudWatch Logs for the Lambda function</strong></p>
                </div>
                <button class="btn btn-primary" onclick="location.reload()">Retry</button>
            </div>
        `;
    }

    /**
     * Group rules by severity
     */
    groupRulesBySeverity() {
        const groups = {
            Critical: [],
            Attention: [],
            Warning: [],
            Info: []
        };

        this.rules.forEach(rule => {
            if (!rule.is_active) return; // Skip inactive rules
            
            const severity = rule.severity || 'Info';
            if (groups[severity]) {
                groups[severity].push(rule);
            } else {
                groups.Info.push(rule);
            }
        });

        return groups;
    }

    /**
     * Render rules list
     */
    render() {
        if (this.rules.length === 0) {
            this.container.innerHTML = `
                <div class="empty-state">
                    <p>No rules found</p>
                </div>
            `;
            return;
        }

        const groupedRules = this.groupRulesBySeverity();
        
        let html = '<div class="rules-list">';

        // Render each severity group
        ['Critical', 'Attention', 'Warning', 'Info'].forEach(severity => {
            const rules = groupedRules[severity];
            if (rules.length === 0) return;

            const severityConfig = getSeverityConfig(severity);
            const totalViolations = rules.reduce((sum, rule) => {
                return sum + (this.violationsByRule[rule.rule_id]?.length || 0);
            }, 0);

            html += `
                <div class="severity-group">
                    <div class="severity-header">
                        <h3>
                            ${severityConfig.icon} ${severity} 
                            <span class="count-badge">${totalViolations}</span>
                        </h3>
                    </div>
                    <div class="rules-accordion">
                        ${this.renderRulesInGroup(rules)}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        this.container.innerHTML = html;

        // Attach event listeners
        this.attachEventListeners();
    }

    /**
     * Render rules within a severity group
     */
    renderRulesInGroup(rules) {
        return rules.map(rule => {
            const violations = this.violationsByRule[rule.rule_id] || [];
            const isExpanded = this.expandedRules.has(rule.rule_id);
            const violationCount = violations.length;

            return `
                <div class="rule-card ${isExpanded ? 'expanded' : ''}">
                    <div class="rule-header" data-rule-id="${rule.rule_id}">
                        <div class="rule-title">
                            <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
                            <strong>${sanitizeHtml(rule.rule_name)}</strong>
                        </div>
                        <div class="rule-meta">
                            <span class="last-executed-badge">Last executed: ${formatDateTime(rule.last_executed_at)}</span>
                            <span class="violation-count ${violationCount > 0 ? 'has-violations' : ''}">
                                ${violationCount} violation${violationCount !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                    
                    ${isExpanded ? `
                        <div class="rule-body">
                            <p class="rule-description">${sanitizeHtml(rule.description)}</p>
                            
                            <div class="rule-actions">
                                <button class="btn btn-secondary view-rule-btn" 
                                        data-rule-id="${rule.rule_id}">
                                    View Details
                                </button>
                                <button class="btn btn-danger delete-rule-btn" 
                                        data-rule-id="${rule.rule_id}"
                                        data-rule-name="${sanitizeHtml(rule.rule_name)}">
                                    Deactivate
                                </button>
                                <button class="btn btn-primary run-rule-btn" 
                                        data-run-rule-id="${rule.rule_id}"
                                        data-rule-name="${sanitizeHtml(rule.rule_name)}">
                                    ▶ Run Rule
                                </button>
                            </div>
                            
                            ${violations.length > 0 ? `
                                <div class="violations-preview">
                                    <h4>Violations (${violations.length})</h4>
                                    ${this.renderViolationsTable(violations.slice(0, 5), rule.last_executed_at)}
                                    ${violations.length > 5 ? `
                                        <p class="more-violations">
                                            ... and ${violations.length - 5} more
                                        </p>
                                    ` : ''}
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    /**
     * Render violations table
     */
    renderViolationsTable(violations, lastExecutedAt) {
        return `
            <table class="violations-table-mini">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Issue</th>
                        <th>Detected</th>
                        <th>Last Executed</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${violations.map(v => `
                        <tr>
                            <td>${sanitizeHtml(v.violation_details?.item_short_name || v.entity_id)}</td>
                            <td>${sanitizeHtml(truncateText(v.violation_details?.message || 'N/A', 60))}</td>
                            <td>${formatRelativeTime(v.detected_at)}</td>
                            <td>${formatDateTime(lastExecutedAt)}</td>
                            <td>
                                <button class="btn btn-sm btn-secondary view-violation-link" 
                                        data-violation-id="${v.violation_id}">
                                    View
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Toggle rule expansion
        this.container.querySelectorAll('.rule-header').forEach(header => {
            header.addEventListener('click', () => {
                const ruleId = header.dataset.ruleId;
                this.toggleRule(ruleId);
            });
        });

        // View rule detail
        this.container.querySelectorAll('.view-rule-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const ruleId = btn.dataset.ruleId;
                this.viewRuleDetail(ruleId);
            });
        });

        // Delete rule
        this.container.querySelectorAll('.delete-rule-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const ruleId = btn.dataset.ruleId;
                const ruleName = btn.dataset.ruleName;
                this.deleteRule(ruleId, ruleName);
            });
        });

        // Run rule
        this.container.querySelectorAll('.run-rule-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const ruleId = btn.dataset.runRuleId;
                const ruleName = btn.dataset.ruleName;
                this.runRule(ruleId, ruleName);
            });
        });

        // View violation - navigate to violation page
        this.container.querySelectorAll('.view-violation-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const violationId = btn.dataset.violationId;
                navigateTo(`/inspector/violations/${violationId}`);
            });
        });
    }
}