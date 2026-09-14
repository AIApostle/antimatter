import React, { useState } from 'react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (config: {
    name: string;
    width: number;
    height: number;
    layers: number;
    maskColor: string;
    initialPrompt?: string;
  }) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [width, setWidth] = useState('50');
  const [height, setHeight] = useState('35');
  const [layers, setLayers] = useState('2');
  const [maskColor, setMaskColor] = useState('black');
  const [initialPrompt, setInitialPrompt] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      name: name.trim() || 'antimatter',
      width: parseFloat(width) || 50.0,
      height: parseFloat(height) || 35.0,
      layers: parseInt(layers, 10) || 2,
      maskColor,
      initialPrompt: initialPrompt.trim() || undefined,
    });
    setName('');
    setInitialPrompt('');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0d111a',
          border: '1px solid #1c2436',
          borderRadius: '12px',
          width: '460px',
          maxWidth: '94vw',
          padding: '24px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: '16px', borderBottom: '1px solid #1a2233', paddingBottom: '12px' }}>
          <div>
            <span style={{ fontSize: '17px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.3px' }}>
              Create New Circuit Project
            </span>
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              Initialize board outline, stackup, and launch the AI hardware designer.
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ fontSize: '13px', padding: '4px 8px', color: '#94a3b8' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Project Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. ESP32 Sensor Node (leave blank for AI to auto-name)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #232c3f',
                background: '#080a0f',
                color: '#f8fafc',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>

          <div className="flex" style={{ gap: '12px' }}>
            <div className="flex-1">
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Width (mm)
              </label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                min="10"
                max="500"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #232c3f',
                  background: '#080a0f',
                  color: '#f8fafc',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>
            <div className="flex-1">
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Height (mm)
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                min="10"
                max="500"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #232c3f',
                  background: '#080a0f',
                  color: '#f8fafc',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div className="flex" style={{ gap: '12px' }}>
            <div className="flex-1">
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Layers
              </label>
              <select
                value={layers}
                onChange={(e) => setLayers(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #232c3f',
                  background: '#080a0f',
                  color: '#f8fafc',
                  fontSize: '12px',
                  outline: 'none',
                }}
              >
                <option value="2">2-Layer Standard FR-4</option>
                <option value="4">4-Layer Controlled Impedance</option>
                <option value="6">6-Layer High Density</option>
              </select>
            </div>
            <div className="flex-1">
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Solder Mask
              </label>
              <select
                value={maskColor}
                onChange={(e) => setMaskColor(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #232c3f',
                  background: '#080a0f',
                  color: '#f8fafc',
                  fontSize: '12px',
                  outline: 'none',
                }}
              >
                <option value="black">Matte Black</option>
                <option value="purple">Studio Purple</option>
                <option value="green">Classic Green</option>
                <option value="blue">Signal Blue</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Design Requirements / First Prompt (Optional)
            </label>
            <textarea
              placeholder="e.g. Design a 5V USB-C input to 3.3V LDO power circuit with status LED and decoupling capacitors"
              value={initialPrompt}
              onChange={(e) => setInitialPrompt(e.target.value)}
              rows={2}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #232c3f',
                background: '#080a0f',
                color: '#f8fafc',
                fontSize: '12px',
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>

          <div className="flex items-center justify-end" style={{ gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ fontSize: '12px', padding: '8px 20px', fontWeight: 700 }}
            >
              ⚡ Create & Launch Studio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
