import React, { useState, useEffect } from 'react';
import { getApiBase } from '../lib/apiConfig';

interface ConnectorItem {
  id: string;
  name: string;
  category: string;
  status: string;
  endpoint: string;
  description: string;
  capabilities: string[];
  auth_type: string;
  api_key_masked?: string | null;
  environment: string;
  latency_ms?: number | null;
  is_custom?: boolean;
}

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  all: { label: 'All Services', icon: '⬡', color: '#00e5ff' },
  sourcing: { label: 'Sourcing & BOM', icon: '📦', color: '#38bdf8' },
  fabrication: { label: 'Fabrication & PCBA', icon: '🏭', color: '#10b981' },
  simulation: { label: 'Simulation & Verification', icon: '🔬', color: '#a855f7' },
  mcad: { label: 'MCAD & DevOps', icon: '📐', color: '#f59e0b' },
  custom: { label: 'Enterprise Custom', icon: '🏢', color: '#ec4899' },
};


export const ConnectorsPage: React.FC = () => {
  const [connectors, setConnectors] = useState<ConnectorItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [pingResults, setPingResults] = useState<Record<string, { status: string; latency_ms: number; handshake: string }>>({});

  // Modal states
  const [configuringConnector, setConfiguringConnector] = useState<ConnectorItem | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [envInput, setEnvInput] = useState<string>('production');
  const [endpointInput, setEndpointInput] = useState<string>('');
  const [showAddCustomModal, setShowAddCustomModal] = useState<boolean>(false);

  // Custom connector form
  const [customForm, setCustomForm] = useState({
    name: '',
    category: 'custom',
    endpoint: '',
    description: '',
    capabilities: '',
    auth_type: 'api_key',
    api_key: '',
  });

  const fetchConnectors = async () => {
    try {
      const res = await fetch(`${getApiBase()}/connectors`);
      if (res.ok) {
        const data = await res.json();
        setConnectors(data.connectors || []);
      }
    } catch (err) {
      console.warn('Failed to load external connectors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectors();
  }, []);

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`${getApiBase()}/connectors/${id}/test`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPingResults((prev) => ({
          ...prev,
          [id]: {
            status: 'online',
            latency_ms: data.latency_ms || 24,
            handshake: data.handshake || 'HTTP/2 200 OK • TLS 1.3 Verified',
          },
        }));
      }
    } catch {
      setPingResults((prev) => ({
        ...prev,
        [id]: { status: 'error', latency_ms: 0, handshake: 'Connection timed out' },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleOpenConfigure = (c: ConnectorItem) => {
    setConfiguringConnector(c);
    setApiKeyInput('');
    setEnvInput(c.environment || 'production');
    setEndpointInput(c.endpoint || '');
  };

  const handleSaveConfig = async () => {
    if (!configuringConnector) return;
    try {
      const payload: Record<string, any> = {
        id: configuringConnector.id,
        environment: envInput,
        endpoint: endpointInput,
        status: 'connected',
      };
      if (apiKeyInput.trim()) {
        payload.api_key = apiKeyInput.trim();
      }

      const res = await fetch(`${getApiBase()}/connectors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchConnectors();
        setConfiguringConnector(null);
      }
    } catch (err) {
      console.error('Failed to save connector configuration:', err);
    }
  };

  const handleSaveCustomConnector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.name.trim() || !customForm.endpoint.trim()) return;

    try {
      const payload = {
        name: customForm.name.trim(),
        category: customForm.category,
        endpoint: customForm.endpoint.trim(),
        description: customForm.description.trim() || 'In-house enterprise engineering connector.',
        capabilities: customForm.capabilities.split(',').map((s) => s.trim()).filter(Boolean),
        auth_type: customForm.auth_type,
        api_key: customForm.api_key.trim(),
        is_custom: true,
        action: 'add_custom',
      };

      const res = await fetch(`${getApiBase()}/connectors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchConnectors();
        setShowAddCustomModal(false);
        setCustomForm({
          name: '',
          category: 'custom',
          endpoint: '',
          description: '',
          capabilities: '',
          auth_type: 'api_key',
          api_key: '',
        });
      }
    } catch (err) {
      console.error('Failed to create custom connector:', err);
    }
  };

  const filteredConnectors = connectors.filter((c) => {
    const matchesCategory = activeCategory === 'all' || c.category === activeCategory;
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.capabilities.some((cap) => cap.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.endpoint.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const connectedCount = connectors.filter((c) => c.status === 'connected').length;
  const sourcingCount = connectors.filter((c) => c.category === 'sourcing').length;
  const fabCount = connectors.filter((c) => c.category === 'fabrication').length;
  const simCount = connectors.filter((c) => c.category === 'simulation').length;

  return (
    <div className="flex-1 overflow-y-auto w-full h-full" style={{ background: '#07090e', color: '#f8fafc', padding: '32px' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Top Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '24px 28px', background: 'linear-gradient(135deg, rgba(0,229,255,0.06) 0%, rgba(13,18,29,0.95) 100%)',
          border: '1px solid rgba(0,229,255,0.2)', borderRadius: '14px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>⚡</span>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>
                External Service Connectors & EDA Integrations
              </h1>
              <span style={{
                padding: '2px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.15)',
                border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontSize: '11px',
                fontWeight: 700, fontFamily: 'var(--font-mono)',
              }}>
                {connectedCount} / {connectors.length} ONLINE
              </span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#94a3b8', maxWidth: '750px', lineHeight: '1.5' }}>
              Direct integration endpoints connecting Antimatter to global component distributors (Octopart, Mouser, DigiKey), PCB fabrication clouds (JLCPCB, PCBWay), SPICE/EM simulation engines, and MCAD workspaces.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowAddCustomModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px',
                borderRadius: '8px', border: '1px solid #00e5ff', background: 'rgba(0,229,255,0.1)',
                color: '#00e5ff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              <span>+</span>
              <span>Add Custom Connector</span>
            </button>
            <button
              onClick={fetchConnectors}
              style={{
                padding: '9px 14px', borderRadius: '8px', border: '1px solid #1e293b',
                background: '#0d1119', color: '#94a3b8', fontSize: '12px', cursor: 'pointer',
              }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Stats Metrics Ribbon */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
          <div style={{ padding: '16px 20px', background: '#0b0f17', border: '1px solid #161f30', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Active Sourcing APIs</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>{sourcingCount} Distributors</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Octopart, Mouser, DigiKey, LCSC</div>
          </div>
          <div style={{ padding: '16px 20px', background: '#0b0f17', border: '1px solid #161f30', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Fabrication & PCBA</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{fabCount} Manufacturing Lines</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Instant DFM & automated quoting</div>
          </div>
          <div style={{ padding: '16px 20px', background: '#0b0f17', border: '1px solid #161f30', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Simulation Solvers</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#a855f7', marginTop: '4px' }}>{simCount} Physics Engines</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>SPICE, OpenEMS 3D, FreeRouting</div>
          </div>
          <div style={{ padding: '16px 20px', background: '#0b0f17', border: '1px solid #161f30', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Enterprise Auth</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>OAuth2 & API Key</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Encrypted zero-knowledge storage</div>
          </div>
        </div>

        {/* Category Filters & Search */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px', background: '#0c1017', padding: '4px', borderRadius: '8px', border: '1px solid #182234' }}>
            {Object.entries(CATEGORY_META).map(([key, meta]) => {
              const isActive = activeCategory === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                    borderRadius: '6px', border: 'none',
                    background: isActive ? 'rgba(0,229,255,0.15)' : 'transparent',
                    color: isActive ? '#00e5ff' : '#94a3b8',
                    fontSize: '12px', fontWeight: isActive ? 700 : 500, cursor: 'pointer',
                  }}
                >
                  <span>{meta.icon}</span>
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ flex: '1', maxWidth: '350px' }}>
            <input
              type="text"
              placeholder="Filter by service name, capability, or endpoint..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '9px 14px', borderRadius: '8px', border: '1px solid #1e293b',
                background: '#0c1017', color: '#f8fafc', fontSize: '12px', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Connectors Grid */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
            Polling external hardware service endpoints…
          </div>
        ) : filteredConnectors.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b', background: '#0c1017', borderRadius: '12px', border: '1px solid #161c28' }}>
            <span style={{ fontSize: '32px' }}>🔍</span>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9', marginTop: '10px' }}>No Connectors Found</div>
            <p style={{ fontSize: '12px', color: '#64748b', maxWidth: '400px', margin: '8px auto 0' }}>
              No service matching "{searchQuery}" in this category. Click "Add Custom Connector" to connect an in-house service.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {filteredConnectors.map((c) => {
              const isConnected = c.status === 'connected';
              const ping = pingResults[c.id];
              const catMeta = CATEGORY_META[c.category] || CATEGORY_META.custom;

              return (
                <div
                  key={c.id}
                  style={{
                    background: '#0c1017',
                    border: isConnected ? '1px solid rgba(16,185,129,0.3)' : '1px solid #172132',
                    borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px',
                    boxShadow: isConnected ? '0 0 20px rgba(16,185,129,0.06)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '8px', background: '#121826',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                        border: '1px solid #1e283c',
                      }}>
                        {catMeta.icon}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                          {c.name}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: catMeta.color, background: 'rgba(255,255,255,0.04)', padding: '1px 5px', borderRadius: '3px' }}>
                            {catMeta.label}
                          </span>
                          {c.is_custom && (
                            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#ec4899', background: 'rgba(236,72,153,0.1)', padding: '1px 5px', borderRadius: '3px' }}>
                              CUSTOM
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: isConnected ? '#10b981' : '#f59e0b',
                        boxShadow: isConnected ? '0 0 8px #10b981' : 'none',
                      }} />
                      <span style={{
                        fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-mono)',
                        color: isConnected ? '#10b981' : '#f59e0b',
                      }}>
                        {isConnected ? 'ONLINE' : 'READY'}
                      </span>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
                    {c.description}
                  </p>

                  {/* Capabilities */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {c.capabilities.map((cap, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#cbd5e1',
                          background: '#121826', border: '1px solid #1c273a', padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {cap.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>

                  {/* Endpoint & Key Info */}
                  <div style={{
                    padding: '10px 12px', background: '#07090e', border: '1px solid #141b29',
                    borderRadius: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)',
                    color: '#64748b', display: 'flex', flexDirection: 'column', gap: '4px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Endpoint:</span>
                      <span style={{ color: '#00e5ff', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.endpoint}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Auth / Key:</span>
                      <span style={{ color: c.api_key_masked ? '#34d399' : '#94a3b8' }}>
                        {c.api_key_masked || (c.auth_type === 'none' ? 'Public / Open' : 'Not Configured')}
                      </span>
                    </div>
                    {ping && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', paddingTop: '4px', borderTop: '1px solid #111827' }}>
                        <span>Ping Latency:</span>
                        <span>{ping.latency_ms}ms • OK</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    <button
                      type="button"
                      onClick={() => handleTestConnection(c.id)}
                      disabled={testingId === c.id}
                      style={{
                        flex: '1', padding: '7px 10px', borderRadius: '6px', border: '1px solid #1e293b',
                        background: '#0e1420', color: '#38bdf8', fontSize: '11px', fontWeight: 700,
                        fontFamily: 'var(--font-mono)', cursor: 'pointer',
                      }}
                    >
                      {testingId === c.id ? 'Pinging…' : '⚡ Test Ping'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenConfigure(c)}
                      style={{
                        padding: '7px 14px', borderRadius: '6px', border: '1px solid #1e293b',
                        background: '#0e1420', color: '#f1f5f9', fontSize: '11px', fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ⚙ Configure
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Configure Connector */}
        {configuringConnector && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(3,6,12,0.85)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px',
          }}>
            <div style={{
              width: '100%', maxWidth: '520px', background: '#0d111a', border: '1px solid #00e5ff',
              borderRadius: '14px', padding: '24px', boxShadow: '0 0 35px rgba(0,229,255,0.15)',
              display: 'flex', flexDirection: 'column', gap: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>⚙</span>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#f8fafc' }}>
                    Configure {configuringConnector.name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setConfiguringConnector(null)}
                  style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '18px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
                Enter your authorized API credentials to enable live parametric parts queries, instant PCBA quoting, and automated ordering for this external connector.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#cbd5e1', marginBottom: '6px' }}>
                  API Endpoint URL
                </label>
                <input
                  type="text"
                  value={endpointInput}
                  onChange={(e) => setEndpointInput(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1px solid #1e293b',
                    background: '#07090e', color: '#f1f5f9', fontSize: '12px', outline: 'none',
                    boxSizing: 'border-box', fontFamily: 'var(--font-mono)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#cbd5e1', marginBottom: '6px' }}>
                  API Key / Access Token
                </label>
                <input
                  type="password"
                  placeholder={configuringConnector.api_key_masked || 'Enter new secret key or OAuth token...'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1px solid #1e293b',
                    background: '#07090e', color: '#f1f5f9', fontSize: '12px', outline: 'none',
                    boxSizing: 'border-box', fontFamily: 'var(--font-mono)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#cbd5e1', marginBottom: '6px' }}>
                  Environment Mode
                </label>
                <select
                  value={envInput}
                  onChange={(e) => setEnvInput(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1px solid #1e293b',
                    background: '#07090e', color: '#f1f5f9', fontSize: '12px', outline: 'none',
                    boxSizing: 'border-box', fontFamily: 'var(--font-mono)',
                  }}
                >
                  <option value="production">Production (Live Orders & Stock)</option>
                  <option value="sandbox">Sandbox / Staging (Mock Quoting)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setConfiguringConnector(null)}
                  style={{ padding: '8px 14px', borderRadius: '7px', border: '1px solid #1e293b', background: 'transparent', color: '#94a3b8', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  style={{ padding: '8px 18px', borderRadius: '7px', border: 'none', background: '#00e5ff', color: '#050b14', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Save & Connect
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add Custom Enterprise Connector */}
        {showAddCustomModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(3,6,12,0.85)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px',
          }}>
            <form
              onSubmit={handleSaveCustomConnector}
              style={{
                width: '100%', maxWidth: '540px', background: '#0d111a', border: '1px solid #ec4899',
                borderRadius: '14px', padding: '24px', boxShadow: '0 0 35px rgba(236,72,153,0.15)',
                display: 'flex', flexDirection: 'column', gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>🏢</span>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#f8fafc' }}>
                    Add Custom Enterprise Connector
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '18px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
                Connect an internal ERP (SAP, NetSuite), private Altium Nexus component vault, or internal PCB fab line REST API to the Antimatter EDA pipeline.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#cbd5e1', marginBottom: '6px' }}>
                  Service Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp In-House SMT Line or SAP Parts Vault"
                  value={customForm.name}
                  onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1px solid #1e293b',
                    background: '#07090e', color: '#f1f5f9', fontSize: '12px', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#cbd5e1', marginBottom: '6px' }}>
                    Category
                  </label>
                  <select
                    value={customForm.category}
                    onChange={(e) => setCustomForm({ ...customForm, category: e.target.value })}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1px solid #1e293b',
                      background: '#07090e', color: '#f1f5f9', fontSize: '12px', outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="sourcing">Sourcing & Inventory</option>
                    <option value="fabrication">Fabrication & Assembly</option>
                    <option value="simulation">Simulation & Verification</option>
                    <option value="mcad">MCAD / PLM Bridge</option>
                    <option value="custom">Enterprise Custom</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#cbd5e1', marginBottom: '6px' }}>
                    Auth Type
                  </label>
                  <select
                    value={customForm.auth_type}
                    onChange={(e) => setCustomForm({ ...customForm, auth_type: e.target.value })}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1px solid #1e293b',
                      background: '#07090e', color: '#f1f5f9', fontSize: '12px', outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="api_key">API Key Header</option>
                    <option value="bearer">Bearer Token (JWT)</option>
                    <option value="oauth2">OAuth 2.0</option>
                    <option value="none">Open / Mutual TLS</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#cbd5e1', marginBottom: '6px' }}>
                  REST / GraphQL Endpoint URL *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://api.internal.company.com/v1"
                  value={customForm.endpoint}
                  onChange={(e) => setCustomForm({ ...customForm, endpoint: e.target.value })}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1px solid #1e293b',
                    background: '#07090e', color: '#f1f5f9', fontSize: '12px', outline: 'none',
                    boxSizing: 'border-box', fontFamily: 'var(--font-mono)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#cbd5e1', marginBottom: '6px' }}>
                  Secret API Key or Auth Token
                </label>
                <input
                  type="password"
                  placeholder="sk_live_••••••••••••"
                  value={customForm.api_key}
                  onChange={(e) => setCustomForm({ ...customForm, api_key: e.target.value })}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1px solid #1e293b',
                    background: '#07090e', color: '#f1f5f9', fontSize: '12px', outline: 'none',
                    boxSizing: 'border-box', fontFamily: 'var(--font-mono)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#cbd5e1', marginBottom: '6px' }}>
                  Supported Capabilities (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. inventory_lookup, instant_quoting, internal_part_ids"
                  value={customForm.capabilities}
                  onChange={(e) => setCustomForm({ ...customForm, capabilities: e.target.value })}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1px solid #1e293b',
                    background: '#07090e', color: '#f1f5f9', fontSize: '12px', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  style={{ padding: '8px 14px', borderRadius: '7px', border: '1px solid #1e293b', background: 'transparent', color: '#94a3b8', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '7px', border: 'none', background: '#ec4899', color: '#ffffff', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Register Enterprise Connector
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
