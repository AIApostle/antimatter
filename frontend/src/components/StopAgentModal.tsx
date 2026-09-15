import React from 'react';

interface StopAgentModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirmStop: () => void;
}

export const StopAgentModal: React.FC<StopAgentModalProps> = ({
  isOpen,
  onCancel,
  onConfirmStop,
}) => {
  if (!isOpen) return null;

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
        zIndex: 10000,
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'linear-gradient(180deg, #111622 0%, #0a0d14 100%)',
          border: '1px solid rgba(239, 68, 68, 0.45)',
          borderRadius: '14px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 35px rgba(239, 68, 68, 0.2)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          animation: 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              color: '#ef4444',
              flexShrink: 0,
            }}
          >
            ⏹
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 800,
                color: '#f8fafc',
                letterSpacing: '-0.3px',
              }}
            >
              Stop Agent Execution?
            </h3>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: '12px',
                color: '#94a3b8',
              }}
            >
              Disconnect active hardware synthesis session
            </p>
          </div>
        </div>

        <p
          style={{
            margin: 0,
            fontSize: '13px',
            lineHeight: 1.5,
            color: '#cbd5e1',
          }}
        >
          Do you want to stop the agent running? This will immediately disconnect the agent stream and halt the ongoing circuit design and trace routing.
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '8px',
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #1e293b',
              background: '#07090e',
              color: '#94a3b8',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Keep Running
          </button>

          <button
            type="button"
            onClick={onConfirmStop}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.6)',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 0 16px rgba(239, 68, 68, 0.35)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>■</span>
            <span>Yes, Stop Agent</span>
          </button>
        </div>
      </div>
    </div>
  );
};
