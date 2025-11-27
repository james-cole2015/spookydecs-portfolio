const TreeGraphRenderer = ({ data, selectedNodeId, onNodeClick }) => {
    const svgRef = React.useRef();
    const [tooltip, setTooltip] = React.useState(null);

    React.useEffect(() => {
        if (!data || !svgRef.current) return;

        renderGraph();
    }, [data, selectedNodeId]);

    const renderGraph = () => {
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const { nodes, edges, bounds } = data.graph;
        
        // Calculate dimensions
        const width = bounds.max_x - bounds.min_x + 100;
        const height = bounds.max_y - bounds.min_y + 100;
        const padding = 50;

        // Set SVG dimensions
        svg.attr('width', '100%')
           .attr('height', '100%')
           .attr('viewBox', `${bounds.min_x - padding} ${bounds.min_y - padding} ${width} ${height}`);

        // Create main group for zoom/pan
        const g = svg.append('g').attr('class', 'graph-group');

        // Draw edges using pre-calculated paths
        const edgeGroup = g.append('g').attr('class', 'edges');
        edges.forEach(edge => {
            if (edge.path) {
                // Use pre-calculated SVG path from Lambda
                edgeGroup.append('path')
                    .attr('d', edge.path)
                    .attr('fill', 'none')
                    .attr('stroke', edge.color)
                    .attr('stroke-width', edge.stroke_width)
                    .attr('stroke-dasharray', edge.stroke_dasharray || null)
                    .attr('class', `edge edge-${edge.type}`);
            }
        });

        // Draw nodes
        const nodeGroup = g.append('g').attr('class', 'nodes');
        nodes.forEach(node => {
            const isSelected = node.id === selectedNodeId;
            
            const nodeEl = nodeGroup.append('g')
                .attr('transform', `translate(${node.x}, ${node.y})`)
                .attr('class', `node ${isSelected ? 'node-selected' : ''}`)
                .style('cursor', 'pointer');

            // Render icon if available, otherwise render circle
            if (node.icon_url) {
                // Render SVG icon
                nodeEl.append('image')
                    .attr('href', node.icon_url)
                    .attr('x', -node.size / 2)
                    .attr('y', -node.size / 2)
                    .attr('width', node.size)
                    .attr('height', node.size)
                    .attr('stroke', isSelected ? '#000' : '#fff')
                    .attr('stroke-width', isSelected ? 3 : 2);
            } else {
                // Render circle (existing behavior)
                nodeEl.append('circle')
                    .attr('r', node.size / 2)
                    .attr('fill', node.color)
                    .attr('stroke', isSelected ? '#000' : '#fff')
                    .attr('stroke-width', isSelected ? 3 : 2);
            }

            // Node label (short_name for tree view - more readable)
            nodeEl.append('text')
                .attr('dy', node.size / 2 + 15)
                .attr('text-anchor', 'middle')
                .attr('font-size', '10px')
                .attr('font-weight', '600')
                .attr('fill', '#1f2937')
                .text(node.class_acronym);

            // Zone label
            nodeEl.append('text')
                .attr('dy', -node.size / 2 - 5)
                .attr('text-anchor', 'middle')
                .attr('font-size', '9px')
                .attr('fill', '#6b7280')
                .text(node.zone);

            // Click handler
            nodeEl.on('click', (event) => {
                event.stopPropagation();
                onNodeClick(node);
            });

            // Hover interactions
            nodeEl.on('mouseenter', (event) => {
                if (!isSelected) {
                    const target = node.icon_url ? 'image' : 'circle';
                    d3.select(event.currentTarget).select(target)
                        .attr('stroke-width', 3)
                        .attr('stroke', '#000');
                }
                
                setTooltip({
                    node,
                    x: event.pageX,
                    y: event.pageY
                });
            })
            .on('mouseleave', (event) => {
                if (!isSelected) {
                    const target = node.icon_url ? 'image' : 'circle';
                    d3.select(event.currentTarget).select(target)
                        .attr('stroke-width', 2)
                        .attr('stroke', '#fff');
                }
                
                setTooltip(null);
            });
        });

        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.5, 3])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);
        
        // Click on background to deselect
        svg.on('click', () => {
            onNodeClick(null);
        });
    };

    return (
        <div className="tree-graph">
            <svg ref={svgRef}></svg>
            {tooltip && <NodeTooltip data={tooltip} />}
        </div>
    );
};