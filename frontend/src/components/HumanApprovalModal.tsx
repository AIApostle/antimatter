import React, { useState } from 'react';
import type { ECOProposal } from '../types/eda';

interface HumanApprovalModalProps {
  eco: ECOProposal;
  onApprove: (ecoId: string) => void;
  onReject: (ecoId: string) => void;
  onModify: (ecoId: string, feedback: string) => void;
  isProcessing?: boolean;
}

export const HumanApprovalModal: React.FC<HumanApprovalModalProps> = ({
  eco,
  onApprove,
  onReject,
  onModify,
  isProcessing = false,
}) => {
  const [feedback, setFeedback] = useState<string>('');
  const [showFeedbackInput, setShowFeedbackInput] = useState<boolean>(false);

  return (
    <div
      className="w-full flex flex-col"
      style={{
        background: 'linear-gradient(180deg, rgba(20, 26, 38, 0.95) 0%, rgba(14, 18, 26, 0.95) 100%)',
        border: '1px solid #3b82f6',
        borderRadius: '10px',
        padding: '14px 16px',
        boxShadow: '0 8px 32px rgba(0, 110, 255, 0.15)',
        margin: '12px 0',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
        <div className="flex items-center" style={{ gap: '8px' }}>
          <span className="badge badge-cyan" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', borderColor: '#3b82f6' }}>
            HITL Approval Required
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
            {eco.title}
          </span>
        </div>
        <span className="font-mono" style={{ fontSize: '11px', color: '#64748b' }}>
          ECO #{eco.id}
        </span>
      </div>

      <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4', marginBottom: '12px' }}>
        {eco.description}
      </p>

      {/* Changes Breakdown */}
      <div
        className="flex flex-col"
        style={{
          background: 'rgba(10, 13, 20, 0.6)',
          border: '1px solid #1e2433',
          borderRadius: '6px',
          padding: '10px',
          gap: '8px',
          marginBottom: '12px',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {/* Additions */}
        {eco.additions && eco.additions.length > 0 && (
          <div>
            <div style={{ color: '#10b981', fontWeight: 600, marginBottom: '4px' }}>
              + ADDITIONS ({eco.additions.length})
            </div>
            {eco.additions.map((item, i) => (
              <div key={i} style={{ color: '#94a3b8', paddingLeft: '8px' }}>
                • <strong style={{ color: '#f1f5f9' }}>{item.ref}</strong>: {item.value} ({item.footprint})
              </div>
            ))}
          </div>
        )}

        {/* Modifications */}
        {eco.modifications && eco.modifications.length > 0 && (
          <div>
            <div style={{ color: '#38bdf8', fontWeight: 600, marginBottom: '4px' }}>
              ~ MODIFICATIONS ({eco.modifications.length})
            </div>
            {eco.modifications.map((item, i) => (
              <div key={i} style={{ color: '#94a3b8', paddingLeft: '8px' }}>
                • Net <strong style={{ color: '#f1f5f9' }}>{item.net}</strong>: {item.change}
              </div>
            ))}
          </div>
        )}

        {/* Removals */}
        {eco.removals && eco.removals.length > 0 && (
          <div>
            <div style={{ color: '#f43f5e', fontWeight: 600, marginBottom: '4px' }}>
              - REMOVALS ({eco.removals.length})
            </div>
            {eco.removals.map((item, i) => (
              <div key={i} style={{ color: '#94a3b8', paddingLeft: '8px' }}>
                • {item.ref}: {item.reason}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feedback text input if modifying */}
      {showFeedbackInput && (
        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Type modification instructions for the agent..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #334155',
              background: '#090d16',
              color: '#f8fafc',
              fontSize: '12px',
              outline: 'none',
            }}
          />
        </div>
      )}

      {/* Decision Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center" style={{ gap: '8px' }}>
          <button
            onClick={() => onApprove(eco.id)}
            disabled={isProcessing}
            className="btn btn-success"
            style={{ fontSize: '12px', padding: '6px 14px' }}
          >
            {isProcessing ? 'Applying...' : '✓ Approve & Commit ECO'}
          </button>
          <button
            onClick={() => onReject(eco.id)}
            disabled={isProcessing}
            className="btn btn-danger"
            style={{ fontSize: '12px', padding: '6px 14px' }}
          >
            ✕ Reject
          </button>
        </div>

        <div>
          {showFeedbackInput ? (
            <button
              onClick={() => onModify(eco.id, feedback)}
              disabled={isProcessing || !feedback.trim()}
              className="btn btn-primary"
              style={{ fontSize: '11px', padding: '6px 10px' }}
            >
              Submit Feedback
            </button>
          ) : (
            <button
              onClick={() => setShowFeedbackInput(true)}
              className="btn btn-ghost font-mono"
              style={{ fontSize: '11px', color: '#94a3b8' }}
            >
              Modify Prompt...
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
