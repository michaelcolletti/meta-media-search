import { useAppStore } from '@store/index';
import type { VisualizationConfig } from '@types/index';
import './VisualizationControls.css';

export function VisualizationControls() {
  const vizConfig = useAppStore(state => state.vizConfig);
  const updateVizConfig = useAppStore(state => state.updateVizConfig);

  const handleLayoutChange = (layout: VisualizationConfig['layout']) => {
    updateVizConfig({ layout });
  };

  const handleColorSchemeChange = (colorScheme: VisualizationConfig['colorScheme']) => {
    updateVizConfig({ colorScheme });
  };

  const handleNodeSizeChange = (nodeSize: VisualizationConfig['nodeSize']) => {
    updateVizConfig({ nodeSize });
  };

  const toggleClustering = () => {
    updateVizConfig({ clustering: !vizConfig.clustering });
  };

  const toggle3D = () => {
    updateVizConfig({ show3D: !vizConfig.show3D });
  };

  return (
    <div className="viz-controls">
      <div className="viz-control-group">
        <label className="viz-control-label">Layout</label>
        <div className="viz-control-buttons">
          {(['force', 'hierarchical', 'circular', 'grid'] as const).map(layout => (
            <button
              key={layout}
              className={`viz-control-button ${vizConfig.layout === layout ? 'active' : ''}`}
              onClick={() => handleLayoutChange(layout)}
            >
              {layout.charAt(0).toUpperCase() + layout.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="viz-control-group">
        <label className="viz-control-label">Color by</label>
        <div className="viz-control-buttons">
          {(['genre', 'type', 'platform', 'mood'] as const).map(scheme => (
            <button
              key={scheme}
              className={`viz-control-button ${vizConfig.colorScheme === scheme ? 'active' : ''}`}
              onClick={() => handleColorSchemeChange(scheme)}
            >
              {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="viz-control-group">
        <label className="viz-control-label">Node size</label>
        <div className="viz-control-buttons">
          {(['fixed', 'popularity', 'rating'] as const).map(size => (
            <button
              key={size}
              className={`viz-control-button ${vizConfig.nodeSize === size ? 'active' : ''}`}
              onClick={() => handleNodeSizeChange(size)}
            >
              {size.charAt(0).toUpperCase() + size.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="viz-control-group">
        <label className="viz-control-label">Options</label>
        <div className="viz-control-toggles">
          <button
            className={`viz-toggle ${vizConfig.clustering ? 'active' : ''}`}
            onClick={toggleClustering}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              {vizConfig.clustering ? (
                <path
                  d="M13 5L6 12L3 9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
            </svg>
            Clustering
          </button>
          <button className={`viz-toggle ${vizConfig.show3D ? 'active' : ''}`} onClick={toggle3D}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              {vizConfig.show3D ? (
                <path
                  d="M13 5L6 12L3 9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
            </svg>
            3D View
          </button>
        </div>
      </div>
    </div>
  );
}
