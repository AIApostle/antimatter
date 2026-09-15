import React, { useEffect, useState } from 'react';
import { getApiBase } from '../lib/apiConfig';

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

interface ProposalsModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onApprovePlan?: (id: string) => void;
  onRejectPlan?: (id: string) => void;
}


export const ProposalsModal: React.FC<ProposalsModalProps> = ({
  projectId,
  isOpen,
  onClose,
  onApprovePlan,
  onRejectPlan,
}) => {
  const [plans, setPlans] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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
        // Strict project isolation
        setPlans(rawPlans.filter((p) => !p.project_id || p.project_id === projectId));
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && projectId) {
      fetchPlans();
    } else if (!isOpen) {
      setPlans([]);
    }
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 6, 12, 0.82)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9998,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '85vh',
          background: 'linear-gradient(180deg, #0d121d 0%, #080a10 100%)',
          border: '1px solid rgba(0, 229, 255, 0.35)',
          borderRadius: '16px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7), 0 0 40px rgba(0, 229, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0, 229, 255, 0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>📜</span>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.2px' }}>
              Design Proposals & Change Orders
            </span>
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(0, 229, 255, 0.12)',
                color: '#00e5ff',
                fontWeight: 700,
              }}
            >
              Cloud Synced
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content list */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              Loading design proposals...
            </div>
          ) : plans.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              No design proposals recorded yet for this project.
              <p style={{ fontSize: '11px', color: '#475569', marginTop: '6px' }}>
                Ask the AI to design a circuit subsystem to formulate a formal engineering proposal.
              </p>
            </div>
          ) : (
            plans.map((p) => {
              const isPending = p.status === 'pending' || p.status === 'pending_approval';
              const isApproved = p.status === 'approved';
              const statusColor = isPending ? '#facc15' : isApproved ? '#34d399' : '#ef4444';

              return (
                <div
                  key={p.id}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: '#090d16',
                    border: `1px solid ${isPending ? 'rgba(250, 204, 21, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontFamily: 'var(--font-mono)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: `${statusColor}22`,
                          color: statusColor,
                          border: `1px solid ${statusColor}44`,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {p.status}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>
                        {p.title}
                      </span>
                    </div>

                    <span style={{ fontSize: '11px', color: '#475569', fontFamily: 'var(--font-mono)' }}>
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {p.rationale && (
                    <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
                      {p.rationale}
                    </p>
                  )}

                  {/* Architecture Badges */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {p.power_architecture && (
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                        ⚡ {p.power_architecture}
                      </span>
                    )}
                    {p.layer_stackup && (
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#a78bfa', background: 'rgba(167, 139, 250, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                        ▦ {p.layer_stackup}
                      </span>
                    )}
                    {p.board_dimensions && (
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#94a3b8', background: 'rgba(148, 163, 184, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                        📐 {p.board_dimensions}
                      </span>
                    )}
                  </div>

                  {/* Components */}
                  {p.components && p.components.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                      Components: {p.components.map((c) => `${c.ref || ''} (${c.value || ''})`).join(', ')}
                    </div>
                  )}

                  {/* Action buttons if pending */}
                  {isPending && onApprovePlan && onRejectPlan && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button
                        onClick={() => {
                          onApprovePlan(p.id);
                          onClose();
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#10b981',
                          color: '#050b14',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Approve & Commit
                      </button>
                      <button
                        onClick={() => {
                          onRejectPlan(p.id);
                          onClose();
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          background: 'transparent',
                          color: '#ef4444',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
