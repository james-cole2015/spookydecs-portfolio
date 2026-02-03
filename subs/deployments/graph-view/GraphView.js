const GraphView = () => {
    const [deployments, setDeployments] = React.useState([]);
    const [selectedDeployment, setSelectedDeployment] = React.useState(null);
    const [visualizationType, setVisualizationType] = React.useState('network');
    const [selectedZone, setSelectedZone] = React.useState(null);
    const [graphData, setGraphData] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [selectedNode, setSelectedNode] = React.useState(null);

    // Load deployments (both in_progress and complete) on mount
    React.useEffect(() => {
        loadDeployments();
    }, []);

    // Load graph data when deployment or settings change
    React.useEffect(() => {
        if (selectedDeployment) {
            loadGraphData();
        }
    }, [selectedDeployment, visualizationType, selectedZone]);

    // Clear selected node when graph data changes
    React.useEffect(() => {
        setSelectedNode(null);
    }, [graphData]);

    const loadDeployments = async () => {
        try {
            setLoading(true);
            // Get all deployments
            const allDeployments = await API.listDeployments();
            
            // Filter for in_progress and complete deployments
            const visualizable = allDeployments.filter(d => 
                d.status === 'in_progress' || d.status === 'complete'
            );
            
            // Sort by updated_at (most recent first)
            visualizable.sort((a, b) => {
                const dateA = new Date(a.updated_at || a.setup_started_at);
                const dateB = new Date(b.updated_at || b.setup_started_at);
                return dateB - dateA;
            });
            
            setDeployments(visualizable);
            
            if (visualizable.length > 0) {
                setSelectedDeployment(visualizable[0].id);
            }
        } catch (err) {
            setError(`Failed to load deployments: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const loadGraphData = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await API.getVisualization(
                selectedDeployment,
                visualizationType,
                selectedZone
            );
            setGraphData(data);
        } catch (err) {
            setError(`Failed to load graph: ${err.message}`);
            setGraphData(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="graph-view-container">
            <div className="graph-controls-panel">
                <DeploymentSelector
                    deployments={deployments}
                    selectedDeployment={selectedDeployment}
                    onSelect={setSelectedDeployment}
                />
                <GraphControls
                    visualizationType={visualizationType}
                    onTypeChange={setVisualizationType}
                    zones={graphData?.zones || []}
                    selectedZone={selectedZone}
                    onZoneChange={setSelectedZone}
                />
            </div>

            {loading && (
                <div className="graph-loading">
                    <div className="spinner"></div>
                    <p>Loading graph visualization...</p>
                </div>
            )}

            {error && (
                <div className="graph-error">
                    <p className="error-message">{error}</p>
                    <button onClick={loadGraphData} className="retry-button">
                        Retry
                    </button>
                </div>
            )}

            {!loading && !error && graphData && (
                <div className="graph-main">
                    <div className="graph-canvas">
                        {visualizationType === 'network' ? (
                            <NetworkGraphRenderer 
                                data={graphData} 
                                selectedNodeId={selectedNode?.id}
                                onNodeClick={setSelectedNode}
                            />
                        ) : (
                            <TreeGraphRenderer 
                                data={graphData}
                                selectedNodeId={selectedNode?.id}
                                onNodeClick={setSelectedNode}
                            />
                        )}
                    </div>
                    <div className="graph-sidebar">
                        <Legend data={graphData} />
                        <NodeDetailPanel 
                            node={selectedNode}
                            edges={graphData.graph.edges}
                            allNodes={graphData.graph.nodes}
                        />
                    </div>
                </div>
            )}

            {!loading && !error && !graphData && deployments.length === 0 && (
                <div className="graph-empty">
                    <p>No deployments with connections found.</p>
                    <p className="text-sm text-gray-600">
                        Start a deployment and add connections to visualize them here.
                    </p>
                </div>
            )}
        </div>
    );
};