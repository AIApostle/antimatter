import React, { useState } from 'react';
import type { CircuitState } from '../types/eda';

interface BOMAndNetlistProps {
  state: CircuitState;
}

export const BOMAndNetlist: React.FC<BOMAndNetlistProps> = ({ state }) => {
  const [activeSubTab, setActiveSubTab] = useState<'bom' | 'nets' | 'drc'>('bom');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const components = Object.values(state.components || {});
  const nets = Object.entries(state.nets || {});
  const drcErrors = state.drc_errors || [];

  const filteredComponents = components.filter(
    (c) =>
      c.ref.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.value.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.footprint.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredNets = nets.filter(([name]) =>
    name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full h-full overflow-hidden" style={{ background: '#090b10' }}>
      {/* Sub-tab header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid #1c2230',
          background: '#0d1017',
        }}
      >
        <div className="flex items-center" style={{ gap: '6px' }}>
          <button
            onClick={() => setActiveSubTab('bom')}
            className={`btn btn-ghost font-mono ${activeSubTab === 'bom' ? 'btn-primary' : ''}`}
            style={{ fontSize: '11px', padding: '4px 10px' }}
          >
            Bill of Materials ({components.length})
          </button>
          <button
            onClick={() => setActiveSubTab('nets')}
            className={`btn btn-ghost font-mono ${activeSubTab === 'nets' ? 'btn-primary' : ''}`}
            style={{ fontSize: '11px', padding: '4px 10px' }}
          >
            Netlist ({nets.length})
          </button>
          <button
            onClick={() => setActiveSubTab('drc')}
            className={`btn btn-ghost font-mono ${activeSubTab === 'drc' ? 'btn-primary' : ''}`}
            style={{ fontSize: '11px', padding: '4px 10px' }}
          >
            DRC / ERC ({drcErrors.length})
          </button>
        </div>

        {/* Search input */}
        <div>
          <input
            type="text"
            placeholder="Search items..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="font-mono"
            style={{
              fontSize: '11px',
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #232a3b',
              background: '#07080c',
              color: '#f1f5f9',
              outline: 'none',
              width: '180px',
            }}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '16px' }}>
        {/* BOM View */}
        {activeSubTab === 'bom' && (
          <div style={{ border: '1px solid #1c2230', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#111520', borderBottom: '1px solid #1c2230', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                  <th style={{ padding: '8px 12px' }}>Ref</th>
                  <th style={{ padding: '8px 12px' }}>Value</th>
                  <th style={{ padding: '8px 12px' }}>Footprint</th>
                  <th style={{ padding: '8px 12px' }}>Position (X, Y)</th>
                  <th style={{ padding: '8px 12px' }}>Rot</th>
                  <th style={{ padding: '8px 12px' }}>Layer</th>
                </tr>
              </thead>
              <tbody>
                {filteredComponents.map((c) => (
                  <tr
                    key={c.ref}
                    style={{
                      borderBottom: '1px solid #141924',
                      background: 'rgba(10, 13, 20, 0.4)',
                    }}
                  >
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#00e5ff', fontFamily: 'var(--font-mono)' }}>
                      {c.ref}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#f8fafc', fontWeight: 500 }}>
                      {c.value}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#94a3b8', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                      {c.footprint}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#cbd5e1', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                      ({c.x.toFixed(1)}, {c.y.toFixed(1)}) mm
                    </td>
                    <td style={{ padding: '8px 12px', color: '#94a3b8', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                      {c.rotation}°
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
                        {c.layer}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Netlist View */}
        {activeSubTab === 'nets' && (
          <div className="flex flex-col" style={{ gap: '10px' }}>
            {filteredNets.map(([netName, netData]) => (
              <div
                key={netName}
                style={{
                  background: '#0e121b',
                  border: '1px solid #1d2331',
                  borderRadius: '6px',
                  padding: '10px 14px',
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: '6px' }}>
                  <span className="font-mono" style={{ fontWeight: 700, color: '#f59e0b', fontSize: '13px' }}>
                    {netName}
                  </span>
                  <span className="badge" style={{ background: '#1c2333', color: '#94a3b8' }}>
                    {netData.nodes.length} node(s)
                  </span>
                </div>
                <div className="flex flex-wrap" style={{ gap: '6px' }}>
                  {netData.nodes.map(([ref, pin], idx) => (
                    <span
                      key={idx}
                      className="font-mono"
                      style={{
                        background: '#141824',
                        border: '1px solid #232a3d',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        color: '#cbd5e1',
                      }}
                    >
                      {ref}.{pin}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DRC / ERC View */}
        {activeSubTab === 'drc' && (
          <div className="flex flex-col" style={{ gap: '10px' }}>
            {drcErrors.length === 0 ? (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid #10b981',
                  borderRadius: '8px',
                  padding: '16px',
                  color: '#10b981',
                  fontSize: '13px',
                  textAlign: 'center',
                }}
              >
                ✓ All Design Rules and Electrical Rules are passing with 0 violations!
              </div>
            ) : (
              drcErrors.map((err, i) => (
                <div
                  key={i}
                  style={{
                    background: '#12141c',
                    border: `1px solid ${err.severity === 'error' ? '#f43f5e' : '#f59e0b'}`,
                    borderRadius: '8px',
                    padding: '12px 14px',
                  }}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: '6px' }}>
                    <span className={`badge ${err.severity === 'error' ? 'badge-red' : 'badge-amber'}`}>
                      {err.severity.toUpperCase()}: {err.rule}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#f1f5f9', marginBottom: '6px' }}>
                    {err.message}
                  </div>
                  {err.items && err.items.length > 0 && (
                    <div className="flex flex-wrap" style={{ gap: '4px' }}>
                      {err.items.map((item, idx) => (
                        <span
                          key={idx}
                          className="font-mono"
                          style={{
                            fontSize: '10px',
                            background: '#191d28',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            color: '#94a3b8',
                          }}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
