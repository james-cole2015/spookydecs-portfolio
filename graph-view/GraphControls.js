const GraphControls = ({ visualizationType, onTypeChange, zones, selectedZone, onZoneChange }) => {
    return (
        <div className="graph-controls">
            <div className="control-group">
                <label className="control-label">View Type:</label>
                <div className="button-group">
                    <button
                        className={`toggle-button ${visualizationType === 'network' ? 'active' : ''}`}
                        onClick={() => onTypeChange('network')}
                    >
                        Network
                    </button>
                    <button
                        className={`toggle-button ${visualizationType === 'tree' ? 'active' : ''}`}
                        onClick={() => onTypeChange('tree')}
                    >
                        Tree
                    </button>
                </div>
            </div>

            {zones.length > 1 && (
                <div className="control-group">
                    <label htmlFor="zone-select" className="control-label">
                        Zone Filter:
                    </label>
                    <select
                        id="zone-select"
                        value={selectedZone || ''}
                        onChange={(e) => onZoneChange(e.target.value || null)}
                        className="zone-dropdown"
                    >
                        <option value="">All Zones</option>
                        {zones.map((zone) => (
                            <option key={zone} value={zone}>
                                {zone}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
};