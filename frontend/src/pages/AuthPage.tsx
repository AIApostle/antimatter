import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export type AuthMode = 'signin' | 'signup' | 'forgot_password' | 'reset_password';

interface AuthPageProps {
  onAuthenticated: () => void;
  onBack: () => void;
  initialTab?: AuthMode;
}

// ── PCB Animation Canvas ───────────────────────────────────────────────────
const PCBAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    // ── PCB trace network (normalized 0-1 coords) ──────────────────────────
    const NODES = [
      { x: 0.15, y: 0.20 }, // U1 IC top-left
      { x: 0.40, y: 0.20 }, // U1 IC top-right
      { x: 0.40, y: 0.42 }, // U1 IC bot-right
      { x: 0.15, y: 0.42 }, // U1 IC bot-left
      { x: 0.62, y: 0.18 }, // C1
      { x: 0.78, y: 0.28 }, // C2
      { x: 0.72, y: 0.50 }, // R1
      { x: 0.55, y: 0.65 }, // U2 small IC
      { x: 0.30, y: 0.70 }, // via cluster
      { x: 0.14, y: 0.58 }, // connector left
      { x: 0.50, y: 0.82 }, // R2
      { x: 0.80, y: 0.72 }, // pad cluster
      { x: 0.22, y: 0.88 }, // bottom pad
      { x: 0.68, y: 0.88 }, // bottom pad 2
      { x: 0.90, y: 0.48 }, // edge pad
      { x: 0.88, y: 0.15 }, // corner decap
    ];

    const TRACES = [
      [0, 4], [4, 5], [5, 14], [1, 4], [2, 6], [6, 5],
      [2, 7], [7, 6], [7, 11], [3, 8], [8, 9], [8, 10],
      [10, 12], [10, 7], [11, 13], [11, 14], [0, 3],
      [1, 2], [3, 9], [5, 15], [15, 14], [13, 12],
    ];

    // Packet state
    type Packet = { trace: number; t: number; speed: number; color: string };
    const packets: Packet[] = [];
    const COLORS = ['#00e5ff', '#10b981', '#a855f7', '#38bdf8', '#f59e0b'];

    const spawnPacket = () => {
      const ti = Math.floor(Math.random() * TRACES.length);
      packets.push({
        trace: ti,
        t: 0,
        speed: 0.004 + Math.random() * 0.006,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    };

    const traceProgress = TRACES.map(() => 0);
    const startTime = performance.now();
    let tick = 0;

    const draw = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      tick++;
      ctx.clearRect(0, 0, W(), H());

      // Substrate background
      ctx.fillStyle = '#040a08';
      ctx.fillRect(0, 0, W(), H());

      // PCB grid
      ctx.strokeStyle = 'rgba(0,180,80,0.06)';
      ctx.lineWidth = 0.5;
      const grid = 22;
      for (let x = 0; x < W(); x += grid) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H()); ctx.stroke();
      }
      for (let y = 0; y < H(); y += grid) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W(), y); ctx.stroke();
      }

      const fadeIn = Math.min(1, elapsed / 1.5);

      // Advance trace reveal
      TRACES.forEach((_, i) => {
        const delay = i * 0.08;
        if (elapsed > delay) {
          traceProgress[i] = Math.min(1, (elapsed - delay) * 1.2);
        }
      });

      // Draw traces
      TRACES.forEach(([a, b], i) => {
        const p = traceProgress[i];
        if (p <= 0) return;
        const ax = NODES[a].x * W(), ay = NODES[a].y * H();
        const bx = NODES[b].x * W(), by = NODES[b].y * H();
        const ex = ax + (bx - ax) * p, ey = ay + (by - ay) * p;

        // Trace glow layer
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = `rgba(0,100,60,${0.25 * fadeIn})`;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Trace core
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = `rgba(0,180,80,${0.55 * fadeIn})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Big IC (U1)
      const u1 = {
        x1: NODES[0].x * W(), y1: NODES[0].y * H(),
        x2: NODES[1].x * W(), y2: NODES[2].y * H(),
      };
      const icAlpha = Math.min(1, elapsed / 1.2);
      ctx.strokeStyle = `rgba(0,229,255,${0.4 * icAlpha})`;
      ctx.fillStyle = `rgba(0,20,40,${0.7 * icAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(u1.x1, u1.y1, u1.x2 - u1.x1, u1.y2 - u1.y1, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = `rgba(0,229,255,${0.7 * icAlpha})`;
      ctx.font = `bold ${Math.max(10, W() * 0.02)}px JetBrains Mono, monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('MCU', (u1.x1 + u1.x2) / 2, (u1.y1 + u1.y2) / 2 + 4);

      // Small IC (U2)
      const u2cx = NODES[7].x * W(), u2cy = NODES[7].y * H();
      const u2s = Math.min(W(), H()) * 0.065;
      ctx.strokeStyle = `rgba(0,229,255,${0.3 * icAlpha})`;
      ctx.fillStyle = `rgba(0,20,40,${0.6 * icAlpha})`;
      ctx.beginPath();
      ctx.roundRect(u2cx - u2s / 2, u2cy - u2s / 2, u2s, u2s, 3);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = `rgba(0,229,255,${0.5 * icAlpha})`;
      ctx.font = `bold ${Math.max(8, W() * 0.015)}px JetBrains Mono, monospace`;
      ctx.fillText('IC', u2cx, u2cy + 4);

      // Pads / vias
      NODES.forEach((n, i) => {
        const nx = n.x * W(), ny = n.y * H();
        const alpha = Math.min(1, Math.max(0, (elapsed - i * 0.05) / 0.6));
        const pulse = 0.6 + 0.4 * Math.sin(tick * 0.07 + i * 0.9);
        const r = Math.max(3, W() * 0.008);

        const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, r * 3);
        grad.addColorStop(0, `rgba(0,229,255,${0.25 * pulse * alpha})`);
        grad.addColorStop(1, 'rgba(0,229,255,0)');
        ctx.beginPath();
        ctx.arc(nx, ny, r * 3, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(10,30,20,${alpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(0,229,255,${0.9 * pulse * alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(nx, ny, r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,229,255,${0.8 * alpha})`;
        ctx.fill();
      });

      // Data packets
      if (elapsed > 2 && tick % 40 === 0 && packets.length < 12) spawnPacket();

      for (let i = packets.length - 1; i >= 0; i--) {
        const pk = packets[i];
        pk.t += pk.speed;
        if (pk.t >= 1) { packets.splice(i, 1); continue; }

        const [a, b] = TRACES[pk.trace];
        const ax = NODES[a].x * W(), ay = NODES[a].y * H();
        const bx = NODES[b].x * W(), by = NODES[b].y * H();
        const px = ax + (bx - ax) * pk.t;
        const py = ay + (by - ay) * pk.t;

        if (pk.t > traceProgress[pk.trace]) continue;

        const pg = ctx.createRadialGradient(px, py, 0, px, py, 10);
        pg.addColorStop(0, `${pk.color}cc`);
        pg.addColorStop(1, `${pk.color}00`);
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fillStyle = pg;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = pk.color;
        ctx.fill();
      }

      // Watermark
      ctx.save();
      ctx.globalAlpha = 0.07 * Math.min(1, elapsed);
      ctx.font = `900 ${Math.max(18, W() * 0.06)}px Plus Jakarta Sans, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#00e5ff';
      ctx.letterSpacing = '-1px';
      ctx.fillText('antimatter', W() / 2, H() * 0.95);
      ctx.restore();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
};

// ── Auth Page ──────────────────────────────────────────────────────────────
export const AuthPage: React.FC<AuthPageProps> = ({
  onAuthenticated,
  onBack,
  initialTab = 'signin',
}) => {
  const {
    signInWithEmail,
    signUpWithEmail,
    forgotPassword,
    resetPassword,
    isRecoveryMode,
    clearRecoveryMode,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>(() => (isRecoveryMode ? 'reset_password' : initialTab));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Hardware Engineer');
  const [experienceLevel, setExperienceLevel] = useState('Intermediate');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (isRecoveryMode) {
      setMode('reset_password');
    }
  }, [isRecoveryMode]);

  const resetMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const switchMode = (newMode: AuthMode) => {
    resetMessages();
    setMode(newMode);
    if (newMode !== 'reset_password' && isRecoveryMode) {
      clearRecoveryMode();
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please provide both email and password.');
      return;
    }
    resetMessages();
    setLoading(true);
    try {
      const res = await signInWithEmail(email, password);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        onAuthenticated();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please provide both email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }
    resetMessages();
    setLoading(true);
    try {
      const res = await signUpWithEmail(email, password, name, {
        role,
        experience_level: experienceLevel,
      });
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || 'Account initialized successfully.');
        setTimeout(() => {
          onAuthenticated();
        }, 800);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please enter the email address associated with your account.');
      return;
    }
    resetMessages();
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || `Password recovery link dispatched to ${email}.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg('Please enter your new password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }
    resetMessages();
    setLoading(true);
    try {
      const res = await resetPassword(password);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || 'Password successfully updated.');
        setTimeout(() => {
          onAuthenticated();
        }, 1200);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        background: '#060810',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.4s ease',
        zIndex: 500,
      }}
    >
      {/* ── LEFT PANEL: Live PCB Animation ── */}
      <div
        style={{
          flex: '0 0 46%',
          position: 'relative',
          overflow: 'hidden',
          borderRight: '1px solid #0d1a10',
          display: 'flex',
        }}
      >
        <PCBAnimation />

        {/* Top-left logo overlaid on canvas */}
        <div style={{ position: 'absolute', top: '28px', left: '32px', zIndex: 2 }}>
          <button
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(0,229,255,0.25)',
              borderRadius: '8px',
              padding: '7px 14px',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
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
            <span style={{ fontSize: '15px', fontWeight: 900, letterSpacing: '-0.4px', color: '#f8fafc' }}>
              antimatter
            </span>
          </button>
        </div>

        {/* Bottom-left tagline overlaid */}
        <div
          style={{
            position: 'absolute',
            bottom: '28px',
            left: '32px',
            right: '32px',
            zIndex: 2,
          }}
        >
          <div
            style={{
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(14px)',
              border: '1px solid rgba(0,229,255,0.15)',
              borderRadius: '12px',
              padding: '16px 20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00e5ff', boxShadow: '0 0 8px #00e5ff' }} />
              <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.4px', color: '#f8fafc' }}>
                Hardware Engineering Cloud
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6' }}>
              Autonomous circuit synthesis, KiCad 8 compilation, verified JLCPCB/LCSC part resolution, and multi-layer stackup routing.
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Auth Form ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 32px',
          background: '#060810',
          overflowY: 'auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: '400px' }}>
          {/* Top navigation row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
            <button
              onClick={onBack}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                padding: 0,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#94a3b8')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
            >
              ← Back to home
            </button>
          </div>

          {/* Heading */}
          <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px', color: '#f8fafc', marginBottom: '6px' }}>
            {mode === 'signin' && 'Welcome back'}
            {mode === 'signup' && 'Create engineering account'}
            {mode === 'forgot_password' && 'Reset your password'}
            {mode === 'reset_password' && 'Set new password'}
          </h2>

          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px', lineHeight: '1.5' }}>
            {mode === 'signin' && 'Sign in to access your hardware projects and design history.'}
            {mode === 'signup' && 'Initialize your personalized AI hardware workstation.'}
            {mode === 'forgot_password' && 'Enter your email address and we will send you a link to reset your credentials.'}
            {mode === 'reset_password' && 'Choose a secure password for your antimatter engineering account.'}
          </p>

          {/* Tab switcher for Sign In / Sign Up */}
          {(mode === 'signin' || mode === 'signup') && (
            <div
              style={{
                display: 'flex',
                background: '#0c0f18',
                border: '1px solid #1c2332',
                borderRadius: '8px',
                padding: '3px',
                marginBottom: '20px',
                gap: '3px',
              }}
            >
              <button
                type="button"
                onClick={() => switchMode('signin')}
                style={{
                  flex: 1,
                  padding: '7px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'var(--font-mono)',
                  background: mode === 'signin' ? '#00e5ff' : 'transparent',
                  color: mode === 'signin' ? '#050b14' : '#64748b',
                  boxShadow: mode === 'signin' ? '0 0 12px rgba(0,229,255,0.3)' : 'none',
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                style={{
                  flex: 1,
                  padding: '7px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'var(--font-mono)',
                  background: mode === 'signup' ? '#00e5ff' : 'transparent',
                  color: mode === 'signup' ? '#050b14' : '#64748b',
                  boxShadow: mode === 'signup' ? '0 0 12px rgba(0,229,255,0.3)' : 'none',
                }}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Feedback Alerts */}
          {errorMsg && (
            <div
              style={{
                background: 'rgba(244,63,94,0.1)',
                border: '1px solid rgba(244,63,94,0.35)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#fda4af',
                fontSize: '12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.35)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#6ee7b7',
                fontSize: '12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>✓</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* ── 1. SIGN IN FORM ── */}
          {mode === 'signin' && (
            <form onSubmit={handleSignInSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input
                  type="email"
                  placeholder="engineer@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot_password')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#00e5ff',
                      fontSize: '11px',
                      cursor: 'pointer',
                      padding: 0,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ ...inputStyle, paddingRight: '36px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={eyeButtonStyle}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...submitBtnStyle,
                  background: loading ? '#1c2a3a' : '#00e5ff',
                  color: loading ? '#64748b' : '#050b14',
                  boxShadow: loading ? 'none' : '0 0 16px rgba(0,229,255,0.35)',
                }}
              >
                {loading ? 'Authenticating...' : 'Sign In to Workspace'}
              </button>
            </form>
          )}

          {/* ── 2. SIGN UP FORM ── */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Engineer Full Name</label>
                <input
                  type="text"
                  placeholder="Ada Lovelace"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Work or Personal Email</label>
                <input
                  type="email"
                  placeholder="ada@antimatter.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Engineering Focus</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="Hardware Engineer">Hardware Engineer</option>
                    <option value="PCB Designer">PCB Designer</option>
                    <option value="Embedded/Firmware">Embedded/Firmware</option>
                    <option value="Researcher/Student">Researcher/Student</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Experience Level</label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Senior / Principal">Senior / Principal</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Create Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ ...inputStyle, paddingRight: '36px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={eyeButtonStyle}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{ ...inputStyle, paddingRight: '36px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={eyeButtonStyle}
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...submitBtnStyle,
                  background: loading ? '#1c2a3a' : '#00e5ff',
                  color: loading ? '#64748b' : '#050b14',
                  boxShadow: loading ? 'none' : '0 0 16px rgba(0,229,255,0.35)',
                  marginTop: '6px',
                }}
              >
                {loading ? 'Creating Account...' : 'Initialize Workspace Account'}
              </button>
            </form>
          )}

          {/* ── 3. FORGOT PASSWORD FORM ── */}
          {mode === 'forgot_password' && (
            <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Registered Email Address</label>
                <input
                  type="email"
                  placeholder="engineer@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...submitBtnStyle,
                  background: loading ? '#1c2a3a' : '#00e5ff',
                  color: loading ? '#64748b' : '#050b14',
                }}
              >
                {loading ? 'Dispatching Link...' : 'Send Password Reset Link'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#00e5ff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* ── 4. RESET PASSWORD FORM ── */}
          {mode === 'reset_password' && (
            <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ ...inputStyle, paddingRight: '36px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={eyeButtonStyle}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{ ...inputStyle, paddingRight: '36px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={eyeButtonStyle}
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...submitBtnStyle,
                  background: loading ? '#1c2a3a' : '#00e5ff',
                  color: loading ? '#64748b' : '#050b14',
                }}
              >
                {loading ? 'Updating Password...' : 'Save Password & Sign In'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  ← Return to Sign In
                </button>
              </div>
            </form>
          )}

          <p style={{ marginTop: '24px', fontSize: '11px', color: '#334155', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
            🔒 End-to-End Encrypted Hardware Data · Supabase JWT Authentication
          </p>
        </div>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: '#64748b',
  marginBottom: '5px',
  fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '7px',
  border: '1px solid #1c2635',
  background: '#0a0d16',
  color: '#f1f5f9',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'var(--font-sans)',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const eyeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  right: '10px',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'transparent',
  border: 'none',
  color: '#64748b',
  cursor: 'pointer',
  fontSize: '13px',
  padding: '2px',
};

const submitBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 700,
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.15s',
};
