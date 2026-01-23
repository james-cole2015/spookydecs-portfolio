/**
 * Inspector Configuration
 * Constants, formatters, and utility functions
 */

const InspectorConfig = {
    // Severity levels and colors
    SEVERITY: {
        Critical: {
            label: 'Critical',
            color: '#DC2626',
            icon: '🔴',
            badge: 'severity-critical'
        },
        Attention: {
            label: 'Attention',
            color: '#F59E0B',
            icon: '🟡',
            badge: 'severity-attention'
        },
        Warning: {
            label: 'Warning',
            color: '#F59E0B',
            icon: '🟡',
            badge: 'severity-warning'
        },
        Info: {
            label: 'Info',
            color: '#3B82F6',
            icon: '🔵',
            badge: 'severity-info'
        }
    },

    // Status types
    STATUS: {
        open: {
            label: 'Open',
            color: '#DC2626',
            badge: 'status-open'
        },
        resolved: {
            label: 'Resolved',
            color: '#10B981',
            badge: 'status-resolved'
        },
        dismissed: {
            label: 'Dismissed',
            color: '#6B7280',
            badge: 'status-dismissed'
        }
    },

    // Rule categories
    RULE_CATEGORIES: {
        field_validation: {
            label: 'Field Validation',
            endpoint: '/admin/inspector/rules/field-validation'
        },
        relationship_eval: {
            label: 'Relationship Evaluation',
            endpoint: '/admin/inspector/rules/relationship-eval'
        },
        duplicate_detection: {
            label: 'Duplicate Detection',
            endpoint: '/admin/inspector/rules/duplicate-detection'
        }
    },

    // Pagination
    DEFAULT_PAGE_SIZE: 25,

    // Tab identifiers
    TABS: {
        BY_RULE: 'by-rule',
        BY_ITEM: 'by-item',
        ORPHANED: 'orphaned'
    }
};

/**
 * Format date string to human-readable format
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffSec < 60) return 'Just now';
        if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
        if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
        if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
        
        return formatDate(dateString);
    } catch (error) {
        return dateString;
    }
}

/**
 * Get severity configuration
 */
function getSeverityConfig(severity) {
    return InspectorConfig.SEVERITY[severity] || InspectorConfig.SEVERITY.Info;
}

/**
 * Get status configuration
 */
function getStatusConfig(status) {
    return InspectorConfig.STATUS[status] || InspectorConfig.STATUS.open;
}

/**
 * Get rule category configuration
 */
function getRuleCategoryConfig(category) {
    return InspectorConfig.RULE_CATEGORIES[category] || null;
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Sanitize HTML to prevent XSS
 */
function sanitizeHtml(html) {
    const temp = document.createElement('div');
    temp.textContent = html;
    return temp.innerHTML;
}

/**
 * Group violations by severity
 */
function groupViolationsBySeverity(violations) {
    const groups = {
        Critical: [],
        Attention: [],
        Warning: [],
        Info: []
    };
    
    violations.forEach(violation => {
        const severity = violation.severity || 'Info';
        if (groups[severity]) {
            groups[severity].push(violation);
        } else {
            groups.Info.push(violation);
        }
    });
    
    return groups;
}

/**
 * Group violations by rule
 */
function groupViolationsByRule(violations) {
    const groups = {};
    
    violations.forEach(violation => {
        const ruleId = violation.rule_id;
        if (!groups[ruleId]) {
            groups[ruleId] = [];
        }
        groups[ruleId].push(violation);
    });
    
    return groups;
}

/**
 * Group violations by item
 */
function groupViolationsByItem(violations) {
    const groups = {};
    
    violations.forEach(violation => {
        const entityId = violation.entity_id;
        if (!groups[entityId]) {
            groups[entityId] = {
                entity_id: entityId,
                entity_type: violation.entity_type,
                short_name: violation.violation_details?.item_short_name || entityId,
                violations: []
            };
        }
        groups[entityId].violations.push(violation);
    });
    
    return Object.values(groups);
}

/**
 * Calculate statistics from violations
 */
function calculateStats(violations) {
    const stats = {
        total: violations.length,
        critical: 0,
        attention: 0,
        warning: 0,
        info: 0,
        open: 0,
        resolved: 0,
        dismissed: 0
    };
    
    violations.forEach(violation => {
        const severity = violation.severity?.toLowerCase() || 'info';
        const status = violation.status || 'open';
        
        stats[severity] = (stats[severity] || 0) + 1;
        stats[status] = (stats[status] || 0) + 1;
    });
    
    return stats;
}
/**
 * Format date to date and time only (no relative time)
 * Example: "Jan 23, 2026 9:18 PM"
 */
function formatDateTime(dateString) {
    if (!dateString) return 'Never';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch (error) {
        return 'N/A';
    }
}