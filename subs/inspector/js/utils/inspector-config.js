/**
 * Inspector Configuration
 * Constants, formatters, and utility functions
 */

const InspectorConfig = {
    // Resolution mode labels for the stats bar (open violations only)
    RESOLUTION_MODE: {
        unanalyzed:      { label: 'Unanalyzed',    badge: 'resolution-unanalyzed' },
        auto_resolved:   { label: 'Auto-resolved',  badge: 'resolution-auto' },
        manual_resolved: { label: 'Manual',         badge: 'resolution-manual' },
        dismissed:       { label: 'Dismissed',      badge: 'resolution-dismissed' }
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
    },
    required_related_entity: {
        label: 'Required Related Entity',
        endpoint: '/admin/inspector/rules/entity_relationship_eval'
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
 * Get dismissible badge config for a violation or rule
 */
function getDismissibleConfig(dismissible) {
    return dismissible === false
        ? { label: 'Non-dismissible', badge: 'badge-non-dismissible', icon: '⛔' }
        : { label: 'Dismissible', badge: 'badge-dismissible', icon: '✅' };
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
 * Calculate status statistics from a local list of violations
 */
function calculateStats(violations) {
    const stats = {
        total: violations.length,
        open: 0,
        resolved: 0,
        dismissed: 0
    };

    violations.forEach(violation => {
        const status = violation.status || 'open';
        if (stats[status] !== undefined) stats[status]++;
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