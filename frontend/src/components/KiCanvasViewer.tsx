import React, { useMemo, useEffect, useState, useRef } from 'react';
import type { CircuitState } from '../types/eda';

interface KiCanvasViewerProps {
  viewMode: 'schematic' | 'pcb';
  state: CircuitState;
}

export interface BgOption {
  id: string;
  label: string;
  color: string;
  theme: 'witchhazel' | 'kicad';
  isLight?: boolean;
}

export const SCHEMATIC_BG_OPTIONS: BgOption[] = [
  { id: 'dark', label: 'Dark Obsidian', color: '#131218', theme: 'witchhazel' },
  { id: 'paper', label: 'Paper Light', color: '#f5f4ef', theme: 'kicad', isLight: true },
  { id: 'navy', label: 'Blueprint Navy', color: '#001428', theme: 'witchhazel' },
  { id: 'emerald', label: 'CAD Green', color: '#04160e', theme: 'witchhazel' },
];

export const PCB_BG_OPTIONS: BgOption[] = [
  { id: 'obsidian', label: 'Obsidian Night', color: '#090c14', theme: 'witchhazel' },
  { id: 'navy', label: 'KiCad Navy', color: '#001023', theme: 'kicad' },
  { id: 'pitch', label: 'Pitch Black', color: '#000000', theme: 'witchhazel' },
  { id: 'emerald', label: 'FR-4 Green', color: '#071b12', theme: 'witchhazel' },
  { id: 'slate', label: 'Muted Slate', color: '#141822', theme: 'witchhazel' },
];

export const KiCanvasViewer: React.FC<KiCanvasViewerProps> = ({ viewMode, state }) => {
  const [activeLayer, setActiveLayer] = useState<'all' | 'top' | 'bottom'>('all');
  const embedRef = useRef<HTMLElement | null>(null);

  // Background color / theme state (persisted per view mode)
  const isSchematic = viewMode === 'schematic';
  const storageKey = isSchematic ? 'antimatter_sch_bg' : 'antimatter_pcb_bg';
  const bgOptions = isSchematic ? SCHEMATIC_BG_OPTIONS : PCB_BG_OPTIONS;

  const [activeBgId, setActiveBgId] = useState<string>(() => {
    return localStorage.getItem(storageKey) || (isSchematic ? 'dark' : 'obsidian');
  });

  // Ensure current option is valid for active mode
  const activeBg = useMemo(() => {
    return bgOptions.find((opt) => opt.id === activeBgId) || bgOptions[0];
  }, [bgOptions, activeBgId]);

  const handleSelectBg = (id: string) => {
    setActiveBgId(id);
    localStorage.setItem(storageKey, id);
  };

  // Pick the active KiCad S-Expression
  const sexpr = useMemo(() => {
    if (viewMode === 'schematic') {
      return state.schematic_sexpr || '';
    } else {
      return state.pcb_sexpr || '';
    }
  }, [viewMode, state.schematic_sexpr, state.pcb_sexpr]);

  const fileName = viewMode === 'schematic' ? `${state.project_id}.kicad_sch` : `${state.project_id}.kicad_pcb`;

  // Synchronize KiCanvas preferences in localStorage and DOM
  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('kc:prefs') || '{}');
      const val = prefs.val || {};
      if (val.theme !== activeBg.theme) {
        prefs.val = { ...val, theme: activeBg.theme };
        localStorage.setItem('kc:prefs', JSON.stringify(prefs));
      }
    } catch { /* ignore */ }

    // Direct shadow DOM background styling
    const applyCanvasStyle = () => {
      const embed = embedRef.current;
      if (!embed) return;
      embed.style.setProperty('--bg', activeBg.color);
      embed.style.setProperty('--panel-bg', activeBg.color);

      try {
        const shadow = embed.shadowRoot;
        if (shadow) {
          const canvas = shadow.querySelector('canvas') as HTMLCanvasElement | null;
          if (canvas) {
            canvas.style.backgroundColor = activeBg.color;
          }
          const app = shadow.querySelector('kc-ui-app') as HTMLElement | null;
          if (app) {
            app.style.setProperty('--bg', activeBg.color);
            app.style.backgroundColor = activeBg.color;
          }
        }
      } catch { /* ignore */ }
    };

    applyCanvasStyle();
    const t = setTimeout(applyCanvasStyle, 250);
    return () => clearTimeout(t);
  }, [activeBg, viewMode, sexpr]);

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
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{
        background: activeBg.color,
        transition: 'background 0.2s ease',
      }}
    >
      {/* Top Engineering Sub-Toolbar */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '7px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: activeBg.isLight ? '#e5e4de' : 'rgba(13, 16, 24, 0.95)',
          backdropFilter: 'blur(8px)',
          fontSize: '12px',
          flexShrink: 0,
          zIndex: 5,
        }}
      >
        {/* Left: Canvas Mode Badge & Filename */}
        <div className="flex items-center" style={{ gap: '8px' }}>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              background: isSchematic ? 'rgba(0, 229, 255, 0.15)' : 'rgba(59, 130, 246, 0.15)',
              color: isSchematic ? '#00e5ff' : '#60a5fa',
              border: isSchematic ? '1px solid rgba(0, 229, 255, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            {isSchematic ? 'SCHEMATIC' : 'PCB LAYOUT'}
          </span>
          <span
            className="font-mono"
            style={{
              color: activeBg.isLight ? '#334155' : '#94a3b8',
              fontSize: '11px',
              maxWidth: '220px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {fileName}
          </span>
        </div>

        {/* Center: Background Color Switcher */}
        <div
          className="flex items-center"
          style={{
            gap: '4px',
            background: activeBg.isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.03)',
            border: activeBg.isLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid #1c2635',
            borderRadius: '7px',
            padding: '2px 4px',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: activeBg.isLight ? '#64748b' : '#64748b',
              marginRight: '2px',
              paddingLeft: '4px',
              textTransform: 'uppercase',
            }}
          >
            Color:
          </span>
          {bgOptions.map((opt) => {
            const isSel = opt.id === activeBg.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleSelectBg(opt.id)}
                title={`Switch canvas background to ${opt.label}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  border: isSel ? '1px solid #00e5ff' : '1px solid transparent',
                  background: isSel
                    ? (activeBg.isLight ? 'rgba(0,229,255,0.2)' : 'rgba(0,229,255,0.12)')
                    : 'transparent',
                  color: isSel
                    ? '#00e5ff'
                    : (activeBg.isLight ? '#475569' : '#94a3b8'),
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: isSel ? 700 : 500,
                  transition: 'all 0.15s',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: opt.color,
                    border: isSel ? '1px solid #00e5ff' : '1px solid rgba(255,255,255,0.3)',
                    boxShadow: isSel ? '0 0 6px rgba(0,229,255,0.6)' : 'none',
                    display: 'inline-block',
                  }}
                />
                <span>{opt.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Layer Filters & Download */}
        <div className="flex items-center" style={{ gap: '8px' }}>
          {viewMode === 'pcb' && (
            <div
              className="flex items-center"
              style={{
                background: activeBg.isLight ? 'rgba(0,0,0,0.06)' : '#151924',
                borderRadius: '6px',
                padding: '2px',
                border: '1px solid #1c2635',
              }}
            >
              <button
                onClick={() => setActiveLayer('all')}
                style={{
                  padding: '3px 8px',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  borderRadius: '4px',
                  border: 'none',
                  background: activeLayer === 'all' ? '#00e5ff' : 'transparent',
                  color: activeLayer === 'all' ? '#050b14' : '#94a3b8',
                  fontWeight: activeLayer === 'all' ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                ALL
              </button>
              <button
                onClick={() => setActiveLayer('top')}
                style={{
                  padding: '3px 8px',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  borderRadius: '4px',
                  border: 'none',
                  background: activeLayer === 'top' ? '#00e5ff' : 'transparent',
                  color: activeLayer === 'top' ? '#050b14' : '#94a3b8',
                  fontWeight: activeLayer === 'top' ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                F.Cu
              </button>
              <button
                onClick={() => setActiveLayer('bottom')}
                style={{
                  padding: '3px 8px',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  borderRadius: '4px',
                  border: 'none',
                  background: activeLayer === 'bottom' ? '#00e5ff' : 'transparent',
                  color: activeLayer === 'bottom' ? '#050b14' : '#94a3b8',
                  fontWeight: activeLayer === 'bottom' ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                B.Cu
              </button>
            </div>
          )}

          <button
            onClick={handleDownload}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              borderRadius: '6px',
              border: '1px solid #1c2635',
              background: activeBg.isLight ? '#f1f5f9' : 'rgba(255,255,255,0.03)',
              color: activeBg.isLight ? '#0f172a' : '#cbd5e1',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>↓</span>
            <span>{isSchematic ? '.kicad_sch' : '.kicad_pcb'}</span>
          </button>
        </div>
      </div>

      {/* KiCanvas WebGL Viewport */}
      <div
        className="relative flex-1 w-full h-full overflow-hidden"
        style={{
          background: activeBg.color,
          transition: 'background 0.2s ease',
        }}
      >
        {sexpr ? (
          <kicanvas-embed
            key={`${viewMode}-${activeBg.id}-${activeBg.theme}`}
            ref={(node: HTMLElement | null) => {
              embedRef.current = node;
            }}
            controls="full"
            controlslist="nooverlay"
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              background: activeBg.color,
            }}
          >
            <kicanvas-source name={fileName}>
              {sexpr}
            </kicanvas-source>
          </kicanvas-embed>
        ) : (
          <div
            className="flex flex-col items-center justify-center w-full h-full"
            style={{ color: activeBg.isLight ? '#64748b' : '#475569', gap: '8px' }}
          >
            <span style={{ fontSize: '32px' }}>{isSchematic ? '📐' : '▦'}</span>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>
              Generating KiCad {isSchematic ? 'Schematic' : 'PCB'} CAD File...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KiCanvasViewer;
