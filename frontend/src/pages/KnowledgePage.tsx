import React, { useState, useEffect } from 'react';

interface ComponentData {
  id: string;
  value: string;
  footprint: string;
  symbol: string;
  description: string;
  pin_count: number;
  pins: Record<string, string>;
}

interface OpenSourceStandard {
  id: string;
  title: string;
  standard: string;
  category: string;
  rule: string;
  scope: string;
  description: string;
  checklist: string[];
  agent_rule: string;
}

interface OrganizationSOP {
  id: string;
  title: string;
  standard: string;
  category: string;
  rule: string;
  scope: string;
  author?: string;
  description: string;
  checklist: string[];
  agent_rule: string;
  is_custom?: boolean;
}

interface AgentPrompt {
  category: string;
  title: string;
  prompt: string;
}

interface KnowledgePageProps {
  onCopyPromptToStudio?: (prompt: string) => void;
}

const getApiBase = () => {
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:8000/api`;
  }
  return 'http://localhost:8000/api';
};

export const KnowledgePage: React.FC<KnowledgePageProps> = ({ onCopyPromptToStudio }) => {
  const [standards, setStandards] = useState<OpenSourceStandard[]>([]);
  const [organizationSOPs, setOrganizationSOPs] = useState<OrganizationSOP[]>([]);
  const [components, setComponents] = useState<ComponentData[]>([]);
  const [agentPrompts, setAgentPrompts] = useState<AgentPrompt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'sops' | 'standards' | 'components' | 'prompts'>('sops');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  // Modal for adding custom organization SOP
  const [showAddSopModal, setShowAddSopModal] = useState<boolean>(false);
  const [sopForm, setSopForm] = useState({
    title: '',
    standard: '',
    category: 'Organization SOP',
    rule: '',
    scope: 'Company Mandatory',
    author: '',
    description: '',
    checklistText: '',
    agent_rule: '',
  });

  const fetchKnowledge = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/knowledge`);
      if (res.ok) {
        const data = await res.json();
        setStandards(data.standards || []);
        setOrganizationSOPs(data.organization_sops || []);
        setComponents(data.components || []);
        setAgentPrompts(data.agent_prompts || []);
      }
    } catch (err) {
      console.warn('Could not fetch knowledge base:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const handleCopyPrompt = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 1500);
    if (onCopyPromptToStudio) {
      onCopyPromptToStudio(text);
    }
  };

  const handleCreateSop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sopForm.title.trim() || !sopForm.rule.trim()) return;

    try {
      const checklist = sopForm.checklistText
        .split('\n')
        .map((s) => s.replace(/^[•\-*]\s*/, '').trim())
        .filter(Boolean);

      const payload = {
        title: sopForm.title.trim(),
        standard: sopForm.standard.trim() || 'Internal SOP',
        category: sopForm.category,
        rule: sopForm.rule.trim(),
        scope: sopForm.scope,
        author: sopForm.author.trim() || 'Engineering Team',
        description: sopForm.description.trim(),
        checklist,
        agent_rule: sopForm.agent_rule.trim(),
        is_custom: true,
      };

      const res = await fetch(`${getApiBase()}/knowledge/sop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchKnowledge();
        setShowAddSopModal(false);
        setSopForm({
          title: '',
          standard: '',
          category: 'Organization SOP',
          rule: '',
          scope: 'Company Mandatory',
          author: '',
          description: '',
          checklistText: '',
          agent_rule: '',
        });
      }
    } catch (err) {
      console.error('Failed to create SOP:', err);
    }
  };

  const handleDeleteSop = async (sopId: string) => {
    try {
      const res = await fetch(`${getApiBase()}/knowledge/sop/${sopId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchKnowledge();
      }
    } catch (err) {
      console.error('Failed to delete SOP:', err);
    }
  };

  // Filtered queries
  const filteredSOPs = organizationSOPs.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.standard.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rule.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStandards = standards.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.standard.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredComponents = components.filter(
    (c) =>
      c.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.footprint.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto w-full h-full" style={{ background: '#07090e', color: '#f8fafc', padding: '32px' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Top Header Banner */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '24px 28px', background: 'linear-gradient(135deg, rgba(0,229,255,0.06) 0%, rgba(13,18,29,0.95) 100%)',
          border: '1px solid rgba(0,229,255,0.2)', borderRadius: '14px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>📜</span>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>
                Engineering Knowledge Base & Organizational Standards
              </h1>
              <span style={{
                padding: '2px 8px', borderRadius: '6px', background: 'rgba(0,229,255,0.15)',
                border: '1px solid rgba(0,229,255,0.3)', color: '#00e5ff', fontSize: '11px',
                fontWeight: 700, fontFamily: 'var(--font-mono)',
              }}>
                {standards.length + organizationSOPs.length} KNOWLEDGE RULES
              </span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#94a3b8', maxWidth: '780px', lineHeight: '1.5' }}>
              Open-source IPC design benchmarks, RF/high-speed physics rules, and company-specific Standard Operating Procedures (SOPs). Organizations can define custom manufacturing and routing processes enforced directly by the AI hardware architect.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowAddSopModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px',
                borderRadius: '8px', border: '1px solid #10b981', background: 'rgba(16,185,129,0.12)',
                color: '#34d399', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              <span>+</span>
              <span>Create Custom Knowledge / SOP</span>
            </button>
            <button
              onClick={fetchKnowledge}
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
            <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Organization SOPs</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{organizationSOPs.length} Company Standards</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Custom in-house routing & QA rules</div>
          </div>
          <div style={{ padding: '16px 20px', background: '#0b0f17', border: '1px solid #161f30', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Open-Source Standards</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#00e5ff', marginTop: '4px' }}>{standards.length} IPC Benchmarks</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>IPC-2221B, 7351B, PDN, 50Ω RF</div>
          </div>
          <div style={{ padding: '16px 20px', background: '#0b0f17', border: '1px solid #161f30', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Verified Components</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#a855f7', marginTop: '4px' }}>{components.length} Real Parts</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Pre-verified footprints & symbols</div>
          </div>
          <div style={{ padding: '16px 20px', background: '#0b0f17', border: '1px solid #161f30', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>AI Agent Enforced</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>100% Autonomous</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Direct prompt recipe injections</div>
          </div>
        </div>

        {/* Navigation Tabs & Search */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px', background: '#0c1017', padding: '4px', borderRadius: '8px', border: '1px solid #182234' }}>
            <button
              onClick={() => setActiveTab('sops')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
                borderRadius: '6px', border: 'none',
                background: activeTab === 'sops' ? 'rgba(16,185,129,0.18)' : 'transparent',
                color: activeTab === 'sops' ? '#10b981' : '#94a3b8',
                fontSize: '12px', fontWeight: activeTab === 'sops' ? 700 : 500, cursor: 'pointer',
              }}
            >
              <span>🏢</span>
              <span>Organization Knowledge & Custom SOPs ({organizationSOPs.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('standards')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
                borderRadius: '6px', border: 'none',
                background: activeTab === 'standards' ? 'rgba(0,229,255,0.15)' : 'transparent',
                color: activeTab === 'standards' ? '#00e5ff' : '#94a3b8',
                fontSize: '12px', fontWeight: activeTab === 'standards' ? 700 : 500, cursor: 'pointer',
              }}
            >
              <span>📐</span>
              <span>Open-Source IPC Standards & Physics ({standards.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('components')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
                borderRadius: '6px', border: 'none',
                background: activeTab === 'components' ? 'rgba(168,85,247,0.15)' : 'transparent',
                color: activeTab === 'components' ? '#a855f7' : '#94a3b8',
                fontSize: '12px', fontWeight: activeTab === 'components' ? 700 : 500, cursor: 'pointer',
              }}
            >
              <span>⚡</span>
              <span>Components & Footprints ({components.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('prompts')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
                borderRadius: '6px', border: 'none',
                background: activeTab === 'prompts' ? 'rgba(245,158,11,0.15)' : 'transparent',
                color: activeTab === 'prompts' ? '#f59e0b' : '#94a3b8',
                fontSize: '12px', fontWeight: activeTab === 'prompts' ? 700 : 500, cursor: 'pointer',
              }}
            >
              <span>💡</span>
              <span>Agent Prompt Recipes ({agentPrompts.length})</span>
            </button>
          </div>

          <div style={{ flex: '1', maxWidth: '340px' }}>
            <input
              type="text"
              placeholder="Search knowledge rules, standards, or SOPs..."
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

        {loading && (
          <div style={{ color: '#00e5ff', fontSize: '12px', padding: '8px 0', fontFamily: 'var(--font-mono)' }}>
            ⚡ Syncing engineering knowledge base and organizational standards...
          </div>
        )}

        {/* Tab 1: Organization Knowledge & Custom SOPs */}
        {activeTab === 'sops' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredSOPs.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b', background: '#0c1017', borderRadius: '12px', border: '1px solid #161c28' }}>
                <span style={{ fontSize: '32px' }}>🏢</span>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9', marginTop: '10px' }}>No Organization SOPs Found</div>
                <p style={{ fontSize: '12px', color: '#64748b', maxWidth: '420px', margin: '8px auto 0' }}>
                  Click "+ Create Custom Knowledge / SOP" to add your company's in-house engineering policies and routing procedures.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
                {filteredSOPs.map((sop) => {
                  const isMandatory = sop.scope.includes('Mandatory');
                  return (
                    <div
                      key={sop.id}
                      style={{
                        background: '#0c1017',
                        border: isMandatory ? '1px solid rgba(16,185,129,0.35)' : '1px solid #172132',
                        borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px',
                        boxShadow: isMandatory ? '0 0 20px rgba(16,185,129,0.06)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#34d399', background: 'rgba(16,185,129,0.12)', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                              {sop.standard}
                            </span>
                            {sop.is_custom && (
                              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#ec4899', background: 'rgba(236,72,153,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                CUSTOM
                              </span>
                            )}
                          </div>
                          <h3 style={{ margin: '8px 0 0', fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                            {sop.title}
                          </h3>
                        </div>

                        <span style={{
                          fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-mono)',
                          padding: '2px 7px', borderRadius: '4px',
                          background: isMandatory ? 'rgba(239,68,68,0.12)' : 'rgba(0,229,255,0.12)',
                          color: isMandatory ? '#f87171' : '#38bdf8',
                          border: isMandatory ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(0,229,255,0.3)',
                        }}>
                          {sop.scope.toUpperCase()}
                        </span>
                      </div>

                      {/* Rule Pill */}
                      <div style={{
                        padding: '8px 12px', background: '#07090e', border: '1px solid #151d2a',
                        borderRadius: '7px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#38bdf8',
                      }}>
                        ⚡ <strong>Rule:</strong> {sop.rule}
                      </div>

                      <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
                        {sop.description}
                      </p>

                      {/* Checklist */}
                      {sop.checklist && sop.checklist.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#0a0e16', padding: '10px 12px', borderRadius: '8px', border: '1px solid #131b26' }}>
                          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#64748b', textTransform: 'uppercase' }}>Enforced Checklist Items:</span>
                          {sop.checklist.map((item, idx) => (
                            <div key={idx} style={{ fontSize: '11px', color: '#cbd5e1', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                              <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span>
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Agent Directive */}
                      {sop.agent_rule && (
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', background: '#070a10', padding: '8px 10px', borderRadius: '6px', borderLeft: '3px solid #10b981' }}>
                          <strong style={{ color: '#10b981', fontStyle: 'normal' }}>AI Directive:</strong> {sop.agent_rule}
                        </div>
                      )}

                      {/* Action Footer */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleCopyPrompt(`Enforce standard '${sop.title}' (${sop.standard}): ${sop.agent_rule}`, sop.id)}
                          style={{
                            flex: '1', padding: '7px 12px', borderRadius: '6px', border: '1px solid #1e293b',
                            background: '#0d131f', color: '#38bdf8', fontSize: '11px', fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {copiedIndex === sop.id ? '✓ Injected to Studio' : '⚡ Apply in Studio'}
                        </button>
                        {sop.is_custom && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSop(sop.id)}
                            style={{
                              padding: '7px 10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)',
                              background: 'transparent', color: '#ef4444', fontSize: '11px', cursor: 'pointer',
                            }}
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Open-Source Standards & Physics */}
        {activeTab === 'standards' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {filteredStandards.map((std) => (
              <div
                key={std.id}
                style={{
                  background: '#0c1017', border: '1px solid #182234', borderRadius: '12px',
                  padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#00e5ff', background: 'rgba(0,229,255,0.1)', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                      {std.standard}
                    </span>
                    <h3 style={{ margin: '8px 0 0', fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                      {std.title}
                    </h3>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                    {std.category}
                  </span>
                </div>

                <div style={{
                  padding: '8px 12px', background: '#07090e', border: '1px solid #151d2a',
                  borderRadius: '7px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#38bdf8',
                }}>
                  📏 <strong>Design Rule:</strong> {std.rule}
                </div>

                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
                  {std.description}
                </p>

                {std.checklist && std.checklist.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#0a0e16', padding: '10px 12px', borderRadius: '8px', border: '1px solid #131b26' }}>
                    <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#64748b', textTransform: 'uppercase' }}>IPC Verification Rules:</span>
                    {std.checklist.map((item, idx) => (
                      <div key={idx} style={{ fontSize: '11px', color: '#cbd5e1', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <span style={{ color: '#00e5ff', flexShrink: 0 }}>•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleCopyPrompt(`Apply design standard '${std.title}' (${std.standard}): ${std.agent_rule}`, std.id)}
                    style={{
                      width: '100%', padding: '7px 12px', borderRadius: '6px', border: '1px solid #1e293b',
                      background: '#0d131f', color: '#00e5ff', fontSize: '11px', fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedIndex === std.id ? '✓ Copied to Studio' : '⚡ Copy Rule Prompt'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Components & Footprints Reference */}
        {activeTab === 'components' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {filteredComponents.map((c) => (
              <div
                key={c.id}
                style={{
                  background: '#0c1017', border: '1px solid #182234', borderRadius: '12px',
                  padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>{c.value}</span>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#a855f7', background: 'rgba(168,85,247,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    {c.pin_count} PINS
                  </span>
                </div>

                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                  {c.footprint}
                </div>

                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                  {c.description}
                </p>

                {/* Pins preview */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {Object.entries(c.pins).slice(0, 10).map(([num, name]) => (
                    <span
                      key={num}
                      style={{
                        padding: '2px 5px', borderRadius: '4px', background: '#070a10',
                        border: '1px solid #1e283c', fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#64748b',
                      }}
                    >
                      {num}: {name}
                    </span>
                  ))}
                  {Object.keys(c.pins).length > 10 && (
                    <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#64748b', alignSelf: 'center' }}>
                      +{Object.keys(c.pins).length - 10} more
                    </span>
                  )}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleCopyPrompt(`Add component ${c.value} (${c.footprint}) to the schematic.`, c.id)}
                    style={{
                      width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #1e293b',
                      background: '#0d131f', color: '#cbd5e1', fontSize: '11px', cursor: 'pointer',
                    }}
                  >
                    {copiedIndex === c.id ? '✓ Prompt Copied' : 'Copy Add Component Prompt'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Agent Prompt Recipes */}
        {activeTab === 'prompts' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {agentPrompts.map((p, idx) => (
              <div
                key={idx}
                style={{
                  background: '#0c1017', border: '1px solid #182234', borderRadius: '12px',
                  padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                    {p.title}
                  </h3>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    {p.category}
                  </span>
                </div>

                <div style={{
                  padding: '12px', background: '#07090e', border: '1px solid #151d2a',
                  borderRadius: '8px', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5',
                  fontFamily: 'var(--font-mono)',
                }}>
                  "{p.prompt}"
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyPrompt(p.prompt, `prompt-${idx}`)}
                  style={{
                    marginTop: 'auto', padding: '8px 14px', borderRadius: '6px', border: 'none',
                    background: '#f59e0b', color: '#050b14', fontSize: '12px', fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {copiedIndex === `prompt-${idx}` ? '✓ Loaded into Studio!' : '⚡ Copy Prompt to Studio'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Create Custom Organization Knowledge / SOP */}
        {showAddSopModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(3,6,12,0.85)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px',
          }}>
            <form
              onSubmit={handleCreateSop}
              style={{
                width: '100%', maxWidth: '580px', background: '#0d111a', border: '1px solid #10b981',
                borderRadius: '14px', padding: '24px', boxShadow: '0 0 35px rgba(16,185,129,0.15)',
                display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '90vh', overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>🏢</span>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#f8fafc' }}>
                    Create Organization Knowledge / SOP
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddSopModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '18px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
                Define internal company engineering standards, custom component derating rules, or manufacturing checklists that the Antimatter AI architect must enforce.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#cbd5e1', marginBottom: '5px' }}>
                  SOP Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Automotive Class 3 High-Reliability EMC Clearance SOP"
                  value={sopForm.title}
                  onChange={(e) => setSopForm({ ...sopForm, title: e.target.value })}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1px solid #1e293b',
                    background: '#07090e', color: '#f1f5f9', fontSize: '12px', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#cbd5e1', marginBottom: '5px' }}>
                    Reference Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SOP-EMC-402 (v1.0)"
                    value={sopForm.standard}
                    onChange={(e) => setSopForm({ ...sopForm, standard: e.target.value })}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1px solid #1e293b',
                      background: '#07090e', color: '#f1f5f9', fontSize: '12px', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#cbd5e1', marginBottom: '5px' }}>
                    Scope / Strictness
                  </label>
                  <select
                    value={sopForm.scope}
                    onChange={(e) => setSopForm({ ...sopForm, scope: e.target.value })}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1px solid #1e293b',
                      background: '#07090e', color: '#f1f5f9', fontSize: '12px', outline: 'none', boxSizing: 'border-box',
                    }}
                  >
                    <option value="Company Mandatory">Company Mandatory (Hard Constraint)</option>
                    <option value="Company Recommended">Company Recommended</option>
                    <option value="Advisory Guideline">Advisory Guideline</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#cbd5e1', marginBottom: '5px' }}>
                  Core Rule / Threshold Metric *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Minimum 0.35mm clearance on high-voltage lines • 50% voltage derating on ceramic capacitors"
                  value={sopForm.rule}
                  onChange={(e) => setSopForm({ ...sopForm, rule: e.target.value })}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1px solid #1e293b',
                    background: '#07090e', color: '#f1f5f9', fontSize: '12px', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#cbd5e1', marginBottom: '5px' }}>
                  Engineering Description & Justification
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this rule exists and which failures it prevents (e.g. Prevents galvanic leakage in humid operating environments)..."
                  value={sopForm.description}
                  onChange={(e) => setSopForm({ ...sopForm, description: e.target.value })}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1px solid #1e293b',
                    background: '#07090e', color: '#f1f5f9', fontSize: '12px', outline: 'none', boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#cbd5e1', marginBottom: '5px' }}>
                  Checklist Items (One per line)
                </label>
                <textarea
                  rows={3}
                  placeholder="• 4-layer stackup required&#10;• Dedicated test points on all reset lines&#10;• TVS ESD protection diode on all external connectors"
                  value={sopForm.checklistText}
                  onChange={(e) => setSopForm({ ...sopForm, checklistText: e.target.value })}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1px solid #1e293b',
                    background: '#07090e', color: '#f1f5f9', fontSize: '12px', outline: 'none', boxSizing: 'border-box',
                    resize: 'vertical', fontFamily: 'var(--font-mono)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#cbd5e1', marginBottom: '5px' }}>
                  AI Hardware Agent Directive (Prompt Rule)
                </label>
                <input
                  type="text"
                  placeholder="e.g. When designing circuits for this product line, enforce 4-layer stackup and place 1mm test points on debug nets."
                  value={sopForm.agent_rule}
                  onChange={(e) => setSopForm({ ...sopForm, agent_rule: e.target.value })}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1px solid #1e293b',
                    background: '#07090e', color: '#f1f5f9', fontSize: '12px', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddSopModal(false)}
                  style={{ padding: '8px 14px', borderRadius: '7px', border: '1px solid #1e293b', background: 'transparent', color: '#94a3b8', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '7px', border: 'none', background: '#10b981', color: '#050b14', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Save Organization SOP
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
