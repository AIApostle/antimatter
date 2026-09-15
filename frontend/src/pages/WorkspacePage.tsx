import React, { useState, useRef, useEffect } from 'react';
import type { CircuitState, ChatMessage, AIModel, ECOProposal, HumanDecisionRequest, ApprovalMode } from '../types/eda';
import { KiCanvasViewer } from '../components/KiCanvasViewer';
import { Board3DViewer } from '../components/Board3DViewer';
import { BOMAndNetlist } from '../components/BOMAndNetlist';
import { HumanDecisionModal } from '../components/HumanDecisionModal';
import { ProposalsModal } from '../components/ProposalsModal';
import { Composer } from './HomePage';
import { getApiBase } from '../lib/apiConfig';

export type ProjectTab = 'ai' | 'schematics' | 'layout' | 'plans' | 'bom' | '3d';

const PROJECT_TABS: { key: ProjectTab; label: string; icon: string }[] = [
  { key: 'ai',         label: 'AI Chat',         icon: '⚡' },
  { key: 'schematics', label: 'Schematics',      icon: '📐' },
  { key: 'layout',     label: 'Layout',          icon: '▦' },
  { key: 'plans',      label: 'Plans & ECOs',    icon: '📜' },
  { key: 'bom',        label: 'BOM',             icon: '📋' },
  { key: '3d',         label: '3D View',         icon: '🧊' },
];

// ── Streaming thought bubble ──────────────────────────────────────────────
const ThoughtBubble: React.FC<{ thought: string }> = ({ thought }) => (
  <div
    style={{
      display: 'flex',
      gap: '12px',
      padding: '12px 16px',
      background: 'rgba(0,229,255,0.04)',
      border: '1px solid rgba(0,229,255,0.15)',
      borderRadius: '10px',
      margin: '8px 0',
      alignItems: 'flex-start',
    }}
  >
    <div
      style={{
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        border: '2px solid #00e5ff',
        borderTopColor: 'transparent',
        animation: 'spin 1s linear infinite',
        flexShrink: 0,
        marginTop: '2px',
      }}
    />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#00e5ff', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>
        Agent Reasoning
      </div>
      <div style={{ fontSize: '13px', color: '#94a3b8', fontFamily: 'var(--font-mono)', lineHeight: '1.6' }}>
        {thought}
      </div>
    </div>
  </div>
);

// ── Message bubble ────────────────────────────────────────────────────────
const MessageBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '20px',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '12px',
          maxWidth: isUser ? '85%' : '92%',
          alignItems: 'flex-start',
          flexDirection: isUser ? 'row-reverse' : 'row',
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: isUser ? '#1c2635' : 'linear-gradient(135deg, #00e5ff 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 800,
            color: isUser ? '#94a3b8' : '#050b14',
            flexShrink: 0,
            boxShadow: isUser ? 'none' : '0 0 14px rgba(0,229,255,0.25)',
          }}
        >
          {isUser ? '👤' : '⚡'}
        </div>

        {/* Bubble content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {msg.imageUrl && (
            <div style={{ marginBottom: '8px' }}>
              <img
                src={msg.imageUrl}
                alt="attachment"
                style={{
                  maxWidth: '300px',
                  maxHeight: '220px',
                  borderRadius: '10px',
                  display: 'block',
                  border: '1px solid #1c2635',
                  objectFit: 'cover',
                }}
              />
            </div>
          )}

          <div
            style={{
              padding: '14px 18px',
              borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
              background: isUser ? 'rgba(0,229,255,0.1)' : '#0d1119',
              border: isUser ? '1px solid rgba(0,229,255,0.25)' : '1px solid #1c2635',
              fontSize: '14px',
              lineHeight: '1.7',
              color: '#f1f5f9',
              whiteSpace: 'pre-wrap',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}
          >
            {msg.content}
          </div>

          {/* Captured tool calls */}
          {msg.toolCalls && msg.toolCalls.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              {msg.toolCalls.map((tc, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(0,229,255,0.06)',
                    border: '1px solid rgba(0,229,255,0.15)',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    color: '#38bdf8',
                  }}
                >
                  <span>🔧</span>
                  <span>{tc.tool}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── ECO proposal card ─────────────────────────────────────────────────────
const EcoCard: React.FC<{
  eco: ECOProposal;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onModify: (id: string, feedback: string) => void;
  isProcessing?: boolean;
}> = ({ eco, onApprove, onReject, onModify, isProcessing = false }) => {
  const [feedback, setFeedback] = useState('');
  const [showModify, setShowModify] = useState(false);
  const isApproved = eco.status === 'approved';
  const isRejected = eco.status === 'rejected';

  return (
    <div
      style={{
        margin: '14px 0',
        padding: '16px',
        borderRadius: '12px',
        background: '#0a0e17',
        border: isApproved ? '1px solid #10b981' : isRejected ? '1px solid #ef4444' : '1px solid #00e5ff',
        boxShadow: isApproved ? '0 0 28px rgba(16,185,129,0.15)' : isRejected ? '0 0 28px rgba(239,68,68,0.15)' : '0 0 28px rgba(0,229,255,0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', padding: '2px 6px', borderRadius: '4px', background: isApproved ? 'rgba(16,185,129,0.15)' : isRejected ? 'rgba(239,68,68,0.15)' : 'rgba(0,229,255,0.15)', color: isApproved ? '#10b981' : isRejected ? '#ef4444' : '#00e5ff', fontWeight: 700 }}>
            ECO #{eco.id}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>{eco.title}</span>
        </div>
        <span style={{ fontSize: '11px', color: isApproved ? '#10b981' : isRejected ? '#ef4444' : '#facc15', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
          {isApproved ? 'Approved ✓' : isRejected ? 'Rejected ✕' : 'Pending Approval'}
        </span>
      </div>

      <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '12px' }}>
        {eco.description}
      </p>

      {/* Additions / modifications */}
      {eco.additions && eco.additions.length > 0 && (
        <div style={{ marginBottom: '8px', fontSize: '11px', color: '#34d399', fontFamily: 'var(--font-mono)' }}>
          + Additions: {eco.additions.map((a: any) => `${a.ref} (${a.value})`).join(', ')}
        </div>
      )}
      {eco.modifications && eco.modifications.length > 0 && (
        <div style={{ marginBottom: '8px', fontSize: '11px', color: '#fde68a', fontFamily: 'var(--font-mono)' }}>
          ~ Modifications: {eco.modifications.map((m: any) => `${m.ref}`).join(', ')}
        </div>
      )}

      {isApproved ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', padding: '9px 14px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399', fontSize: '12px', fontWeight: 600 }}>
          <span>✓ Plan approved and committed to circuit schematic & PCB layout.</span>
        </div>
      ) : isRejected ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', padding: '9px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: '12px', fontWeight: 600 }}>
          <span>✕ Plan rejected by engineer.</span>
        </div>
      ) : showModify ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
          <input
            type="text"
            placeholder="Specify requested changes or alternate footprint..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '7px',
              border: '1px solid #1c2635',
              background: '#07090e',
              color: '#f1f5f9',
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => onModify(eco.id, feedback)}
              className="btn btn-primary"
              style={{ fontSize: '11px', padding: '5px 12px' }}
            >
              Submit Feedback
            </button>
            <button
              onClick={() => setShowModify(false)}
              className="btn btn-ghost"
              style={{ fontSize: '11px', padding: '5px 10px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button
            onClick={() => onApprove(eco.id)}
            disabled={isProcessing}
            style={{
              padding: '6px 14px',
              borderRadius: '7px',
              border: 'none',
              background: '#10b981',
              color: '#050b14',
              fontSize: '12px',
              fontWeight: 700,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.7 : 1,
            }}
          >
            {isProcessing ? 'Applying & Resuming...' : '✓ Approve ECO'}
          </button>
          <button
            onClick={() => setShowModify(true)}
            disabled={isProcessing}
            style={{
              padding: '6px 12px',
              borderRadius: '7px',
              border: '1px solid #1c2635',
              background: 'transparent',
              color: '#94a3b8',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            ✎ Request Changes
          </button>
          <button
            onClick={() => onReject(eco.id)}
            style={{
              padding: '6px 12px',
              borderRadius: '7px',
              border: '1px solid rgba(239,68,68,0.3)',
              background: 'transparent',
              color: '#ef4444',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            ✕ Reject
          </button>
        </div>
      )}
    </div>
  );
};

interface ProposalItem {
  id: string;
  project_id: string;
  title: string;
  rationale?: string;
  components?: Array<{ ref?: string; value?: string; footprint?: string; [key: string]: any }>;
  power_architecture?: string;
  layer_stackup?: string;
  board_dimensions?: string;
  status: 'pending' | 'approved' | 'rejected' | 'modified' | 'pending_approval';
  created_at: string;
}


const PlansPageView: React.FC<{
  projectId: string;
  pendingEco: ECOProposal | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}> = ({ projectId, pendingEco, onApprove, onReject }) => {
  const [plans, setPlans] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingAll, setApprovingAll] = useState(false);

  const fetchPlans = async () => {
    if (!projectId) {
      setPlans([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/projects/${encodeURIComponent(projectId)}/plans`);
      if (res.ok) {
        const data = await res.json();
        const rawPlans: ProposalItem[] = data.plans || [];
        setPlans(rawPlans.filter((p) => !p.project_id || p.project_id === projectId));
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchPlans();
    } else {
      setPlans([]);
      setLoading(false);
    }
  }, [projectId]);

  const handleApproveAll = async () => {
    setApprovingAll(true);
    try {
      await onApprove('all');
      await fetchPlans();
    } finally {
      setApprovingAll(false);
    }
  };

  const isProjectEco = pendingEco && (!pendingEco.project_id || pendingEco.project_id === projectId);
  const pendingCount = (isProjectEco && pendingEco.status !== 'approved' ? 1 : 0) + plans.filter((p) => p.status === 'pending' || p.status === 'pending_approval').length;

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', padding: '24px 32px', background: '#07090e', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Top Header Banner */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', background: 'linear-gradient(135deg, rgba(0,229,255,0.08) 0%, rgba(13,18,29,0.95) 100%)',
          border: '1px solid rgba(0,229,255,0.25)', borderRadius: '14px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>📜</span>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                Architecture Plans & ECO Change Orders
              </h1>
              {pendingCount > 0 && (
                <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.35)', color: '#facc15', fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {pendingCount} Pending Approval
                </span>
              )}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
              Review circuit design proposals formulated by the hardware systems architect. You can approve individual plans or commit the full architectural plan at once.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={fetchPlans}
              style={{
                padding: '8px 14px', borderRadius: '8px', border: '1px solid #1e293b',
                background: '#0d1119', color: '#94a3b8', fontSize: '12px', cursor: 'pointer',
              }}
            >
              ↻ Refresh
            </button>

            <button
              type="button"
              onClick={handleApproveAll}
              disabled={approvingAll || pendingCount === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 20px',
                borderRadius: '8px', border: 'none', background: pendingCount > 0 ? '#00e5ff' : '#1e293b',
                color: pendingCount > 0 ? '#050b14' : '#64748b', fontSize: '13px', fontWeight: 800,
                cursor: pendingCount > 0 ? 'pointer' : 'not-allowed',
                boxShadow: pendingCount > 0 ? '0 0 20px rgba(0,229,255,0.3)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <span>⚡</span>
              <span>{approvingAll ? 'Committing...' : 'Approve Full Plan & Apply'}</span>
            </button>
          </div>
        </div>

        {/* Active in-memory pending ECO if present for this project */}
        {isProjectEco && pendingEco && (
          <div style={{
            background: 'linear-gradient(180deg, #121826 0%, #0d121d 100%)',
            border: pendingEco.status === 'approved' ? '1px solid #10b981' : '1px solid #00e5ff',
            borderRadius: '12px', padding: '18px 20px',
            boxShadow: pendingEco.status === 'approved' ? '0 0 24px rgba(16,185,129,0.15)' : '0 0 24px rgba(0,229,255,0.12)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  padding: '2px 8px', borderRadius: '4px',
                  background: pendingEco.status === 'approved' ? 'rgba(16,185,129,0.15)' : 'rgba(0,229,255,0.15)',
                  color: pendingEco.status === 'approved' ? '#10b981' : '#00e5ff',
                  fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-mono)'
                }}>
                  {pendingEco.status === 'approved' ? 'APPROVED ECO' : 'ACTIVE IN-MEMORY ECO'}
                </span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>{pendingEco.title}</span>
              </div>
              {pendingEco.status !== 'approved' ? (
                <button
                  type="button"
                  onClick={() => onApprove(pendingEco.id)}
                  style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#00e5ff', color: '#050b14', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Approve ECO
                </button>
              ) : (
                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>Approved ✓</span>
              )}
            </div>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#cbd5e1' }}>{pendingEco.description}</p>
            {pendingEco.additions && pendingEco.additions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {pendingEco.additions.map((item, idx) => (
                  <span key={idx} style={{ padding: '3px 8px', borderRadius: '4px', background: '#070a10', border: '1px solid #1e2535', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                    +{item.ref}: {item.value} ({item.footprint || 'Default'})
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Database Plans */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
            Loading design plans from database…
          </div>
        ) : plans.length === 0 && !isProjectEco ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b', background: '#0c1017', borderRadius: '12px', border: '1px solid #161c28' }}>
            <span style={{ fontSize: '32px' }}>📜</span>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9', marginTop: '10px' }}>No Design Plans Yet</div>
            <p style={{ fontSize: '12px', color: '#64748b', maxWidth: '400px', margin: '8px auto 0', lineHeight: '1.6' }}>
              Ask the AI assistant in the chat tab to formulate a modular design plan (e.g. "Propose a design plan for an ESP32-C3 power delivery board with status LED").
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {plans.map((p) => {
              const isPending = p.status === 'pending' || p.status === 'pending_approval';
              const isApproved = p.status === 'approved';
              return (
                <div
                  key={p.id}
                  style={{
                    background: '#0c1017', border: isPending ? '1px solid rgba(234,179,8,0.4)' : (isApproved ? '1px solid rgba(16,185,129,0.3)' : '1px solid #161c28'),
                    borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>{p.title}</span>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '2px 7px', borderRadius: '4px',
                        background: isPending ? 'rgba(234,179,8,0.12)' : (isApproved ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'),
                        color: isPending ? '#facc15' : (isApproved ? '#34d399' : '#f87171'),
                        border: isPending ? '1px solid rgba(234,179,8,0.3)' : (isApproved ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)'),
                      }}>
                        {p.status.toUpperCase()}
                      </span>
                    </div>

                    {isPending && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => onApprove(String(p.id))}
                          style={{
                            padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#00e5ff',
                            color: '#050b14', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          Approve Plan
                        </button>
                        <button
                          type="button"
                          onClick={() => onReject(String(p.id))}
                          style={{
                            padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)',
                            background: 'transparent', color: '#ef4444', fontSize: '12px', cursor: 'pointer',
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {p.rationale && (
                    <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>{p.rationale}</div>
                  )}

                  {p.power_architecture && (
                    <div style={{ fontSize: '12px', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                      ⚡ Power: {p.power_architecture}
                    </div>
                  )}

                  {p.components && p.components.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {p.components.map((c, i) => (
                        <span key={i} style={{ padding: '3px 8px', borderRadius: '4px', background: '#070a10', border: '1px solid #1e2535', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                          <strong style={{ color: '#00e5ff' }}>{c.ref || `C${i+1}`}</strong>: {c.value} ({c.footprint || 'SMD'})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Props ─────────────────────────────────────────────────────────────────
interface WorkspacePageProps {
  projectId?: string;
  circuitState: CircuitState | null;
  messages: ChatMessage[];
  models: AIModel[];
  selectedModel: string;
  onSelectModel: (id: string) => void;
  onSendMessage: (prompt: string, imageData?: string, modelId?: string, approvalMode?: ApprovalMode) => void;
  isStreaming: boolean;
  currentThought: string;
  pendingEco: ECOProposal | null;
  onApproveEco: (id: string) => void;
  onRejectEco: (id: string) => void;
  onModifyEco: (id: string, feedback: string) => void;
  approvalMode?: ApprovalMode;
  onApprovalModeChange?: (mode: ApprovalMode) => void;
  hitlMode: boolean;
  onToggleHitlMode: () => void;
  onOpenSettings: () => void;
  permissionRequest: { tool: string; input: any; prompt: string } | null;
  humanDecision?: HumanDecisionRequest | null;
  onConfirmDecision?: (decisionId: string, selection: string) => void;
  onDismissDecision?: () => void;
  onSetMaskColor: (color: string) => void;
  onExportZip: () => void;
  onBackToProjects: () => void;
  onStopAgent?: () => void;
  isApproving?: boolean;
}

// ── WorkspacePage Component ───────────────────────────────────────────────
export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  projectId,
  circuitState,
  messages,
  selectedModel,
  onSelectModel,
  onSendMessage,
  isStreaming,
  currentThought,
  pendingEco,
  onApproveEco,
  onRejectEco,
  onModifyEco,
  approvalMode = 'request_approval',
  onApprovalModeChange,
  permissionRequest,
  humanDecision,
  onConfirmDecision,
  onDismissDecision,
  onSetMaskColor: _onSetMaskColor,
  onExportZip,
  onBackToProjects: _onBackToProjects,
  onStopAgent,
  isApproving = false,
}) => {
  const activeProjectId = projectId || circuitState?.project_id || '';
  const isProjectEco = pendingEco && (!pendingEco.project_id || pendingEco.project_id === activeProjectId) && pendingEco.status !== 'approved' && pendingEco.status !== 'rejected';

  // Top header tabs: AI, Schematics, PCB Layout, Plans, BOM, 3D View
  const [activeTab, setActiveTab] = useState<ProjectTab>('ai');
  const [aiSplitView, setAiSplitView] = useState<boolean>(true);
  const [liveCanvasMode, setLiveCanvasMode] = useState<'schematic' | 'pcb'>('schematic');
  const [showProposals, setShowProposals] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll AI message history
  useEffect(() => {
    if (activeTab === 'ai' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentThought, pendingEco, activeTab]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden', background: '#07080b' }}>

      {/* ── Top Header Bar ── */}
      <div
        style={{
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: '1px solid #141c2b',
          background: '#090c12',
          flexShrink: 0,
        }}
      >
        {/* Left: Project title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px' }}>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#f1f5f9',
              fontFamily: 'var(--font-mono)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {circuitState?.project_name ?? 'Active Workspace'}
          </span>
        </div>

        {/* Center: Top Header Tabs (AI | Layout | Schematics | BOM | 3D View) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#0c1017',
            border: '1px solid #1c2635',
            borderRadius: '9px',
            padding: '3px',
            gap: '2px',
          }}
        >
          {PROJECT_TABS.map(({ key, label, icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  background: isActive ? '#00e5ff' : 'transparent',
                  color: isActive ? '#050b14' : '#64748b',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 500,
                  fontFamily: 'var(--font-mono)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#f1f5f9';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#64748b';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '13px' }}>{icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Proposals & Clean Export Action */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', minWidth: '180px' }}>
          <button
            onClick={() => setShowProposals(true)}
            title="View engineering change orders and design proposals"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '7px',
              border: '1px solid #1c2635',
              background: '#0d1119',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#00e5ff';
              e.currentTarget.style.borderColor = 'rgba(0,229,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.borderColor = '#1c2635';
            }}
          >
            <span>📜</span>
            <span>Proposals</span>
          </button>

          <button
            onClick={onExportZip}
            title="Download complete KiCad 8 fabrication package (.zip)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '7px',
              border: '1px solid #1c2635',
              background: '#0d1119',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#00e5ff';
              e.currentTarget.style.borderColor = 'rgba(0,229,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.borderColor = '#1c2635';
            }}
          >
            <span>⬇</span>
            <span>Export ZIP</span>
          </button>
        </div>
      </div>

      {/* ── Main View Area: Dedicated Page per Tab ── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* ── 1. DEDICATED AI CHAT PAGE WITH LIVE SPLIT-VIEW SCHEMATIC/PCB ── */}
        {activeTab === 'ai' && (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'row',
              overflow: 'hidden',
            }}
          >
            {/* Left Pane: Chat Conversation & Composer */}
            <div
              style={{
                flex: aiSplitView ? '0 0 50%' : '1 1 100%',
                maxWidth: aiSplitView ? '50%' : '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRight: aiSplitView ? '1px solid #141c2b' : 'none',
                background: '#07080b',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Sub-header Bar with Split-Screen Toggle */}
              <div
                style={{
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 16px',
                  borderBottom: '1px solid #111827',
                  background: '#0a0d14',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00e5ff', boxShadow: '0 0 8px #00e5ff' }} />
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>
                    HARDWARE ARCHITECT &bull; <strong style={{ color: '#00e5ff' }}>Online</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAiSplitView(!aiSplitView)}
                  title={aiSplitView ? "Switch to Full Screen Chat" : "Open Split View (Live Circuit Canvas)"}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '30px',
                    height: '30px',
                    borderRadius: '7px',
                    background: aiSplitView ? 'rgba(0,229,255,0.15)' : '#0c1017',
                    border: `1px solid ${aiSplitView ? '#00e5ff' : '#1c2635'}`,
                    color: aiSplitView ? '#00e5ff' : '#94a3b8',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: aiSplitView ? '0 0 12px rgba(0,229,255,0.2)' : 'none',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="12" height="12" rx="2" />
                    <line x1="8" y1="2" x2="8" y2="14" />
                  </svg>
                </button>
              </div>

              {/* Scrollable Conversation Stream */}
              <div
                ref={scrollRef}
                style={{
                  flex: 1,
                  width: '100%',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '16px',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ width: '100%', maxWidth: aiSplitView ? '100%' : '820px', display: 'flex', flexDirection: 'column' }}>

                  {/* Empty State / Welcome banner */}
                  {messages.length === 0 && !isStreaming && (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '40px 16px',
                        color: '#475569',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: 'rgba(0,229,255,0.08)',
                          border: '1px solid rgba(0,229,255,0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          color: '#00e5ff',
                          boxShadow: '0 0 24px rgba(0,229,255,0.15)',
                        }}
                      >
                        ⚡
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>
                        Hardware Engineering Assistant
                      </div>
                      <p style={{ fontSize: '12px', color: '#64748b', maxWidth: '440px', lineHeight: '1.6' }}>
                        Instruct the AI to design schematics, connect rails, route traces, and resolve design trade-offs. The KiCanvas viewer on the right will update in real time.
                      </p>
                    </div>
                  )}

                  {/* Messages */}
                  {messages.map((m) => (
                    <MessageBubble key={m.id} msg={m} />
                  ))}

                  {/* Live thought stream */}
                  {isStreaming && currentThought && (
                    <ThoughtBubble thought={currentThought} />
                  )}

                  {/* Streaming indicator */}
                  {isStreaming && !currentThought && (
                    <div style={{ display: 'flex', gap: '6px', padding: '12px 16px', alignItems: 'center' }}>
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#00e5ff',
                            animation: `bounce 1s ${i * 0.15}s infinite`,
                          }}
                        />
                      ))}
                      <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#00e5ff', marginLeft: '6px' }}>
                        Synthesizing EDA instructions…
                      </span>
                    </div>
                  )}

                  {/* ECO proposal card - strictly hidden immediately upon approval */}
                  {isProjectEco && pendingEco && pendingEco.status !== 'approved' && pendingEco.status !== 'rejected' && (
                    <EcoCard
                      eco={pendingEco}
                      onApprove={onApproveEco}
                      onReject={onRejectEco}
                      onModify={onModifyEco}
                      isProcessing={isApproving}
                    />
                  )}

                  {/* HITL Permission request */}
                  {permissionRequest && (
                    <div
                      style={{
                        background: 'linear-gradient(180deg, rgba(234, 179, 8, 0.12) 0%, rgba(20, 26, 38, 0.95) 100%)',
                        border: '1px solid #eab308',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        margin: '12px 0',
                      }}
                    >
                      <div className="flex items-center" style={{ gap: '8px', marginBottom: '6px' }}>
                        <span className="badge badge-amber" style={{ fontSize: '11px' }}>
                          HITL Checkpoint: Permission Required
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#fef08a' }}>
                          Tool: {permissionRequest.tool}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '8px' }}>
                        {permissionRequest.prompt}
                      </p>
                      {permissionRequest.input && Object.keys(permissionRequest.input).length > 0 && (
                        <pre style={{ fontSize: '10px', background: '#05070a', padding: '6px', borderRadius: '4px', overflowX: 'auto', color: '#94a3b8', marginBottom: '8px' }}>
                          {JSON.stringify(permissionRequest.input, null, 2)}
                        </pre>
                      )}
                      <div className="flex items-center" style={{ gap: '8px' }}>
                        <button
                          onClick={() => onSendMessage(`Yes, proceed with ${permissionRequest.tool}`)}
                          className="btn btn-success"
                          style={{ fontSize: '11px', padding: '5px 12px' }}
                        >
                          ✓ Allow Execution
                        </button>
                        <button
                          onClick={() => onSendMessage(`No, do not run ${permissionRequest.tool}. Instead, suggest an alternative approach.`)}
                          className="btn btn-danger"
                          style={{ fontSize: '11px', padding: '5px 12px' }}
                        >
                          ✕ Deny
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Docked Composer with 3-State Autonomy Permission Toggle directly underneath */}
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '10px 16px 16px',
                  background: 'linear-gradient(180deg, transparent 0%, #07080b 40%)',
                  boxSizing: 'border-box',
                  borderTop: '1px solid #111827',
                }}
              >
                <div style={{ width: '100%', maxWidth: aiSplitView ? '100%' : '820px' }}>
                  <Composer
                    onSubmit={(prompt, img, model, mode) => onSendMessage(prompt, img, model, mode || approvalMode)}
                    isStreaming={isStreaming}
                    onStopAgent={onStopAgent}
                    selectedModel={selectedModel}
                    onSelectModel={onSelectModel}
                    approvalMode={approvalMode}
                    onApprovalModeChange={onApprovalModeChange}
                    placeholder="Describe circuit additions, route traces, adjust regulators, or attach schematics…"
                  />
                </div>
              </div>
            </div>

            {/* Right Pane: Live KiCanvas Schematic & PCB Synthesis (visible in split view) */}
            {aiSplitView && (
              <div
                style={{
                  flex: '0 0 50%',
                  maxWidth: '50%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#05070a',
                  overflow: 'hidden',
                }}
              >
                {/* Canvas Control Header */}
                <div
                  style={{
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 14px',
                    borderBottom: '1px solid #141c2b',
                    background: '#090c12',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.04em' }}>
                      HARDWARE SCHEMATIC &amp; PCB CANVAS
                    </span>
                  </div>

                  {/* Schematic vs PCB toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', background: '#05070a', padding: '2px', borderRadius: '6px', border: '1px solid #161f2e', gap: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setLiveCanvasMode('schematic')}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '4px',
                        border: 'none',
                        background: liveCanvasMode === 'schematic' ? '#00e5ff' : 'transparent',
                        color: liveCanvasMode === 'schematic' ? '#050b14' : '#94a3b8',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span>📐</span>
                      <span>Schematic</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLiveCanvasMode('pcb')}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '4px',
                        border: 'none',
                        background: liveCanvasMode === 'pcb' ? '#00e5ff' : 'transparent',
                        color: liveCanvasMode === 'pcb' ? '#050b14' : '#94a3b8',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span>▦</span>
                      <span>PCB Layout</span>
                    </button>
                  </div>
                </div>

                {/* Live Canvas Viewer */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                  {circuitState && (liveCanvasMode === 'schematic' ? circuitState.schematic_sexpr : circuitState.pcb_sexpr) ? (
                    <KiCanvasViewer viewMode={liveCanvasMode} state={circuitState} />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        color: '#475569',
                      }}
                    >
                      <span style={{ fontSize: '36px' }}>{liveCanvasMode === 'schematic' ? '📐' : '▦'}</span>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>
                        Waiting for {liveCanvasMode === 'schematic' ? 'Schematic' : 'PCB Layout'} Synthesis
                      </div>
                      <p style={{ fontSize: '12px', maxWidth: '340px', textAlign: 'center', lineHeight: '1.6', color: '#64748b' }}>
                        Ask the AI assistant on the left to add components or route traces. Your board will update right here in real time.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 2. DEDICATED LAYOUT PAGE ── */}
        {activeTab === 'layout' && (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {circuitState && circuitState.pcb_sexpr ? (
              <KiCanvasViewer viewMode="pcb" state={circuitState} />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  color: '#475569',
                }}
              >
                <span style={{ fontSize: '32px' }}>▦</span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>
                  No PCB Layout Generated Yet
                </div>
                <p style={{ fontSize: '12px', maxWidth: '380px', textAlign: 'center', lineHeight: '1.6', color: '#64748b' }}>
                  Instruct the AI assistant to place footprints and route copper tracks.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── 3. DEDICATED SCHEMATICS PAGE ── */}
        {activeTab === 'schematics' && (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {circuitState && circuitState.schematic_sexpr ? (
              <KiCanvasViewer viewMode="schematic" state={circuitState} />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  color: '#475569',
                }}
              >
                <span style={{ fontSize: '32px' }}>📐</span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>
                  No Schematic Generated Yet
                </div>
                <p style={{ fontSize: '12px', maxWidth: '380px', textAlign: 'center', lineHeight: '1.6', color: '#64748b' }}>
                  Instruct the AI assistant on the AI tab to synthesize components, pins, and nets.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── 4. DEDICATED BOM PAGE ── */}
        {activeTab === 'bom' && (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {circuitState ? (
              <BOMAndNetlist state={circuitState} />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  color: '#475569',
                }}
              >
                <span style={{ fontSize: '32px' }}>📋</span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>
                  No Bill of Materials Available
                </div>
                <p style={{ fontSize: '12px', maxWidth: '380px', textAlign: 'center', lineHeight: '1.6', color: '#64748b' }}>
                  Component data and netlist items will appear here once synthesized.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── 5. DEDICATED 3D VIEW PAGE ── */}
        {activeTab === '3d' && (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {circuitState ? (
              <Board3DViewer state={circuitState} />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  color: '#475569',
                }}
              >
                <span style={{ fontSize: '32px' }}>🧊</span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>
                  No 3D Board Available
                </div>
                <p style={{ fontSize: '12px', maxWidth: '380px', textAlign: 'center', lineHeight: '1.6', color: '#64748b' }}>
                  Board dimensions, substrate, and components will render in 3D once synthesized.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── 6. DEDICATED PLANS & PROPOSALS PAGE ── */}
        {activeTab === 'plans' && (
          <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
            <PlansPageView
              projectId={activeProjectId}
              pendingEco={isProjectEco ? pendingEco : null}
              onApprove={onApproveEco}
              onReject={onRejectEco}
            />
          </div>
        )}
      </div>

      {/* ── Proposals & Design Plans Modal (Supabase) ── */}
      <ProposalsModal
        projectId={activeProjectId}
        isOpen={showProposals}
        onClose={() => setShowProposals(false)}
        onApprovePlan={onApproveEco}
        onRejectPlan={onRejectEco}
      />

      {/* ── Human-in-the-Loop Architectural Decision Modal ── */}
      {humanDecision && onConfirmDecision && (
        <HumanDecisionModal
          decision={humanDecision}
          onConfirm={onConfirmDecision}
          onDismiss={onDismissDecision}
        />
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
