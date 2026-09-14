import React, { useState, useEffect } from 'react';

interface LandingPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
}

const PIPELINE_STEPS = [
  { step: '01', color: '#00e5ff', label: 'Natural Language', desc: 'Describe your circuit in plain English' },
  { step: '02', color: '#10b981', label: 'Research & Parts', desc: 'Agent sources datasheets & specs' },
  { step: '03', color: '#eab308', label: 'HITL Plan Review', desc: 'You approve every change order' },
  { step: '04', color: '#a855f7', label: '3D Board Visualization', desc: 'Photorealistic hardware rendering' },
  { step: '05', color: '#38bdf8', label: 'KiCad 8 Export', desc: 'Production-ready ZIP archive' },
];

const FEATURES = [
  {
    icon: '🤖',
    accent: '#00e5ff',
    title: 'Strands Agent SDK Loop',
    desc: 'Driven genuinely by the Strands Agent SDK. Pre-loaded with electronic design skills, component datasheets, and LiteLLM model provider streaming.',
  },
  {
    icon: '🛡️',
    accent: '#10b981',
    title: 'Human-in-the-Loop Safety',
    desc: 'The agent asks permission before modifying hardware. Review proposed ECOs, verify power architecture, or guide iterations in natural language.',
  },
  {
    icon: '🧊',
    accent: '#a855f7',
    title: '3D & 2D Hardware Canvas',
    desc: 'Instant photorealistic 3D board rendering with realistic FR4 substrates, ENIG gold pads, solder mask color switcher, and reactive 2D inspection.',
  },
  {
    icon: '☁️',
    accent: '#38bdf8',
    title: 'Cloud Project Management',
    desc: 'Stores projects, board configurations, design change orders, and revision history with encrypted cloud persistence.',
  },
  {
    icon: '📐',
    accent: '#f59e0b',
    title: 'Automated DRC & ERC',
    desc: 'Continuous physical clearance rules check, short-circuit detection, and netlist integrity diagnostics after every layout modification.',
  },
  {
    icon: '📦',
    accent: '#f43f5e',
    title: 'KiCad 8 ZIP Export',
    desc: 'One-click bundle containing .kicad_sch, .kicad_pcb, .kicad_pro, and bom.csv — ready to open in KiCad 8 or upload to JLCPCB / PCBWay.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, onGetStarted }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const el = document.getElementById('landing-scroll');
    const onScroll = () => setScrolled((el?.scrollTop ?? 0) > 40);
    el?.addEventListener('scroll', onScroll);
    return () => el?.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      id="landing-scroll"
      style={{
        position: 'fixed',
        inset: 0,
        overflowY: 'auto',
        background: '#060810',
        color: '#f8fafc',
        zIndex: 400,
      }}
    >
      {/* ── NAVBAR ── */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          height: '60px',
          background: scrolled ? 'rgba(6,8,16,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(26,33,53,0.7)' : '1px solid transparent',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, rgba(0,229,255,0.2) 0%, rgba(59,130,246,0.2) 100%)',
              border: '1px solid rgba(0,229,255,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00e5ff',
              fontSize: '14px',
              fontWeight: 900,
              fontFamily: 'monospace',
              lineHeight: 1,
              boxShadow: '0 0 12px rgba(0,229,255,0.35)',
              flexShrink: 0,
            }}
          >
            ^
          </div>
          <span style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '-0.4px' }}>antimatter</span>
        </div>

        {/* Center links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          {['Features', 'Workflow', 'About'].map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#64748b',
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
            >
              {l}
            </a>
          ))}
        </div>

        {/* Right CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onSignIn}
            style={{
              padding: '7px 16px',
              borderRadius: '7px',
              fontSize: '13px',
              fontWeight: 600,
              border: '1px solid #1e2d44',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#0d131f'; e.currentTarget.style.color = '#f1f5f9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            Sign In
          </button>
          <button
            onClick={onGetStarted}
            style={{
              padding: '7px 18px',
              borderRadius: '7px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              background: '#00e5ff',
              color: '#050b14',
              cursor: 'pointer',
              boxShadow: '0 0 14px rgba(0,229,255,0.35)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#38edff'; e.currentTarget.style.boxShadow = '0 0 22px rgba(0,229,255,0.5)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#00e5ff'; e.currentTarget.style.boxShadow = '0 0 14px rgba(0,229,255,0.35)'; }}
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section
        style={{
          position: 'relative',
          minHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '80px 24px 60px',
          overflow: 'hidden',
        }}
      >
        {/* Background grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(0,229,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            pointerEvents: 'none',
          }}
        />
        {/* Top cyan radial */}
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '900px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(0,229,255,0.11) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              letterSpacing: '1px',
              color: '#00e5ff',
              background: 'rgba(0,229,255,0.08)',
              border: '1px solid rgba(0,229,255,0.25)',
              borderRadius: '20px',
              padding: '5px 14px',
              marginBottom: '28px',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00e5ff', display: 'inline-block' }} />
            AI-NATIVE HARDWARE DESIGN AUTOMATION
          </div>

          <h1
            style={{
              fontSize: 'clamp(36px, 6vw, 72px)',
              fontWeight: 900,
              letterSpacing: '-2px',
              lineHeight: 1.05,
              maxWidth: '900px',
              marginBottom: '24px',
              background: 'linear-gradient(180deg, #ffffff 20%, #64748b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Natural Language to
            <br />
            Production-Ready PCB
          </h1>

          <p
            style={{
              fontSize: '17px',
              lineHeight: '1.65',
              color: '#64748b',
              maxWidth: '600px',
              marginBottom: '40px',
            }}
          >
            antimatter is an AI-first Electronic Design Automation platform. Direct an autonomous Strands agent
            to research part specs, plan layouts, route copper tracks, and export native KiCad 8 archives — with
            Human-in-the-Loop safety at every step.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '60px' }}>
            <button
              id="hero-get-started"
              onClick={onGetStarted}
              style={{
                padding: '14px 36px',
                borderRadius: '9px',
                fontSize: '15px',
                fontWeight: 700,
                border: 'none',
                background: '#00e5ff',
                color: '#050b14',
                cursor: 'pointer',
                boxShadow: '0 0 24px rgba(0,229,255,0.4)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 32px rgba(0,229,255,0.6)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(0,229,255,0.4)'; }}
            >
              ⚡ Get Started Free
            </button>
            <button
              onClick={onSignIn}
              style={{
                padding: '14px 26px',
                borderRadius: '9px',
                fontSize: '15px',
                fontWeight: 600,
                border: '1px solid #1e2d44',
                background: '#0d131f',
                color: '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#111b2d'; e.currentTarget.style.color = '#f1f5f9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#0d131f'; e.currentTarget.style.color = '#94a3b8'; }}
            >
              Sign In
            </button>
          </div>

          {/* Social proof bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              flexWrap: 'wrap',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              color: '#334155',
            }}
          >
            {['KiCad 8 Native', 'Real S-Expressions', 'JLCPCB Ready', 'Strands SDK', 'Open Source'].map((tag) => (
              <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#10b981' }}>✓</span> {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── WORKFLOW PIPELINE ── */}
      <section id="workflow" style={{ padding: '80px 24px', borderTop: '1px solid #10141f' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: '10px' }}>
              From Prompt to Production
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '480px', margin: '0 auto' }}>
              Five precise stages that take you from an idea to a manufacturable PCB — all driven by AI with your control.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '2px',
              background: '#10141f',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #10141f',
            }}
          >
            {PIPELINE_STEPS.map((s, i) => (
              <div
                key={s.step}
                style={{
                  background: '#07090f',
                  padding: '28px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = '#0b0f1c')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = '#07090f')}
              >
                {/* Connector arrow */}
                {i < PIPELINE_STEPS.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      right: '-1px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#1e2b3d',
                      fontSize: '18px',
                      zIndex: 2,
                    }}
                  >
                    ›
                  </div>
                )}
                <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: s.color, letterSpacing: '1px' }}>
                  STEP {s.step}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9' }}>{s.label}</div>
                <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>{s.desc}</div>
                <div style={{ height: '2px', background: s.color, borderRadius: '1px', opacity: 0.4, marginTop: '4px' }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section id="features" style={{ padding: '80px 24px', borderTop: '1px solid #10141f' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: '10px' }}>
              Engineered for Real Hardware Architects
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '480px', margin: '0 auto' }}>
              No mock responses. No synthetic shortcuts. Real EDA S-expressions and physics-checked rules.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '16px',
            }}
          >
            {FEATURES.map((f) => (
              <div
                key={f.title}
                style={{
                  background: '#08090f',
                  border: '1px solid #131928',
                  borderRadius: '12px',
                  padding: '28px 24px',
                  transition: 'border-color 0.2s, transform 0.2s',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = f.accent + '55';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#131928';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '28px', marginBottom: '14px' }}>{f.icon}</div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>{f.title}</h3>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT / CTA ── */}
      <section id="about" style={{ padding: '100px 24px', borderTop: '1px solid #10141f', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Bottom glow */}
        <div
          style={{
            position: 'absolute',
            bottom: '-200px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '800px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(0,229,255,0.08) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 48px)',
              fontWeight: 900,
              letterSpacing: '-1px',
              lineHeight: 1.1,
              marginBottom: '20px',
              background: 'linear-gradient(180deg, #ffffff 0%, #64748b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Ready to design your first AI-generated PCB?
          </h2>
          <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.6', marginBottom: '40px' }}>
            Join engineers already using antimatter to ship hardware faster. Start free — no credit card required.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={onGetStarted}
              style={{
                padding: '14px 36px',
                borderRadius: '9px',
                fontSize: '15px',
                fontWeight: 700,
                border: 'none',
                background: '#00e5ff',
                color: '#050b14',
                cursor: 'pointer',
                boxShadow: '0 0 24px rgba(0,229,255,0.4)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Create Account
            </button>
            <button
              onClick={onSignIn}
              style={{
                padding: '14px 26px',
                borderRadius: '9px',
                fontSize: '15px',
                fontWeight: 600,
                border: '1px solid #1e2d44',
                background: 'transparent',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.borderColor = '#334155'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#1e2d44'; }}
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        style={{
          borderTop: '1px solid #10141f',
          padding: '28px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              background: 'linear-gradient(135deg, rgba(0,229,255,0.2) 0%, rgba(59,130,246,0.2) 100%)',
              border: '1px solid rgba(0,229,255,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00e5ff',
              fontSize: '11px',
              fontWeight: 900,
              fontFamily: 'monospace',
              lineHeight: 1,
              boxShadow: '0 0 8px rgba(0,229,255,0.35)',
              flexShrink: 0,
            }}
          >
            ^
          </div>
          <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '-0.3px', color: '#f8fafc' }}>antimatter</span>
        </div>
        <p style={{ fontSize: '11px', color: '#334155', fontFamily: 'var(--font-mono)' }}>
          ANTIMATTER AI HARDWARE STUDIO · KICAD 8 ECOSYSTEM
        </p>
        <div style={{ display: 'flex', gap: '20px' }}>
          {['Features', 'Workflow', 'About'].map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              style={{ fontSize: '12px', color: '#475569', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#94a3b8')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
            >
              {l}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
};
