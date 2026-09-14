import React, { useState } from 'react';
import type { HumanDecisionRequest } from '../types/eda';

interface HumanDecisionModalProps {
  decision: HumanDecisionRequest;
  onConfirm: (decisionId: string, selection: string) => void;
  onDismiss?: () => void;
}

export const HumanDecisionModal: React.FC<HumanDecisionModalProps> = ({
  decision,
  onConfirm,
  onDismiss,
}) => {
  const [selectedOption, setSelectedOption] = useState<string>(
    decision.recommended_option || (decision.options.length > 0 ? decision.options[0] : '')
  );
  const [customInput, setCustomInput] = useState<string>('');
  const [useCustom, setUseCustom] = useState<boolean>(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalChoice = useCustom ? customInput.trim() : selectedOption;
    if (!finalChoice) return;
    onConfirm(decision.decision_id, finalChoice);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 6, 12, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: 'min(88vh, 720px)',
          background: 'linear-gradient(180deg, #0d121d 0%, #080a10 100%)',
          border: '1px solid rgba(0, 229, 255, 0.4)',
          borderRadius: '16px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7), 0 0 40px rgba(0, 229, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0, 229, 255, 0.03)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(234, 179, 8, 0.12)',
                border: '1px solid rgba(234, 179, 8, 0.35)',
                color: '#facc15',
                fontSize: '11px',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#facc15',
                  boxShadow: '0 0 8px #facc15',
                  animation: 'pulse 1.5s infinite',
                }}
              />
              HITL Decision Required
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>
              Architectural Checkpoint
            </span>
          </div>

          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: '#475569',
            }}
          >
            ID: {decision.decision_id}
          </span>
        </div>

        {/* Content Body (Scrollable) */}
        <div
          style={{
            padding: '20px 24px',
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Question */}
          <div>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#f8fafc',
                lineHeight: '1.4',
                margin: 0,
              }}
            >
              {decision.question}
            </h2>
          </div>

          {/* Context / Engineering Rationale */}
          {decision.context && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'rgba(0, 229, 255, 0.04)',
                border: '1px solid rgba(0, 229, 255, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  color: '#00e5ff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  fontWeight: 700,
                }}
              >
                Engineering Rationale & Trade-offs
              </span>
              <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5' }}>
                {decision.context}
              </p>
            </div>
          )}

          {/* Selectable Options List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Available Architectural Options:
            </span>

            {decision.options.map((opt, idx) => {
              const isSelected = !useCustom && selectedOption === opt;
              const isRecommended = decision.recommended_option === opt;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedOption(opt);
                    setUseCustom(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: isSelected
                      ? '1px solid #00e5ff'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isSelected
                      ? 'rgba(0, 229, 255, 0.08)'
                      : '#0f1420',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                    boxShadow: isSelected
                      ? '0 0 20px rgba(0, 229, 255, 0.15)'
                      : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Radio circle */}
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: isSelected ? '2px solid #00e5ff' : '2px solid #475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && (
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#00e5ff',
                            boxShadow: '0 0 6px #00e5ff',
                          }}
                        />
                      )}
                    </div>

                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? '#f8fafc' : '#cbd5e1',
                      }}
                    >
                      {opt}
                    </span>
                  </div>

                  {isRecommended && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#34d399',
                        letterSpacing: '0.4px',
                      }}
                    >
                      RECOMMENDED
                    </span>
                  )}
                </button>
              );
            })}

            {/* Custom Input Option */}
            <div
              onClick={() => setUseCustom(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '10px',
                border: useCustom
                  ? '1px solid #00e5ff'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                background: useCustom
                  ? 'rgba(0, 229, 255, 0.05)'
                  : '#0a0d14',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: useCustom ? '2px solid #00e5ff' : '2px solid #475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {useCustom && (
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#00e5ff',
                      boxShadow: '0 0 6px #00e5ff',
                    }}
                  />
                )}
              </div>

              <input
                type="text"
                placeholder="Or specify custom requirement / package..."
                value={customInput}
                onFocus={() => setUseCustom(true)}
                onChange={(e) => {
                  setCustomInput(e.target.value);
                  setUseCustom(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                }}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: '#f8fafc',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: '#090d16',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            The AI agent will proceed immediately with your chosen decision.
          </span>

          <div style={{ display: 'flex', gap: '10px' }}>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #1e293b',
                  background: 'transparent',
                  color: '#94a3b8',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Dismiss
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={useCustom ? !customInput.trim() : !selectedOption}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#00e5ff',
                color: '#050b14',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(0, 229, 255, 0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Confirm & Proceed</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
};
