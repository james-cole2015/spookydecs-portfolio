const Legend = ({ data }) => {
    if (!data || !data.graph) return null;

    const { statistics } = data.graph;

    // Extract unique class types from statistics
    const classTypes = Object.entries(statistics.items_by_type || {});

    return (
        <div className="legend">
            <div className="legend-section">
                <h3 className="legend-title">Class Types</h3>
                <div className="legend-items">
                    {classTypes.map(([classType, count]) => {
                        // Get color and acronym from first node of this type
                        const node = data.graph.nodes.find(n => n.class_type === classType);
                        if (!node) return null;

                        return (
                            <div key={classType} className="legend-item">
                                <div 
                                    className="legend-color-box" 
                                    style={{ backgroundColor: node.color }}
                                ></div>
                                <span className="legend-label">
                                    <strong>{node.class_acronym}</strong> - {classType}
                                </span>
                                <span className="legend-count">({count})</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="legend-section">
                <h3 className="legend-title">Connections</h3>
                <div className="legend-items">
                    <div className="legend-item">
                        <svg width="40" height="20" className="legend-line-sample">
                            <line 
                                x1="0" y1="10" x2="40" y2="10" 
                                stroke="#3b82f6" 
                                strokeWidth="2"
                            />
                        </svg>
                        <span className="legend-label">Power</span>
                        <span className="legend-count">
                            ({statistics.power_connections || 0})
                        </span>
                    </div>
                    <div className="legend-item">
                        <svg width="40" height="20" className="legend-line-sample">
                            <line 
                                x1="0" y1="10" x2="40" y2="10" 
                                stroke="#facc15" 
                                strokeWidth="2"
                                strokeDasharray="5,5"
                            />
                        </svg>
                        <span className="legend-label">Illuminates</span>
                        <span className="legend-count">
                            ({statistics.illuminates_connections || 0})
                        </span>
                    </div>
                </div>
            </div>

            <div className="legend-section">
                <h3 className="legend-title">Statistics</h3>
                <div className="legend-stats">
                    <div className="stat-item">
                        <span className="stat-label">Total Items:</span>
                        <span className="stat-value">{statistics.total_items || 0}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Total Connections:</span>
                        <span className="stat-value">{statistics.total_connections || 0}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};