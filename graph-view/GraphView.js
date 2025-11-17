const GraphView = () => {
    const [deployments, setDeployments] = React.useState([]);
    const [selectedDeployment, setSelectedDeployment] = React.useState(null);
    const [visualizationType, setVisualizationType] = React.useState('network');
    const [selectedZone, setSelectedZone] = React.useState(null);
    const [graphData, setGraphData] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);

    // Load completed deployments on mount
    React.useEffect(() => {
        loadDeployments();
    }, []);

    // Load graph data when deployment or settings change
    React.useEffect(() => {
        if (selectedDeployment) {
            loadGraphData();
        }
    }, [selectedDeployment, visualizationType, selectedZone]);

    const loadDeployments = async () => {
        try {
            setLoading(true);
            const completed = await API.listCompletedDeployments();
            setDeployments(completed);
            if (completed.length > 0) {
                setSelectedDeployment(completed[0].deployment_id);
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
                            <NetworkGraphRenderer data={graphData} />
                        ) : (
                            <TreeGraphRenderer data={graphData} />
                        )}
                    </div>
                    <div className="graph-sidebar">
                        <Legend data={graphData} />
                    </div>
                </div>
            )}

            {!loading && !error && !graphData && deployments.length === 0 && (
                <div className="graph-empty">
                    <p>No completed deployments found.</p>
                    <p className="text-sm text-gray-600">
                        Complete a deployment to visualize it here.
                    </p>
                </div>
            )}
        </div>
    );
};