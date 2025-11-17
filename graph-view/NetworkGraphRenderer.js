const NetworkGraphRenderer = ({ data }) => {
    const svgRef = React.useRef();
    const [tooltip, setTooltip] = React.useState(null);

    React.useEffect(() => {
        if (!data || !svgRef.current) return;

        renderGraph();
    }, [data]);

    const renderGraph = () => {
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const { nodes, edges, zone_regions, bounds } = data.graph;
        
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

        // Draw zone regions (background rectangles)
        if (zone_regions) {
            const zoneGroup = g.append('g').attr('class', 'zones');
            zone_regions.forEach(zone => {
                zoneGroup.append('rect')
                    .attr('x', zone.x)
                    .attr('y', zone.y)
                    .attr('width', zone.width)
                    .attr('height', zone.height)
                    .attr('fill', zone.fill_color)
                    .attr('stroke', zone.border_color)
                    .attr('stroke-width', 2)
                    .attr('rx', 8);
                
                // Zone label
                zoneGroup.append('text')
                    .attr('x', zone.x + zone.width / 2)
                    .attr('y', zone.y + 20)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '14px')
                    .attr('font-weight', 'bold')
                    .attr('fill', '#1f2937')
                    .text(zone.zone);
            });
        }

        // Draw edges
        const edgeGroup = g.append('g').attr('class', 'edges');
        edges.forEach(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            
            if (!sourceNode || !targetNode) return;

            edgeGroup.append('line')
                .attr('x1', sourceNode.x)
                .attr('y1', sourceNode.y)
                .attr('x2', targetNode.x)
                .attr('y2', targetNode.y)
                .attr('stroke', edge.color)
                .attr('stroke-width', edge.stroke_width)
                .attr('stroke-dasharray', edge.stroke_dasharray || null)
                .attr('class', `edge edge-${edge.type}`);
        });

        // Draw nodes
        const nodeGroup = g.append('g').attr('class', 'nodes');
        nodes.forEach(node => {
            const nodeEl = nodeGroup.append('g')
                .attr('transform', `translate(${node.x}, ${node.y})`)
                .attr('class', 'node')
                .style('cursor', 'pointer');

            // Node circle
            nodeEl.append('circle')
                .attr('r', node.size / 2)
                .attr('fill', node.color)
                .attr('stroke', '#fff')
                .attr('stroke-width', 2);

            // Node label (acronym)
            nodeEl.append('text')
                .attr('dy', node.size / 2 + 15)
                .attr('text-anchor', 'middle')
                .attr('font-size', '11px')
                .attr('font-weight', '600')
                .attr('fill', '#1f2937')
                .text(node.class_acronym);

            // Hover interactions
            nodeEl.on('mouseenter', (event) => {
                d3.select(event.currentTarget).select('circle')
                    .attr('stroke-width', 3)
                    .attr('stroke', '#000');
                
                setTooltip({
                    node,
                    x: event.pageX,
                    y: event.pageY
                });
            })
            .on('mouseleave', (event) => {
                d3.select(event.currentTarget).select('circle')
                    .attr('stroke-width', 2)
                    .attr('stroke', '#fff');
                
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
    };

    return (
        <div className="network-graph">
            <svg ref={svgRef}></svg>
            {tooltip && <NodeTooltip data={tooltip} />}
        </div>
    );
};