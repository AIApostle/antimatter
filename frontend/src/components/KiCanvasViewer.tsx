import React, { useMemo, useEffect, useState, useRef } from 'react';
import type { CircuitState } from '../types/eda';

interface KiCanvasViewerProps {
  viewMode: 'schematic' | 'pcb';
  state: CircuitState;
}

export const KiCanvasViewer: React.FC<KiCanvasViewerProps> = ({ viewMode, state }) => {
  const [activeLayer, setActiveLayer] = useState<'all' | 'top' | 'bottom'>('all');
  const embedRef = useRef<HTMLElement | null>(null);

  // Pick the active KiCad S-Expression
  const sexpr = useMemo(() => {
    if (viewMode === 'schematic') {
      return state.schematic_sexpr || '';
    } else {
      return state.pcb_sexpr || '';
    }
  }, [viewMode, state.schematic_sexpr, state.pcb_sexpr]);

  const fileName = viewMode === 'schematic' ? `${state.project_id}.kicad_sch` : `${state.project_id}.kicad_pcb`;

  // Create a reactive Blob URL whenever S-expression updates
  const blobUrl = useMemo(() => {
    if (!sexpr) return '';
    const blob = new Blob([sexpr], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    return url;
  }, [sexpr]);

  // Clean up object URLs on unmount or URL change
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  const handleDownload = () => {
    if (!sexpr) return;
    const blob = new Blob([sexpr], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden" style={{ background: '#0a0d14' }}>
      {/* Top Engineering Sub-Toolbar */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid #1c2230',
          background: '#0d1018',
          fontSize: '12px',
        }}
      >
        <div className="flex items-center" style={{ gap: '8px' }}>
          <span className="badge badge-cyan">Hardware Canvas</span>
          <span className="font-mono" style={{ color: '#94a3b8' }}>
            {fileName}
          </span>
        </div>

        <div className="flex items-center" style={{ gap: '8px' }}>
          {viewMode === 'pcb' && (
            <div className="flex items-center" style={{ background: '#151924', borderRadius: '6px', padding: '2px' }}>
              <button
                onClick={() => setActiveLayer('all')}
                className={`btn btn-ghost font-mono ${activeLayer === 'all' ? 'btn-primary' : ''}`}
                style={{ padding: '2px 8px', fontSize: '10px' }}
              >
                ALL
              </button>
              <button
                onClick={() => setActiveLayer('top')}
                className={`btn btn-ghost font-mono ${activeLayer === 'top' ? 'btn-primary' : ''}`}
                style={{ padding: '2px 8px', fontSize: '10px' }}
              >
                F.Cu (TOP)
              </button>
              <button
                onClick={() => setActiveLayer('bottom')}
                className={`btn btn-ghost font-mono ${activeLayer === 'bottom' ? 'btn-primary' : ''}`}
                style={{ padding: '2px 8px', fontSize: '10px' }}
              >
                B.Cu (BOT)
              </button>
            </div>
          )}

          <button onClick={handleDownload} className="btn btn-ghost font-mono" style={{ padding: '4px 8px', fontSize: '11px' }}>
            Download {viewMode === 'schematic' ? '.kicad_sch' : '.kicad_pcb'}
          </button>
        </div>
      </div>

      {/* KiCanvas WebGL Viewport */}
      <div className="relative flex-1 w-full h-full overflow-hidden" style={{ background: '#090b10' }}>
        {sexpr ? (
          <kicanvas-embed
            key={`${viewMode}-${state.revision}-${state.project_id}`}
            ref={(node: HTMLElement | null) => {
              embedRef.current = node;
            }}
            controls="full"
            style={{ width: '100%', height: '100%', display: 'block' }}
          >
            <kicanvas-source name={fileName}>
              {sexpr}
            </kicanvas-source>
          </kicanvas-embed>
        ) : (
          <div className="flex items-center justify-center w-full h-full" style={{ color: '#64748b' }}>
            Generating KiCad CAD file...
          </div>
        )}
      </div>
    </div>
  );
};
