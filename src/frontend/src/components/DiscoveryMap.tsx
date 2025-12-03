import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import './DiscoveryMap.css';

cytoscape.use(fcose);

interface MapNode {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  size: number;
  metadata: any;
}

interface MapEdge {
  source: string;
  target: string;
  weight: number;
  type: string;
}

interface DiscoveryMapProps {
  nodes: MapNode[];
  edges: MapEdge[];
}

export default function DiscoveryMap({ nodes, edges }: DiscoveryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || !nodes.length) return;

    // Initialize Cytoscape
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: [
        ...nodes.map(node => ({
          data: {
            id: node.id,
            label: node.label,
            type: node.type,
            size: node.size,
            ...node.metadata
          },
          position: { x: node.x, y: node.y }
        })),
        ...edges.map(edge => ({
          data: {
            source: edge.source,
            target: edge.target,
            weight: edge.weight,
            type: edge.type
          }
        }))
      ],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#6366f1',
            'label': 'data(label)',
            'width': 'data(size)',
            'height': 'data(size)',
            'color': '#f1f5f9',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '12px',
            'text-outline-color': '#0f172a',
            'text-outline-width': 2
          }
        },
        {
          selector: 'node:selected',
          style: {
            'background-color': '#8b5cf6',
            'border-width': 3,
            'border-color': '#f1f5f9'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 'data(weight)',
            'line-color': '#334155',
            'target-arrow-color': '#334155',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'opacity': 0.6
          }
        }
      ],
      layout: {
        name: 'fcose',
        quality: 'proof',
        randomize: false,
        animate: true,
        animationDuration: 1000,
        fit: true,
        padding: 50
      }
    });

    // Add event listeners
    cyRef.current.on('tap', 'node', function(evt: any) {
      const node = evt.target;
      console.log('Selected:', node.data());
      // TODO: Show content details panel
    });

    return () => {
      cyRef.current?.destroy();
    };
  }, [nodes, edges]);

  return (
    <div className="discovery-map-container">
      <div className="map-controls">
        <button onClick={() => cyRef.current?.fit()}>Fit</button>
        <button onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.2)}>+</button>
        <button onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)}>-</button>
      </div>
      <div ref={containerRef} className="discovery-map" />
    </div>
  );
}
