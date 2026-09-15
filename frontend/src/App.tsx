import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { CircuitState, ChatMessage, AIModel, HumanDecisionRequest, ApprovalMode } from './types/eda';
import { kicanvasMcpServer } from './mcp/kicanvasMcpServer';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { AppUser, UserDetails } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import type { AuthMode } from './pages/AuthPage';
import { HomePage, OPENROUTER_MODELS } from './pages/HomePage';
import { WorkspacePage } from './pages/WorkspacePage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ConnectorsPage } from './pages/ConnectorsPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { CreateProjectModal } from './components/CreateProjectModal';
import { getApiBase, getWsBase } from './lib/apiConfig';
import { AntimatterLogo } from './components/AntimatterLogo';

const API_BASE = getApiBase();

type TopView = 'landing' | 'auth' | 'app';
type AppPage = 'home' | 'workspace' | 'projects' | 'connectors' | 'knowledge';
type AuthTab = AuthMode;

// ── Sidebar ───────────────────────────────────────────────────────────────
interface SidebarProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  activeProjectName?: string;
  userName: string;
  onSignOut: () => void;
  onOpenSettings: () => void;
  onNewChat: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const NAV: { key: AppPage; icon: string; label: string }[] = [
  { key: 'projects',   icon: '◫',  label: 'Projects' },
  { key: 'connectors', icon: '⬡',  label: 'Connectors' },
  { key: 'knowledge',  icon: '◈',  label: 'Knowledge' },
];

const Sidebar: React.FC<SidebarProps> = ({
  activePage, onNavigate, activeProjectName, userName, onSignOut, onOpenSettings, onNewChat,
  isCollapsed, onToggleCollapse,
}) => (
  <aside
    style={{
      width: isCollapsed ? '64px' : '220px',
      flexShrink: 0,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#090c12',
      borderRight: '1px solid #141c2b',
      transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden',
      position: 'relative',
    }}
  >
    {/* Brand Header */}
    <div
      style={{
        padding: isCollapsed ? '16px 8px 14px' : '18px 16px 14px',
        borderBottom: '1px solid #141c2b',
        display: 'flex',
        flexDirection: isCollapsed ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
        gap: isCollapsed ? '10px' : '8px',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', minWidth: 0, overflow: 'hidden' }}>
        <AntimatterLogo size={22} fontSize={15} showText={!isCollapsed} />
      </div>
      <button
        onClick={onToggleCollapse}
        title={isCollapsed ? 'Expand sidebar (Ctrl+[)' : 'Collapse sidebar (Ctrl+[)'}
        style={{
          background: isCollapsed ? 'rgba(255,255,255,0.03)' : 'transparent',
          border: '1px solid #1c2636',
          borderRadius: '6px',
          color: '#64748b',
          cursor: 'pointer',
          padding: isCollapsed ? '5px 7px' : '4px 7px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#00e5ff';
          e.currentTarget.style.color = '#00e5ff';
          e.currentTarget.style.background = 'rgba(0,229,255,0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#1c2636';
          e.currentTarget.style.color = '#64748b';
          e.currentTarget.style.background = isCollapsed ? 'rgba(255,255,255,0.03)' : 'transparent';
        }}
      >
        {isCollapsed ? '▶' : '◀'}
      </button>
    </div>

    {/* + New Chat button (ChatGPT UI) */}
    <div style={{ padding: isCollapsed ? '10px 8px 4px' : '12px 10px 4px' }}>
      <button
        onClick={onNewChat}
        title={isCollapsed ? 'New chat' : undefined}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          gap: '9px',
          padding: isCollapsed ? '9px 0' : '9px 12px',
          borderRadius: '8px',
          border: activePage === 'home' ? '1px solid #00e5ff' : '1px solid #1e2d44',
          background: activePage === 'home' ? 'rgba(0,229,255,0.1)' : '#0d1119',
          color: activePage === 'home' ? '#00e5ff' : '#f1f5f9',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 700,
          transition: 'all 0.15s',
          boxShadow: activePage === 'home' ? '0 0 16px rgba(0,229,255,0.12)' : 'none',
        }}
        onMouseEnter={(e) => {
          if (activePage !== 'home') {
            e.currentTarget.style.borderColor = '#00e5ff';
            e.currentTarget.style.color = '#00e5ff';
          }
        }}
        onMouseLeave={(e) => {
          if (activePage !== 'home') {
            e.currentTarget.style.borderColor = '#1e2d44';
            e.currentTarget.style.color = '#f1f5f9';
          }
        }}
      >
        <span style={{ fontSize: '16px', color: '#00e5ff', lineHeight: 1 }}>+</span>
        {!isCollapsed && <span>New chat</span>}
      </button>
    </div>

    {/* Active workspace indicator */}
    {activeProjectName && (
      <button
        onClick={() => onNavigate('workspace')}
        title={isCollapsed ? `Active Workspace: ${activeProjectName}` : undefined}
        style={{
          margin: isCollapsed ? '8px 8px 0' : '10px 8px 0',
          padding: isCollapsed ? '8px 0' : '8px 12px',
          borderRadius: '8px',
          background: activePage === 'workspace' ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.03)',
          border: activePage === 'workspace' ? '1px solid rgba(0,229,255,0.25)' : '1px solid #1a2233',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          gap: '8px',
          cursor: 'pointer',
          textAlign: 'left',
          width: isCollapsed ? 'calc(100% - 16px)' : 'calc(100% - 16px)',
          transition: 'all 0.15s',
        }}
      >
        <span style={{ fontSize: '13px', color: '#00e5ff' }}>⚡</span>
        {!isCollapsed && (
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: activePage === 'workspace' ? '#38bdf8' : '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Workspace</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: activePage === 'workspace' ? '#f1f5f9' : '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeProjectName}</div>
          </div>
        )}
      </button>
    )}

    {/* Nav Links */}
    <nav style={{ padding: '10px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
      {NAV.map(({ key, icon, label }) => {
        const isActive = activePage === key;
        return (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            title={isCollapsed ? label : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '10px',
              padding: isCollapsed ? '9px 0' : '9px 12px',
              borderRadius: '8px',
              border: 'none',
              background: isActive ? 'rgba(0,229,255,0.1)' : 'transparent',
              color: isActive ? '#00e5ff' : '#64748b',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: isActive ? 700 : 500,
              textAlign: isCollapsed ? 'center' : 'left',
              width: '100%',
              transition: 'all 0.15s',
              borderLeft: !isCollapsed && isActive ? '2px solid #00e5ff' : '2px solid transparent',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                (e.currentTarget as HTMLButtonElement).style.color = '#cbd5e1';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
              }
            }}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>{icon}</span>
            {!isCollapsed && <span>{label}</span>}
          </button>
        );
      })}
    </nav>

    {/* Bottom: Settings + User */}
    <div style={{ padding: isCollapsed ? '10px 6px' : '10px 8px', borderTop: '1px solid #141c2b', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <button
        onClick={onOpenSettings}
        title={isCollapsed ? 'Settings' : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          gap: '10px',
          padding: isCollapsed ? '9px 0' : '9px 12px',
          borderRadius: '8px',
          border: 'none',
          background: 'transparent',
          color: '#64748b',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          textAlign: isCollapsed ? 'center' : 'left',
          width: '100%',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.color = '#cbd5e1'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
      >
        <span style={{ fontSize: '14px' }}>⚙</span>
        {!isCollapsed && <span>Settings</span>}
      </button>

      <div
        style={{
          display: 'flex',
          flexDirection: isCollapsed ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          gap: isCollapsed ? '8px' : '0',
          padding: isCollapsed ? '8px 4px' : '8px 12px',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid #1a2438',
          marginTop: '2px',
        }}
        title={isCollapsed ? `${userName} (Signed in)` : undefined}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
          <div style={{
            width: '26px', height: '26px', borderRadius: '50%',
            background: 'linear-gradient(135deg,#00e5ff,#3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 800, color: '#050b14', flexShrink: 0,
          }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          {!isCollapsed && (
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userName}
            </span>
          )}
        </div>
        <button
          onClick={onSignOut}
          title="Sign out"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#475569',
            fontSize: '13px',
            padding: '2px 4px',
            borderRadius: '4px',
            flexShrink: 0,
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
        >
          ↩
        </button>
      </div>
    </div>
  </aside>
);

// ── Settings modal ────────────────────────────────────────────────────────
interface SettingsModalProps {
  approvalMode: ApprovalMode;
  onApprovalMode: (v: ApprovalMode) => void;
  selectedModel: string;
  onSelectModel: (v: string) => void;
  onClose: () => void;
  user: AppUser | null;
  userDetails: UserDetails | null;
  onUpdateProfile: (details: Partial<UserDetails>) => Promise<{ error?: string; details?: UserDetails }>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  approvalMode,
  onApprovalMode,
  selectedModel,
  onSelectModel,
  onClose,
  user,
  userDetails,
  onUpdateProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'agent' | 'profile' | 'fabrication'>('agent');
  const [layers, setLayers] = useState<number>(() => Number(localStorage.getItem('antimatter_def_layers') || 2));
  const [finish, setFinish] = useState<string>(() => localStorage.getItem('antimatter_def_finish') || 'ENIG');
  const [mask, setMask] = useState<string>(() => localStorage.getItem('antimatter_def_mask') || 'black');

  // Profile fields state
  const [fullName, setFullName] = useState(userDetails?.full_name || user?.name || '');
  const [role, setRole] = useState(userDetails?.role || 'Hardware Engineer');
  const [organization, setOrganization] = useState(userDetails?.organization || '');
  const [experienceLevel, setExperienceLevel] = useState(userDetails?.experience_level || 'Intermediate');
  const [preferredEda, setPreferredEda] = useState(userDetails?.preferred_eda || 'KiCad 8');
  const [preferredMcu, setPreferredMcu] = useState(userDetails?.preferred_mcu || 'ESP32 / ARM Cortex');
  const [bio, setBio] = useState(userDetails?.bio || '');

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSaveFabrication = () => {
    localStorage.setItem('antimatter_def_layers', String(layers));
    localStorage.setItem('antimatter_def_finish', finish);
    localStorage.setItem('antimatter_def_mask', mask);
    setSaveStatus('Fabrication preferences saved!');
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await onUpdateProfile({
        full_name: fullName,
        role,
        organization,
        experience_level: experienceLevel,
        preferred_eda: preferredEda,
        preferred_mcu: preferredMcu,
        bio,
      });
      if (res.error) {
        setSaveStatus(`⚠️ ${res.error}`);
      } else {
        setSaveStatus('✓ Engineer profile synchronized successfully!');
        setTimeout(() => setSaveStatus(null), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #0d121c 0%, #080a10 100%)',
          border: '1px solid rgba(0, 229, 255, 0.3)',
          borderRadius: '16px',
          padding: '24px',
          width: '580px',
          maxWidth: '94vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 32px rgba(0,229,255,0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>⚙</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>Platform & Account Settings</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '18px' }}>✕</button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            background: '#0c0f18',
            border: '1px solid #1c2332',
            borderRadius: '8px',
            padding: '3px',
            marginBottom: '18px',
            gap: '3px',
          }}
        >
          {[
            { id: 'agent', label: '🤖 Agent & Platform' },
            { id: 'profile', label: '👤 Engineer Profile' },
            { id: 'fabrication', label: '📐 Fabrication' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: 'var(--font-mono)',
                background: activeTab === t.id ? '#00e5ff' : 'transparent',
                color: activeTab === t.id ? '#050b14' : '#64748b',
                boxShadow: activeTab === t.id ? '0 0 12px rgba(0,229,255,0.3)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {saveStatus && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              background: saveStatus.startsWith('⚠️') ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)',
              border: saveStatus.startsWith('⚠️') ? '1px solid rgba(244,63,94,0.3)' : '1px solid rgba(16,185,129,0.3)',
              color: saveStatus.startsWith('⚠️') ? '#fda4af' : '#6ee7b7',
              fontSize: '12px',
              marginBottom: '14px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {saveStatus}
          </div>
        )}

        {/* TAB 1: Agent & Autonomy */}
        {activeTab === 'agent' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>☁️</span>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#00e5ff' }}>Fully Managed EDA Platform</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>API keys, compute, KiCad compilation, and model routing are securely managed server-side.</div>
              </div>
            </div>

            <div>
              <label style={settingLabel}>Agent Autonomy & Approval Mode</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { id: 'request_approval', title: '🛡️ Request Approval (Recommended)', desc: 'Agent requires confirmation for sensitive actions and prompts you on critical engineering crossroads.' },
                  { id: 'review', title: '👁️ Review Plans', desc: 'Agent formulates formal engineering change plans (ECOs) for your review before committing them to the board.' },
                  { id: 'auto_approve', title: '⚡ Auto-Approve (Autonomous)', desc: 'Agent executes continuously without stopping, adopting recommended component selections and committing S-expressions.' },
                ].map((opt) => {
                  const isSel = approvalMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onApprovalMode(opt.id as ApprovalMode)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: isSel ? '1px solid #00e5ff' : '1px solid #1c2635',
                        background: isSel ? 'rgba(0,229,255,0.08)' : '#0a0d16',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: isSel ? 700 : 500, color: isSel ? '#f8fafc' : '#cbd5e1' }}>{opt.title}</span>
                      <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={settingLabel}>AI Hardware Synthesis Engine</label>
              <select
                value={selectedModel}
                onChange={(e) => onSelectModel(e.target.value)}
                style={settingInput}
              >
                <option value="openrouter/auto">Antimatter Autonomous Engine (Recommended)</option>
                <option value="anthropic/claude-3.7-sonnet">Deep Systems Architect</option>
                <option value="openai/gpt-4o">High-Speed Hardware Synthesizer</option>
                <option value="google/gemini-2.5-pro">Deep Technical Analyst</option>
                <option value="deepseek/deepseek-r1">Mathematical Logic &amp; Verification</option>
              </select>
            </div>
          </div>
        )}

        {/* TAB 2: Engineer Profile */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid #1e293b', borderRadius: '8px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>ACCOUNT IDENTITY</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>{user?.email || 'Not logged in'}</div>
              </div>
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  background: user?.isGuest ? 'rgba(245,158,11,0.15)' : 'rgba(0,229,255,0.15)',
                  color: user?.isGuest ? '#f59e0b' : '#00e5ff',
                  border: user?.isGuest ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(0,229,255,0.3)',
                }}
              >
                {user?.isGuest ? 'SANDBOX GUEST' : 'SUPABASE AUTHENTICATED'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={settingLabel}>Engineer Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={settingInput}
                  placeholder="e.g. Nicola Tesla"
                />
              </div>
              <div>
                <label style={settingLabel}>Organization / Lab</label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  style={settingInput}
                  placeholder="e.g. Hardware R&D"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={settingLabel}>Role Focus</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} style={settingInput}>
                  <option value="Hardware Engineer">Hardware Engineer</option>
                  <option value="PCB Designer">PCB Designer</option>
                  <option value="Embedded/Firmware">Embedded/Firmware</option>
                  <option value="Researcher/Student">Researcher/Student</option>
                </select>
              </div>
              <div>
                <label style={settingLabel}>Experience Level</label>
                <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} style={settingInput}>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Senior / Principal">Senior / Principal</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={settingLabel}>Target EDA Platform</label>
                <select value={preferredEda} onChange={(e) => setPreferredEda(e.target.value)} style={settingInput}>
                  <option value="KiCad 8">KiCad 8 (Native)</option>
                  <option value="Altium Designer">Altium Designer</option>
                  <option value="EasyEDA">EasyEDA</option>
                  <option value="EAGLE">Autodesk EAGLE</option>
                </select>
              </div>
              <div>
                <label style={settingLabel}>Primary MCU Target</label>
                <select value={preferredMcu} onChange={(e) => setPreferredMcu(e.target.value)} style={settingInput}>
                  <option value="ESP32 / ARM Cortex">ESP32 / ARM Cortex</option>
                  <option value="STM32 Series">STM32 Series</option>
                  <option value="Nordic nRF52/nRF53">Nordic nRF52/nRF53</option>
                  <option value="RP2040 / RP2350">RP2040 / RP2350</option>
                  <option value="Microchip AVR / SAM">Microchip AVR / SAM</option>
                </select>
              </div>
            </div>

            <div>
              <label style={settingLabel}>Engineering Bio / Specialization</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                style={{ ...settingInput, height: 'auto', resize: 'vertical' }}
                placeholder="High-speed digital routing, RF impedance matching, switched-mode power supplies..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: saving ? '#1c2a3a' : '#00e5ff',
                  color: saving ? '#64748b' : '#050b14',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {saving ? 'Syncing...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: Fabrication Defaults */}
        {activeTab === 'fabrication' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={settingLabel}>Stackup</label>
                <select value={layers} onChange={(e) => setLayers(Number(e.target.value))} style={settingInput}>
                  <option value={2}>2-Layer</option>
                  <option value={4}>4-Layer</option>
                </select>
              </div>
              <div>
                <label style={settingLabel}>Surface Finish</label>
                <select value={finish} onChange={(e) => setFinish(e.target.value)} style={settingInput}>
                  <option value="ENIG">ENIG</option>
                  <option value="HASL">HASL</option>
                </select>
              </div>
              <div>
                <label style={settingLabel}>Mask Color</label>
                <select value={mask} onChange={(e) => setMask(e.target.value)} style={settingInput}>
                  <option value="black">Matte Black</option>
                  <option value="green">Forest Green</option>
                  <option value="blue">Signal Blue</option>
                  <option value="purple">Royal Purple</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={handleSaveFabrication} style={{ padding: '8px 22px', borderRadius: '8px', border: 'none', background: '#00e5ff', color: '#050b14', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const settingLabel: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#64748b',
  marginBottom: '6px', letterSpacing: '0.5px', textTransform: 'uppercase',
};
const settingInput: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1px solid #1c2635',
  background: '#090d16', color: '#f8fafc', fontSize: '13px', outline: 'none',
  fontFamily: 'var(--font-mono)', boxSizing: 'border-box',
};

// ── Main App Content ──────────────────────────────────────────────────────
const AntimatterAppContent: React.FC = () => {
  const { user, session, signOut, isRecoveryMode, userDetails, updateUserProfile, loading } = useAuth();

  const [topView, setTopView] = useState<TopView>(() => (isRecoveryMode ? 'auth' : user ? 'app' : 'landing'));
  const [authTab, setAuthTab]  = useState<AuthTab>(() => (isRecoveryMode ? 'reset_password' : 'signin'));

  useEffect(() => {
    if (isRecoveryMode) {
      setAuthTab('reset_password');
      setTopView('auth');
    }
  }, [isRecoveryMode]);

  useEffect(() => {
    if (!user && topView === 'app') setTopView('landing');
    if (user && topView !== 'app') { setTopView('app'); setAppPage('home'); }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // In-app routing
  const [appPage, setAppPage] = useState<AppPage>('home');

  // Collapsible sidebar state (persisted)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('antimatter_sidebar_collapsed') === 'true';
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('antimatter_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Active dynamic project ID
  const [currentProjectId, setCurrentProjectId] = useState<string>(() => `antimatter-${Math.random().toString(16).slice(2, 10)}`);

  // Circuit / workspace state
  const [circuitState, setCircuitState] = useState<CircuitState | null>(null);

  // AI chat state
  const [messages, setMessages]             = useState<ChatMessage[]>([]);
  const [models]                            = useState<AIModel[]>(OPENROUTER_MODELS.map((m) => ({ id: m.id, name: m.label, provider: m.sub, multimodal: true })));
  const [selectedModel, setSelectedModel]   = useState<string>(() => localStorage.getItem('antimatter_selected_model') || 'openrouter/auto');
  const [isStreaming, setIsStreaming]        = useState<boolean>(false);
  const [currentThought, setCurrentThought] = useState<string>('');
  const [isApprovingEco, setIsApprovingEco] = useState<boolean>(false);

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('antimatter_selected_model', modelId);
  };

  const handleStopAgent = () => {
    if (activeWsRef.current && activeWsRef.current.readyState === WebSocket.OPEN) {
      try {
        activeWsRef.current.send(JSON.stringify({ action: 'stop' }));
        activeWsRef.current.close();
      } catch { /* ignore */ }
    }
    activeWsRef.current = null;
    setIsStreaming(false);
    setCurrentThought('');
    setMessages((p) => [
      ...p,
      {
        id: `stop-${Date.now()}`,
        role: 'assistant',
        content: '🛑 **Agent Stopped**: Session disconnected by engineer.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // HITL & settings
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(() => (localStorage.getItem('antimatter_approval_mode') as ApprovalMode) || 'request_approval');
  const [permissionRequest, setPermissionRequest] = useState<{ tool: string; input: any; prompt: string } | null>(null);
  const [humanDecision, setHumanDecision] = useState<HumanDecisionRequest | null>(null);
  const activeWsRef = useRef<WebSocket | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const handleApprovalModeChange = (mode: ApprovalMode) => {
    setApprovalMode(mode);
    localStorage.setItem('antimatter_approval_mode', mode);
  };

  // Boot
  useEffect(() => {
    kicanvasMcpServer.start();
    return () => { kicanvasMcpServer.stop(); };
  }, []);

  const fetchProjectMessages = useCallback(async (projId: string) => {
    try {
      const r = await fetch(`${API_BASE}/projects/${projId}/messages`);
      if (r.ok) {
        const d = await r.json();
        if (d.messages && d.messages.length > 0) {
          const loaded: ChatMessage[] = d.messages.map((m: any, idx: number) => ({
            id: m.id || `msg-${idx}`,
            role: m.role,
            content: m.content,
            timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            thoughts: m.thoughts || [],
            toolCalls: m.tool_calls || [],
          }));
          setMessages(loaded);
        }
      }
    } catch { /* offline */ }
  }, []);

  const fetchProjectState = useCallback(async (projId?: string) => {
    const id = projId || currentProjectId;
    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      const r = await fetch(`${API_BASE}/projects/${id}/state`, { headers });
      if (r.ok) {
        const state = await r.json();
        setCircuitState(state);
        setCurrentProjectId(state.project_id);
      }
    } catch { /* offline */ }
  }, [session, currentProjectId]);

  useEffect(() => {
    const initApp = async () => {
      try {
        const res = await fetch(`${API_BASE}/projects`);
        if (res.ok) {
          const data = await res.json();
          const projs = data.projects || [];
          if (projs.length > 0) {
            const latest = projs[projs.length - 1];
            setCurrentProjectId(latest.project_id);
            await fetchProjectState(latest.project_id);
            await fetchProjectMessages(latest.project_id);
            return;
          }
        }
      } catch { /* offline */ }
      const freshId = `antimatter-${Math.random().toString(16).slice(2, 10)}`;
      setCurrentProjectId(freshId);
      await fetchProjectState(freshId);
    };

    initApp();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-sync historical messages whenever project changes to maintain session memory
  useEffect(() => {
    if (currentProjectId) {
      fetchProjectMessages(currentProjectId);
    }
  }, [currentProjectId, fetchProjectMessages]);

  const [showCreateProjectModal, setShowCreateProjectModal] = useState<boolean>(false);

  // ── New Chat: opens clean new chat interface as before ────
  const handleNewChat = () => {
    const freshId = `antimatter-${Math.random().toString(16).slice(2, 10)}`;
    setCurrentProjectId(freshId);
    setCircuitState(null);
    setMessages([]);
    setHumanDecision(null);
    setShowCreateProjectModal(false);
    setAppPage('home');
  };

  const handleCreateProject = async (config: {
    name: string;
    width: number;
    height: number;
    layers: number;
    maskColor: string;
    initialPrompt?: string;
  }) => {
    const rawName = config.name.trim();
    const projId = rawName
      ? rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + `-${Math.random().toString(16).slice(2, 6)}`
      : `antimatter-${Math.random().toString(16).slice(2, 10)}`;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          project_id: projId,
          project_name: rawName || 'antimatter',
          width: config.width,
          height: config.height,
          layers: config.layers,
          mask_color: config.maskColor,
          finish: 'ENIG',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentProjectId(projId);
        setCircuitState(data.project || data.state);
        setMessages([]);
        setAppPage('workspace');

        if (config.initialPrompt?.trim()) {
          setTimeout(() => {
            handleSendMessage(config.initialPrompt!.trim(), undefined, selectedModel, approvalMode, projId);
          }, 120);
        }
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  // ── Navigate to workspace from home prompt ────────────────────────────
  const handleHomeSubmit = (prompt: string, imageData?: string, modelId?: string, overrideApprovalMode?: ApprovalMode) => {
    const freshId = `antimatter-${Math.random().toString(16).slice(2, 10)}`;
    setCurrentProjectId(freshId);
    if (modelId) setSelectedModel(modelId);
    if (overrideApprovalMode) handleApprovalModeChange(overrideApprovalMode);
    setAppPage('workspace');
    setMessages([]);
    setCircuitState(null);
    setTimeout(() => handleSendMessage(prompt, imageData, modelId, overrideApprovalMode || approvalMode, freshId), 50);
  };

  // ── Open existing project ─────────────────────────────────────────────
  const handleSelectProject = async (projId: string) => {
    setCurrentProjectId(projId);
    setAppPage('workspace');
    setMessages([]);
    setCircuitState(null);
    await fetchProjectState(projId);
    await fetchProjectMessages(projId);
  };

  // ── Chat Streaming (WebSocket with SSE Fallback) ───────────────────────
  const handleSendMessage = async (
    prompt: string,
    imageData?: string,
    modelId?: string,
    overrideApprovalMode?: ApprovalMode,
    targetProjectId?: string,
  ) => {
    if (isStreaming) return;
    const effectiveModel = modelId ?? selectedModel;
    const effectiveApprovalMode = overrideApprovalMode ?? approvalMode;
    const activeId = targetProjectId || circuitState?.project_id || currentProjectId;

    setIsStreaming(true);
    setCurrentThought('');
    setPermissionRequest(null);
    setHumanDecision(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      imageUrl: imageData,
    };
    setMessages((p) => [...p, userMsg]);

    const assistantMsgId = `assistant-${Date.now()}`;
    const thoughts: string[] = [];
    const toolCalls: Array<{ tool: string; input: any }> = [];

    const handleStreamEvent = (ev: any) => {
      if (ev.type === 'permission_requested') {
        setPermissionRequest({ tool: ev.tool, input: ev.input, prompt: ev.prompt || `Execute ${ev.tool}?` });
      } else if (ev.type === 'human_decision_required') {
        setHumanDecision(ev);
      } else if (ev.type === 'thought') {
        const text = String(ev.content || '').trim();
        if (text && text !== '"?' && text !== '?' && text !== '"') {
          setCurrentThought(text);
          thoughts.push(text);
        }
      } else if (ev.type === 'content_delta') {
        setCurrentThought('');
      } else if (ev.type === 'tool_call') {
        toolCalls.push({ tool: ev.tool, input: ev.input });
        setCurrentThought(`Executing tool: ${ev.tool}...`);
      } else if (ev.type === 'eco_proposal') {
        const ecoProjectId = ev.project_id || ev.eco?.project_id;
        if (!ecoProjectId || ecoProjectId === activeId) {
          setCircuitState((p) => p ? { ...p, pending_eco: ev.eco } : ({ project_id: activeId, pending_eco: ev.eco } as any));
        }
      } else if (ev.type === 'project_updated') {
        if (ev.project_name) {
          setCircuitState((p) => p ? { ...p, project_name: ev.project_name } : ({ project_name: ev.project_name } as any));
        }
      } else if (ev.type === 'circuit_delta') {
        setPermissionRequest(null);
        setHumanDecision(null);
        setCircuitState((p) => p
          ? {
              ...p,
              ...ev.state,
              schematic_sexpr: ev.schematic_sexpr,
              pcb_sexpr: ev.pcb_sexpr,
              revision: ev.revision,
              pending_eco: ev.state?.pending_eco || p.pending_eco,
            }
          : ev.state);
      } else if (ev.type === 'final_message') {
        setCurrentThought('');
        setHumanDecision(null);
        setMessages((p) => [...p, {
          id: assistantMsgId,
          role: 'assistant',
          content: ev.content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          thoughts: [...thoughts],
          toolCalls: [...toolCalls],
        }]);
      }
    };

    // 1. Attempt WebSocket streaming connection
    let wsSuccess = false;
    try {
      const ws = new WebSocket(`${getWsBase()}/ws/chat`);

      const wsPromise = new Promise<void>((resolve, reject) => {
        ws.onopen = () => {
          wsSuccess = true;
          activeWsRef.current = ws;
          ws.send(JSON.stringify({
            prompt,
            project_id: activeId,
            model: effectiveModel,
            image_data: imageData,
            hitl_mode: effectiveApprovalMode === 'request_approval',
            approval_mode: effectiveApprovalMode,
            token: session?.access_token || undefined,
          }));
        };

        ws.onmessage = (event) => {
          try {
            const ev = JSON.parse(event.data);
            handleStreamEvent(ev);
            if (ev.type === 'final_message' || ev.type === 'error' || ev.type === 'stopped') {
              setIsStreaming(false);
              ws.close();
              resolve();
            }
          } catch { /* ignore parse error */ }
        };

        ws.onerror = (err) => {
          activeWsRef.current = null;
          setIsStreaming(false);
          if (!wsSuccess) reject(err);
          else resolve();
        };

        ws.onclose = () => {
          activeWsRef.current = null;
          setIsStreaming(false);
          resolve();
        };
      });

      await wsPromise;
    } catch {
      wsSuccess = false;
    }

    // 2. If WebSocket failed to initiate, fallback gracefully to SSE stream
    if (!wsSuccess) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const resp = await fetch(`${API_BASE}/chat/stream`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            prompt,
            project_id: activeId,
            model: effectiveModel,
            image_data: imageData,
            hitl_mode: effectiveApprovalMode === 'request_approval',
            approval_mode: effectiveApprovalMode,
            token: session?.access_token || undefined,
          }),
        });

        if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);

        const reader = resp.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const ev = JSON.parse(line.slice(6).trim());
              handleStreamEvent(ev);
            } catch { /* ignore */ }
          }
        }
      } catch (err: any) {
        setMessages((p) => [...p, { id: assistantMsgId, role: 'assistant', content: `Error: ${err.message}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      }
    }

    setIsStreaming(false);
    setCurrentThought('');
    fetchProjectState(activeId);
  };

  const handleConfirmDecision = async (decisionId: string, selection: string) => {
    setHumanDecision(null);

    // 1. Dispatch over active WebSocket stream if connected
    if (activeWsRef.current && activeWsRef.current.readyState === WebSocket.OPEN) {
      try {
        activeWsRef.current.send(JSON.stringify({
          action: 'human_decision_response',
          decision_id: decisionId,
          selection,
        }));
        return; // Handled directly via WebSocket; do not fire redundant HTTP request
      } catch { /* ws fallback below */ }
    }

    // 2. Only fallback to REST endpoint if WebSocket is closed
    try {
      await fetch(`${API_BASE}/chat/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision_id: decisionId,
          selection,
        }),
      });
    } catch { /* ignore */ }
  };

  const handleApproveEco = async (ecoId: string) => {
    const projId = circuitState?.project_id || currentProjectId;
    setIsApprovingEco(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const r = await fetch(`${API_BASE}/chat/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          project_id: projId,
          eco_id: ecoId,
          action: 'approve',
          token: session?.access_token || undefined,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        setCircuitState((p) => p ? {
          ...p,
          ...d.state,
          schematic_sexpr: d.schematic_sexpr || p.schematic_sexpr,
          pcb_sexpr: d.pcb_sexpr || p.pcb_sexpr,
          pending_eco: null, // Dismiss immediately upon approval
        } : d.state);
        setMessages((p) => [...p, { id: `sys-${Date.now()}`, role: 'assistant', content: `✓ **Plan Committed**: ${d.message}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        
        // Auto-resume agent stream without stopping or stalling
        await handleSendMessage(
          "The design plan is approved. Proceed to place all components on the board, route physical copper traces, run DRC/ERC verification, and generate the final BOM.",
          undefined,
          selectedModel,
          'auto_approve',
          projId
        );
      }
    } catch { /* ignore */ } finally {
      setIsApprovingEco(false);
      fetchProjectState(projId);
    }
  };

  const handleRejectEco = async (ecoId: string) => {
    const projId = circuitState?.project_id || currentProjectId;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      await fetch(`${API_BASE}/chat/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          project_id: projId,
          eco_id: ecoId,
          action: 'reject',
          token: session?.access_token || undefined,
        }),
      });
      setCircuitState((p) => p ? {
        ...p,
        pending_eco: null, // Dismiss immediately upon rejection
      } : null);
      setMessages((p) => [...p, { id: `sys-${Date.now()}`, role: 'assistant', content: 'Plan rejected.', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } catch { /* ignore */ }
  };

  const handleModifyEco = (ecoId: string, feedback: string) => handleSendMessage(`Regarding ECO #${ecoId}: ${feedback}`);
  const handleExportZip  = () => window.open(`${API_BASE}/projects/${circuitState?.project_id || currentProjectId}/export`, '_blank');
  const handleSetMaskColor = (color: string) => handleSendMessage(`Change board solder mask color to ${color}`);

  // ── RENDER: Loading Check ─────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', width: '100vw', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#07080b', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '34px', height: '34px', border: '3px solid rgba(0,229,255,0.15)', borderTopColor: '#00e5ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: '#64748b' }}>VERIFYING CREDENTIALS...</span>
      </div>
    );
  }

  // ── RENDER: Landing ───────────────────────────────────────────────────
  if (topView === 'landing' && !user) {
    return (
      <LandingPage
        onSignIn={() => { setAuthTab('signin'); setTopView('auth'); }}
        onGetStarted={() => { setAuthTab('signup'); setTopView('auth'); }}
      />
    );
  }

  // ── RENDER: Auth Page (Mandatory for unauthenticated access) ──────────
  if (!user) {
    return (
      <AuthPage
        initialTab={authTab === 'reset_password' ? 'reset_password' : 'signin'}
        onAuthenticated={() => { setTopView('app'); setAppPage('home'); }}
        onBack={() => setTopView('landing')}
      />
    );
  }

  // ── RENDER: App Shell (Strictly authenticated only) ────────────────────
  const userName = user.name || user.email.split('@')[0];

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', background: '#07080b' }}>

      <Sidebar
        activePage={appPage}
        onNavigate={(page) => setAppPage(page)}
        activeProjectName={circuitState?.project_name}
        userName={userName}
        onSignOut={signOut}
        onOpenSettings={() => setShowSettings(true)}
        onNewChat={handleNewChat}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {appPage === 'home' && (
          <HomePage
            onSubmit={handleHomeSubmit}
            selectedModel={selectedModel}
            onSelectModel={handleSelectModel}
            approvalMode={approvalMode}
            onApprovalModeChange={handleApprovalModeChange}
            isStreaming={isStreaming}
            onStopAgent={handleStopAgent}
          />
        )}

        {appPage === 'workspace' && (
          <WorkspacePage
            projectId={currentProjectId || circuitState?.project_id || ''}
            circuitState={circuitState}
            messages={messages}
            models={models}
            selectedModel={selectedModel}
            onSelectModel={handleSelectModel}
            onSendMessage={handleSendMessage}
            isStreaming={isStreaming}
            currentThought={currentThought}
            pendingEco={
              circuitState?.pending_eco &&
              (!circuitState.pending_eco.project_id || circuitState.pending_eco.project_id === (currentProjectId || circuitState.project_id)) &&
              circuitState.pending_eco.status !== 'approved' &&
              circuitState.pending_eco.status !== 'rejected'
                ? circuitState.pending_eco
                : null
            }
            onApproveEco={handleApproveEco}
            onRejectEco={handleRejectEco}
            onModifyEco={handleModifyEco}
            approvalMode={approvalMode}
            onApprovalModeChange={handleApprovalModeChange}
            hitlMode={approvalMode === 'request_approval'}
            onToggleHitlMode={() => handleApprovalModeChange(approvalMode === 'request_approval' ? 'auto_approve' : 'request_approval')}
            onOpenSettings={() => setShowSettings(true)}
            permissionRequest={permissionRequest}
            humanDecision={humanDecision}
            onConfirmDecision={handleConfirmDecision}
            onDismissDecision={() => setHumanDecision(null)}
            onSetMaskColor={handleSetMaskColor}
            onExportZip={handleExportZip}
            onBackToProjects={() => setAppPage('projects')}
            onStopAgent={handleStopAgent}
            isApproving={isApprovingEco}
          />
        )}

        {appPage === 'projects' && (
          <ProjectsPage
            onSelectProject={handleSelectProject}
            onOpenStudio={() => setAppPage('workspace')}
            onOpenCreateModal={() => setShowCreateProjectModal(true)}
          />
        )}

        {appPage === 'connectors' && <ConnectorsPage />}

        {appPage === 'knowledge' && (
          <KnowledgePage
            onCopyPromptToStudio={(prompt) => {
              handleSendMessage(prompt);
              setAppPage('workspace');
            }}
            />
        )}
      </div>

      <CreateProjectModal
        isOpen={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        onCreate={handleCreateProject}
      />

      {showSettings && (
        <SettingsModal
          approvalMode={approvalMode}
          onApprovalMode={handleApprovalModeChange}
          selectedModel={selectedModel}
          onSelectModel={handleSelectModel}
          onClose={() => setShowSettings(false)}
          user={user}
          userDetails={userDetails}
          onUpdateProfile={updateUserProfile}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => (
  <AuthProvider>
    <AntimatterAppContent />
  </AuthProvider>
);

export default App;
