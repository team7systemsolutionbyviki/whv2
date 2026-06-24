import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  Database,
  RefreshCw,
  Eye,
  EyeOff,
  Check
} from 'lucide-react';

export const Login: React.FC = () => {
  const { login, isMock, forgotPassword } = useAuth();
  
  // Auth Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setErrorMsg("Please enter your Username or Email address in the field above first.");
      return;
    }
    setIsLoading(true);
    try {
      await forgotPassword(emailTrimmed);
      if (!isMock) {
        setSuccessMsg("Password reset email sent! Please check your inbox.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reset password. Please check your username/email.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed. Please verify credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)',
      overflowY: 'auto',
      zIndex: 99999,
      padding: '2rem'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
        maxWidth: '460px',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Main Portal Card */}
        <div className="glass-panel" style={{
          padding: '2.5rem',
          borderRadius: 'var(--border-radius-lg)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          position: 'relative'
        }}>
          {/* Logo & Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              display: 'inline-flex',
              padding: '0.85rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--primary) 0%, #818cf8 100%)',
              color: '#fff',
              boxShadow: 'var(--primary-glow)',
              marginBottom: '1rem'
            }}>
              <Database size={28} />
            </div>
            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              fontFamily: 'var(--font-title)',
              letterSpacing: '-0.02em',
              margin: '0 0 0.4rem 0',
              color: 'var(--text-primary)'
            }}>
              Welcome Back
            </h2>
            <p style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              margin: 0
            }}>
              Log in to access your wholesale warehouse system
            </p>
          </div>

          {/* Offline Mock Warning Banner */}
          {isMock && (
            <div style={{
              background: 'var(--warning-light)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: 'var(--border-radius-sm)',
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--warning)',
              fontSize: '0.75rem'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <div>
                <strong>Local Offline Mode Active:</strong> Super Admin: <span style={{ textDecoration: 'underline' }}>viki</span> / <span style={{ textDecoration: 'underline' }}>1101viki</span>.
              </div>
            </div>
          )}

          {/* Error Message Box */}
          {errorMsg && (
            <div style={{
              background: 'var(--danger-light)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--border-radius-sm)',
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              color: 'var(--danger)',
              fontSize: '0.8rem',
              animation: 'shake 0.3s ease'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Message Box */}
          {successMsg && (
            <div style={{
              background: 'var(--success-light)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: 'var(--border-radius-sm)',
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              color: 'var(--success)',
              fontSize: '0.8rem'
            }}>
              <Check size={18} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={14} />
                <span>Username or Email</span>
              </label>
              <input
                type="text"
                id="login-email"
                name="email"
                className="form-control"
                placeholder="viki or you@wolsales.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '1rem' }}
                disabled={isLoading}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                  <Lock size={14} />
                  <span>Password</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="login-password"
                  name="password"
                  className="form-control"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '1rem', paddingRight: '2.5rem' }}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.2rem'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                marginTop: '0.5rem',
                height: '46px'
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                  <RefreshCw className="spin" size={16} />
                  <span>Processing...</span>
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                  <span>Sign In Account</span>
                  <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Footer Developer Info */}
        <div style={{
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'rgba(255, 255, 255, 0.4)',
          marginTop: '0.5rem',
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.02em',
          lineHeight: '1.4'
        }}>
          This App Developed by vignesh<br />
          <span style={{ color: '#818cf8', fontWeight: 600 }}>9360039283</span>
        </div>
      </div>

      {/* Embedded shake keyframe styles */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .spin {
          animation: spin-anim 1s linear infinite;
        }
        @keyframes spin-anim {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
