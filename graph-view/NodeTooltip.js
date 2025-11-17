const NodeTooltip = ({ data }) => {
    if (!data || !data.node) return null;

    const { node, x, y } = data;

    return (
        <div 
            className="node-tooltip" 
            style={{
                left: `${x + 15}px`,
                top: `${y - 10}px`,
                position: 'fixed',
                pointerEvents: 'none'
            }}
        >
            <div className="tooltip-header">
                <strong>{node.id}</strong>
            </div>
            <div className="tooltip-body">
                <div className="tooltip-row">
                    <span className="tooltip-label">Name:</span>
                    <span className="tooltip-value">{node.short_name}</span>
                </div>
                <div className="tooltip-row">
                    <span className="tooltip-label">Type:</span>
                    <span className="tooltip-value">
                        {node.class_acronym} ({node.class_type})
                    </span>
                </div>
                <div className="tooltip-row">
                    <span className="tooltip-label">Zone:</span>
                    <span className="tooltip-value">{node.zone}</span>
                </div>
                {node.male_ends !== undefined && (
                    <div className="tooltip-row">
                        <span className="tooltip-label">Male Ends:</span>
                        <span className="tooltip-value">{node.male_ends}</span>
                    </div>
                )}
                {node.female_ends !== undefined && (
                    <div className="tooltip-row">
                        <span className="tooltip-label">Female Ends:</span>
                        <span className="tooltip-value">{node.female_ends}</span>
                    </div>
                )}
                <div className="tooltip-row">
                    <span className="tooltip-label">Incoming:</span>
                    <span className="tooltip-value">{node.incoming_connections}</span>
                </div>
                <div className="tooltip-row">
                    <span className="tooltip-label">Outgoing:</span>
                    <span className="tooltip-value">{node.outgoing_connections}</span>
                </div>
            </div>
        </div>
    );
};