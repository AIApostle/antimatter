import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ApprovalMode } from '../types/eda';
import { getApiBase } from '../lib/apiConfig';
import { StopAgentModal } from '../components/StopAgentModal';

// ── OpenRouter model catalogue with rich EDA metadata ────────────────────────
export interface OpenRouterModel {
  id: string;
  label: string;
  sub: string;
  provider: string;
  badge?: string;
  badgeColor?: string;
  context: string;
  description: string;
  category: string;
}

export const OPENROUTER_MODELS: OpenRouterModel[] = [
  {
    id: 'openrouter/auto',
    label: 'Auto (Recommended)',
    sub: 'Smart Router',
    provider: 'OpenRouter',
    badge: 'SMART ROUTING',
    badgeColor: '#00e5ff',
    context: '200k+',
    description: 'Dynamically routes to the best model based on prompt complexity, image attachments, and reasoning depth.',
    category: 'auto',
  },
  {
    id: 'anthropic/claude-3.7-sonnet',
    label: 'Claude 3.7 Sonnet',
    sub: 'Anthropic',
    provider: 'Anthropic',
    badge: 'HYBRID REASONING',
    badgeColor: '#f59e0b',
    context: '200k',
    description: 'Industry standard for complex hardware architecture, schematics, netlists, and DRC resolution.',
    category: 'anthropic',
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    label: 'Claude 3.5 Sonnet',
    sub: 'Anthropic',
    provider: 'Anthropic',
    badge: 'VISION & CODE',
    badgeColor: '#3b82f6',
    context: '200k',
    description: 'High-speed, benchmark-leading electrical engineering, pinout synthesis, and schematic analysis.',
    category: 'anthropic',
  },
  {
    id: 'openai/gpt-4o',
    label: 'GPT-4o',
    sub: 'OpenAI',
    provider: 'OpenAI',
    badge: 'MULTIMODAL',
    badgeColor: '#10b981',
    context: '128k',
    description: 'State-of-the-art multimodal vision for reading hand sketches, datasheet diagrams, and pinouts.',
    category: 'openai',
  },
  {
    id: 'openai/o3-mini',
    label: 'o3-mini',
    sub: 'OpenAI',
    provider: 'OpenAI',
    badge: 'STEM REASONING',
    badgeColor: '#8b5cf6',
    context: '200k',
    description: 'Deep mathematical step-by-step thinking for power budget calculations and analog filtering.',
    category: 'openai',
  },
  {
    id: 'openai/o1',
    label: 'o1 (Full Reasoning)',
    sub: 'OpenAI',
    provider: 'OpenAI',
    badge: 'DELIBERATE THINKING',
    badgeColor: '#ec4899',
    context: '200k',
    description: 'Maximum reasoning power for intricate multi-layer routing strategies and impedance matching.',
    category: 'openai',
  },
  {
    id: 'google/gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    sub: 'Google',
    provider: 'Google',
    badge: '1M CONTEXT',
    badgeColor: '#06b6d4',
    context: '1M',
    description: 'Massive 1M token context capable of digesting entire 300-page MCU datasheets and full system schematics.',
    category: 'google',
  },
  {
    id: 'google/gemini-2.0-flash-001',
    label: 'Gemini 2.0 Flash',
    sub: 'Google',
    provider: 'Google',
    badge: 'ULTRA FAST',
    badgeColor: '#00e5ff',
    context: '1M',
    description: 'Near-instant streaming response times for fast, iterative component adjustments and ECO proposals.',
    category: 'google',
  },
  {
    id: 'deepseek/deepseek-r1',
    label: 'DeepSeek R1',
    sub: 'DeepSeek',
    provider: 'DeepSeek',
    badge: 'OPEN REASONING',
    badgeColor: '#6366f1',
    context: '128k',
    description: 'Open-weights reasoning model with high performance in electronics engineering equations.',
    category: 'opensource',
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    label: 'Llama 3.3 70B',
    sub: 'Meta',
    provider: 'Meta',
    badge: 'OPEN SOURCE',
    badgeColor: '#64748b',
    context: '128k',
    description: 'Strong open weights model for standard board setup, net naming, and basic power regulation.',
    category: 'opensource',
  },
];

// ── Attachment type definitions ──────────────────────────────────────────────
export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: 'image' | 'datasheet' | 'kicad' | 'dxf' | 'bom' | 'code';
  dataUrl?: string; // base64 for image preview and multimodal
  textContent?: string; // for netlists, csv, dxf, code
}

// ── Suggested starter prompts ─────────────────────────────────────────────
const SUGGESTED = [
  '5V USB-C → 3.3V power delivery for ESP32',
  'STM32F4 dev board with SWD, USB, crystal',
  'Raspberry Pi RP2040 sensor hub',
  'Motor driver with H-bridge and current sensing',
  'Li-Po charger with protection circuit',
  'Arduino-compatible Nano form factor board',
];

// ── ChatGPT-style composer (reused on Home + Workspace) ───────────────────
interface ComposerProps {
  onSubmit: (prompt: string, imageData?: string, modelId?: string, approvalMode?: ApprovalMode) => void;
  isStreaming?: boolean;
  placeholder?: string;
  selectedModel: string;
  onSelectModel: (id: string) => void;
  approvalMode?: ApprovalMode;
  onApprovalModeChange?: (mode: ApprovalMode) => void;
  autoFocus?: boolean;
  /** compact = workspace inline mode (no outer card shadow) */
  compact?: boolean;
  onStopAgent?: () => void;
}

export const Composer: React.FC<ComposerProps> = ({
  onSubmit,
  isStreaming = false,
  placeholder = 'Describe your circuit or PCB…',
  selectedModel,
  onSelectModel,
  approvalMode = 'request_approval',
  onApprovalModeChange,
  autoFocus = false,
  compact = false,
  onStopAgent,
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [modelOpen, setModelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showAttachmentHelp, setShowAttachmentHelp] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [allModels, setAllModels] = useState<OpenRouterModel[]>(OPENROUTER_MODELS);

  useEffect(() => {
    fetch(`${getApiBase()}/models`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d && Array.isArray(d.models) && d.models.length > 0) {
          const mapped: OpenRouterModel[] = d.models.map((m: any) => ({
            id: m.id,
            label: m.name || m.label || m.id,
            sub: m.provider || m.author || m.sub || 'OpenRouter',
            provider: m.provider || 'OpenRouter',
            badge: m.badge || (m.multimodal ? 'VISION' : undefined),
            badgeColor: m.badgeColor || '#00e5ff',
            context: m.context_length ? `${Math.round(m.context_length / 1000)}k` : (m.context || '128k'),
            description: m.description || `High-performance OpenRouter model (${m.id})`,
            category: m.category || 'other',
          }));
          setAllModels(mapped);
        }
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const helpDropdownRef = useRef<HTMLDivElement>(null);

  // Close model menu and help popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setModelOpen(false);
      }
      if (helpDropdownRef.current && !helpDropdownRef.current.contains(e.target as Node)) {
        setShowAttachmentHelp(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 240)}px`;
  }, [text]);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  // Process selected file with format classification
  const handleFile = useCallback((file: File) => {
    const ext = file.name.toLowerCase().split('.').pop() || '';
    const isImage = file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext);
    const isDatasheet = ext === 'pdf' || file.name.toLowerCase().includes('datasheet');
    const isKiCad = ['kicad_sch', 'kicad_pcb', 'sch', 'brd', 'net'].includes(ext);
    const isDxf = ['dxf', 'step', 'stp'].includes(ext);
    const isBom = ['csv', 'tsv', 'xlsx'].includes(ext);

    let detectedType: AttachedFile['type'] = 'code';
    if (isImage) detectedType = 'image';
    else if (isDatasheet) detectedType = 'datasheet';
    else if (isKiCad) detectedType = 'kicad';
    else if (isDxf) detectedType = 'dxf';
    else if (isBom) detectedType = 'bom';

    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            id: fileId,
            name: file.name,
            size: file.size,
            type: 'image',
            dataUrl: result,
          },
        ]);
      };
      reader.readAsDataURL(file);
    } else if (isDatasheet && ext === 'pdf') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            id: fileId,
            name: file.name,
            size: file.size,
            type: 'datasheet',
            dataUrl: result,
          },
        ]);
      };
      reader.readAsDataURL(file);
    } else {
      // Text / KiCad / CSV / DXF / code files: read as text to feed directly into context
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            id: fileId,
            name: file.name,
            size: file.size,
            type: detectedType,
            textContent: content,
          },
        ]);
      };
      reader.readAsText(file);
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    files.forEach(handleFile);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || isStreaming) return;

    // Compile text prompt including any text-based attachments
    let compiledPrompt = trimmed;
    const textAttachments = attachments.filter((a) => a.textContent);
    if (textAttachments.length > 0) {
      const sections = textAttachments.map(
        (a) =>
          `\n\n--- ATTACHED SPECIFICATION: ${a.name} (${a.type.toUpperCase()}) ---\n${a.textContent?.slice(0, 15000)}\n--- END SPECIFICATION ---`
      );
      compiledPrompt += sections.join('');
    }

    // Extract first image / visual attachment for multimodal reasoning
    const visualAttachment = attachments.find((a) => a.dataUrl);
    const base64Data = visualAttachment?.dataUrl
      ? visualAttachment.dataUrl.includes(',')
        ? visualAttachment.dataUrl.split(',')[1]
        : visualAttachment.dataUrl
      : undefined;

    onSubmit(compiledPrompt, base64Data, selectedModel, approvalMode);
    setText('');
    setAttachments([]);
  };

  const activeModel = allModels.find((m) => m.id === selectedModel) ?? allModels[0] ?? OPENROUTER_MODELS[0];

  const filteredModels = allModels.filter((m) => {
    const matchesCategory =
      activeCategory === 'all' ||
      m.category === activeCategory ||
      (activeCategory === 'opensource' && ['meta', 'mistral', 'qwen', 'deepseek', 'opensource'].includes(m.category));
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      m.label.toLowerCase().includes(q) ||
      m.provider.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      (m.badge && m.badge.toLowerCase().includes(q));
    return matchesCategory && matchesQuery;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getAttachmentBadge = (type: AttachedFile['type']) => {
    switch (type) {
      case 'image':
        return { label: 'SCHEMATIC / IMAGE', bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', icon: '🖼️' };
      case 'datasheet':
        return { label: 'DATASHEET (PDF)', bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', icon: '📄' };
      case 'kicad':
        return { label: 'KICAD EDA', bg: 'rgba(16,185,129,0.15)', color: '#34d399', icon: '⚡' };
      case 'dxf':
        return { label: 'BOARD OUTLINE (DXF)', bg: 'rgba(168,85,247,0.15)', color: '#c084fc', icon: '📐' };
      case 'bom':
        return { label: 'BOM / PINOUT (CSV)', bg: 'rgba(6,182,212,0.15)', color: '#22d3ee', icon: '📋' };
      default:
        return { label: 'DOC / CODE', bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', icon: '📎' };
    }
  };

  return (
    <div
      ref={dropRef}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      style={{
        background: compact ? 'transparent' : '#0d1119',
        border: '1px solid #1c2635',
        borderRadius: compact ? '10px' : '14px',
        boxShadow: compact ? 'none' : '0 0 40px rgba(0,229,255,0.05)',
        overflow: 'visible',
        position: 'relative',
      }}
    >
      {/* Attachments preview tray */}
      {attachments.length > 0 && (
        <div
          style={{
            padding: '10px 12px 2px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            borderBottom: '1px solid #141c2b',
            background: 'rgba(10,13,22,0.4)',
          }}
        >
          {attachments.map((att) => {
            const badge = getAttachmentBadge(att.type);
            return (
              <div
                key={att.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  background: '#0a0d16',
                  border: '1px solid #1c2635',
                  fontSize: '12px',
                  maxWidth: '280px',
                }}
              >
                {att.type === 'image' && att.dataUrl ? (
                  <img
                    src={att.dataUrl}
                    alt={att.name}
                    style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '15px' }}>{badge.icon}</span>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      color: '#e2e8f0',
                      fontSize: '11px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {att.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                    <span
                      style={{
                        fontSize: '9px',
                        fontFamily: 'var(--font-mono)',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        background: badge.bg,
                        color: badge.color,
                        fontWeight: 700,
                      }}
                    >
                      {badge.label}
                    </span>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>{formatFileSize(att.size)}</span>
                  </div>
                </div>
                <button
                  onClick={() => removeAttachment(att.id)}
                  title="Remove attachment"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '2px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder={placeholder}
        rows={1}
        style={{
          width: '100%',
          resize: 'none',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: '#f1f5f9',
          fontSize: '15px',
          lineHeight: '1.6',
          padding: '16px 16px 8px',
          fontFamily: 'var(--font-sans)',
          overflowY: 'hidden',
          boxSizing: 'border-box',
        }}
      />

      {/* Bottom toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px 12px',
          gap: '8px',
          position: 'relative',
        }}
      >
        {/* + Attachment button */}
        <div style={{ position: 'relative' }} ref={helpDropdownRef}>
          <button
            title="Attach schematics, datasheets, KiCad files, BOM, or DXF outlines"
            onClick={() => fileRef.current?.click()}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              border: '1px solid #1c2635',
              background: '#0a0d16',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 300,
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#00e5ff';
              (e.currentTarget as HTMLButtonElement).style.color = '#00e5ff';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#1c2635';
              (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
            }}
          >
            +
          </button>

          {/* Hidden multi-format file input */}
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.md,.kicad_sch,.kicad_pcb,.net,.sch,.brd,.dxf,.csv,.tsv"
            style={{ display: 'none' }}
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              files.forEach(handleFile);
              e.target.value = '';
            }}
          />
        </div>

        {/* Attachment format helper badge */}
        <button
          onClick={() => setShowAttachmentHelp((v) => !v)}
          style={{
            background: 'transparent',
            border: 'none',
            color: showAttachmentHelp ? '#00e5ff' : '#475569',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'color 0.15s',
          }}
          title="See what attachments help the AI design better PCBs"
        >
          <span style={{ fontSize: '12px' }}>📎</span> Attach info
        </button>

        {/* Attachment Guide Popover */}
        {showAttachmentHelp && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '12px',
              width: '360px',
              background: '#0d1119',
              border: '1px solid #1e2d44',
              borderRadius: '12px',
              padding: '14px 16px',
              boxShadow: '0 16px 36px rgba(0,0,0,0.8)',
              zIndex: 110,
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '13px' }}>
                PCB Attachment Intelligence
              </div>
              <button
                onClick={() => setShowAttachmentHelp(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px' }}
              >
                ×
              </button>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '11px', lineHeight: '1.5', marginBottom: '10px' }}>
              The AI hardware agent uses multimodal vision and parsing tools to extract engineering constraints directly from attached files:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '14px' }}>🖼️</span>
                <div>
                  <strong style={{ color: '#cbd5e1' }}>Schematic & Napkin Sketches:</strong>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Hand-drawn schematics or screenshots. Vision converts them to nets and parts.</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '14px' }}>📄</span>
                <div>
                  <strong style={{ color: '#cbd5e1' }}>Component Datasheets (PDF / Text):</strong>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Pinout mappings, reference application circuits, decoupling capacitor sizes.</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '14px' }}>⚡</span>
                <div>
                  <strong style={{ color: '#cbd5e1' }}>KiCad Files (.kicad_sch, .net):</strong>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Existing circuit schematics or netlists to extend, optimize, or autoroute.</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '14px' }}>📐</span>
                <div>
                  <strong style={{ color: '#cbd5e1' }}>Mechanical Outline (.DXF):</strong>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Enclosure mounting holes, connector edge cutouts, and keep-out zones.</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '14px' }}>📋</span>
                <div>
                  <strong style={{ color: '#cbd5e1' }}>Part List / Pinout (.CSV):</strong>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Approved manufacturer part numbers (MPNs), LCSC part codes, or FPGA tables.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Model selector button & rich modal */}
        <div style={{ position: 'relative' }} ref={modelDropdownRef}>
          <button
            onClick={() => setModelOpen((o) => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '8px',
              border: modelOpen ? '1px solid #00e5ff' : '1px solid #1c2635',
              background: '#0a0d16',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#334155';
            }}
            onMouseLeave={(e) => {
              if (!modelOpen) (e.currentTarget as HTMLButtonElement).style.borderColor = '#1c2635';
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: activeModel.badgeColor || '#00e5ff',
                boxShadow: `0 0 8px ${activeModel.badgeColor || '#00e5ff'}`,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span>{activeModel.label}</span>
            <span style={{ fontSize: '9px', color: '#64748b', marginLeft: '2px' }}>▾</span>
          </button>

          {/* Model picker popover */}
          {modelOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: 0,
                width: '380px',
                maxHeight: '440px',
                background: '#0b0f17',
                border: '1px solid #1e2d44',
                borderRadius: '12px',
                padding: '12px',
                boxShadow: '0 20px 48px rgba(0,0,0,0.85)',
                zIndex: 120,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {/* Header & Search */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                  AI Hardware Engine Routing
                </div>
                <span style={{ fontSize: '10px', color: '#00e5ff', fontFamily: 'var(--font-mono)' }}>
                  Auto: Recommended
                </span>
              </div>

              {/* Search bar */}
              <input
                type="text"
                placeholder="Search models (e.g. Claude, GPT, o3, Gemini, Llama)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '7px',
                  border: '1px solid #1c2635',
                  background: '#07090e',
                  color: '#f1f5f9',
                  fontSize: '12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />

              {/* Category pills */}
              <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
                {[
                  { id: 'all', label: `All (${allModels.length})` },
                  { id: 'auto', label: 'Auto' },
                  { id: 'openai', label: 'OpenAI' },
                  { id: 'anthropic', label: 'Anthropic' },
                  { id: 'google', label: 'Google' },
                  { id: 'deepseek', label: 'DeepSeek' },
                  { id: 'meta', label: 'Meta' },
                  { id: 'mistral', label: 'Mistral' },
                  { id: 'qwen', label: 'Qwen' },
                  { id: 'opensource', label: 'Open Source' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '5px',
                      border: 'none',
                      background: activeCategory === cat.id ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.03)',
                      color: activeCategory === cat.id ? '#00e5ff' : '#64748b',
                      fontSize: '11px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      fontWeight: activeCategory === cat.id ? 700 : 500,
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Scrollable Model list */}
              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '280px', paddingRight: '2px' }}>
                {filteredModels.map((m) => {
                  const isSelected = m.id === selectedModel;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        onSelectModel(m.id);
                        setModelOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: isSelected ? '1px solid rgba(0,229,255,0.3)' : '1px solid transparent',
                        background: isSelected ? 'rgba(0,229,255,0.06)' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.1s',
                        gap: '3px',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
                          (e.currentTarget as HTMLButtonElement).style.borderColor = '#1e2d44';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: m.badgeColor || '#64748b',
                            }}
                          />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? '#00e5ff' : '#f1f5f9' }}>
                            {m.label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {m.badge && (
                            <span
                              style={{
                                fontSize: '9px',
                                fontFamily: 'var(--font-mono)',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                background: 'rgba(255,255,255,0.06)',
                                color: m.badgeColor || '#94a3b8',
                                fontWeight: 700,
                              }}
                            >
                              {m.badge}
                            </span>
                          )}
                          <span style={{ fontSize: '10px', color: '#475569', fontFamily: 'var(--font-mono)' }}>
                            {m.context}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                        {m.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Autonomy Dropdown inside Composer toolbar */}
        {approvalMode && onApprovalModeChange && (
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <select
              value={approvalMode}
              onChange={(e) => onApprovalModeChange(e.target.value as ApprovalMode)}
              title="Select AI Hardware Agent Autonomy Mode"
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #1c2635',
                background: '#0a0d16',
                color: approvalMode === 'auto_approve' ? '#34d399' : (approvalMode === 'review' ? '#38bdf8' : '#facc15'),
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.15s',
              }}
            >
              <option value="request_approval">🛡️ Request Approval</option>
              <option value="review">👁️ Review Plans</option>
              <option value="auto_approve">⚡ Auto-Approve</option>
            </select>
          </div>
        )}

        {/* Submit or Stop button */}
        {isStreaming ? (
          <button
            type="button"
            onClick={() => setShowStopModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '9px',
              border: '1px solid rgba(239, 68, 68, 0.6)',
              background: 'rgba(239, 68, 68, 0.18)',
              color: '#fca5a5',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              boxShadow: '0 0 16px rgba(239, 68, 68, 0.3)',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '10px' }}>■</span>
            <span>Stop Agent</span>
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!text.trim() && attachments.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '9px',
              border: 'none',
              background: (!text.trim() && attachments.length === 0) ? '#131a27' : '#00e5ff',
              color: (!text.trim() && attachments.length === 0) ? '#334155' : '#050b14',
              cursor: (!text.trim() && attachments.length === 0) ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              boxShadow: (text.trim() || attachments.length > 0) ? '0 0 16px rgba(0,229,255,0.3)' : 'none',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            ⚡ Engineer It
          </button>
        )}
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

// ── Home Page ─────────────────────────────────────────────────────────────
interface HomePageProps {
  onSubmit: (prompt: string, imageData?: string, modelId?: string, approvalMode?: ApprovalMode) => void;
  selectedModel: string;
  onSelectModel: (id: string) => void;
  approvalMode?: ApprovalMode;
  onApprovalModeChange?: (mode: ApprovalMode) => void;
  isStreaming?: boolean;
  onStopAgent?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onSubmit,
  selectedModel,
  onSelectModel,
  approvalMode = 'request_approval',
  onApprovalModeChange,
  isStreaming = false,
  onStopAgent,
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        background: '#07080b',
        overflow: 'hidden auto',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      <div style={{ width: '100%', maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '5px',
                background: 'linear-gradient(135deg, rgba(0,229,255,0.2) 0%, rgba(59,130,246,0.2) 100%)',
                border: '1px solid rgba(0,229,255,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00e5ff',
                fontSize: '13px',
                fontWeight: 900,
                fontFamily: 'monospace',
                lineHeight: 1,
                boxShadow: '0 0 10px rgba(0,229,255,0.35)',
                flexShrink: 0,
              }}
            >
              ^
            </div>
            <span style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '-0.3px', color: '#f8fafc' }}>antimatter</span>
          </div>
          <h1
            style={{
              fontSize: 'clamp(24px, 4vw, 36px)',
              fontWeight: 800,
              letterSpacing: '-0.8px',
              color: '#f8fafc',
              marginBottom: '8px',
              lineHeight: 1.15,
            }}
          >
            What are you building today?
          </h1>
          <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
            Describe your circuit or attach datasheets, sketches, or KiCad files — antimatter will synthesize the schematic, route the PCB, and check DRC in real time.
          </p>
        </div>

        {/* Main composer with autonomy dropdown */}
        <Composer
          onSubmit={onSubmit}
          selectedModel={selectedModel}
          onSelectModel={onSelectModel}
          approvalMode={approvalMode}
          onApprovalModeChange={onApprovalModeChange}
          isStreaming={isStreaming}
          onStopAgent={onStopAgent}
          autoFocus
          placeholder="e.g. 5V USB-C to 3.3V power delivery for an ESP32 with status LED, or attach a schematic sketch / datasheet…"
        />

        {/* Suggested starter prompts */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
          {SUGGESTED.map((s) => (
            <button
              key={s}
              onClick={() => onSubmit(s, undefined, selectedModel)}
              style={{
                padding: '7px 14px',
                borderRadius: '20px',
                border: '1px solid #1c2635',
                background: 'transparent',
                color: '#64748b',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#334155';
                (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#1c2635';
                (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};
