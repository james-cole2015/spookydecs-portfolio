// Statistics Calculations Helper Functions

const StatisticsCalculations = {
    /**
     * Format seconds into human-readable duration
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration (e.g., "2h 30m")
     */
    formatDuration(seconds) {
        if (!seconds || seconds === 0) return '0m';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        }
        return `${minutes}m`;
    },

    /**
     * Format date to readable string
     * @param {string} isoDate - ISO date string
     * @returns {string} Formatted date
     */
    formatDate(isoDate) {
        if (!isoDate) return 'N/A';
        
        const date = new Date(isoDate);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    },

    /**
     * Format date to short format (no time)
     * @param {string} isoDate - ISO date string
     * @returns {string} Formatted date
     */
    formatDateShort(isoDate) {
        if (!isoDate) return 'N/A';
        
        const date = new Date(isoDate);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    },

    /**
     * Calculate elapsed time between two dates
     * @param {string} startDate - ISO start date
     * @param {string} endDate - ISO end date (or null for current time)
     * @returns {number} Elapsed seconds
     */
    calculateElapsedTime(startDate, endDate = null) {
        if (!startDate) return 0;
        
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : new Date();
        
        return Math.floor((end - start) / 1000);
    },

    /**
     * Get all sessions from a deployment, sorted by recency
     * Active sessions appear first, then most recent
     * @param {object} deployment - Deployment object
     * @returns {array} Sorted sessions with location info
     */
    getAllSessions(deployment) {
        if (!deployment || !deployment.locations) return [];
        
        const sessions = [];
        
        deployment.locations.forEach(location => {
            const workSessions = location.work_sessions || [];
            workSessions.forEach(session => {
                sessions.push({
                    ...session,
                    location_name: location.name,
                    zone_code: location.zone_code
                });
            });
        });
        
        // Sort: active sessions first, then by start_time descending
        sessions.sort((a, b) => {
            const aActive = !a.end_time;
            const bActive = !b.end_time;
            
            if (aActive && !bActive) return -1;
            if (!aActive && bActive) return 1;
            
            // Both same active state, sort by start time
            const aTime = new Date(a.start_time);
            const bTime = new Date(b.start_time);
            return bTime - aTime;
        });
        
        return sessions;
    },

    /**
     * Get unique items from session (deduplicates item IDs)
     * @param {object} session - Session object
     * @returns {array} Unique item IDs
     */
    getUniqueSessionItems(session) {
        if (!session || !session.items_deployed) return [];
        return [...new Set(session.items_deployed)];
    },

    /**
     * Calculate total session time from all sessions
     * @param {array} sessions - Array of session objects
     * @returns {number} Total seconds
     */
    calculateTotalSessionTime(sessions) {
        return sessions.reduce((total, session) => {
            return total + (session.duration_seconds || 0);
        }, 0);
    },

    /**
     * Count completed vs active sessions
     * @param {array} sessions - Array of session objects
     * @returns {object} { completed, active, total }
     */
    countSessions(sessions) {
        const completed = sessions.filter(s => s.end_time).length;
        const active = sessions.filter(s => !s.end_time).length;
        
        return {
            completed,
            active,
            total: sessions.length
        };
    },

    /**
     * Calculate zone statistics from deployment
     * @param {object} deployment - Deployment object
     * @returns {array} Zone stats array
     */
    calculateZoneStats(deployment) {
        if (!deployment || !deployment.locations) return [];
        
        return deployment.locations.map(location => {
            const items = location.items_deployed || [];
            const connections = location.connections || [];
            const sessions = location.work_sessions || [];
            
            // Count sessions that have end_time (completed sessions)
            const completedSessions = sessions.filter(s => s.end_time).length;
            
            return {
                name: location.name,
                zone_code: location.zone_code,
                items_count: items.length,
                connections_count: connections.length,
                sessions_count: sessions.length,
                completed_sessions: completedSessions
            };
        });
    },

    /**
     * Get total items and connections from deployment
     * @param {object} deployment - Deployment object
     * @returns {object} { totalItems, totalConnections }
     */
    getDeploymentTotals(deployment) {
        if (!deployment || !deployment.locations) {
            return { totalItems: 0, totalConnections: 0 };
        }
        
        // Use Set to deduplicate items across zones
        const allItems = new Set();
        let totalConnections = 0;
        
        deployment.locations.forEach(location => {
            const items = location.items_deployed || [];
            items.forEach(itemId => allItems.add(itemId));
            
            const connections = location.connections || [];
            totalConnections += connections.length;
        });
        
        return {
            totalItems: allItems.size,
            totalConnections
        };
    },

    /**
     * Find the most productive session (by connections created)
     * @param {array} sessions - Array of session objects
     * @returns {object|null} Most productive session
     */
    findMostProductiveSession(sessions) {
        if (!sessions || sessions.length === 0) return null;
        
        let mostProductive = null;
        let maxConnections = 0;
        
        sessions.forEach(session => {
            const connectionsCount = (session.connections_created || []).length;
            if (connectionsCount > maxConnections) {
                maxConnections = connectionsCount;
                mostProductive = session;
            }
        });
        
        return mostProductive;
    },

    /**
     * Calculate average session duration (completed sessions only)
     * @param {array} sessions - Array of session objects
     * @returns {number} Average duration in seconds
     */
    calculateAverageSessionDuration(sessions) {
        const completedSessions = sessions.filter(s => s.end_time && s.duration_seconds);
        
        if (completedSessions.length === 0) return 0;
        
        const totalDuration = completedSessions.reduce((sum, session) => {
            return sum + session.duration_seconds;
        }, 0);
        
        return Math.floor(totalDuration / completedSessions.length);
    },

    /**
     * Format session number for display
     * @param {number} index - Zero-based index
     * @returns {string} Session number (e.g., "Session 1")
     */
    formatSessionNumber(index) {
        return `Session ${index + 1}`;
    }
};

// Export for use in other modules
window.StatisticsCalculations = StatisticsCalculations;