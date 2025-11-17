const DeploymentSelector = ({ deployments, selectedDeployment, onSelect }) => {
    return (
        <div className="deployment-selector">
            <label htmlFor="deployment-select" className="selector-label">
                Select Deployment:
            </label>
            <select
                id="deployment-select"
                value={selectedDeployment || ''}
                onChange={(e) => onSelect(e.target.value)}
                className="selector-dropdown"
            >
                {deployments.length === 0 && (
                    <option value="">No completed deployments</option>
                )}
                {deployments.map((deployment) => (
                    <option key={deployment.deployment_id} value={deployment.deployment_id}>
                        {deployment.deployment_name || `${deployment.year} ${deployment.season}`}
                    </option>
                ))}
            </select>
        </div>
    );
};