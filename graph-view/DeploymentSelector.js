const DeploymentSelector = ({ deployments, selectedDeployment, onSelect }) => {
    return (
        <div className="deployment-selector">
            <label htmlFor="deployment-select" className="control-label">
                Select Deployment:
            </label>
            <select
                id="deployment-select"
                value={selectedDeployment || ''}
                onChange={(e) => onSelect(e.target.value)}
                className="deployment-dropdown"
            >
                {deployments.length === 0 && (
                    <option value="">No deployments available</option>
                )}
                {deployments.map((deployment) => {
                    const statusBadge = deployment.status === 'in_progress' 
                        ? '🟢 In Progress' 
                        : '✅ Complete';
                    
                    const label = `${deployment.id} - ${deployment.season} ${deployment.year} (${statusBadge})`;
                    
                    return (
                        <option key={deployment.id} value={deployment.id}>
                            {label}
                        </option>
                    );
                })}
            </select>
        </div>
    );
};