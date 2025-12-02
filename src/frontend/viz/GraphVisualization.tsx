import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { GraphNode, GraphEdge, VisualizationConfig } from '@types/index';
import { useAppStore } from '@store/index';
import './GraphVisualization.css';

interface GraphVisualizationProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  config: VisualizationConfig;
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
}

export function GraphVisualization({
  nodes,
  edges,
  config,
  onNodeClick,
  onNodeHover,
}: GraphVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;

    // Create simulation
    const simulation = d3
      .forceSimulation(nodes as any)
      .force(
        'link',
        d3
          .forceLink(edges)
          .id((d: any) => d.id)
          .distance((d: any) => 100 / (d.weight || 1))
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => d.size + 10));

    // Create container groups
    const container = svg.append('g').attr('class', 'graph-container');

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Draw edges
    const link = container
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('stroke', (d) => {
        const colors: Record<string, string> = {
          similar: '#6366f1',
          genre: '#8b5cf6',
          actor: '#ec4899',
          director: '#f59e0b',
          mood: '#10b981',
        };
        return colors[d.type] || '#4b5563';
      })
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', (d) => Math.sqrt(d.weight) * 2);

    // Draw nodes
    const node = container
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .call(
        d3
          .drag<any, any>()
          .on('start', (event, d: any) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d: any) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d: any) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Add circles for nodes
    node
      .append('circle')
      .attr('r', (d) => d.size)
      .attr('fill', (d) => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        onNodeHover?.(d);
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr('r', d.size * 1.3)
          .attr('stroke-width', 3);
      })
      .on('mouseleave', (event, d) => {
        onNodeHover?.(null);
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr('r', d.size)
          .attr('stroke-width', 2);
      })
      .on('click', (event, d) => {
        onNodeClick?.(d);
      });

    // Add labels
    node
      .append('text')
      .attr('dy', (d) => d.size + 15)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--color-text-primary)')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .style('pointer-events', 'none')
      .text((d) => d.label);

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [nodes, edges, dimensions, config, onNodeClick, onNodeHover]);

  return (
    <div ref={containerRef} className="graph-visualization">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />
    </div>
  );
}
