// About Page - System overview and information

export function renderAbout(config) {
    const container = document.getElementById('app-container');
    
    container.innerHTML = `
        <div class="about-container">
            <div class="about-header">
                <h1 class="about-title">About SpookyDecs</h1>
                <p class="about-subtitle">
                    A comprehensive holiday decoration management platform powered by AI
                </p>
            </div>

            <div class="about-section">
                <h2 class="about-section-title">
                    <span class="about-section-icon">🎃</span>
                    What is SpookyDecs?
                </h2>
                <div class="about-section-content">
                    <p>
                        SpookyDecs is an operational management platform designed to handle the 
                        complete lifecycle of large-scale holiday decoration deployments. From 
                        inventory tracking to storage organization, cost management to maintenance 
                        scheduling, SpookyDecs provides the tools needed to manage complex 
                        seasonal operations.
                    </p>
                    <p>
                        Built with operational intelligence in mind, the platform integrates 
                        across multiple subdomains to provide a unified view of your decoration 
                        ecosystem while maintaining the flexibility to drill into specific areas 
                        when needed.
                    </p>
                </div>
            </div>

            <div class="about-section">
                <h2 class="about-section-title">
                    <span class="about-section-icon">💬</span>
                    Meet Iris
                </h2>
                <div class="about-section-content">
                    <p>
                        Iris is your AI-powered assistant, designed to provide read-only insights 
                        and operational intelligence across the entire SpookyDecs ecosystem. Iris can:
                    </p>
                    <ul class="about-list">
                        <li>Answer questions about your inventory and deployments</li>
                        <li>Aggregate data across multiple subdomains</li>
                        <li>Provide spending analysis and cost insights</li>
                        <li>Help locate items and track their status</li>
                        <li>Suggest maintenance priorities and planning timelines</li>
                    </ul>
                    <p>
                        All Iris responses include clear assumptions and direct links back to 
                        authoritative data sources, ensuring you can always verify and explore 
                        further in the relevant subdomain.
                    </p>
                </div>
            </div>

            <div class="about-section">
                <h2 class="about-section-title">
                    <span class="about-section-icon">🗺️</span>
                    Platform Features
                </h2>
                <div class="about-features-grid">
                    <div class="about-feature-card">
                        <div class="about-feature-title">📦 Items Management</div>
                        <div class="about-feature-description">
                            Track decorations, lights, and accessories with detailed metadata, 
                            photos, and repair status.
                        </div>
                    </div>
                    <div class="about-feature-card">
                        <div class="about-feature-title">🗄️ Storage Organization</div>
                        <div class="about-feature-description">
                            Manage totes, bins, and storage locations with visual inventory 
                            and packing workflows.
                        </div>
                    </div>
                    <div class="about-feature-card">
                        <div class="about-feature-title">🎯 Deployment Tracking</div>
                        <div class="about-feature-description">
                            Plan and track seasonal deployments with historical records and 
                            configuration notes.
                        </div>
                    </div>
                    <div class="about-feature-card">
                        <div class="about-feature-title">💰 Finance Management</div>
                        <div class="about-feature-description">
                            Track costs, receipts, and spending patterns across seasons and 
                            item categories.
                        </div>
                    </div>
                    <div class="about-feature-card">
                        <div class="about-feature-title">🔧 Maintenance Records</div>
                        <div class="about-feature-description">
                            Schedule repairs, track maintenance history, and manage inspection 
                            workflows.
                        </div>
                    </div>
                    <div class="about-feature-card">
                        <div class="about-feature-title">📸 Photo Documentation</div>
                        <div class="about-feature-description">
                            Visual catalog with image management and deployment reference photos.
                        </div>
                    </div>
                </div>
            </div>

            <div class="about-section">
                <h2 class="about-section-title">
                    <span class="about-section-icon">⚙️</span>
                    Technical Stack
                </h2>
                <div class="about-section-content">
                    <p>
                        SpookyDecs is built as a modern, modular web application with a focus 
                        on performance and maintainability:
                    </p>
                    <div class="about-tech-stack">
                        <span class="about-tech-badge">Vanilla JavaScript</span>
                        <span class="about-tech-badge">AWS S3 + CloudFront</span>
                        <span class="about-tech-badge">PostgreSQL</span>
                        <span class="about-tech-badge">Lambda Functions</span>
                        <span class="about-tech-badge">Claude AI API</span>
                        <span class="about-tech-badge">Navigo Router</span>
                    </div>
                </div>
            </div>

            <div class="about-cta">
                <h3 class="about-cta-title">Ready to explore?</h3>
                <a href="/admin" class="about-cta-button" data-navigo>
                    Return to Dashboard
                </a>
            </div>
        </div>
    `;
}
