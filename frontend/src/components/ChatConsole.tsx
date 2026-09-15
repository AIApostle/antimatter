import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, AIModel, ECOProposal } from '../types/eda';
import { HumanApprovalModal } from './HumanApprovalModal';
import { StopAgentModal } from './StopAgentModal';

interface ChatConsoleProps {
  messages: ChatMessage[];
  models: AIModel[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  onSendMessage: (prompt: string, imageData?: string) => void;
  isStreaming: boolean;
  currentThought: string;
  pendingEco: ECOProposal | null;
  onApproveEco: (ecoId: string) => void;
  onRejectEco: (ecoId: string) => void;
  onModifyEco: (ecoId: string, feedback: string) => void;
  hitlMode: boolean;
  onToggleHitlMode: () => void;
  onOpenSettings: () => void;
  permissionRequest: { tool: string; input: any; prompt: string } | null;
  onStopAgent?: () => void;
  isApproving?: boolean;
}

const QUICK_PROMPTS = [
  'Research AMS1117-3.3 power specs & pinout',
  'Gather components for 5V USB-C to 3.3V with status LED',
  'Propose design plan for ESP32-C3 power delivery',
  'Run full DRC and ERC verification audit',
  'Export manufacturing files & KiCad archive',
];

export const ChatConsole: React.FC<ChatConsoleProps> = ({
  messages,
  models,
  selectedModel,
  onSelectModel,
  onSendMessage,
  isStreaming,
  currentThought,
  pendingEco,
  onApproveEco,
  onRejectEco,
  onModifyEco,
  hitlMode,
  onToggleHitlMode,
  onOpenSettings,
  permissionRequest,
  onStopAgent,
  isApproving = false,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showStopModal, setShowStopModal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, currentThought, pendingEco, permissionRequest]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !imagePreview) return;
    if (isStreaming) return;

    onSendMessage(inputText, imagePreview || undefined);
    setInputText('');
    setImagePreview(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#0b0d13', borderRight: '1px solid #1c2230' }}>
      {/* Console Header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid #1c2230',
          background: '#0e1119',
          gap: '8px',
        }}
      >
        <div className="flex items-center" style={{ gap: '8px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isStreaming ? '#00e5ff' : '#10b981',
              boxShadow: isStreaming ? '0 0 8px #00e5ff' : '0 0 8px #10b981',
            }}
          />
          <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.2px', color: '#f8fafc' }}>
            antimatter Agent
          </span>
        </div>

        {/* Status Pills & Controls */}
        <div className="flex items-center" style={{ gap: '6px' }}>
          {/* HITL Permission Toggle */}
          <button
            onClick={onToggleHitlMode}
            title={hitlMode ? 'HITL Active: Agent requires explicit permission before changing hardware' : 'Autonomous Mode: Agent applies changes immediately'}
            className="btn font-mono"
            style={{
              fontSize: '10px',
              padding: '3px 8px',
              borderRadius: '6px',
              border: hitlMode ? '1px solid #10b981' : '1px solid #eab308',
              background: hitlMode ? 'rgba(16, 185, 129, 0.12)' : 'rgba(234, 179, 8, 0.12)',
              color: hitlMode ? '#34d399' : '#fde047',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
              <span>{hitlMode ? '🛡️ HITL: Permission' : '⚡ HITL: Auto'}</span>
            </button>

            {/* Settings trigger */}
          <button
            onClick={onOpenSettings}
            className="btn btn-ghost font-mono"
            title="Configure Agent API Keys & Endpoints"
            style={{
              fontSize: '11px',
              padding: '3px 6px',
              borderRadius: '6px',
              color: '#94a3b8',
              border: '1px solid #242c3d',
            }}
          >
            ⚙
          </button>

          {/* Multimodal Model Selector */}
          <select
            value={selectedModel}
            onChange={(e) => onSelectModel(e.target.value)}
            className="font-mono"
            style={{
              fontSize: '11px',
              background: '#151924',
              color: '#94a3b8',
              border: '1px solid #242c3d',
              borderRadius: '6px',
              padding: '3px 6px',
              outline: 'none',
              cursor: 'pointer',
              maxWidth: '120px',
            }}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name.split(' ')[0]} {m.name.split(' ')[1] || ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
        style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* Welcome message */}
        <div
          style={{
            background: 'rgba(17, 22, 32, 0.6)',
            border: '1px solid #1f2738',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '12px',
            color: '#94a3b8',
            lineHeight: '1.5',
          }}
        >
          <div style={{ color: '#00e5ff', fontWeight: 600, marginBottom: '4px' }}>
            antimatter EDA Studio Active
          </div>
          Hardware design agent ready. Speak naturally to place parts, route nets, modify power supplies, or upload a schematic sketch.
        </div>

        {/* Message History */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="flex flex-col"
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '92%',
              background: msg.role === 'user' ? '#182438' : '#10141f',
              border: `1px solid ${msg.role === 'user' ? '#2b3d5b' : '#1c2333'}`,
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '13px',
              lineHeight: '1.45',
              color: '#f1f5f9',
            }}
          >
            {/* User Attached Image */}
            {msg.imageUrl && (
              <div style={{ marginBottom: '8px' }}>
                <img
                  src={msg.imageUrl}
                  alt="User uploaded sketch"
                  style={{ maxHeight: '140px', borderRadius: '6px', border: '1px solid #2e3a4e' }}
                />
              </div>
            )}

            {/* Thoughts / Reasoning Steps */}
            {msg.thoughts && msg.thoughts.length > 0 && (
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderLeft: '2px solid #00e5ff',
                  padding: '6px 8px',
                  marginBottom: '8px',
                  fontSize: '11px',
                  color: '#94a3b8',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {msg.thoughts.map((th, i) => (
                  <div key={i}>› {th}</div>
                ))}
              </div>
            )}

            {/* Tool Calls */}
            {msg.toolCalls && msg.toolCalls.length > 0 && (
              <div className="flex flex-wrap" style={{ gap: '4px', marginBottom: '8px' }}>
                {msg.toolCalls.map((tc, idx) => (
                  <span key={idx} className="badge badge-cyan" style={{ fontSize: '10px' }}>
                    tool: {tc.tool}
                  </span>
                ))}
              </div>
            )}

            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>

            <div
              className="font-mono"
              style={{
                fontSize: '10px',
                color: '#475569',
                marginTop: '6px',
                alignSelf: 'flex-end',
              }}
            >
              {msg.timestamp}
            </div>
          </div>
        ))}

        {/* Live Streaming Thought Indicator */}
        {isStreaming && (
          <div
            style={{
              background: '#0d131f',
              border: '1px solid #00e5ff33',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              color: '#00e5ff',
            }}
          >
            <div className="flex items-center" style={{ gap: '6px', marginBottom: '4px' }}>
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#00e5ff',
                  animation: 'pulse 1s infinite',
                }}
              />
              <span style={{ fontWeight: 600 }}>Synthesizing Circuit...</span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: '11px' }}>{currentThought || 'Computing layout vectors...'}</div>
          </div>
        )}

        {/* HITL Real-time Permission Request Card */}
        {permissionRequest && (
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(234, 179, 8, 0.12) 0%, rgba(20, 26, 38, 0.95) 100%)',
              border: '1px solid #eab308',
              borderRadius: '8px',
              padding: '12px 14px',
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
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                ✓ Allow Execution
              </button>
              <button
                onClick={() => onSendMessage(`No, do not run ${permissionRequest.tool}. Instead, suggest an alternative approach.`)}
                className="btn btn-danger"
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                ✕ Deny
              </button>
            </div>
          </div>
        )}

        {/* Human In The Loop Approval Banner / Modal */}
        {pendingEco && (
          <HumanApprovalModal
            eco={pendingEco}
            onApprove={onApproveEco}
            onReject={onRejectEco}
            onModify={onModifyEco}
            isProcessing={isApproving}
          />
        )}
      </div>

      {/* Quick Prompt Suggestions */}
      <div
        className="flex items-center"
        style={{
          padding: '6px 12px',
          overflowX: 'auto',
          gap: '6px',
          borderTop: '1px solid #171c28',
          background: '#0c0f16',
        }}
      >
        {QUICK_PROMPTS.map((qp, i) => (
          <button
            key={i}
            onClick={() => onSendMessage(qp)}
            disabled={isStreaming}
            className="btn btn-ghost font-mono"
            style={{
              fontSize: '10px',
              whiteSpace: 'nowrap',
              padding: '3px 8px',
              border: '1px solid #1e2535',
              borderRadius: '4px',
              color: '#94a3b8',
            }}
          >
            + {qp}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div
        style={{
          padding: '12px 14px',
          borderTop: '1px solid #1c2230',
          background: '#0e1118',
        }}
      >
        {/* Image Attachment Preview */}
        {imagePreview && (
          <div className="flex items-center" style={{ gap: '8px', marginBottom: '8px' }}>
            <img
              src={imagePreview}
              alt="Preview"
              style={{ height: '44px', width: '44px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #00e5ff' }}
            />
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Multimodal schematic attached</span>
            <button
              onClick={() => setImagePreview(null)}
              className="btn btn-ghost"
              style={{ fontSize: '10px', padding: '2px 6px', color: '#f43f5e' }}
            >
              Remove
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: '8px' }}>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Instruct agent (e.g. 'Add a 3.3V power regulator with decoupling caps and route to header')..."
            rows={2}
            style={{
              width: '100%',
              background: '#080a0f',
              border: '1px solid #222938',
              borderRadius: '6px',
              padding: '8px 10px',
              fontSize: '13px',
              color: '#f8fafc',
              outline: 'none',
              resize: 'none',
              fontFamily: 'var(--font-sans)',
            }}
          />

          <div className="flex items-center justify-between">
            {/* File upload trigger */}
            <div className="flex items-center" style={{ gap: '6px' }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-ghost"
                style={{ fontSize: '11px', padding: '4px 8px' }}
                title="Attach circuit sketch or datasheet image"
              >
                📎 Attach Sketch
              </button>
            </div>

            {isStreaming ? (
              <button
                type="button"
                onClick={() => setShowStopModal(true)}
                className="btn font-mono"
                style={{
                  fontSize: '12px',
                  padding: '6px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(239, 68, 68, 0.18)',
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
                  borderRadius: '6px',
                  boxShadow: '0 0 12px rgba(239, 68, 68, 0.25)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '10px' }}>■</span>
                <span>Stop Agent</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputText.trim() && !imagePreview}
                className="btn btn-primary"
                style={{ fontSize: '12px', padding: '6px 16px' }}
              >
                ⚡ Engineer It
              </button>
            )}
          </div>
        </form>
      </div>

      {showStopModal && (
        <StopAgentModal
          isOpen={showStopModal}
          onCancel={() => setShowStopModal(false)}
          onConfirmStop={() => {
            setShowStopModal(false);
            onStopAgent?.();
          }}
        />
      )}
    </div>
  );
};
