// Deployment Sessions Management
// Handles work session lifecycle, timer, and session widget

const DeploymentSessions = {
    timerInterval: null,
    sessionStartTime: null,

    /**
     * Start a new work session
     */
    async startSession() {
        const notes = document.getElementById('session-notes')?.value || '';
        
        try {
            UIUtils.showToast('Starting session...', 'info');
            
            const result = await API.startSession(
                AppState.currentDeploymentId,
                AppState.currentLocationName,
                { notes }
            );
            
            AppState.activeSession = result.session;
            this.sessionStartTime = new Date(result.session.start_time);
            
            // Start timer
            this.startTimer();
            
            // Clear notes input
            if (document.getElementById('session-notes')) {
                document.getElementById('session-notes').value = '';
            }
            
            // Re-render session widget
            this.renderSessionWidget();
            
            // Enable connection buttons
            this.updateConnectionFormState();
            
            UIUtils.showToast(`Session ${result.session.id} started`, 'success');
        } catch (error) {
            UIUtils.showToast(`Failed to start session: ${error.message}`, 'error');
        }
    },

    /**
     * End the current work session
     */
    async endSession() {
        if (!AppState.activeSession) {
            UIUtils.showToast('No active session to end', 'error');
            return;
        }
        
        // Show confirmation modal
        this.showEndSessionConfirmation();
    },

    /**
     * Show end session confirmation modal
     */
    showEndSessionConfirmation() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
        modal.id = 'end-session-modal';
        
        const duration = this.getSessionDuration();
        
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md mx-4">
                <h3 class="text-xl font-semibold mb-4">End Work Session?</h3>
                <p class="text-gray-600 mb-4">
                    This session has been active for <strong>${duration}</strong>.
                </p>
                <p class="text-sm text-gray-500 mb-6">
                    The time will be saved and you can start a new session later.
                </p>
                <div class="flex justify-end space-x-2">
                    <button 
                        class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                        onclick="DeploymentSessions.cancelEndSession()"
                    >
                        Cancel
                    </button>
                    <button 
                        class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        onclick="DeploymentSessions.confirmEndSession()"
                    >
                        End Session
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    },

    /**
     * Cancel end session
     */
    cancelEndSession() {
        const modal = document.getElementById('end-session-modal');
        if (modal) {
            modal.remove();
        }
    },

    /**
     * Confirm end session
     */
    async confirmEndSession() {
        const sessionId = AppState.activeSession.id;
        
        try {
            UIUtils.showToast('Ending session...', 'info');
            
            // Close modal
            this.cancelEndSession();
            
            const result = await API.endSession(
                AppState.currentDeploymentId,
                AppState.currentLocationName,
                sessionId
            );
            
            // Clear active session
            AppState.activeSession = null;
            this.sessionStartTime = null;
            
            // Stop timer
            this.stopTimer();
            
            // Re-render session widget
            this.renderSessionWidget();
            
            // Disable connection buttons
            this.updateConnectionFormState();
            
            UIUtils.showToast(`Session ended. Duration: ${result.session.duration_minutes} minutes`, 'success');
        } catch (error) {
            UIUtils.showToast(`Failed to end session: ${error.message}`, 'error');
        }
    },

    /**
     * Start session timer
     */
    startTimer() {
        // Clear any existing timer
        this.stopTimer();
        
        // Update timer display immediately
        this.updateTimerDisplay();
        
        // Update every second
        this.timerInterval = setInterval(() => {
            this.updateTimerDisplay();
        }, 1000);
    },

    /**
     * Stop session timer
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },

    /**
     * Clear timer (called when leaving builder)
     */
    clearTimer() {
        this.stopTimer();
        this.sessionStartTime = null;
    },

    /**
     * Update timer display
     */
    updateTimerDisplay() {
        const timerElement = document.getElementById('session-timer');
        if (!timerElement) return;
        
        if (!this.sessionStartTime) {
            timerElement.textContent = '00:00:00';
            return;
        }
        
        const elapsed = Date.now() - this.sessionStartTime.getTime();
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        timerElement.textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    },

    /**
     * Get session duration as human-readable string
     */
    getSessionDuration() {
        if (!this.sessionStartTime) return '0 minutes';
        
        const elapsed = Date.now() - this.sessionStartTime.getTime();
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        
        if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    },

    /**
     * Render session widget
     */
    renderSessionWidget() {
        const sessionWidget = document.getElementById('session-widget');
        if (!sessionWidget) return;
        
        if (AppState.activeSession) {
            // Active session - show timer and end button
            this.sessionStartTime = new Date(AppState.activeSession.start_time);
            
            sessionWidget.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center">
                            <div class="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                            <span class="text-sm font-medium text-green-800">Session Active</span>
                        </div>
                        <button 
                            class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                            onclick="DeploymentSessions.endSession()"
                        >
                            End Session
                        </button>
                    </div>
                    <div class="text-2xl font-bold text-green-900 font-mono" id="session-timer">00:00:00</div>
                    <div class="text-xs text-green-700 mt-1">Session ID: ${AppState.activeSession.id}</div>
                </div>
            `;
            
            // Start timer
            this.startTimer();
        } else {
            // No active session - show start session form
            sessionWidget.innerHTML = `
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div class="flex items-center mb-2">
                        <div class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                        <span class="text-sm font-medium text-yellow-800">No Active Session</span>
                    </div>
                    <p class="text-xs text-yellow-700 mb-3">Start a session to begin tracking your work time</p>
                    <textarea 
                        id="session-notes" 
                        placeholder="Session notes (optional)..."
                        class="w-full px-3 py-2 border border-yellow-300 rounded text-sm mb-2"
                        rows="2"
                    ></textarea>
                    <button 
                        class="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                        onclick="DeploymentSessions.startSession()"
                    >
                        Start Session
                    </button>
                </div>
            `;
        }
    },

    /**
     * Update connection form state based on session
     */
    updateConnectionFormState() {
        console.log('Active session found - enabling connection buttons');
        const addConnectionBtn = document.getElementById('add-connection-btn');
        const addStaticPropBtn = document.getElementById('add-static-prop-btn');
        
        if (AppState.activeSession) {
            // Enable buttons
            if (addConnectionBtn) {
                addConnectionBtn.disabled = false;
                addConnectionBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                addConnectionBtn.title = '';
            }
            if (addStaticPropBtn) {
                addStaticPropBtn.disabled = false;
                addStaticPropBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                addStaticPropBtn.title = '';
            }
        } else {
            // Disable buttons
            if (addConnectionBtn) {
                addConnectionBtn.disabled = true;
                addConnectionBtn.classList.add('opacity-50', 'cursor-not-allowed');
                addConnectionBtn.title = 'Start a session to add connections';
            }
            if (addStaticPropBtn) {
                addStaticPropBtn.disabled = true;
                addStaticPropBtn.classList.add('opacity-50', 'cursor-not-allowed');
                addStaticPropBtn.title = 'Start a session to add static props';
            }
        }
    }
};

// Make functions available globally for onclick handlers
window.DeploymentSessions = DeploymentSessions;
window.startSession = DeploymentSessions.startSession.bind(DeploymentSessions);
window.endSession = DeploymentSessions.endSession.bind(DeploymentSessions);
window.renderSessionWidget = DeploymentSessions.renderSessionWidget.bind(DeploymentSessions);
window.updateConnectionFormState = DeploymentSessions.updateConnectionFormState.bind(DeploymentSessions);