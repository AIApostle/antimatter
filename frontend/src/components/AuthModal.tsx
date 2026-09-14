import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signInWithEmail, signUpWithEmail, signInAsGuest } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please provide both email and password.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    try {
      if (tab === 'signin') {
        const res = await signInWithEmail(email, password);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          onClose();
        }
      } else {
        const res = await signUpWithEmail(email, password, name);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          onClose();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    signInAsGuest();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #111520 0%, #0c0f17 100%)',
          border: '1px solid #1e2638',
          borderRadius: '12px',
          width: '420px',
          maxWidth: '92vw',
          padding: '24px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 229, 255, 0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: '18px' }}>
          <div className="flex items-center" style={{ gap: '8px' }}>
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
            <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px', color: '#f8fafc' }}>
              antimatter AUTH
            </span>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ fontSize: '13px', padding: '2px 8px', color: '#94a3b8' }}
          >
            ✕
          </button>
        </div>

        {/* Tab switch */}
        <div
          className="flex items-center"
          style={{
            background: '#080a0f',
            borderRadius: '8px',
            border: '1px solid #1c2230',
            padding: '3px',
            marginBottom: '16px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setErrorMsg(null);
            }}
            className={`btn btn-ghost font-mono flex-1 ${tab === 'signin' ? 'btn-primary' : ''}`}
            style={{ fontSize: '12px', padding: '6px' }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setErrorMsg(null);
            }}
            className={`btn btn-ghost font-mono flex-1 ${tab === 'signup' ? 'btn-primary' : ''}`}
            style={{ fontSize: '12px', padding: '6px' }}
          >
            Create Account
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid #f43f5e',
              borderRadius: '6px',
              padding: '8px 10px',
              color: '#fda4af',
              fontSize: '11px',
              marginBottom: '14px',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: '12px' }}>
          {tab === 'signup' && (
            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Engineer Name
              </label>
              <input
                type="text"
                placeholder="Ada Lovelace"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #232c3f',
                  background: '#090d15',
                  color: '#f8fafc',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="engineer@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid #232c3f',
                background: '#090d15',
                color: '#f8fafc',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid #232c3f',
                background: '#090d15',
                color: '#f8fafc',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ fontSize: '12px', padding: '9px', marginTop: '6px' }}
          >
            {loading ? 'Authenticating...' : tab === 'signin' ? 'Sign In to Workspace' : 'Create Hardware Account'}
          </button>
        </form>

        <div className="flex items-center my-3" style={{ gap: '8px', margin: '14px 0' }}>
          <div style={{ flex: 1, height: '1px', background: '#1c2230' }} />
          <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: '#1c2230' }} />
        </div>

        {/* Quick Demo Access */}
        <button
          type="button"
          onClick={handleGuest}
          className="btn font-mono w-full"
          style={{
            fontSize: '11px',
            padding: '8px',
            border: '1px solid #243048',
            background: '#121824',
            color: '#38bdf8',
            borderRadius: '6px',
            width: '100%',
          }}
        >
          ⚡ Quick Demo / Guest Access
        </button>

        <div style={{ marginTop: '14px', fontSize: '10px', color: '#64748b', textAlign: 'center' }}>
          ✓ Enterprise Hardware Platform · End-to-End Encrypted Workspace
        </div>
      </div>
    </div>
  );
};
