const NodeDetailPanel = ({ node, edges, allNodes }) => {
    if (!node) {
        return (
            <div className="node-detail-panel node-detail-empty">
                <h3 className="detail-panel-title">Selected Item</h3>
                <p className="detail-panel-empty-text">Click a node to view details</p>
            </div>
        );
    }

    // Find incoming connections (edges where this node is the target)
    const incomingEdges = edges.filter(e => e.target === node.id);
    
    // Find outgoing connections (edges where this node is the source)
    const outgoingEdges = edges.filter(e => e.source === node.id);

    // Helper to get node name by ID
    const getNodeName = (nodeId) => {
        const foundNode = allNodes.find(n => n.id === nodeId);
        return foundNode ? foundNode.short_name : nodeId;
    };

    return (
        <div className="node-detail-panel">
            <h3 className="detail-panel-title">Selected Item</h3>
            
            <div className="detail-panel-content">
                {/* Header with node name and badge */}
                <div className="detail-header">
                    <h4 className="detail-item-name">{node.short_name}</h4>
                    <span 
                        className="detail-class-badge" 
                        style={{ backgroundColor: node.color }}
                    >
                        {node.class_acronym}
                    </span>
                </div>

                {/* Item ID */}
                <div className="detail-row">
                    <span className="detail-label">Item ID:</span>
                    <span className="detail-value">{node.id}</span>
                </div>

                {/* Class Type */}
                <div className="detail-row">
                    <span className="detail-label">Type:</span>
                    <span className="detail-value">{node.class_type}</span>
                </div>

                {/* Zone */}
                <div className="detail-row">
                    <span className="detail-label">Zone:</span>
                    <span className="detail-value">{node.zone}</span>
                </div>

                {/* Ports info (if applicable) */}
                {(node.male_ends > 0 || node.female_ends > 0) && (
                    <div className="detail-row">
                        <span className="detail-label">Ports:</span>
                        <span className="detail-value">
                            {node.male_ends > 0 && `${node.male_ends}M`}
                            {node.male_ends > 0 && node.female_ends > 0 && ' / '}
                            {node.female_ends > 0 && `${node.female_ends}F`}
                        </span>
                    </div>
                )}

                {/* Incoming Connections */}
                {incomingEdges.length > 0 && (
                    <div className="detail-section">
                        <h5 className="detail-section-title">
                            Incoming ({incomingEdges.length})
                        </h5>
                        <div className="detail-connections">
                            {incomingEdges.map((edge, idx) => (
                                <div key={edge.id} className="detail-connection">
                                    <span className="connection-arrow">←</span>
                                    <span className="connection-name">
                                        {getNodeName(edge.source)}
                                    </span>
                                    {edge.from_port && edge.to_port && (
                                        <span className="connection-ports">
                                            ({edge.from_port} → {edge.to_port})
                                        </span>
                                    )}
                                    <span 
                                        className="connection-type-badge"
                                        style={{ 
                                            backgroundColor: edge.type === 'power' ? '#3b82f6' : '#facc15',
                                            color: edge.type === 'power' ? 'white' : '#000'
                                        }}
                                    >
                                        {edge.type}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Outgoing Connections */}
                {outgoingEdges.length > 0 && (
                    <div className="detail-section">
                        <h5 className="detail-section-title">
                            Outgoing ({outgoingEdges.length})
                        </h5>
                        <div className="detail-connections">
                            {outgoingEdges.map((edge, idx) => (
                                <div key={edge.id} className="detail-connection">
                                    <span className="connection-arrow">→</span>
                                    <span className="connection-name">
                                        {getNodeName(edge.target)}
                                    </span>
                                    {edge.from_port && edge.to_port && (
                                        <span className="connection-ports">
                                            ({edge.from_port} → {edge.to_port})
                                        </span>
                                    )}
                                    <span 
                                        className="connection-type-badge"
                                        style={{ 
                                            backgroundColor: edge.type === 'power' ? '#3b82f6' : '#facc15',
                                            color: edge.type === 'power' ? 'white' : '#000'
                                        }}
                                    >
                                        {edge.type}
                                    </span>
                                    {edge.illuminates && edge.illuminates.length > 0 && (
                                        <div className="connection-illuminates">
                                            <span className="illuminates-label">Illuminates:</span>
                                            {edge.illuminates.map(itemId => (
                                                <span key={itemId} className="illuminates-item">
                                                    {getNodeName(itemId)}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* No connections message */}
                {incomingEdges.length === 0 && outgoingEdges.length === 0 && (
                    <div className="detail-section">
                        <p className="detail-no-connections">No connections</p>
                    </div>
                )}
            </div>
        </div>
    );
};