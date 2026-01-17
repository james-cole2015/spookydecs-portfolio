// Iris AI Assistant Panel Component
import { submitIrisQuery } from '../utils/admin-api.js';

export class IrisPanel {
    constructor() {
        this.isExpanded = false;
        this.messages = [];
    }

    render() {
        const container = document.createElement('div');
        container.className = 'iris-container';
        container.id = 'iris-panel';
        
        container.innerHTML = `
            <div class="iris-header" id="iris-header">
                <div class="iris-title-section">
                    <span class="iris-icon">💬</span>
                    <div>
                        <div class="iris-title">Iris Assistant</div>
                        <div class="iris-subtitle">Click to expand</div>
                    </div>
                </div>
                <span class="iris-toggle" id="iris-toggle">▼</span>
            </div>
            <div class="iris-content hidden" id="iris-content">
                ${this.renderCollapsedContent()}
            </div>
        `;
        
        this.attachEventListeners(container);
        return container;
    }

    renderCollapsedContent() {
        return `
            <div class="iris-tagline">💬 "Ask Iris about your inventory"</div>
            <div class="iris-examples">
                <div class="iris-examples-title">Example queries:</div>
                <ul class="iris-examples-list">
                    <li>What needs repair?</li>
                    <li>Show Christmas spending</li>
                    <li>Where is Zero stored?</li>
                    <li>What items are deployed?</li>
                </ul>
            </div>
        `;
    }

    renderExpandedContent() {
        return `
            <div class="iris-chat-container">
                <div class="iris-chat-messages" id="iris-messages">
                    ${this.messages.length === 0 ? this.renderWelcomeMessage() : ''}
                    ${this.messages.map(msg => this.renderMessage(msg)).join('')}
                </div>
                <div class="iris-input-container">
                    <form class="iris-input-form" id="iris-form">
                        <input 
                            type="text" 
                            class="iris-input" 
                            id="iris-input"
                            placeholder="Ask Iris anything..."
                            autocomplete="off"
                        />
                        <button type="submit" class="iris-submit">Send</button>
                    </form>
                </div>
            </div>
        `;
    }

    renderWelcomeMessage() {
        return `
            <div class="iris-system-message">
                Welcome! Ask me anything about your SpookyDecs inventory.
            </div>
        `;
    }

    renderMessage(message) {
        const timestamp = new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        return `
            <div class="iris-message ${message.role}">
                <div class="iris-message-bubble">${message.content}</div>
                <div class="iris-message-timestamp">${timestamp}</div>
            </div>
        `;
    }

    attachEventListeners(container) {
        const header = container.querySelector('#iris-header');
        const toggle = container.querySelector('#iris-toggle');
        const content = container.querySelector('#iris-content');
        
        header.addEventListener('click', () => {
            this.togglePanel(toggle, content);
        });
    }

    togglePanel(toggle, content) {
        this.isExpanded = !this.isExpanded;
        
        if (this.isExpanded) {
            toggle.classList.add('expanded');
            content.classList.remove('hidden');
            content.innerHTML = this.renderExpandedContent();
            this.attachFormListener();
        } else {
            toggle.classList.remove('expanded');
            content.classList.add('hidden');
            setTimeout(() => {
                content.innerHTML = this.renderCollapsedContent();
            }, 300);
        }
    }

    attachFormListener() {
        const form = document.getElementById('iris-form');
        const input = document.getElementById('iris-input');
        
        if (form && input) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSubmit(input.value);
                input.value = '';
            });
        }
    }

    async handleSubmit(query) {
        if (!query.trim()) return;
        
        // Add user message
        this.addMessage('user', query);
        
        // Show "not yet implemented" response
        setTimeout(() => {
            this.addMessage('assistant', 'Not yet implemented - Iris will be available soon!');
        }, 500);
    }

    addMessage(role, content) {
        const message = {
            role,
            content,
            timestamp: new Date().toISOString()
        };
        
        this.messages.push(message);
        this.updateMessages();
    }

    updateMessages() {
        const messagesContainer = document.getElementById('iris-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = this.messages.map(msg => 
                this.renderMessage(msg)
            ).join('');
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
}
